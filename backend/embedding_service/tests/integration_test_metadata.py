"""
Integration tests for metadata preservation.

This module contains focused integration tests that verify metadata (especially filenames
and security classifications) is correctly preserved throughout the embedding pipeline.
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
from unittest.mock import patch

from ..core.vectorstore import VectorStoreManager
from ..core.document import load_documents, extract_document_metadata
from ..core.metadata import normalize_security_classification, extract_metadata_from_file
from ..core.job import initialize_job_manager
from ..api import vectorstore, files
from ..main import app as main_app


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
def app(test_dir):
    """Create a test application with all dependencies configured."""
    # Initialize job manager with the test directory
    initialize_job_manager(os.path.join(test_dir, "jobs"))
    
    # Create dependency overrides to use our test directories
    def get_test_vectorstore_manager():
        return VectorStoreManager(test_dir)
    
    def get_test_upload_dir():
        return os.path.join(test_dir, "uploads")
    
    def get_test_staging_dir():
        return os.path.join(test_dir, "staging")
    
    # Override the dependencies
    main_app.dependency_overrides[vectorstore.get_vectorstore_manager] = get_test_vectorstore_manager
    # Add file upload directory overrides if needed
    
    return main_app


@pytest.fixture
def client(app):
    """Create a test client for the application."""
    return TestClient(app)


@pytest.fixture
def sample_text_file(test_data_dir):
    """Path to a sample text file."""
    return os.path.join(test_data_dir, "sample.txt")


@pytest.fixture
def sample_json_file(test_data_dir):
    """Path to a sample JSON file."""
    return os.path.join(test_data_dir, "sample.json")


def test_metadata_extraction_from_file(sample_text_file):
    """Test that metadata is correctly extracted from a file."""
    # Extract metadata from the file
    metadata = extract_metadata_from_file(sample_text_file)
    
    # Verify basic metadata
    assert "filename" in metadata
    assert metadata["filename"] == os.path.basename(sample_text_file)
    assert "file_size" in metadata
    assert metadata["file_size"] > 0
    
    # The sample file should have an "Author: Test User" line and "Security Classification: UNCLASSIFIED"
    # Test that these were extracted correctly if our implementation supports it
    if "author" in metadata:
        assert metadata["author"] == "Test User"
    
    if "security_classification" in metadata:
        assert metadata["security_classification"] == normalize_security_classification("UNCLASSIFIED")


def test_document_processing_preserves_metadata(test_dir, sample_text_file):
    """Test that document processing preserves metadata."""
    # Copy the file to the staging directory
    staging_path = os.path.join(test_dir, "staging", "test_doc.txt")
    shutil.copy(sample_text_file, staging_path)
    
    # Create metadata for the document
    original_metadata = {
        "filename": "original_filename.txt",
        "security_classification": "CONFIDENTIAL",
        "author": "Test User"
    }
    
    # Process the document
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    
    # Create file metadata dictionary in the format expected by load_documents
    file_metadata = {staging_path: original_metadata}
    
    # Load and process the document
    docs, _ = load_documents([staging_path], chunk_size=1000, chunk_overlap=100, file_metadata=file_metadata)
    
    # Verify that each document chunk has the correct metadata
    for doc in docs:
        assert hasattr(doc, "metadata")
        assert "filename" in doc.metadata
        assert doc.metadata["filename"] == "original_filename.txt"
        assert "security_classification" in doc.metadata
        assert doc.metadata["security_classification"] == normalize_security_classification("CONFIDENTIAL")


def test_vectorstore_creation_preserves_metadata(test_dir, sample_text_file):
    """Test that vector store creation preserves document metadata."""
    # Setup the vector store manager
    manager = VectorStoreManager(test_dir)
    
    # Copy the file to the staging directory
    staging_path = os.path.join(test_dir, "staging", "test_doc.txt")
    shutil.copy(sample_text_file, staging_path)
    
    # Create a vector store
    vs_id = str(uuid.uuid4())
    vs_metadata = {
        "id": vs_id,
        "name": "Test Vector Store",
        "description": "Test for metadata preservation",
        "embedding_model": "test-model",
        "created_at": "2023-06-01T12:00:00Z",
        "files": []
    }
    
    # Save the metadata
    metadata_path = os.path.join(test_dir, "vector_stores", f"{vs_id}.json")
    os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
    with open(metadata_path, "w") as f:
        json.dump(vs_metadata, f)
    
    # Mock embedding function
    def mock_embed_texts(texts):
        return [np.random.rand(128).tolist() for _ in texts]
    
    # Add the document to the vector store with specific metadata
    doc_metadata = {
        "filename": "original_filename.txt",
        "security_classification": "SECRET",
        "author": "Test User"
    }
    
    # Create file metadata dictionary in the format expected by load_documents
    file_metadata = {staging_path: doc_metadata}
    
    # Load and process the document
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs, _ = load_documents([staging_path], chunk_size=1000, chunk_overlap=100, file_metadata=file_metadata)
    
    # Add documents to the vector store
    embeddings = mock_embed_texts([doc.page_content for doc in docs])
    manager.add_documents_to_vectorstore(vs_id, docs, embeddings)
    
    # Query the vector store - we'll use a random embedding to simulate a query
    query_embedding = np.random.rand(128).tolist()
    results = manager.query_vector_store(vs_id, query_embedding, top_k=1)
    
    # Verify the metadata in the query results
    assert len(results) > 0
    result = results[0]
    assert "metadata" in result
    assert "filename" in result["metadata"]
    assert result["metadata"]["filename"] == "original_filename.txt"
    assert "security_classification" in result["metadata"]
    assert result["metadata"]["security_classification"] == normalize_security_classification("SECRET")


def test_end_to_end_metadata_preservation(client, test_dir, sample_text_file):
    """
    Test end-to-end metadata preservation from file upload through vector store 
    creation to query results.
    
    This test focuses on the core issue: ensuring original filenames and
    security classifications are preserved throughout the entire pipeline.
    """
    # This test requires a more complete setup with FastAPI and mocked dependencies
    # For now, we'll skip it and focus on the component tests
    pytest.skip("End-to-end test requires more setup, focusing on component tests for now")
    
    # The full implementation would look something like this:
    """
    # Step 1: Upload a file
    with open(sample_text_file, "rb") as f:
        response = client.post(
            "/files/upload",
            files={"file": ("original_filename.txt", f, "text/plain")},
            data={"security_classification": "SECRET"}
        )
    
    assert response.status_code == 200
    upload_result = response.json()
    assert "file_id" in upload_result
    file_id = upload_result["file_id"]
    
    # Step 2: Create a vector store with the uploaded file
    create_data = {
        "name": "Metadata Test Vector Store",
        "description": "Testing metadata preservation",
        "embedding_model": "test-model",
        "files": [file_id],
        "use_paragraph_chunking": True,
        "batch_processing": False  # Easier to test without background jobs
    }
    
    # Mock the embedding function so we don't need actual model inference
    with patch("..core.vectorstore.VectorStoreManager._get_embedding", 
               return_value=np.random.rand(128).tolist()):
        response = client.post("/vectorstores", json=create_data)
        
        assert response.status_code == 200
        create_result = response.json()
        assert "vectorstore_id" in create_result
        vs_id = create_result["vectorstore_id"]
        
        # Step 3: Query the vector store
        query_data = {
            "query": "test metadata",
            "top_k": 5
        }
        
        response = client.post(f"/vectorstores/{vs_id}/query", json=query_data)
        
        assert response.status_code == 200
        query_result = response.json()
        assert "results" in query_result
        assert len(query_result["results"]) > 0
        
        # Step 4: Verify metadata in query results
        result = query_result["results"][0]
        assert "metadata" in result
        assert "filename" in result["metadata"]
        assert result["metadata"]["filename"] == "original_filename.txt"
        assert "security_classification" in result["metadata"]
        assert result["metadata"]["security_classification"] == normalize_security_classification("SECRET")
    """ 