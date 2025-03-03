"""
Tests for the job management module.

This module tests the core job management functionality.
"""

import os
import json
import uuid
import time
import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from ..core.job import (
    JobManager, JobStatus, JobError,
    register_job, update_job_progress, complete_job, fail_job,
    get_job_status, list_jobs, cancel_job, run_background_job,
    JobContext, initialize_job_manager
)


@pytest.fixture
def job_dir():
    """Create a temporary directory for job files."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Clean up
    shutil.rmtree(temp_dir)


@pytest.fixture
def job_manager(job_dir):
    """Create a JobManager instance."""
    return initialize_job_manager(job_dir)


def test_job_registration(job_manager):
    """Test job registration."""
    # Register a job
    job_id = register_job("test_operation", 10, {"test": "value"})
    
    # Verify job was registered
    assert job_id is not None
    assert isinstance(job_id, str)
    
    # Get job status
    job = get_job_status(job_id)
    assert job is not None
    assert job["status"] == JobStatus.PENDING
    assert job["operation_type"] == "test_operation"
    assert job["total_items"] == 10
    assert job["processed_items"] == 0
    assert job["details"]["test"] == "value"


def test_job_progress_update(job_manager):
    """Test job progress updates."""
    # Register a job
    job_id = register_job("test_operation", 10)
    
    # Update progress
    success = update_job_progress(
        job_id, 
        5, 
        JobStatus.PROCESSING, 
        "test.txt", 
        "Processing file"
    )
    assert success
    
    # Get updated job status
    job = get_job_status(job_id)
    assert job is not None
    assert job["status"] == JobStatus.PROCESSING
    assert job["processed_items"] == 5
    assert job["details"]["current_file"] == "test.txt"
    assert job["details"]["current_operation"] == "Processing file"
    assert job["details"]["progress_percentage"] == 50.0


def test_job_completion(job_manager):
    """Test job completion."""
    # Register a job
    job_id = register_job("test_operation", 10)
    
    # Complete the job
    result = {"result_key": "result_value"}
    success = complete_job(job_id, result)
    assert success
    
    # Get job status
    job = get_job_status(job_id)
    assert job is not None
    assert job["status"] == JobStatus.COMPLETED
    assert job["completed_at"] is not None
    assert job["result"] == result


def test_job_failure(job_manager):
    """Test job failure."""
    # Register a job
    job_id = register_job("test_operation", 10)
    
    # Fail the job
    error_message = "Test error message"
    success = fail_job(job_id, error_message)
    assert success
    
    # Get job status
    job = get_job_status(job_id)
    assert job is not None
    assert job["status"] == JobStatus.FAILED
    assert job["completed_at"] is not None
    assert job["error"] == error_message


def test_job_cancellation(job_manager):
    """Test job cancellation."""
    # Register a job
    job_id = register_job("test_operation", 10)
    
    # Update to processing
    update_job_progress(job_id, 0, JobStatus.PROCESSING)
    
    # Cancel the job
    success = cancel_job(job_id)
    assert success
    
    # Get job status
    job = get_job_status(job_id)
    assert job is not None
    assert job["status"] == JobStatus.CANCELLED
    assert job["completed_at"] is not None
    assert "cancelled" in job["error"].lower()


def test_list_jobs(job_manager):
    """Test listing jobs."""
    # Create some jobs
    job_ids = []
    for i in range(5):
        job_id = register_job(f"operation_{i % 2}", 10)
        job_ids.append(job_id)
        if i % 2 == 0:
            update_job_progress(job_id, 0, JobStatus.PROCESSING)
        elif i % 3 == 0:
            complete_job(job_id)
    
    # List all jobs
    jobs = list_jobs()
    assert len(jobs) >= 5
    
    # List with status filter
    processing_jobs = list_jobs(status=JobStatus.PROCESSING)
    assert all(job["status"] == JobStatus.PROCESSING for job in processing_jobs)
    
    # List with operation filter
    op_jobs = list_jobs(operation_type="operation_0")
    assert all(job["operation_type"] == "operation_0" for job in op_jobs)
    
    # Test pagination
    paginated_jobs = list_jobs(limit=2, offset=1)
    assert len(paginated_jobs) <= 2


def test_background_job_execution(job_manager):
    """Test background job execution."""
    # Define a test function
    def test_func(a, b, sleep_time=0.1):
        time.sleep(sleep_time)  # Simulate work
        return {"sum": a + b}
    
    # Register a job and run in background
    job_id = register_job("test_background", 1)
    run_background_job(job_id, test_func, 1, 2, sleep_time=0.1)
    
    # Check job is processing
    job = get_job_status(job_id)
    assert job["status"] in [JobStatus.PENDING, JobStatus.PROCESSING]
    
    # Wait for completion
    max_wait = 0.5  # seconds
    wait_time = 0
    wait_interval = 0.1
    completed = False
    
    while wait_time < max_wait:
        job = get_job_status(job_id)
        if job["status"] == JobStatus.COMPLETED:
            completed = True
            break
        time.sleep(wait_interval)
        wait_time += wait_interval
    
    assert completed
    assert job["result"] is not None
    assert job["result"]["sum"] == 3


def test_background_job_error(job_manager):
    """Test handling errors in background jobs."""
    # Define a function that raises an exception
    def error_func():
        raise ValueError("Test error")
    
    # Register a job and run in background
    job_id = register_job("test_error", 1)
    
    # This should not raise the error outside the background thread
    run_background_job(job_id, error_func)
    
    # Wait for failure
    max_wait = 0.5  # seconds
    wait_time = 0
    wait_interval = 0.1
    failed = False
    
    while wait_time < max_wait:
        job = get_job_status(job_id)
        if job["status"] == JobStatus.FAILED:
            failed = True
            break
        time.sleep(wait_interval)
        wait_time += wait_interval
    
    assert failed
    assert job["error"] is not None
    assert "ValueError: Test error" in job["error"]


def test_job_context_manager(job_manager):
    """Test the JobContext context manager."""
    # Register a job
    job_id = register_job("test_context", 10)
    
    # Use the context manager
    with JobContext(job_id, 10, "test_operation") as ctx:
        # Initially job should be processing
        job = get_job_status(job_id)
        assert job["status"] == JobStatus.PROCESSING
        
        # Update progress
        for i in range(1, 11):
            ctx.update_progress(
                i, 
                f"file_{i}.txt", 
                f"Processing item {i}"
            )
    
    # After context exit, job should be completed
    job = get_job_status(job_id)
    assert job["status"] == JobStatus.COMPLETED
    assert job["processed_items"] == 10


def test_job_context_manager_error(job_manager):
    """Test the JobContext context manager with an error."""
    # Register a job
    job_id = register_job("test_context_error", 10)
    
    # Use the context manager with an error
    try:
        with JobContext(job_id, 10, "test_operation") as ctx:
            ctx.update_progress(5)
            raise ValueError("Test error")
    except ValueError:
        pass
    
    # After context exit with error, job should be failed
    job = get_job_status(job_id)
    assert job["status"] == JobStatus.FAILED
    assert "ValueError: Test error" in job["error"] 