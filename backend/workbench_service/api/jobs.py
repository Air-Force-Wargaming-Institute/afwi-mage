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

from config import WORKBENCH_DIR, WORKBENCH_SPREADSHEETS_DIR, get_config

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
    """Model for job result data"""
    output_file_path: Optional[str] = None
    spreadsheet_id: Optional[str] = None
    message: Optional[str] = None

class JobUpdate(BaseModel):
    """Model for job update data"""
    status: Optional[str] = None
    progress: Optional[float] = None
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class JobDetails(BaseModel):
    """Model for job details"""
    id: str
    type: str
    status: str
    progress: float = 0.0
    message: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    parameters: Dict[str, Any] = {}
    result: Optional[Dict[str, Any]] = None

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

def update_job_in_store(job_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a job in the jobs store
    
    Args:
        job_id: ID of the job to update
        updates: Dictionary of fields to update
        
    Returns:
        Updated job details
    """
    # Validate updates before applying
    if "result" in updates and updates["result"] is not None:
        # Ensure result is a dictionary
        if not isinstance(updates["result"], dict):
            logger.warning(f"Invalid result format for job {job_id}: {updates['result']}")
            updates["result"] = {"message": str(updates["result"])}
            
        # Ensure spreadsheet_id is a string if provided
        if "spreadsheet_id" in updates["result"] and updates["result"]["spreadsheet_id"] is not None:
            updates["result"]["spreadsheet_id"] = str(updates["result"]["spreadsheet_id"])

    # Sanitize progress value if present
    if "progress" in updates:
        try:
            updates["progress"] = float(updates["progress"])
            # Ensure progress is between 0 and 100
            updates["progress"] = max(0.0, min(100.0, updates["progress"]))
        except (ValueError, TypeError):
            logger.warning(f"Invalid progress value for job {job_id}: {updates['progress']}")
            updates["progress"] = 0.0

    # Ensure status is a valid string if present
    valid_statuses = ["submitted", "running", "completed", "failed", "cancelled", "completed_with_errors"]
    if "status" in updates and updates["status"] not in valid_statuses:
        logger.warning(f"Invalid status for job {job_id}: {updates['status']}")
        updates["status"] = "failed"  # Default to failed if status is invalid
            
    # Get current jobs
    jobs = load_jobs_from_store()
    
    if job_id not in jobs:
        logger.warning(f"Attempted to update non-existent job: ID={job_id}")
        return None

    # Load the existing job data into a Pydantic model to easily update
    try:
        # Ensure 'id' is present before creating the model
        if 'id' not in jobs[job_id]:
            jobs[job_id]['id'] = job_id
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
         elif updated_fields["status"] in ["completed", "failed", "cancelled", "completed_with_errors"] and not existing_job.completed_at: # Added completed_with_errors
             updated_fields["completed_at"] = current_time

    # Ensure 'result' is treated as a dict if updating it
    if 'result' in updated_fields and isinstance(updated_fields['result'], dict):
        # Merge with existing result if present
        existing_result_dict = existing_job.result.model_dump() if existing_job.result else {}
        updated_fields['result'] = {**existing_result_dict, **updated_fields['result']}
    elif 'result' in updated_fields:
         logger.warning(f"Ignoring non-dict update for 'result' field in job {job_id}")
         del updated_fields['result']

    # Use model_copy for safe updates
    try:
        updated_job = existing_job.model_copy(update=updated_fields)
    except Exception as update_error:
        logger.error(f"Error updating job model for ID {job_id}: {update_error}", exc_info=True)
        logger.error(f"Existing Job Data: {jobs[job_id]}")
        logger.error(f"Updates attempted: {updates}")
        logger.error(f"Updated Fields processed: {updated_fields}")
        # Attempt to save with minimal valid fields if update fails
        minimal_updates = {k: v for k, v in updated_fields.items() if k in Job.model_fields}
        if 'status' not in minimal_updates: minimal_updates['status'] = 'failed' # Mark as failed if update logic broke
        if 'message' not in minimal_updates: minimal_updates['message'] = f"Internal error during update: {update_error}"
        if 'completed_at' not in minimal_updates: minimal_updates['completed_at'] = datetime.utcnow()
        try:
            updated_job = existing_job.model_copy(update=minimal_updates)
            logger.warning(f"Job {job_id} update failed, saving with minimal fields.")
        except Exception as final_error:
             logger.critical(f"CRITICAL: Could not even apply minimal updates to job {job_id}: {final_error}")
             # Cannot update, just return None
             return None

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
             
    # Sort by creation date descending (handle potential None values)
    all_jobs.sort(key=lambda j: j.created_at or datetime.min, reverse=True)

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
        # Ensure 'id' is present
        if 'id' not in job_data:
            job_data['id'] = job_id
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

# This endpoint is likely deprecated if results are part of the main job status
# @router.get("/{job_id}/result")
# async def get_job_result(job_id: str):
#     """
#     Get result of a completed job. (Likely Deprecated)
#     """
#     logger.warning(f"Deprecated endpoint /result called for job ID: {job_id}. Use GET /{job_id} instead.")
#     job_details = await get_job(job_id) # Reuse the main get_job endpoint
#     if job_details.status not in ["completed", "completed_with_errors"]:
#         raise HTTPException(status_code=400, detail=f"Job {job_id} is not yet completed (status: {job_details.status})")
#     return job_details.result or {"message": "No result data available."} 