#!/usr/bin/env python3
"""
Test script for job status tracking in the embedding service.
"""

import os
import sys
import json
import time
import uuid
import logging
import requests
import shutil
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("job_status_test")

# Set up API base URL - adjust this to match your embedding service URL
# Default to localhost:8006 which is the correct port for the embedding service in Docker
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8006")
logger.info(f"Using API base URL: {API_BASE_URL}")

# Define the path to the upload directory
# We need to use a directory that is actually mapped into the container
# The most reliable path is the full project path with 'data/uploads'
CURRENT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = CURRENT_DIR.parent.parent  # Go up two levels to project root
UPLOAD_DIR = str(PROJECT_ROOT / "data" / "uploads")
TEST_FILES_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "test_files")
logger.info(f"Using upload directory: {UPLOAD_DIR}")

# Check if the upload directory exists in the expected Docker location
def check_docker_upload_path():
    """Check if the upload directory exists in Docker."""
    try:
        # Get the name of the embedding service container
        embedding_container = subprocess.run(
            ["docker", "ps", "--filter", "name=embedding", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        container_name = embedding_container.stdout.strip()
        if not container_name:
            logger.warning("Could not find embedding service container")
            return
        
        # Check if the /app/data/uploads path exists in the container
        docker_exec = subprocess.run(
            ["docker", "exec", container_name, "ls", "-la", "/app/data/uploads"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if docker_exec.returncode == 0:
            logger.info(f"Docker container upload directory exists: {docker_exec.stdout}")
        else:
            logger.warning(f"Docker container upload directory check failed: {docker_exec.stderr}")
    
    except Exception as e:
        logger.warning(f"Error checking Docker upload path: {str(e)}")

def check_docker_status():
    """Check if Docker is running and if the embedding service container is up."""
    try:
        # Check if Docker is running
        docker_ps = subprocess.run(
            ["docker", "ps"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        
        if docker_ps.returncode != 0:
            logger.error(f"Docker doesn't appear to be running: {docker_ps.stderr}")
            return False
        
        # Check if embedding service container is running
        embedding_container = subprocess.run(
            ["docker", "ps", "--filter", "name=embedding", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if "embedding" not in embedding_container.stdout:
            logger.error("Embedding service container doesn't appear to be running")
            logger.info("Running containers:")
            logger.info(docker_ps.stdout)
            return False
        
        logger.info("Docker is running and embedding service container appears to be up")
        
        # Check the Docker upload path
        check_docker_upload_path()
        
        return True
    except Exception as e:
        logger.error(f"Error checking Docker status: {str(e)}")
        return False

def ensure_upload_dir_exists():
    """Ensure the upload directory exists. Create it if it doesn't."""
    upload_path = Path(UPLOAD_DIR)
    if not upload_path.exists():
        logger.info(f"Creating upload directory: {UPLOAD_DIR}")
        upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path

def create_test_files(prefix="test", num_files=3, content_size=1000):
    """Create test text files and copy them to the upload directory."""
    # Create test files directory if it doesn't exist
    test_files_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "test_files")
    if not os.path.exists(test_files_dir):
        os.makedirs(test_files_dir)
        logger.info(f"Created test files directory: {test_files_dir}")
    
    # Create upload directory if it doesn't exist
    upload_dir = Path(UPLOAD_DIR)
    if not upload_dir.exists():
        upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created upload directory: {upload_dir}")
    
    file_paths = []
    
    for i in range(num_files):
        # Generate random content
        content = f"This is a test file {i+1} for prefix {prefix}.\n\n"
        content += f"Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * (content_size // 10)
        
        # Create file in test directory
        test_file_path = os.path.join(test_files_dir, f"{prefix}_file_{i+1}.txt")
        with open(test_file_path, "w") as f:
            f.write(content)
        
        # Copy to upload directory
        upload_file_path = os.path.join(UPLOAD_DIR, f"{prefix}_file_{i+1}.txt")
        shutil.copy2(test_file_path, upload_file_path)
        
        file_paths.append(upload_file_path)
        logger.info(f"Created test file and copied to upload directory: {upload_file_path}")
    
    return file_paths

def cleanup_test_files(prefix="test"):
    """Clean up test files."""
    # Clean up files in test directory
    if os.path.exists(TEST_FILES_DIR):
        test_files = [f for f in os.listdir(TEST_FILES_DIR) if f.startswith(f"{prefix}_")]
        for file in test_files:
            try:
                os.remove(os.path.join(TEST_FILES_DIR, file))
            except Exception as e:
                logger.warning(f"Error deleting test file {file}: {str(e)}")
    
    # Clean up files in upload directory
    if os.path.exists(UPLOAD_DIR):
        upload_files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(f"{prefix}_")]
        for file in upload_files:
            try:
                os.remove(os.path.join(UPLOAD_DIR, file))
            except Exception as e:
                logger.warning(f"Error deleting upload file {file}: {str(e)}")
    
    logger.info(f"Cleaned up test files with prefix '{prefix}'")

def create_vector_store(vectorstore_name, file_paths):
    """Create a vector store from the given files."""
    url = f"{API_BASE_URL}/api/embedding/vectorstores"
    
    # Convert absolute file paths to just filenames for the API
    # The API expects files that are already in the upload directory
    relative_file_paths = [os.path.basename(path) for path in file_paths]
    
    # Prepare the request payload
    data = {
        "name": vectorstore_name,
        "description": "Test vectorstore for debugging",
        "files": relative_file_paths,
        "embedding_model": "nomic-embed-text",
        "use_paragraph_chunking": True,
        "max_paragraph_length": 2000,
        "min_paragraph_length": 100,
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "batch_processing": True,
        "file_batch_size": 3,
        "doc_batch_size": 100
    }
    
    # Log the request payload
    print(f"Creating vector store with {len(relative_file_paths)} files.")
    print(f"Request payload: {json.dumps(data, indent=2)}")
    
    # Make the request
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        result = response.json()
        job_id = result.get("job_id")
        if job_id:
            print(f"Vector store creation job started with job ID: {job_id}")
            return job_id
        else:
            print(f"Failed to get job ID from response: {result}")
            return None
    else:
        print(f"Failed to create vector store: {response.status_code}, {response.text}")
        return None

def update_vector_store(vectorstore_id, file_paths):
    """Update an existing vector store with additional files."""
    url = f"{API_BASE_URL}/api/embedding/vectorstores/{vectorstore_id}/update"
    
    # Convert absolute file paths to just filenames for the API
    relative_file_paths = [os.path.basename(path) for path in file_paths]
    
    # Prepare the request payload
    data = {
        "files": relative_file_paths,
        "batch_processing": True,
        "file_batch_size": 3,
        "doc_batch_size": 100
    }
    
    # Log the request payload
    print(f"Updating vector store with {len(relative_file_paths)} files.")
    print(f"Request payload: {json.dumps(data, indent=2)}")
    
    # Make the request
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        result = response.json()
        job_id = result.get("job_id")
        if job_id:
            print(f"Vector store update job started with job ID: {job_id}")
            return job_id
        else:
            print(f"Failed to get job ID from update response: {result}")
            return None
    else:
        print(f"Failed to update vector store: {response.status_code}, {response.text}")
        return None

def get_job_status(job_id):
    """Get the status of a job by its ID."""
    url = f"{API_BASE_URL}/api/embedding/status/{job_id}"  # Correct endpoint from API code
    
    try:
        print(f"Checking status for job: {job_id}")
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            print(f"Job status response: {json.dumps(result, indent=2)}")
            return result
        else:
            print(f"Failed to get job status: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        print(f"Exception while getting job status: {str(e)}")
        return None

def get_vectorstore_info(vectorstore_id):
    """Get information about a vector store."""
    url = f"{API_BASE_URL}/api/embedding/vectorstores/{vectorstore_id}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            vs_data = response.json()
            logger.info(f"Vector store info: {json.dumps(vs_data, indent=2)}")
            return vs_data
        else:
            logger.error(f"Error getting vector store info: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception getting vector store info: {str(e)}")
        return None

def check_service_availability():
    """Check if the embedding service is available by trying multiple health check endpoints."""
    possible_endpoints = ["/health", "/api/health", "/api/embedding/health"]
    service_available = False
    
    for endpoint in possible_endpoints:
        health_check_url = f"{API_BASE_URL}{endpoint}"
        logger.info(f"Attempting health check at: {health_check_url}")
        
        try:
            response = requests.get(health_check_url, timeout=5)
            if response.status_code == 200:
                logger.info(f"Embedding service is available at {health_check_url}")
                service_available = True
                break
            else:
                logger.warning(f"Health check at {health_check_url} returned status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Health check at {health_check_url} failed: {str(e)}")
    
    if not service_available:
        logger.error(f"Embedding service is not reachable at {API_BASE_URL}. Check if the service is running and the API_BASE_URL environment variable is correctly set.")
        
        # Try to list Docker containers to assist with debugging
        try:
            logger.info("Checking Docker containers...")
            result = subprocess.run(["docker", "ps"], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"Running Docker containers:\n{result.stdout}")
            else:
                logger.warning(f"Could not list Docker containers: {result.stderr}")
        except Exception as e:
            logger.warning(f"Error checking Docker containers: {str(e)}")
    
    return service_available

def monitor_job_status(job_id, timeout_seconds=120, polling_interval=5):
    """
    Monitor a job's status until it completes or times out.
    
    Args:
        job_id: The ID of the job to monitor
        timeout_seconds: Maximum seconds to wait for job completion
        polling_interval: Seconds between status checks
        
    Returns:
        The final job status or None if timed out
    """
    start_time = time.time()
    elapsed_time = 0
    
    while elapsed_time < timeout_seconds:
        job_status = get_job_status(job_id)
        
        if not job_status:
            print(f"Failed to get status for job {job_id}")
            return None
            
        status = job_status.get("status", "").lower()
        print(f"Job {job_id} status: {status.upper()} (elapsed: {elapsed_time:.1f}s)")
        
        # Check if job has reached a terminal state
        if status in ["completed", "failed", "error"]:
            return job_status
            
        # Wait before checking again
        time.sleep(polling_interval)
        elapsed_time = time.time() - start_time
    
    print(f"Monitoring timed out after {timeout_seconds} seconds for job {job_id}")
    return None

def check_health():
    """Check if the embedding service is healthy."""
    url = f"{API_BASE_URL}/health"
    
    try:
        print("Checking embedding service health...")
        response = requests.get(url)
        
        if response.status_code == 200:
            print("Embedding service is healthy")
            return True
        else:
            print(f"Embedding service health check failed: {response.status_code}, {response.text}")
            return False
    except Exception as e:
        print(f"Exception during health check: {str(e)}")
        return False

def main():
    print("Starting test script...")
    
    # Check if the embedding service is healthy
    if not check_health():
        print("Embedding service is not available. Exiting.")
        return
    
    # Create test files for initial vector store creation
    print("Creating initial test files...")
    initial_files = create_test_files("initial", 3)
    print(f"Created initial test files: {initial_files}")
    
    # Create a vector store with initial files
    vectorstore_name = f"Test Vectorstore {uuid.uuid4()}"
    print(f"Creating vector store named: {vectorstore_name}")
    job_id = create_vector_store(vectorstore_name, initial_files)
    
    if not job_id:
        print("Failed to start vector store creation job. Exiting.")
        cleanup_test_files("initial")
        return
    
    # Monitor the job status until completion or timeout
    print(f"Monitoring job status for job ID: {job_id}")
    job_result = monitor_job_status(job_id, timeout_seconds=60, polling_interval=2)
    
    if not job_result or job_result.get("status").lower() != "completed":
        print(f"Vector store creation failed or timed out: {job_result}")
        cleanup_test_files("initial")
        return
    
    vectorstore_id = job_result.get("result", {}).get("vectorstore_id")
    if not vectorstore_id:
        print("Failed to get vector store ID from job result.")
        cleanup_test_files("initial")
        return
    
    print(f"Vector store created successfully with ID: {vectorstore_id}")
    
    # Create additional test files for vector store update
    print("Creating update test files...")
    update_files = create_test_files("update", 2)
    print(f"Created update test files: {update_files}")
    
    # Update the vector store with additional files
    print(f"Updating vector store {vectorstore_id}...")
    update_job_id = update_vector_store(vectorstore_id, update_files)
    
    if not update_job_id:
        print("Failed to start vector store update job.")
        cleanup_test_files("initial")
        cleanup_test_files("update")
        return
    
    # Monitor the update job status
    print(f"Monitoring update job status for job ID: {update_job_id}")
    update_job_result = monitor_job_status(update_job_id, timeout_seconds=60, polling_interval=2)
    
    if not update_job_result or update_job_result.get("status").lower() != "completed":
        print(f"Vector store update failed or timed out: {update_job_result}")
    else:
        print("Vector store updated successfully.")
    
    # Clean up test files
    print("Cleaning up test files...")
    cleanup_test_files("initial")
    cleanup_test_files("update")
    
    print("Test completed.")

if __name__ == "__main__":
    main() 