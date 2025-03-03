"""
Job management functionality.

This module provides core job management functionality, including:
- Managing long-running background tasks
- Tracking job progress
- Handling job completion and failure
"""

import os
import json
import logging
import uuid
import time
import traceback
from typing import List, Dict, Any, Optional, Callable, Awaitable
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, Future, as_completed
from functools import wraps

# Set up logging
logger = logging.getLogger("embedding_service")

# Global executor for background tasks
_executor = ThreadPoolExecutor(max_workers=4)

# Global job directory - should be configured by the application
_JOB_DIR = os.environ.get("JOB_DIR", "./data/jobs")

# Global future objects tracked for job cancellation
_futures: Dict[str, Future] = {}


class JobStatus:
    """
    Status of a long-running job.
    """
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    

class JobError(Exception):
    """
    Error related to job management.
    """
    pass


class JobManager:
    """
    Manages long-running background jobs.
    """
    
    def __init__(self, job_dir: str):
        """
        Initialize the JobManager.
        
        Args:
            job_dir: Directory where job status files are stored
        """
        self.job_dir = Path(job_dir)
        self.job_dir.mkdir(parents=True, exist_ok=True)
        
        # Set the global job directory
        global _JOB_DIR
        _JOB_DIR = str(self.job_dir)
    
    def register_job(
        self,
        operation_type: str,
        total_items: int = 0,
        details: Dict[str, Any] = None
    ) -> str:
        """
        Register a new job.
        
        Args:
            operation_type: Type of operation (e.g., 'create_vectorstore')
            total_items: Total number of items to process
            details: Additional details about the job
            
        Returns:
            Job ID
        """
        # Generate a new job ID
        job_id = str(uuid.uuid4())
        
        # Create the job status file
        job_file = self.job_dir / f"{job_id}.json"
        
        # Create job status data
        job_data = {
            "job_id": job_id,
            "status": JobStatus.PENDING,
            "operation_type": operation_type,
            "total_items": total_items,
            "processed_items": 0,
            "started_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "completed_at": None,
            "result": None,
            "error": None,
            "details": details or {}
        }
        
        # Write job status to file
        with open(job_file, "w") as f:
            json.dump(job_data, f, indent=2)
        
        logger.info(f"Registered new job {job_id} for operation: {operation_type}")
        return job_id
    
    def update_job_progress(
        self,
        job_id: str,
        processed_items: int,
        status: Optional[str] = None,
        current_file: Optional[str] = None,
        current_operation: Optional[str] = None
    ) -> bool:
        """
        Update job progress.
        
        Args:
            job_id: Job ID
            processed_items: Number of items processed so far
            status: Optional new status
            current_file: Optional current file being processed
            current_operation: Optional current operation being performed
            
        Returns:
            True if successful, False otherwise
        """
        job_file = self.job_dir / f"{job_id}.json"
        
        if not job_file.exists():
            logger.error(f"Job file not found for job ID: {job_id}")
            return False
        
        try:
            # Read current job status
            with open(job_file, "r") as f:
                job_data = json.load(f)
            
            # Update job status
            job_data["processed_items"] = processed_items
            job_data["updated_at"] = datetime.now().isoformat()
            
            if status:
                job_data["status"] = status
            
            # Update details with current operation and file
            details = job_data.get("details", {})
            if current_file:
                details["current_file"] = current_file
            if current_operation:
                details["current_operation"] = current_operation
            
            # Calculate progress percentage
            if job_data.get("total_items", 0) > 0:
                details["progress_percentage"] = (
                    processed_items / job_data["total_items"]
                ) * 100
            else:
                details["progress_percentage"] = 0
                
            job_data["details"] = details
            
            # Write updated job status to file
            with open(job_file, "w") as f:
                json.dump(job_data, f, indent=2)
            
            return True
        
        except Exception as e:
            logger.error(f"Error updating job {job_id}: {str(e)}")
            return False
    
    def complete_job(
        self,
        job_id: str,
        result: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Mark a job as completed.
        
        Args:
            job_id: Job ID
            result: Optional result data
            
        Returns:
            True if successful, False otherwise
        """
        job_file = self.job_dir / f"{job_id}.json"
        
        if not job_file.exists():
            logger.error(f"Job file not found for job ID: {job_id}")
            return False
        
        try:
            # Read current job status
            with open(job_file, "r") as f:
                job_data = json.load(f)
            
            # Update job status
            job_data["status"] = JobStatus.COMPLETED
            job_data["completed_at"] = datetime.now().isoformat()
            job_data["result"] = result
            
            # Write updated job status to file
            with open(job_file, "w") as f:
                json.dump(job_data, f, indent=2)
            
            logger.info(f"Job {job_id} completed successfully")
            return True
        
        except Exception as e:
            logger.error(f"Error completing job {job_id}: {str(e)}")
            return False
    
    def fail_job(
        self,
        job_id: str,
        error: str
    ) -> bool:
        """
        Mark a job as failed.
        
        Args:
            job_id: Job ID
            error: Error message
            
        Returns:
            True if successful, False otherwise
        """
        job_file = self.job_dir / f"{job_id}.json"
        
        if not job_file.exists():
            logger.error(f"Job file not found for job ID: {job_id}")
            return False
        
        try:
            # Read current job status
            with open(job_file, "r") as f:
                job_data = json.load(f)
            
            # Update job status
            job_data["status"] = JobStatus.FAILED
            job_data["completed_at"] = datetime.now().isoformat()
            job_data["error"] = error
            
            # Write updated job status to file
            with open(job_file, "w") as f:
                json.dump(job_data, f, indent=2)
            
            logger.error(f"Job {job_id} failed: {error}")
            return True
        
        except Exception as e:
            logger.error(f"Error marking job {job_id} as failed: {str(e)}")
            return False
    
    def get_job_status(
        self,
        job_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get job status.
        
        Args:
            job_id: Job ID
            
        Returns:
            Job status dictionary or None if not found
        """
        job_file = self.job_dir / f"{job_id}.json"
        
        if not job_file.exists():
            logger.warning(f"Job file not found for job ID: {job_id}")
            return None
        
        try:
            # Read job status
            with open(job_file, "r") as f:
                job_data = json.load(f)
            
            return job_data
        
        except Exception as e:
            logger.error(f"Error reading job status for job ID {job_id}: {str(e)}")
            return None
    
    def list_jobs(
        self,
        status: Optional[str] = None,
        operation_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List jobs with optional filtering.
        
        Args:
            status: Optional status to filter by
            operation_type: Optional operation type to filter by
            limit: Maximum number of jobs to return
            offset: Number of jobs to skip
            
        Returns:
            List of job status dictionaries
        """
        jobs = []
        
        # List all job files
        job_files = list(self.job_dir.glob("*.json"))
        
        # Sort by modification time (newest first)
        job_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Apply offset
        job_files = job_files[offset:]
        
        # Apply limit (if not limited by status/operation filtering)
        if not status and not operation_type:
            job_files = job_files[:limit]
        
        for job_file in job_files:
            try:
                with open(job_file, "r") as f:
                    job_data = json.load(f)
                
                # Apply filters
                if status and job_data.get("status") != status:
                    continue
                
                if operation_type and job_data.get("operation_type") != operation_type:
                    continue
                
                jobs.append(job_data)
                
                # Apply limit if we're filtering
                if len(jobs) >= limit:
                    break
                
            except Exception as e:
                logger.error(f"Error reading job file {job_file}: {str(e)}")
        
        return jobs
    
    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running job.
        
        Args:
            job_id: Job ID
            
        Returns:
            True if successfully cancelled, False otherwise
        """
        global _futures
        
        job_file = self.job_dir / f"{job_id}.json"
        
        if not job_file.exists():
            logger.warning(f"Job file not found for job ID: {job_id}")
            return False
        
        try:
            # Read job status
            with open(job_file, "r") as f:
                job_data = json.load(f)
            
            # Check if job can be cancelled
            if job_data["status"] in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                logger.warning(f"Cannot cancel job {job_id} with status: {job_data['status']}")
                return False
            
            # Cancel the job future if it exists
            if job_id in _futures:
                future = _futures[job_id]
                cancelled = future.cancel()
                if not cancelled:
                    logger.warning(f"Failed to cancel future for job {job_id}")
            
            # Update job status
            job_data["status"] = JobStatus.CANCELLED
            job_data["completed_at"] = datetime.now().isoformat()
            job_data["error"] = "Job cancelled by user"
            
            # Write updated job status to file
            with open(job_file, "w") as f:
                json.dump(job_data, f, indent=2)
            
            logger.info(f"Job {job_id} cancelled")
            return True
        
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {str(e)}")
            return False
    
    def run_background_job(
        self,
        job_id: str,
        func: Callable,
        *args,
        **kwargs
    ) -> None:
        """
        Run a function as a background job.
        
        Args:
            job_id: Job ID for tracking
            func: Function to run in the background
            *args: Arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function
        """
        global _executor, _futures
        
        # Update job status to processing
        self.update_job_progress(job_id, 0, JobStatus.PROCESSING)
        
        # Wrap the function to handle errors
        @wraps(func)
        def wrapped_func(*args, **kwargs):
            try:
                # Call the function
                result = func(*args, **kwargs)
                
                # Mark job as completed
                self.complete_job(job_id, result if isinstance(result, dict) else None)
                
                return result
            
            except Exception as e:
                # Get the full stack trace
                error_trace = traceback.format_exc()
                
                # Log the error
                logger.error(f"Error in background job {job_id}: {str(e)}")
                logger.error(error_trace)
                
                # Mark the job as failed
                self.fail_job(job_id, f"{str(e)}\n\n{error_trace}")
                
                # Re-raise the exception
                raise
            
            finally:
                # Remove the future from tracking
                if job_id in _futures:
                    del _futures[job_id]
        
        # Submit the job to the executor
        future = _executor.submit(wrapped_func, *args, **kwargs)
        
        # Store the future for cancellation
        _futures[job_id] = future


# Initialize the global job manager
_job_manager = None


def initialize_job_manager(job_dir: str):
    """
    Initialize the global job manager.
    
    Args:
        job_dir: Directory where job status files are stored
    """
    global _job_manager
    _job_manager = JobManager(job_dir)
    return _job_manager


def get_job_manager() -> JobManager:
    """
    Get the global job manager.
    
    Returns:
        Global JobManager instance
    """
    global _job_manager
    
    if _job_manager is None:
        # Initialize with default job directory if not explicitly set
        _job_manager = JobManager(Path(_JOB_DIR))
    
    return _job_manager


# Standalone functions for backward compatibility
def generate_job_id() -> str:
    """
    Generate a unique job ID.
    
    Returns:
        Job ID
    """
    return str(uuid.uuid4())


def register_job(
    operation_type: str,
    total_items: int = 0,
    details: Dict[str, Any] = None
) -> str:
    """
    Register a new job.
    
    Args:
        operation_type: Type of operation (e.g., 'create_vectorstore')
        total_items: Total number of items to process
        details: Additional details about the job
        
    Returns:
        Job ID
    """
    job_manager = get_job_manager()
    return job_manager.register_job(operation_type, total_items, details)


def update_job_progress(
    job_id: str,
    processed_items: int,
    status: Optional[str] = None,
    current_file: Optional[str] = None,
    current_operation: Optional[str] = None
) -> bool:
    """
    Update job progress.
    
    Args:
        job_id: Job ID
        processed_items: Number of items processed so far
        status: Optional new status
        current_file: Optional current file being processed
        current_operation: Optional current operation being performed
        
    Returns:
        True if successful, False otherwise
    """
    job_manager = get_job_manager()
    return job_manager.update_job_progress(
        job_id, processed_items, status, current_file, current_operation
    )


def complete_job(
    job_id: str,
    result: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Mark a job as completed.
    
    Args:
        job_id: Job ID
        result: Optional result data
        
    Returns:
        True if successful, False otherwise
    """
    job_manager = get_job_manager()
    return job_manager.complete_job(job_id, result)


def fail_job(
    job_id: str,
    error: str
) -> bool:
    """
    Mark a job as failed.
    
    Args:
        job_id: Job ID
        error: Error message
        
    Returns:
        True if successful, False otherwise
    """
    job_manager = get_job_manager()
    return job_manager.fail_job(job_id, error)


def get_job_status(
    job_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get job status.
    
    Args:
        job_id: Job ID
        
    Returns:
        Job status dictionary or None if not found
    """
    job_manager = get_job_manager()
    return job_manager.get_job_status(job_id)


def list_jobs(
    status: Optional[str] = None,
    operation_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    List jobs with optional filtering.
    
    Args:
        status: Optional status to filter by
        operation_type: Optional operation type to filter by
        limit: Maximum number of jobs to return
        offset: Number of jobs to skip
        
    Returns:
        List of job status dictionaries
    """
    job_manager = get_job_manager()
    return job_manager.list_jobs(status, operation_type, limit, offset)


def cancel_job(job_id: str) -> bool:
    """
    Cancel a running job.
    
    Args:
        job_id: Job ID
        
    Returns:
        True if successfully cancelled, False otherwise
    """
    job_manager = get_job_manager()
    return job_manager.cancel_job(job_id)


def run_background_job(
    job_id: str,
    func: Callable,
    *args,
    **kwargs
) -> None:
    """
    Run a function as a background job.
    
    Args:
        job_id: Job ID for tracking
        func: Function to run in the background
        *args: Arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function
    """
    job_manager = get_job_manager()
    job_manager.run_background_job(job_id, func, *args, **kwargs)


# Context manager for job execution
class JobContext:
    """
    Context manager for job execution.
    This automatically updates job status and handles errors.
    
    Example:
        with JobContext(job_id, total_items=10) as ctx:
            for i in range(10):
                # Do some work
                ctx.update_progress(i+1)
    """
    
    def __init__(
        self,
        job_id: str,
        total_items: int,
        operation_type: Optional[str] = None
    ):
        """
        Initialize the job context.
        
        Args:
            job_id: Job ID
            total_items: Total number of items to process
            operation_type: Optional operation type for logging
        """
        self.job_id = job_id
        self.total_items = total_items
        self.operation_type = operation_type
        self.processed_items = 0
        self.current_file = None
        self.current_operation = None
    
    def __enter__(self):
        """Enter the context manager."""
        # Update job status to processing
        update_job_progress(
            self.job_id,
            0,
            JobStatus.PROCESSING,
            current_operation=f"Starting {self.operation_type or 'job'}"
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context manager."""
        if exc_type is not None:
            # An exception occurred
            error_message = f"{exc_type.__name__}: {str(exc_val)}"
            fail_job(self.job_id, error_message)
            return False
        
        # No exception, mark job as completed if all items processed
        if self.processed_items >= self.total_items:
            complete_job(self.job_id)
        
        return True
    
    def update_progress(
        self,
        processed_items: Optional[int] = None,
        current_file: Optional[str] = None,
        current_operation: Optional[str] = None
    ):
        """
        Update job progress.
        
        Args:
            processed_items: Number of items processed so far
            current_file: Optional current file being processed
            current_operation: Optional current operation being performed
        """
        if processed_items is not None:
            self.processed_items = processed_items
        
        if current_file is not None:
            self.current_file = current_file
        
        if current_operation is not None:
            self.current_operation = current_operation
        
        update_job_progress(
            self.job_id,
            self.processed_items,
            current_file=self.current_file,
            current_operation=self.current_operation
        )
