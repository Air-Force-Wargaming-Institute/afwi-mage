"""
Tests for the job management functionality in the Analysis Workbench Service.

These tests verify that:
1. Jobs can be created, updated, and retrieved correctly
2. Job status values are properly validated
3. Errors in job store operations are properly propagated
"""

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

# Import the application
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.jobs import (
    create_job_entry, update_job_in_store, load_jobs_from_store,
    save_jobs_to_store, get_job_store_path, JobStatus
)
from app import app

# Create test client
client = TestClient(app)

class TestJobStatus(unittest.TestCase):
    """Test job status enumeration and validation."""
    
    def test_job_status_values(self):
        """Test that all required job status values are defined in the enum."""
        # Check all the status values we expect to be defined
        expected_statuses = [
            "pending", "submitted", "running", "completed", 
            "completed_with_errors", "failed", "cancelled"
        ]
        
        for status in expected_statuses:
            self.assertIn(status, [e.value for e in JobStatus])
    
    def test_status_consistent_spelling(self):
        """Test that cancelled is spelled consistently with double 'l'."""
        self.assertEqual(JobStatus.CANCELLED.value, "cancelled")


class TestJobStore(unittest.TestCase):
    """Test job store operations."""
    
    def setUp(self):
        """Set up a temporary directory for test job store."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.orig_get_path = get_job_store_path
        
        # Mock get_job_store_path to use our temp directory
        def mock_get_path():
            return Path(self.temp_dir.name) / "jobs_store.json"
        
        # Apply the mock
        patch('api.jobs.get_job_store_path', mock_get_path).start()
    
    def tearDown(self):
        """Clean up temporary directory and mocks."""
        self.temp_dir.cleanup()
        patch.stopall()
    
    def test_save_load_jobs(self):
        """Test that saving and loading jobs works correctly."""
        # Create a simple job dictionary
        test_jobs = {
            "job1": {
                "id": "job1",
                "type": "test",
                "status": "running",
                "progress": 50.0,
                "created_at": "2023-01-01T00:00:00Z"
            }
        }
        
        # Save to the store
        save_jobs_to_store(test_jobs)
        
        # Load from the store
        loaded_jobs = load_jobs_from_store()
        
        # Verify the job was stored and loaded correctly
        self.assertIn("job1", loaded_jobs)
        self.assertEqual(loaded_jobs["job1"]["status"], "running")
        self.assertEqual(loaded_jobs["job1"]["progress"], 50.0)
    
    def test_error_propagation(self):
        """Test that errors during save are properly propagated."""
        # Create a job dict with an item that can't be serialized
        test_jobs = {
            "job1": {
                "id": "job1",
                "type": "test",
                "status": "running",
                "bad_field": object()  # This can't be serialized to JSON
            }
        }
        
        # Attempt to save and verify exception is raised
        with self.assertRaises(Exception):
            save_jobs_to_store(test_jobs)
    
    def test_create_update_job(self):
        """Test creating and updating a job."""
        # Create a job
        job = create_job_entry("test_job", "test_type", {"param1": "value1"})
        
        # Verify initial state
        self.assertEqual(job.id, "test_job")
        self.assertEqual(job.type, "test_type")
        self.assertEqual(job.status, "submitted")
        
        # Update the job
        updated_job = update_job_in_store("test_job", {
            "status": "running",
            "progress": 25.0,
            "message": "Job is running"
        })
        
        # Verify updated state
        self.assertEqual(updated_job.status, "running")
        self.assertEqual(updated_job.progress, 25.0)
        self.assertEqual(updated_job.message, "Job is running")
        
        # Update to completed
        final_job = update_job_in_store("test_job", {
            "status": "completed",
            "progress": 100.0,
            "message": "Job completed successfully",
            "result": {"output": "test result"}
        })
        
        # Verify final state
        self.assertEqual(final_job.status, "completed")
        self.assertEqual(final_job.progress, 100.0)
        self.assertEqual(final_job.message, "Job completed successfully")
        self.assertEqual(final_job.result.get("output"), "test result")
    
    def test_completed_with_errors_status(self):
        """Test the completed_with_errors status is handled correctly."""
        # Create a job
        job = create_job_entry("error_job", "test_type")
        
        # Update to completed_with_errors
        updated_job = update_job_in_store("error_job", {
            "status": "completed_with_errors",
            "progress": 100.0,
            "message": "Job completed with some errors"
        })
        
        # Verify status
        self.assertEqual(updated_job.status, "completed_with_errors")
        
        # Load from store to verify persistence
        jobs = load_jobs_from_store()
        self.assertEqual(jobs["error_job"]["status"], "completed_with_errors")


@pytest.mark.asyncio
async def test_job_api_endpoints():
    """Test the job API endpoints through the FastAPI TestClient."""
    # Create a test job through the API
    response = client.post("/api/workbench/jobs/create", json={
        "job_type": "api_test",
        "parameters": {"test_param": "test_value"}
    })
    assert response.status_code == 200
    job_data = response.json()
    job_id = job_data["id"]
    
    # Get job status
    response = client.get(f"/api/workbench/jobs/{job_id}")
    assert response.status_code == 200
    job_status = response.json()
    assert job_status["status"] == "submitted"
    
    # Update job to running
    response = client.put(f"/api/workbench/jobs/{job_id}", json={
        "status": "running",
        "progress": 50.0
    })
    assert response.status_code == 200
    
    # Get updated status
    response = client.get(f"/api/workbench/jobs/{job_id}")
    assert response.status_code == 200
    job_status = response.json()
    assert job_status["status"] == "running"
    assert job_status["progress"] == 50.0
    
    # Update to completed_with_errors
    response = client.put(f"/api/workbench/jobs/{job_id}", json={
        "status": "completed_with_errors",
        "progress": 100.0,
        "message": "Completed with some errors"
    })
    assert response.status_code == 200
    
    # Verify terminal status
    response = client.get(f"/api/workbench/jobs/{job_id}")
    assert response.status_code == 200
    job_status = response.json()
    assert job_status["status"] == "completed_with_errors"
    assert job_status["progress"] == 100.0 