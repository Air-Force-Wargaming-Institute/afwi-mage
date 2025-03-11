"""
API endpoints for managing background jobs in the embedding service.

This module provides API endpoints for:
- Getting job status
- Listing jobs with filtering
- Cancelling jobs
- Getting job statistics
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

# Import from the core module
try:
    from ..core.job import (
        get_job_status as core_get_job_status,
        list_jobs as core_list_jobs,
        cancel_job as core_cancel_job,
        JobStatus
    )
except ImportError:
    from core.job import (
        get_job_status as core_get_job_status,
        list_jobs as core_list_jobs,
        cancel_job as core_cancel_job,
        JobStatus
    )

# Set up router
router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobStatusResponse(BaseModel):
    """Response containing job status information."""
    job_id: str
    status: str
    operation_type: str
    total_items: int
    processed_items: int
    progress_percentage: float
    started_at: str
    updated_at: str
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    model_config = {
        "extra": "ignore",
        "json_schema_extra": {
            "example": {
                "job_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "processing",
                "operation_type": "vectorstore_creation",
                "total_items": 100,
                "processed_items": 45,
                "progress_percentage": 45.0,
                "started_at": "2025-01-01T12:00:00Z",
                "updated_at": "2025-01-01T12:05:00Z"
            }
        }
    }


class JobActionResponse(BaseModel):
    """Response from a job action (cancel, pause, resume)."""
    success: bool
    message: str
    
    model_config = {
        "extra": "ignore"
    }


class JobListQuery(BaseModel):
    """Query parameters for job listing."""
    status: Optional[str] = None
    operation_type: Optional[str] = None
    limit: int = 10
    offset: int = 0
    
    model_config = {
        "extra": "ignore"
    }


class JobListResponse(BaseModel):
    """Response containing a list of jobs."""
    jobs: List[JobStatusResponse]
    total: int
    limit: int
    offset: int
    
    model_config = {
        "extra": "ignore"
    }


class JobStatsResponse(BaseModel):
    """Response containing job statistics."""
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    cancelled: int
    
    model_config = {
        "extra": "ignore"
    }


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """
    Get the status of a job.
    
    Args:
        job_id: ID of the job
        
    Returns:
        Job status information
    """
    try:
        job_status = core_get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        # Calculate progress percentage if not already set
        if "progress_percentage" not in job_status and job_status.get("total_items", 0) > 0:
            job_status["progress_percentage"] = (
                job_status.get("processed_items", 0) / job_status["total_items"]
            ) * 100
        elif "progress_percentage" not in job_status:
            # Default to 0
            job_status["progress_percentage"] = 0
            
        # Convert status to string if it's an enum or similar
        if not isinstance(job_status.get("status"), str):
            job_status["status"] = str(job_status["status"])
            
        # Ensure none of the required fields are missing
        for field in ["job_id", "status", "operation_type", "total_items", 
                     "processed_items", "started_at", "updated_at"]:
            if field not in job_status:
                if field in ["total_items", "processed_items"]:
                    job_status[field] = 0
                else:
                    job_status[field] = "unknown"
        
        return job_status
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting job status: {str(e)}")


# Add an alias endpoint at /status/{job_id} for compatibility with the frontend
@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status_alias(job_id: str):
    """
    Alias for get_job_status to maintain compatibility with frontend.
    
    Args:
        job_id: ID of the job
        
    Returns:
        Job status information
    """
    return await get_job_status(job_id)


# Add an endpoint to match the exact path the frontend is expecting
@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_status_endpoint(job_id: str):
    """
    Get job status by ID at the path the frontend expects.
    
    Args:
        job_id: ID of the job
        
    Returns:
        Job status information
    """
    return await get_job_status(job_id)


@router.get("", response_model=JobListResponse)
async def list_all_jobs(
    status: Optional[str] = None,
    operation_type: Optional[str] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    List all jobs with optional filtering.
    
    Args:
        status: Optional job status to filter by
        operation_type: Optional operation type to filter by
        limit: Maximum number of jobs to return (default: 10, max: 100)
        offset: Number of jobs to skip for pagination
        
    Returns:
        List of job status information
    """
    # Get jobs from core module
    jobs = core_list_jobs(
        status=status,
        operation_type=operation_type,
        limit=limit + 1,  # Get one extra to check if there are more
        offset=offset
    )
    
    # Check if there are more jobs than the limit
    has_more = len(jobs) > limit
    if has_more:
        jobs = jobs[:limit]
    
    # Format jobs as JobStatusResponse objects
    job_responses = []
    for job in jobs:
        # Calculate progress percentage
        progress_percentage = 0
        if job.get("total_items", 0) > 0:
            progress_percentage = (job.get("processed_items", 0) / job.get("total_items", 0)) * 100
        
        job_responses.append(JobStatusResponse(
            job_id=job.get("job_id"),
            status=job.get("status"),
            operation_type=job.get("operation_type"),
            total_items=job.get("total_items", 0),
            processed_items=job.get("processed_items", 0),
            progress_percentage=round(progress_percentage, 2),
            started_at=job.get("started_at"),
            updated_at=job.get("updated_at", job.get("started_at")),
            completed_at=job.get("completed_at"),
            result=job.get("result"),
            error=job.get("error"),
            details=job.get("details", {})
        ))
    
    # Get total count
    # This is a simple approach. For a large number of jobs, we might want to 
    # implement a more efficient counting mechanism
    total = offset + len(job_responses)
    if has_more:
        total += 1  # There's at least one more
    
    return JobListResponse(
        jobs=job_responses,
        total=total,
        limit=limit,
        offset=offset
    )


@router.delete("/{job_id}", response_model=JobActionResponse)
async def cancel_job(job_id: str):
    """
    Cancel a running job.
    
    Args:
        job_id: The ID of the job to cancel
        
    Returns:
        Result of the cancel operation
    """
    job = core_get_job_status(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if job.get("status") in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        return JobActionResponse(
            success=False,
            message=f"Cannot cancel job that is already in '{job.get('status')}' state"
        )
    
    # Cancel the job
    success = core_cancel_job(job_id)
    
    if success:
        return JobActionResponse(
            success=True,
            message=f"Job {job_id} has been cancelled"
        )
    else:
        return JobActionResponse(
            success=False,
            message=f"Failed to cancel job {job_id}"
        )


@router.get("/stats", response_model=JobStatsResponse)
async def get_job_stats():
    """
    Get job statistics.
    
    Returns:
        Job statistics
    """
    # Get all jobs
    all_jobs = core_list_jobs(limit=1000)  # Get a large number to calculate stats
    
    # Count jobs by status
    total = len(all_jobs)
    pending = sum(1 for job in all_jobs if job.get("status") == JobStatus.PENDING)
    processing = sum(1 for job in all_jobs if job.get("status") == JobStatus.PROCESSING)
    completed = sum(1 for job in all_jobs if job.get("status") == JobStatus.COMPLETED)
    failed = sum(1 for job in all_jobs if job.get("status") == JobStatus.FAILED)
    cancelled = sum(1 for job in all_jobs if job.get("status") == JobStatus.CANCELLED)
    
    return JobStatsResponse(
        total=total,
        pending=pending,
        processing=processing,
        completed=completed,
        failed=failed,
        cancelled=cancelled
    )
