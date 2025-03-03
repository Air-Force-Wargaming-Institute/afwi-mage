"""
Tests for the vector store API endpoints.

This module tests the API endpoints for managing vector stores, including:
- Listing vector stores
- Getting vector store details
- Creating vector stores
- Updating vector stores
- Deleting vector stores
- Querying vector stores
- Batch updating vector stores
"""

import os
import json
import pytest
import tempfile
import shutil
import uuid
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from ..core.vectorstore import VectorStoreManager
from ..core.job import JobManager, initialize_job_manager, register_job, complete_job, JobStatus
from ..api import vectorstore  # Import the module, not the router
from fastapi import FastAPI, BackgroundTasks, Depends


@pytest.fixture
def test_dir():
    """Create a temporary directory for test files."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Clean up
    shutil.rmtree(temp_dir)


@pytest.fixture
def vector_store_dir(test_dir):
    """Create directories for vector store files."""
    vs_dir = os.path.join(test_dir, "vector_stores")
    embeddings_dir = os.path.join(test_dir, "embeddings")
    
    os.makedirs(vs_dir, exist_ok=True)
    os.makedirs(embeddings_dir, exist_ok=True)
    
    return test_dir


@pytest.fixture
def job_dir(test_dir):
    """Create a directory for job files."""
    job_dir = os.path.join(test_dir, "jobs")
    os.makedirs(job_dir, exist_ok=True)
    
    # Initialize the job manager
    initialize_job_manager(job_dir)
    
    return job_dir


@pytest.fixture
def vectorstore_manager(vector_store_dir):
    """Create a VectorStoreManager instance."""
    return VectorStoreManager(vector_store_dir)


@pytest.fixture
def app(vector_store_dir, job_dir):
    """Create a FastAPI app with the necessary dependencies."""
    app = FastAPI()
    
    # Override the dependency to use our test instances
    def get_test_vectorstore_manager():
        return VectorStoreManager(vector_store_dir)
    
    # Use the correct reference to the dependency
    app.dependency_overrides[vectorstore.get_vectorstore_manager] = get_test_vectorstore_manager
    
    # Include the router with a prefix
    app.include_router(vectorstore.router, prefix="/vectorstores")
    
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def sample_vs_data():
    """Sample data for creating a vector store."""
    return {
        "name": "Test Vector Store",
        "description": "A test vector store for API testing",
        "embedding_model": "test-embed-model",
        "files": [],  # No files initially
        "use_paragraph_chunking": True,
        "max_paragraph_length": 1500,
        "min_paragraph_length": 50,
        "chunk_size": 1000,
        "chunk_overlap": 100,
        "batch_processing": True
    }


@pytest.fixture
def sample_document_file(test_data_dir):
    """Path to a sample document file."""
    return os.path.join(test_data_dir, "sample.txt")


@pytest.fixture
def sample_vs_id(vectorstore_manager):
    """Create a sample vector store and return its ID."""
    vs_id = vectorstore_manager.create_vector_store(
        name="Test Vector Store",
        description="Pre-created test vector store",
        embedding_model="test-embed-model",
        metadata={
            "security_classification": "UNCLASSIFIED",
            "domain": "Testing"
        }
    )
    
    return vs_id


@pytest.fixture
def completed_job(job_dir):
    """Create a completed job for testing."""
    job_id = register_job("create_vectorstore", 10, {"test": "value"})
    complete_job(job_id, {"result": "Success", "vectorstore_id": str(uuid.uuid4())})
    return job_id


def test_list_vectorstores(client, sample_vs_id):
    """Test listing vector stores."""
    response = client.get("/vectorstores")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Check that our sample vector store is in the list
    found = False
    for vs in data:
        if vs["id"] == sample_vs_id:
            found = True
            assert vs["name"] == "Test Vector Store"
            assert vs["description"] == "Pre-created test vector store"
            assert vs["embedding_model"] == "test-embed-model"
            break
    
    assert found, "Sample vector store not found in the list"


def test_get_vectorstore(client, sample_vs_id):
    """Test getting a specific vector store."""
    response = client.get(f"/vectorstores/{sample_vs_id}")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify vector store details
    assert data["id"] == sample_vs_id
    assert data["name"] == "Test Vector Store"
    assert data["description"] == "Pre-created test vector store"
    assert data["embedding_model"] == "test-embed-model"
    assert "files" in data
    assert isinstance(data["files"], list)


def test_get_nonexistent_vectorstore(client):
    """Test getting a nonexistent vector store."""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/vectorstores/{fake_id}")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_vectorstore(client, sample_vs_data):
    """Test creating a vector store."""
    # Just test the API response - we're not testing the actual background task
    response = client.post("/vectorstores", json=sample_vs_data)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "job_id" in data
    assert data["message"].lower().startswith("vector store creation started")


def test_update_vectorstore(client, sample_vs_id):
    """Test updating a vector store."""
    update_data = {
        "name": "Updated Test Vector Store",
        "description": "Updated description",
        "files": []
    }
    
    # Just test the API response - we're not testing the actual background task
    response = client.post(f"/vectorstores/{sample_vs_id}/update", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "job_id" in data
    assert data["message"].lower().startswith("vector store update started")


def test_delete_vectorstore(client, sample_vs_id):
    """Test deleting a vector store."""
    response = client.delete(f"/vectorstores/{sample_vs_id}")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["message"].lower().startswith("vector store deleted")
    
    # Verify it's actually deleted
    get_response = client.get(f"/vectorstores/{sample_vs_id}")
    assert get_response.status_code == 404


def test_query_vectorstore(client, vectorstore_manager, sample_vs_id):
    """Test querying a vector store."""
    # Setup - add a document to the vector store
    def mock_embed_texts(texts):
        return [np.random.rand(128).tolist() for _ in texts]
    
    # Add a document to the vector store
    vectorstore_manager.add_documents(
        sample_vs_id,
        ["This is a test document for embedding."],
        [{"filename": "test.txt", "security_classification": "UNCLASSIFIED"}],
        embed_func=mock_embed_texts
    )
    
    # Use unittest.mock's patch to mock the embedding function
    with patch.object(VectorStoreManager, '_get_embedding', return_value=np.random.rand(128).tolist()):
        # Test querying
        query_data = {
            "query": "test query",
            "top_k": 5,
            "score_threshold": 0.5
        }
        
        response = client.post(f"/vectorstores/{sample_vs_id}/query", json=query_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        # Due to random embeddings, results might be empty or have matches


def test_update_vectorstore_metadata(client, vectorstore_manager, sample_vs_id):
    """Test updating vector store metadata."""
    update_data = {
        "name": "New Vector Store Name",
        "description": "New description for testing"
    }
    
    response = client.put(f"/vectorstores/{sample_vs_id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["vectorstore_id"] == sample_vs_id
    
    # Verify the changes
    vs_info = vectorstore_manager.get_vector_store(sample_vs_id)
    assert vs_info["name"] == "New Vector Store Name"
    assert vs_info["description"] == "New description for testing"


def test_remove_documents(client, vectorstore_manager, sample_vs_id, monkeypatch):
    """Test removing documents from a vector store."""
    # Setup - add documents to the vector store
    def mock_embed_texts(texts):
        return [np.random.rand(128).tolist() for _ in texts]
    
    # Add documents to the vector store
    document_ids = []
    
    # Add multiple documents
    for i in range(3):
        doc_id = f"test_doc_{i}"
        document_ids.append(doc_id)
        vectorstore_manager.add_documents(
            sample_vs_id,
            [f"Test document {i}"],
            [{"document_id": doc_id, "filename": f"test{i}.txt"}],
            embed_func=mock_embed_texts
        )
    
    # Test removing documents
    remove_data = {
        "document_ids": document_ids[:2]  # Remove first 2 documents
    }
    
    response = client.delete(f"/vectorstores/{sample_vs_id}/documents", json=remove_data)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "job_id" in data
    assert data["message"].lower().startswith("document removal started")


def test_batch_update(client, vectorstore_manager, sample_vs_id):
    """Test batch update operation on a vector store."""
    batch_data = {
        "add": [],  # No files to add
        "remove": [],  # No documents to remove
        "name": "Batch Updated Name",
        "description": "Updated via batch operation"
    }
    
    # Just test the API response - we're not testing the actual background task
    response = client.post(f"/vectorstores/{sample_vs_id}/batch_update", json=batch_data)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "job_id" in data
    assert data["message"].lower().startswith("batch update started")


def test_create_vectorstore_with_invalid_data(client):
    """Test creating a vector store with invalid data."""
    # Missing required fields
    invalid_data = {
        "description": "Invalid vector store data",
        "files": []
    }
    
    response = client.post("/vectorstores", json=invalid_data)
    
    # Should return validation error
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_update_nonexistent_vectorstore(client):
    """Test updating a vector store that doesn't exist."""
    fake_id = str(uuid.uuid4())
    update_data = {
        "name": "Updated Name",
        "description": "Updated description",
        "files": []
    }
    
    response = client.post(f"/vectorstores/{fake_id}/update", json=update_data)
    
    # Should return 404 Not Found
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_query_with_invalid_data(client, sample_vs_id):
    """Test querying a vector store with invalid data."""
    # Missing required query field
    invalid_data = {
        "top_k": 5,
        "score_threshold": 0.5
    }
    
    response = client.post(f"/vectorstores/{sample_vs_id}/query", json=invalid_data)
    
    # Should return validation error
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_update_metadata_with_invalid_data(client, sample_vs_id):
    """Test updating vector store metadata with invalid types."""
    # Invalid types for name and description
    invalid_data = {
        "name": 12345,  # Should be string
        "description": ["invalid", "type"]  # Should be string
    }
    
    response = client.put(f"/vectorstores/{sample_vs_id}", json=invalid_data)
    
    # Should return validation error
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_remove_nonexistent_documents(client, sample_vs_id):
    """Test removing documents that don't exist."""
    remove_data = {
        "document_ids": ["nonexistent-doc-1", "nonexistent-doc-2"]
    }
    
    response = client.delete(f"/vectorstores/{sample_vs_id}/documents", json=remove_data)
    
    # Should still return 200, but with a job that will handle the non-existent documents
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "job_id" in data


def test_batch_update_nonexistent_vectorstore(client):
    """Test batch updating a vector store that doesn't exist."""
    fake_id = str(uuid.uuid4())
    batch_data = {
        "name": "Batch Updated Name",
        "description": "Updated via batch operation",
        "add": [],
        "remove": []
    }
    
    response = client.post(f"/vectorstores/{fake_id}/batch_update", json=batch_data)
    
    # Should return 404 Not Found
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower() 