"""
Tests for the job API endpoints.

This module tests the job API endpoints using FastAPI's TestClient.
"""

import os
import json
import pytest
import tempfile
import shutil
import time
from pathlib import Path
from fastapi.testclient import TestClient

from ..core.job import (
    initialize_job_manager, register_job, update_job_progress,
    complete_job, JobStatus
)

# To avoid import errors, create a simple FastAPI app with the job router
from fastapi import FastAPI
from ..api.jobs import router as job_router


@pytest.fixture
def job_dir():
    """Create a temporary directory for job files."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Clean up
    shutil.rmtree(temp_dir)


@pytest.fixture
def app(job_dir):
    """Create a FastAPI app with the job router."""
    # Initialize the job manager
    initialize_job_manager(job_dir)
    
    # Create a FastAPI app
    app = FastAPI()
    app.include_router(job_router)
    
    return app


@pytest.fixture
def client(app):
    """Create a TestClient for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_jobs(job_dir):
    """Create sample jobs for testing."""
    job_ids = []
    
    # Create jobs with different statuses
    for i in range(5):
        job_id = register_job(f"test_operation_{i % 3}", 10, {"test": f"value_{i}"})
        job_ids.append(job_id)
        
        # Set different statuses
        if i % 3 == 0:
            update_job_progress(job_id, 5, JobStatus.PROCESSING)
        elif i % 3 == 1:
            complete_job(job_id, {"result": f"Completed job {i}"})
        elif i % 3 == 2:
            update_job_progress(job_id, 0, JobStatus.PROCESSING)
    
    return job_ids


def test_get_job_status(client, sample_jobs):
    """Test getting job status."""
    job_id = sample_jobs[0]
    
    # Get job status
    response = client.get(f"/jobs/{job_id}")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == job_id
    assert data["status"] == JobStatus.PROCESSING
    assert data["processed_items"] == 5
    assert data["progress_percentage"] == 50.0


def test_get_nonexistent_job(client):
    """Test getting a nonexistent job."""
    # Get job status for a nonexistent job
    response = client.get("/jobs/nonexistent-job-id")
    
    # Verify response
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_list_jobs(client, sample_jobs):
    """Test listing jobs."""
    # List all jobs
    response = client.get("/jobs")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert "jobs" in data
    assert len(data["jobs"]) > 0
    assert data["total"] >= len(data["jobs"])
    
    # Check job data format
    job = data["jobs"][0]
    assert "job_id" in job
    assert "status" in job
    assert "operation_type" in job
    assert "progress_percentage" in job


def test_filtered_jobs(client, sample_jobs):
    """Test filtering jobs."""
    # Filter by status
    response = client.get("/jobs?status=processing")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert all(job["status"] == JobStatus.PROCESSING for job in data["jobs"])
    
    # Filter by operation type
    response = client.get("/jobs?operation_type=test_operation_0")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    if data["jobs"]:  # Only verify if there are jobs that match the filter
        assert all(job["operation_type"] == "test_operation_0" for job in data["jobs"])


def test_job_pagination(client, sample_jobs):
    """Test job pagination."""
    # Get first page (limit 2)
    response = client.get("/jobs?limit=2&offset=0")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert len(data["jobs"]) <= 2
    
    # Get second page
    response = client.get("/jobs?limit=2&offset=2")
    
    # Verify response
    assert response.status_code == 200
    data2 = response.json()
    
    # Make sure we're getting different jobs
    if data["jobs"] and data2["jobs"]:
        assert data["jobs"][0]["job_id"] != data2["jobs"][0]["job_id"]


def test_cancel_job(client, sample_jobs):
    """Test cancelling a job."""
    # Get a job in PROCESSING state
    job_id = None
    for id in sample_jobs:
        response = client.get(f"/jobs/{id}")
        if response.json()["status"] == JobStatus.PROCESSING:
            job_id = id
            break
    
    if not job_id:
        # Create a processing job if none available
        job_id = register_job("test_cancel", 10)
        update_job_progress(job_id, 0, JobStatus.PROCESSING)
    
    # Cancel the job
    response = client.delete(f"/jobs/{job_id}")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Check job status after cancellation
    response = client.get(f"/jobs/{job_id}")
    assert response.status_code == 200
    job_data = response.json()
    assert job_data["status"] == JobStatus.CANCELLED


def test_cannot_cancel_completed_job(client, sample_jobs):
    """Test that a completed job cannot be cancelled."""
    # Find a completed job
    job_id = None
    for id in sample_jobs:
        response = client.get(f"/jobs/{id}")
        if response.json()["status"] == JobStatus.COMPLETED:
            job_id = id
            break
    
    if not job_id:
        # Create a completed job if none available
        job_id = register_job("test_completed", 10)
        complete_job(job_id)
    
    # Attempt to cancel the job
    response = client.delete(f"/jobs/{job_id}")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "cannot cancel" in data["message"].lower()


def test_job_stats(client, sample_jobs):
    """Test getting job statistics."""
    # Get job stats
    response = client.get("/jobs/stats")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "pending" in data
    assert "processing" in data
    assert "completed" in data
    assert "failed" in data
    assert "cancelled" in data
    
    # Total should be at least the number of sample jobs
    assert data["total"] >= len(sample_jobs) 