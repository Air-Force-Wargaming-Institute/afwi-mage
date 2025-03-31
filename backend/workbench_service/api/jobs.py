"""
Background jobs API endpoints for the Analysis Workbench Service.

This module provides endpoints for:
- Tracking job status
- Canceling jobs
- Retrieving job results
"""

import os
import json
import logging
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from enum import Enum

from config import WORKBENCH_DIR, get_config

logger = logging.getLogger("workbench_service")

router = APIRouter()

class JobStatus(str, Enum):
    """Status of a background job."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"

class JobInfo(BaseModel):
    """Information about a background job."""
    id: str
    status: JobStatus
    operation: str
    progress: float
    created_at: str
    completed_at: Optional[str] = None
    result_url: Optional[str] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "job456",
                "status": "running",
                "operation": "generate_chart",
                "progress": 0.65,
                "created_at": "2023-08-01T12:00:00Z",
                "completed_at": None,
                "result_url": None
            }
        }
    }

class JobParameters(BaseModel):
    """Parameters used to initiate the job."""
    spreadsheet_id: Optional[str] = None
    sheet_name: Optional[str] = None
    # Add other relevant parameters for different job types if needed
    # e.g., transformation_details: Optional[Dict[str, Any]] = None

class JobResult(BaseModel):
    """Result of a completed job."""
    output_file_path: Optional[str] = None
    message: Optional[str] = None
    # Add other result fields as necessary

class Job(BaseModel):
    """Represents a background job."""
    id: str = Field(..., description="Unique job identifier")
    type: str = Field(..., description="Type of job (e.g., 'column_transformation')")
    status: str = Field(..., description="Current status: 'submitted', 'running', 'completed', 'failed', 'cancelled'")
    progress: float = Field(0.0, description="Job progress percentage (0.0 to 100.0)")
    message: Optional[str] = Field(None, description="Current status message or error details")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when the job was created")
    started_at: Optional[datetime] = Field(None, description="Timestamp when the job started processing")
    completed_at: Optional[datetime] = Field(None, description="Timestamp when the job finished (completed, failed, or cancelled)")
    parameters: Optional[JobParameters] = Field(None, description="Parameters used for the job")
    result: Optional[JobResult] = Field(None, description="Result of the completed job")
    
    class Config:
        # Allow datetime serialization
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        # Handle potential NaT values from pandas during loading if needed
        # This might require custom parsing logic if loading directly into Pydantic
        # For now, we assume clean data in the store

# --- Persistence Layer (Simple File Store) ---

# Use a lock for thread safety when accessing the JSON file
_job_store_lock = threading.Lock()

def get_job_store_path() -> Path:
    """Gets the path to the job store JSON file."""
    config = get_config()
    # Ensure WORKBENCH_DIR is a Path object if it comes from config dict
    workbench_dir = Path(config.get('WORKBENCH_DIR', WORKBENCH_DIR)) 
    return workbench_dir / "jobs_store.json"

def load_jobs_from_store() -> Dict[str, Dict]:
    """Loads the job data from the JSON file store."""
    job_store_path = get_job_store_path()
    with _job_store_lock:
        if not job_store_path.exists():
            logger.info(f"Job store file not found at {job_store_path}, creating empty store.")
            # Create parent directory if it doesn't exist
            job_store_path.parent.mkdir(parents=True, exist_ok=True)
            with open(job_store_path, 'w') as f:
                json.dump({}, f)
            return {}
        try:
            with open(job_store_path, 'r') as f:
                # Read content first to check if empty
                content = f.read()
                if not content.strip():
                    logger.warning(f"Job store file {job_store_path} is empty. Returning empty dictionary.")
                    return {}
                # If not empty, rewind and load JSON
                f.seek(0) 
                jobs_data = json.load(f)
                # Basic validation: Ensure it's a dictionary
                if not isinstance(jobs_data, dict):
                     logger.error(f"Job store file {job_store_path} does not contain a valid JSON object (dictionary). Returning empty dictionary.")
                     return {}
                return jobs_data
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from job store {job_store_path}: {e}", exc_info=True)
            # Optionally: backup the corrupted file and create a new empty one
            # For now, just return empty to prevent crashing
            return {}
        except Exception as e:
            logger.error(f"Error loading jobs from store {job_store_path}: {e}", exc_info=True)
            return {} # Return empty dict on other errors

def save_jobs_to_store(jobs_data: Dict[str, Dict]):
    """Saves the job data to the JSON file store."""
    job_store_path = get_job_store_path()
    with _job_store_lock:
        try:
             # Ensure parent directory exists
            job_store_path.parent.mkdir(parents=True, exist_ok=True)
            with open(job_store_path, 'w') as f:
                # Use Pydantic's json method for proper serialization, including datetimes
                # We need to convert our dictionary of Job models back to serializable dicts
                serializable_data = {
                    job_id: Job(**job_dict).model_dump(mode='json') 
                    for job_id, job_dict in jobs_data.items()
                }
                json.dump(serializable_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving jobs to store {job_store_path}: {e}", exc_info=True)
            # Potentially raise an exception here or handle the error appropriately

# --- Helper Functions for Job Management ---

def create_job_entry(job_id: str, job_type: str, parameters: Optional[Dict] = None) -> Job:
    """Creates a new job entry and saves it to the store."""
    jobs = load_jobs_from_store()
    if job_id in jobs:
        raise ValueError(f"Job with ID {job_id} already exists.")

    job_params = JobParameters(**parameters) if parameters else None
    
    new_job = Job(
        id=job_id,
        type=job_type,
        status="submitted",
        parameters=job_params,
        created_at=datetime.utcnow() # Ensure creation time is set now
    )
    
    # Store the dictionary representation
    jobs[job_id] = new_job.model_dump() 
    save_jobs_to_store(jobs)
    logger.info(f"Created new job entry: ID={job_id}, Type={job_type}")
    return new_job # Return the Pydantic model instance

def update_job_in_store(job_id: str, updates: Dict[str, Any]) -> Optional[Job]:
    """Updates an existing job in the store."""
    jobs = load_jobs_from_store()
    if job_id not in jobs:
        logger.warning(f"Attempted to update non-existent job: ID={job_id}")
        return None

    # Load the existing job data into a Pydantic model to easily update
    try:
        existing_job = Job(**jobs[job_id])
    except Exception as e:
         logger.error(f"Error parsing job data for ID {job_id} from store: {e}", exc_info=True)
         return None # Or handle error differently

    # Update fields, ensuring datetimes are handled correctly if present in updates
    current_time = datetime.utcnow()
    updated_fields = updates.copy()

    if "status" in updated_fields:
         if updated_fields["status"] == "running" and not existing_job.started_at:
             updated_fields["started_at"] = current_time
         elif updated_fields["status"] in ["completed", "failed", "cancelled"] and not existing_job.completed_at:
             updated_fields["completed_at"] = current_time
    
    # Use model_copy for safe updates
    updated_job = existing_job.model_copy(update=updated_fields)

    # Store the updated dictionary representation
    jobs[job_id] = updated_job.model_dump()
    save_jobs_to_store(jobs)
    logger.debug(f"Updated job entry: ID={job_id}, Updates={updates}")
    return updated_job # Return the updated Pydantic model instance

# --- API Endpoints ---

@router.get("/list", response_model=List[Job])
async def list_jobs(
    status: Optional[str] = Query(None, description="Filter jobs by status"),
    job_type: Optional[str] = Query(None, description="Filter jobs by type"),
    limit: int = Query(100, description="Maximum number of jobs to return"),
    offset: int = Query(0, description="Offset for pagination")
):
    """
    List background jobs, with optional filtering and pagination.
    Returns jobs sorted by creation date descending.
    """
    logger.info(f"Listing jobs with filters: status={status}, type={job_type}, limit={limit}, offset={offset}")
    jobs_dict = load_jobs_from_store()
    
    # Convert dict values to Job models for easier filtering and sorting
    all_jobs: List[Job] = []
    for job_id, job_data in jobs_dict.items():
         try:
             # Add 'id' back if it's not stored explicitly in the dict value (it should be)
             if 'id' not in job_data:
                 job_data['id'] = job_id
             all_jobs.append(Job(**job_data))
         except Exception as e:
             logger.warning(f"Skipping job ID {job_id} due to parsing error: {e}")
             continue # Skip jobs that fail validation
             
    # Sort by creation date descending
    all_jobs.sort(key=lambda j: j.created_at, reverse=True)

    # Apply filters
    filtered_jobs = all_jobs
    if status:
        filtered_jobs = [job for job in filtered_jobs if job.status == status]
    if job_type:
        filtered_jobs = [job for job in filtered_jobs if job.type == job_type]
        
    # Apply pagination
    paginated_jobs = filtered_jobs[offset : offset + limit]
    
    logger.info(f"Returning {len(paginated_jobs)} jobs out of {len(all_jobs)} total ({len(filtered_jobs)} filtered).")
    return paginated_jobs

@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """
    Get the status and details of a specific job.
    """
    logger.info(f"Fetching job details for ID: {job_id}")
    jobs = load_jobs_from_store()
    job_data = jobs.get(job_id)

    if not job_data:
        logger.warning(f"Job not found: ID={job_id}")
        raise HTTPException(status_code=404, detail="Job not found")
        
    try:
        # Ensure 'id' field is present for Pydantic validation
        if 'id' not in job_data:
            job_data['id'] = job_id
        return Job(**job_data)
    except Exception as e:
        logger.error(f"Error parsing job data for ID {job_id} from store: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving job details")

@router.post("/{job_id}/cancel", response_model=Job)
async def cancel_job(job_id: str):
    """
    Request cancellation of a running job.

    Note: This currently only updates the status in the store.
    Actual cancellation logic needs to be implemented in the job runner
    (e.g., checking a flag periodically).
    """
    logger.info(f"Received cancel request for job ID: {job_id}")
    jobs = load_jobs_from_store()
    job_data = jobs.get(job_id)

    if not job_data:
        logger.warning(f"Job to cancel not found: ID={job_id}")
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        job = Job(**job_data)
    except Exception as e:
        logger.error(f"Error parsing job data for ID {job_id} before cancellation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving job details for cancellation")

    if job.status not in ["submitted", "running"]:
        logger.warning(f"Attempted to cancel job {job_id} which is already in terminal state: {job.status}")
        # Return current job state as cancellation is not applicable
        return job 

    # Update the job status to 'cancelled'
    updated_job = update_job_in_store(job_id, {
        "status": "cancelled",
        "message": "Job cancelled by user request.",
        "completed_at": datetime.utcnow() # Mark completion time
    })

    if not updated_job:
         # This shouldn't happen if we found the job initially, but handle defensively
         logger.error(f"Failed to update job {job_id} to cancelled status in store.")
         raise HTTPException(status_code=500, detail="Failed to update job status")

    logger.info(f"Marked job {job_id} as cancelled in store.")
    # TODO: Implement actual signal/mechanism to stop the running background task if possible.
    
    return updated_job

@router.get("/{job_id}/result")
async def get_job_result(job_id: str):
    """
    Get result of a completed job.
    
    Args:
        job_id: ID of the job
        
    Returns:
        Job result
    """
    logger.info(f"Get job result endpoint called for ID: {job_id}")
    
    # Placeholder implementation - simulate a successfully completed job
    return {
        "job_id": job_id,
        "status": JobStatus.COMPLETED,
        "result": {
            "data": "Sample result data for the completed job",
            "metadata": {
                "processing_time": 5.3,
                "output_type": "text"
            }
        }
    } 