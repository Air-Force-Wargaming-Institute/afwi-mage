"""
Tests for the vectorstore core module.

This module tests the VectorStoreManager class and its functionality
for managing vector stores, embeddings, and metadata.
"""

import os
import json
import pytest
import tempfile
import shutil
import uuid
import numpy as np
from pathlib import Path

from ..core.vectorstore import VectorStoreManager
from ..core.metadata import normalize_security_classification


@pytest.fixture
def vector_store_dir():
    """Create a temporary directory for vector store files."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Clean up
    shutil.rmtree(temp_dir)


@pytest.fixture
def vector_store_manager(vector_store_dir):
    """Create a VectorStoreManager instance for testing."""
    # Create the directories needed by the VectorStoreManager
    os.makedirs(os.path.join(vector_store_dir, "vector_stores"), exist_ok=True)
    os.makedirs(os.path.join(vector_store_dir, "embeddings"), exist_ok=True)
    
    return VectorStoreManager(vector_store_dir)


@pytest.fixture
def test_vs_data():
    """Sample vector store data for testing."""
    return {
        "name": "test_vector_store",
        "description": "A test vector store for unit testing",
        "embedding_model": "test-embedding-model",
        "metadata": {
            "created_by": "test_user",
            "security_classification": "unclassified",
            "domain": "test"
        }
    }


@pytest.fixture
def sample_documents():
    """Sample documents for testing embedding."""
    return [
        {
            "text": "This is a test document for embedding.",
            "metadata": {
                "filename": "test1.txt",
                "security_classification": "unclassified",
                "author": "test_user"
            }
        },
        {
            "text": "Another test document with different content.",
            "metadata": {
                "filename": "test2.txt",
                "security_classification": "confidential",
                "author": "test_user"
            }
        },
        {
            "text": "A third document for good measure.",
            "metadata": {
                "filename": "test3.txt",
                "security_classification": "secret",
                "author": "different_user"
            }
        }
    ]


def test_create_vector_store(vector_store_manager, test_vs_data):
    """Test creating a new vector store."""
    # Create a vector store
    vs_id = vector_store_manager.create_vector_store(
        test_vs_data["name"],
        test_vs_data["description"],
        test_vs_data["embedding_model"],
        test_vs_data["metadata"]
    )
    
    # Verify the vector store ID is in UUID format
    try:
        uuid.UUID(vs_id)
    except ValueError:
        pytest.fail("Vector store ID is not a valid UUID")
    
    # Check if the vector store exists in the list
    vector_stores = vector_store_manager.list_vector_stores()
    assert vs_id in [vs["id"] for vs in vector_stores]
    
    # Check vector store details
    vs_info = vector_store_manager.get_vector_store(vs_id)
    assert vs_info["name"] == test_vs_data["name"]
    assert vs_info["description"] == test_vs_data["description"]
    assert vs_info["embedding_model"] == test_vs_data["embedding_model"]
    
    # Check normalized security classification
    assert vs_info["metadata"]["security_classification"] == normalize_security_classification(
        test_vs_data["metadata"]["security_classification"]
    )


def test_update_vector_store(vector_store_manager, test_vs_data):
    """Test updating an existing vector store."""
    # Create a vector store first
    vs_id = vector_store_manager.create_vector_store(
        test_vs_data["name"],
        test_vs_data["description"],
        test_vs_data["embedding_model"],
        test_vs_data["metadata"]
    )
    
    # Update the vector store
    updated_description = "Updated description for testing"
    updated_metadata = {
        **test_vs_data["metadata"],
        "updated": True,
        "security_classification": "confidential"
    }
    
    vector_store_manager.update_vector_store(
        vs_id,
        description=updated_description,
        metadata=updated_metadata
    )
    
    # Check if the update was successful
    vs_info = vector_store_manager.get_vector_store(vs_id)
    assert vs_info["description"] == updated_description
    assert vs_info["metadata"]["updated"] is True
    assert vs_info["metadata"]["security_classification"] == normalize_security_classification("confidential")
    
    # Name and embedding model should remain unchanged
    assert vs_info["name"] == test_vs_data["name"]
    assert vs_info["embedding_model"] == test_vs_data["embedding_model"]


def test_delete_vector_store(vector_store_manager, test_vs_data):
    """Test deleting a vector store."""
    # Create a vector store first
    vs_id = vector_store_manager.create_vector_store(
        test_vs_data["name"],
        test_vs_data["description"],
        test_vs_data["embedding_model"],
        test_vs_data["metadata"]
    )
    
    # Delete the vector store
    vector_store_manager.delete_vector_store(vs_id)
    
    # Check if the vector store is no longer in the list
    vector_stores = vector_store_manager.list_vector_stores()
    assert vs_id not in [vs["id"] for vs in vector_stores]
    
    # Trying to get the deleted vector store should raise an exception
    with pytest.raises(Exception):
        vector_store_manager.get_vector_store(vs_id)


def test_list_vector_stores(vector_store_manager, test_vs_data):
    """Test listing vector stores with different filters."""
    # Create multiple vector stores with different metadata
    vs_ids = []
    for i in range(3):
        metadata = {
            **test_vs_data["metadata"],
            "domain": f"domain_{i % 2}",  # alternate between two domains
            "security_classification": ["unclassified", "confidential", "secret"][i]
        }
        
        vs_id = vector_store_manager.create_vector_store(
            f"{test_vs_data['name']}_{i}",
            test_vs_data["description"],
            test_vs_data["embedding_model"],
            metadata
        )
        vs_ids.append(vs_id)
    
    # List all vector stores
    all_vector_stores = vector_store_manager.list_vector_stores()
    assert len(all_vector_stores) >= 3
    
    # Try filtering by security classification
    conf_vector_stores = vector_store_manager.list_vector_stores(
        filters={"metadata.security_classification": "confidential"}
    )
    assert len(conf_vector_stores) >= 1
    for vs in conf_vector_stores:
        assert vs["metadata"]["security_classification"] == normalize_security_classification("confidential")
    
    # Try filtering by domain
    domain_vector_stores = vector_store_manager.list_vector_stores(
        filters={"metadata.domain": "domain_0"}
    )
    assert len(domain_vector_stores) >= 1
    for vs in domain_vector_stores:
        assert vs["metadata"]["domain"] == "domain_0"


def test_add_documents_to_vector_store(vector_store_manager, test_vs_data, sample_documents):
    """Test adding documents to a vector store."""
    # Create a vector store
    vs_id = vector_store_manager.create_vector_store(
        test_vs_data["name"],
        test_vs_data["description"],
        test_vs_data["embedding_model"],
        test_vs_data["metadata"]
    )
    
    # Mock embedding function - normally the embedding model would generate these
    def mock_embed_texts(texts):
        # Return mock embeddings (random vectors of fixed dimension)
        return [np.random.rand(128).tolist() for _ in texts]
    
    # Add documents to the vector store
    doc_count = vector_store_manager.add_documents(
        vs_id,
        [doc["text"] for doc in sample_documents],
        [doc["metadata"] for doc in sample_documents],
        embed_func=mock_embed_texts
    )
    
    assert doc_count == len(sample_documents)
    
    # Get the vector store info to check document count
    vs_info = vector_store_manager.get_vector_store(vs_id)
    assert vs_info["document_count"] == len(sample_documents)


def test_query_vector_store(vector_store_manager, test_vs_data, sample_documents):
    """Test querying a vector store."""
    # Create a vector store
    vs_id = vector_store_manager.create_vector_store(
        test_vs_data["name"],
        test_vs_data["description"],
        test_vs_data["embedding_model"],
        test_vs_data["metadata"]
    )
    
    # Create a mapping of texts to fixed mock embeddings for consistent testing
    text_to_embedding = {}
    for i, doc in enumerate(sample_documents):
        # Create a vector with 1.0 at position i and 0.0 elsewhere
        embedding = np.zeros(128)
        embedding[i] = 1.0
        text_to_embedding[doc["text"]] = embedding.tolist()
    
    # Mock embedding function that uses our fixed mappings
    def mock_embed_texts(texts):
        return [text_to_embedding.get(text, np.random.rand(128).tolist()) for text in texts]
    
    # Add documents to the vector store
    vector_store_manager.add_documents(
        vs_id,
        [doc["text"] for doc in sample_documents],
        [doc["metadata"] for doc in sample_documents],
        embed_func=mock_embed_texts
    )
    
    # Create a query embedding that matches the first document
    query_embedding = text_to_embedding[sample_documents[0]["text"]]
    
    # Query the vector store
    results = vector_store_manager.query_vector_store(
        vs_id,
        query_embedding,
        top_k=2
    )
    
    # Verify results
    assert len(results) == 2
    # The first result should be the exact match (first document)
    assert results[0]["text"] == sample_documents[0]["text"]
    assert results[0]["metadata"]["filename"] == sample_documents[0]["metadata"]["filename"]
    
    # Test querying with metadata filter
    filtered_results = vector_store_manager.query_vector_store(
        vs_id,
        query_embedding,
        top_k=3,
        metadata_filter={"author": "different_user"}
    )
    
    # Should only return documents by different_user
    for result in filtered_results:
        assert result["metadata"]["author"] == "different_user"


def test_get_vector_store_stats(vector_store_manager, test_vs_data, sample_documents):
    """Test getting vector store statistics."""
    # Create multiple vector stores
    vs_ids = []
    for i in range(2):
        metadata = {
            **test_vs_data["metadata"],
            "domain": f"domain_{i}"
        }
        
        vs_id = vector_store_manager.create_vector_store(
            f"{test_vs_data['name']}_{i}",
            test_vs_data["description"],
            test_vs_data["embedding_model"],
            metadata
        )
        vs_ids.append(vs_id)
    
    # Mock embedding function
    def mock_embed_texts(texts):
        return [np.random.rand(128).tolist() for _ in texts]
    
    # Add documents to the first vector store
    vector_store_manager.add_documents(
        vs_ids[0],
        [doc["text"] for doc in sample_documents],
        [doc["metadata"] for doc in sample_documents],
        embed_func=mock_embed_texts
    )
    
    # Get overall stats
    stats = vector_store_manager.get_vector_store_stats()
    
    # Verify stats
    assert stats["total_vector_stores"] >= 2
    assert stats["total_documents"] >= len(sample_documents)
    assert "by_security_classification" in stats
    assert "by_domain" in stats
    
    # There should be counts for each security classification in our sample docs
    sec_class_stats = stats["by_security_classification"]
    unique_classifications = {normalize_security_classification(doc["metadata"]["security_classification"]) 
                             for doc in sample_documents}
    for classification in unique_classifications:
        assert classification in sec_class_stats
    
    # Check domain stats
    domain_stats = stats["by_domain"]
    assert "domain_0" in domain_stats 