"""
Essential API tests for the embedding service.

This module focuses on testing only the most critical API endpoints that are essential
for verifying proper metadata handling and core functionality.
"""

import os
import json
import pytest
import tempfile
import shutil
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from ..core.vectorstore import VectorStoreManager
from ..core.job import JobManager, initialize_job_manager
from ..main import app


@pytest.fixture
def test_dir():
    """Create a temporary directory for all test files."""
    temp_dir = tempfile.mkdtemp()
    
    # Create subdirectories needed by the application
    os.makedirs(os.path.join(temp_dir, "vector_stores"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "embeddings"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "staging"), exist_ok=True)
    os.makedirs(os.path.join(temp_dir, "jobs"), exist_ok=True)
    
    yield temp_dir
    
    # Clean up
    shutil.rmtree(temp_dir)


@pytest.fixture
def job_manager(test_dir):
    """Initialize and return a job manager for testing."""
    job_dir = os.path.join(test_dir, "jobs")
    initialize_job_manager(job_dir)
    return JobManager()


@pytest.fixture
def vectorstore_manager(test_dir):
    """Initialize and return a vector store manager for testing."""
    return VectorStoreManager(test_dir)


@pytest.fixture
def client(test_dir, vectorstore_manager, job_manager):
    """Create a test client with patched dependencies."""
    
    # Create dependency overrides
    def get_test_vectorstore_manager():
        return vectorstore_manager
    
    def get_test_job_manager():
        return job_manager
    
    def get_test_upload_dir():
        return os.path.join(test_dir, "uploads")
    
    def get_test_staging_dir():
        return os.path.join(test_dir, "staging")
    
    # Override the dependencies in the app
    from ..api import vectorstore, jobs, files
    app.dependency_overrides[vectorstore.get_vectorstore_manager] = get_test_vectorstore_manager
    app.dependency_overrides[jobs.get_job_manager] = get_test_job_manager
    # Add other dependencies as needed
    
    return TestClient(app)


@pytest.fixture
def mock_file_upload(test_dir):
    """Mock a file upload and return the file ID."""
    # Create a mock file in the uploads directory
    uploads_dir = os.path.join(test_dir, "uploads")
    file_id = "mock-file-id"
    file_path = os.path.join(uploads_dir, file_id)
    
    # Create a simple text file
    with open(file_path, "w") as f:
        f.write("This is test content for the mock file.")
    
    # Create a metadata file for the uploaded file
    metadata = {
        "filename": "original_test_file.txt",
        "file_size": 38,
        "mime_type": "text/plain",
        "security_classification": "CONFIDENTIAL",
        "upload_time": "2023-06-01T12:00:00Z"
    }
    
    metadata_path = f"{file_path}.metadata"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f)
    
    return file_id


@pytest.fixture
def mock_vectorstore(vectorstore_manager, mock_file_upload):
    """Create a mock vector store for testing."""
    # Mock the embedding function
    def mock_embed_func(texts):
        return [[0.1, 0.2, 0.3] for _ in texts]
    
    # Create a vector store
    vs_id = vectorstore_manager.create_vector_store(
        "Test Vector Store",
        "A test vector store for API testing",
        "test-model",
        {"security_classification": "CONFIDENTIAL"}
    )
    
    # Add a document with metadata to the vector store
    vectorstore_manager.add_documents(
        vs_id,
        ["This is a test document for API testing."],
        [{
            "filename": "original_test_file.txt",
            "security_classification": "CONFIDENTIAL",
            "document_id": "test-doc-001"
        }],
        embed_func=mock_embed_func
    )
    
    return vs_id


def test_file_upload_preserves_metadata(client, test_dir):
    """Test that file upload properly stores metadata."""
    # Create a test file
    test_file_content = "This is a test file with specific metadata."
    test_file_path = os.path.join(test_dir, "test_upload.txt")
    with open(test_file_path, "w") as f:
        f.write(test_file_content)
    
    # Upload the file with specific metadata
    with open(test_file_path, "rb") as f:
        response = client.post(
            "/files/upload",
            files={"file": ("critical_document.txt", f, "text/plain")},
            data={
                "security_classification": "SECRET",
                "description": "A critical document for testing"
            }
        )
    
    # Verify the response
    assert response.status_code == 200
    result = response.json()
    assert "file_id" in result
    file_id = result["file_id"]
    
    # Check that the metadata file was created correctly
    uploads_dir = os.path.join(test_dir, "uploads")
    metadata_path = os.path.join(uploads_dir, f"{file_id}.metadata")
    assert os.path.exists(metadata_path)
    
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    
    # Verify critical metadata fields
    assert metadata["filename"] == "critical_document.txt"
    assert metadata["security_classification"] == "SECRET"
    assert "file_size" in metadata
    assert metadata["file_size"] > 0


