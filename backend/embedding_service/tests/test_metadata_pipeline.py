"""
Metadata pipeline tests.

This module tests the critical path of metadata preservation through the document
processing and vector store pipeline.
"""

import os
import json
import tempfile
import shutil
import uuid
import numpy as np
import pytest
from pathlib import Path

# Import directly from the modules to avoid import issues
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.metadata import normalize_security_classification, extract_metadata_from_file
from core.document import load_documents
from core.vectorstore import VectorStoreManager


def test_document_loading_preserves_metadata():
    """Test that document loading preserves metadata."""
    # Create a test document with metadata
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as temp_file:
        temp_file.write("This is a test document for checking metadata preservation.\n"
                        "It contains multiple lines of text.\n"
                        "Author: Test User\n"
                        "Security: SECRET")
        test_file = temp_file.name
    
    try:
        # Create metadata for the document
        original_metadata = {
            "filename": "original_classified_doc.txt",
            "security_classification": "SECRET",
            "author": "Test User",
            "document_id": "test-doc-001"
        }
        
        # Create a file metadata dictionary that maps the file path to its metadata
        file_metadata = {test_file: original_metadata}
        
        # Load the document with metadata
        docs, skipped_files = load_documents(
            [test_file], 
            chunk_size=1000,
            chunk_overlap=100,
            file_metadata=file_metadata
        )
        
        # Verify that the document was loaded successfully
        assert len(docs) > 0, "No documents were loaded"
        assert len(skipped_files) == 0, f"Files were skipped: {skipped_files}"
        
        # Check that metadata was preserved in all document chunks
        for doc in docs:
            assert hasattr(doc, 'metadata'), "Document has no metadata"
            assert doc.metadata["filename"] == "original_classified_doc.txt", f"Filename was not preserved, got: {doc.metadata.get('filename')}"
            assert doc.metadata["security_classification"] == "SECRET", f"Security classification was not preserved, got: {doc.metadata.get('security_classification')}"
            assert doc.metadata["author"] == "Test User", f"Author was not preserved, got: {doc.metadata.get('author')}"
            assert doc.metadata["document_id"] == "test-doc-001", f"Document ID was not preserved, got: {doc.metadata.get('document_id')}"
        
        print(f"Successfully loaded {len(docs)} document chunks with metadata")
    finally:
        # Clean up the test file
        try:
            os.unlink(test_file)
        except:
            pass


def test_vectorstore_pipeline_preserves_metadata():
    """Test that the complete vector store pipeline preserves metadata."""
    # Create a temporary directory for the test
    test_dir = tempfile.mkdtemp()
    
    try:
        # Set up vector store directories
        os.makedirs(os.path.join(test_dir, "vector_stores"), exist_ok=True)
        os.makedirs(os.path.join(test_dir, "embeddings"), exist_ok=True)
        
        # Create a test document
        test_doc_path = os.path.join(test_dir, "test_doc.txt")
        with open(test_doc_path, 'w') as f:
            f.write("This is a test document with classified information.\n"
                    "It should preserve metadata through the pipeline.\n"
                    "Security: TOP SECRET//NOFORN")
        
        # Create metadata for the document
        original_metadata = {
            "filename": "highly_classified.txt",
            "security_classification": "TOP SECRET//NOFORN",
            "author": "Security Officer",
            "document_id": "TS-001-NF"
        }
        
        # Create a file metadata dictionary
        file_metadata = {test_doc_path: original_metadata}
        
        # Load documents with the metadata
        docs, _ = load_documents(
            [test_doc_path], 
            chunk_size=1000,
            chunk_overlap=100,
            file_metadata=file_metadata
        )
        
        # Create a vector store manager
        manager = VectorStoreManager(test_dir)
        
        # Create a vector store
        vs_id = str(uuid.uuid4())
        vs_metadata = {
            "id": vs_id,
            "name": "Test Classified Vector Store",
            "description": "Vector store with classified documents",
            "embedding_model": "test-model",
            "created_at": "2023-06-01T12:00:00Z",
            "files": []
        }
        
        # Save the vector store metadata
        metadata_path = os.path.join(test_dir, "vector_stores", f"{vs_id}.json")
        os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
        with open(metadata_path, "w") as f:
            json.dump(vs_metadata, f)
        
        # Create mock embeddings for the documents
        embeddings = [np.random.rand(128).tolist() for _ in docs]
        
        # Add the documents to the vector store
        manager.add_documents_to_vectorstore(vs_id, docs, embeddings)
        
        # Create a mock query embedding
        query_embedding = np.random.rand(128).tolist()
        
        # Query the vector store
        results = manager.query_vector_store(vs_id, query_embedding, top_k=5)
        
        # Verify the results contain the correct metadata
        assert len(results) > 0, "No results returned from query"
        
        # Check that each result has the expected metadata
        for result in results:
            assert "metadata" in result, "Result has no metadata"
            metadata = result["metadata"]
            assert metadata["filename"] == "highly_classified.txt", f"Filename not preserved in result, got: {metadata.get('filename')}"
            assert metadata["security_classification"] == "TOP SECRET//NOFORN", f"Security classification not preserved, got: {metadata.get('security_classification')}"
            assert metadata["author"] == "Security Officer", f"Author not preserved, got: {metadata.get('author')}"
            assert metadata["document_id"] == "TS-001-NF", f"Document ID not preserved, got: {metadata.get('document_id')}"
        
        print(f"Successfully queried vector store and retrieved {len(results)} results with preserved metadata")
        
    finally:
        # Clean up the test directory
        shutil.rmtree(test_dir)


def test_security_classification_in_extracted_metadata():
    """Test that security classifications are extracted from document content."""
    # Create a test document with an embedded security classification
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as temp_file:
        temp_file.write("TOP SECRET//NOFORN\n\n"
                        "This document contains highly sensitive information.\n"
                        "It should be handled according to proper security procedures.\n"
                        "Do not distribute outside authorized channels.")
        test_file = temp_file.name
    
    try:
        # Extract metadata from the file
        metadata = extract_metadata_from_file(test_file)
        
        # Verify that the security classification was extracted
        assert "security_classification" in metadata, "Security classification not extracted from file content"
        assert metadata["security_classification"] == "TOP SECRET//NOFORN", f"Incorrect security classification extracted, got: {metadata.get('security_classification')}"
        
        print(f"Successfully extracted security classification from file content: {metadata['security_classification']}")
    finally:
        # Clean up the test file
        try:
            os.unlink(test_file)
        except:
            pass


if __name__ == "__main__":
    # Run the tests
    print("\nTesting document loading metadata preservation...")
    test_document_loading_preserves_metadata()
    
    print("\nTesting security classification extraction...")
    test_security_classification_in_extracted_metadata()
    
    print("\nTesting complete vector store pipeline...")
    test_vectorstore_pipeline_preserves_metadata()
    
    print("\nAll tests passed successfully!") 