def test_vectorstore_creation_with_metadata(client, test_dir, mock_file_upload):
    """Test vector store creation with files that have metadata."""
    # Patch the embedding function to avoid actual model calls
    with patch("..core.vectorstore.VectorStoreManager._get_embedding", 
               return_value=[0.1, 0.2, 0.3]):
        
        # Create a vector store with the uploaded file
        response = client.post(
            "/vectorstores",
            json={
                "name": "Metadata Test VS",
                "description": "Testing metadata preservation",
                "embedding_model": "test-model",
                "files": [mock_file_upload],
                "use_paragraph_chunking": True,
                "batch_processing": False  # Disable to make testing easier
            }
        )
    
    # Verify the response
    assert response.status_code == 200
    result = response.json()
    assert "success" in result
    assert result["success"] is True
    assert "vectorstore_id" in result
    vs_id = result["vectorstore_id"]
    
    # Get vector store info to verify it was created correctly
    response = client.get(f"/vectorstores/{vs_id}")
    assert response.status_code == 200
    vs_info = response.json()
    
    # Verify the vector store contains the file
    assert "files" in vs_info
    assert len(vs_info["files"]) > 0
    
    # Check that original filename and security classification are preserved
    file_info = vs_info["files"][0]
    assert "metadata" in file_info
    assert "filename" in file_info["metadata"]
    assert file_info["metadata"]["filename"] == "original_test_file.txt"
    assert "security_classification" in file_info["metadata"]
    assert file_info["metadata"]["security_classification"] == "CONFIDENTIAL"


def test_query_returns_metadata(client, mock_vectorstore):
    """Test that query results include proper metadata."""
    # Patch the embedding function for querying
    with patch("..core.vectorstore.VectorStoreManager._get_query_embedding", 
               return_value=[0.1, 0.2, 0.3]):
        
        # Query the vector store
        response = client.post(
            f"/vectorstores/{mock_vectorstore}/query",
            json={
                "query": "test query",
                "top_k": 5
            }
        )
    
    # Verify the response
    assert response.status_code == 200
    result = response.json()
    assert "results" in result
    assert len(result["results"]) > 0
    
    # Check that the metadata is correctly included in the results
    first_result = result["results"][0]
    assert "metadata" in first_result
    assert "filename" in first_result["metadata"]
    assert first_result["metadata"]["filename"] == "original_test_file.txt"
    assert "security_classification" in first_result["metadata"]
    assert first_result["metadata"]["security_classification"] == "CONFIDENTIAL"


def test_update_preserves_metadata(client, mock_vectorstore, mock_file_upload):
    """Test that vector store updates preserve metadata."""
    # Create another mock file with different metadata
    uploads_dir = os.path.join(os.path.dirname(mock_file_upload), "uploads")
    new_file_id = "new-mock-file-id"
    new_file_path = os.path.join(uploads_dir, new_file_id)
    
    # Create a simple text file
    with open(new_file_path, "w") as f:
        f.write("This is additional content for updating the vector store.")
    
    # Create metadata for the new file
    new_metadata = {
        "filename": "additional_document.txt",
        "file_size": 55,
        "mime_type": "text/plain",
        "security_classification": "SECRET",
        "upload_time": "2023-06-02T12:00:00Z"
    }
    
    new_metadata_path = f"{new_file_path}.metadata"
    with open(new_metadata_path, "w") as f:
        json.dump(new_metadata, f)
    
    # Patch the embedding function for the update
    with patch("..core.vectorstore.VectorStoreManager._get_embedding", 
               return_value=[0.1, 0.2, 0.3]):
        
        # Update the vector store with the new file
        response = client.post(
            f"/vectorstores/{mock_vectorstore}/update",
            json={
                "files": [new_file_id],
                "batch_processing": False  # Disable to make testing easier
            }
        )
    
    # Verify the response
    assert response.status_code == 200
    result = response.json()
    assert "success" in result
    assert result["success"] is True
    
    # Get the updated vector store info
    response = client.get(f"/vectorstores/{mock_vectorstore}")
    assert response.status_code == 200
    vs_info = response.json()
    
    # Verify both files are in the vector store with correct metadata
    assert "files" in vs_info
    assert len(vs_info["files"]) == 2  # Should now have 2 files
    
    # Extract filenames to check both are present
    filenames = [file_info["metadata"]["filename"] for file_info in vs_info["files"]]
    assert "original_test_file.txt" in filenames
    assert "additional_document.txt" in filenames
    
    # Check security classifications
    for file_info in vs_info["files"]:
        if file_info["metadata"]["filename"] == "original_test_file.txt":
            assert file_info["metadata"]["security_classification"] == "CONFIDENTIAL"
        elif file_info["metadata"]["filename"] == "additional_document.txt":
            assert file_info["metadata"]["security_classification"] == "SECRET" 