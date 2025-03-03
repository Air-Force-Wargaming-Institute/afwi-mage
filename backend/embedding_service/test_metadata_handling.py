#!/usr/bin/env python3
"""
Test script to verify metadata handling in vector store queries.
This script tests the entire pipeline to ensure metadata is preserved.
"""

import os
import sys
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("metadata_test")

# Add the parent directory to the path to import modules
sys.path.append(str(Path(__file__).resolve().parent))

from core.vectorstore import (
    create_vector_store,
    query_vector_store,
    get_vector_store_info,
)
from core.document import process_documents
from core.config import get_embedding_function

def setup_test_data():
    """Create a test document with metadata."""
    logger.info("Setting up test data")
    
    # Create test directory if it doesn't exist
    test_dir = Path("data/test_metadata")
    test_dir.mkdir(parents=True, exist_ok=True)
    
    # Create a simple test document
    test_file = test_dir / "test_document.txt"
    with open(test_file, "w") as f:
        f.write("This is a test document with metadata for verification purposes.")
    
    # Define metadata for the test document
    metadata = {
        "filename": "test_document.txt",
        "original_filename": "IMPORTANT_SECURE_DOC.txt",
        "security_classification": "SECRET",
        "additional_info": "This is a test document"
    }
    
    # Write metadata to a JSON file
    metadata_file = test_dir / "metadata.json"
    with open(metadata_file, "w") as f:
        json.dump({str(test_file): metadata}, f, indent=2)
    
    return test_dir, test_file, metadata

def test_metadata_preservation():
    """Test metadata preservation through the document processing pipeline."""
    logger.info("Testing metadata preservation")
    
    # Set up test data
    test_dir, test_file, original_metadata = setup_test_data()
    
    # Process documents
    metadata_file = test_dir / "metadata.json"
    processed_docs, doc_metadata = process_documents(
        [str(test_file)], 
        metadata_file=str(metadata_file)
    )
    
    # Create a vector store
    embedding_function = get_embedding_function()
    vectorstore_id = "test_metadata_store"
    vectorstore_path = f"data/vectorstores/{vectorstore_id}"
    
    # Delete existing vector store if it exists
    import shutil
    if os.path.exists(vectorstore_path):
        shutil.rmtree(vectorstore_path)
    
    create_vector_store(
        vectorstore_id=vectorstore_id,
        documents=processed_docs,
        embedding_function=embedding_function,
        metadata=doc_metadata
    )
    
    # Query the vector store
    results = query_vector_store(
        vectorstore_id=vectorstore_id,
        query_text="test document",
        embedding_function=embedding_function,
    )
    
    # Check metadata in results
    if not results or not results.get('results'):
        logger.error("No results returned from query")
        return False
    
    # Print all results for inspection
    logger.info(f"Found {len(results['results'])} results")
    for i, result in enumerate(results['results']):
        logger.info(f"Result {i+1}:")
        logger.info(f"  Content: {result.get('content')}")
        logger.info(f"  Metadata: {json.dumps(result.get('metadata', {}), indent=2)}")
        
        # Check if metadata was preserved
        metadata = result.get('metadata', {})
        if metadata.get('security_classification') != original_metadata['security_classification']:
            logger.error(f"Security classification mismatch: expected {original_metadata['security_classification']}, got {metadata.get('security_classification')}")
            return False
        
        if metadata.get('original_filename') != original_metadata['original_filename']:
            logger.error(f"Original filename mismatch: expected {original_metadata['original_filename']}, got {metadata.get('original_filename')}")
            return False
        
    logger.info("Metadata preservation test PASSED!")
    return True

def clean_up():
    """Clean up test files."""
    logger.info("Cleaning up test files")
    
    # Remove test directory
    test_dir = Path("data/test_metadata")
    if test_dir.exists():
        import shutil
        shutil.rmtree(test_dir)
    
    # Remove test vector store
    vectorstore_path = Path("data/vectorstores/test_metadata_store")
    if vectorstore_path.exists():
        import shutil
        shutil.rmtree(vectorstore_path)

if __name__ == "__main__":
    try:
        success = test_metadata_preservation()
        if success:
            logger.info("All tests PASSED!")
        else:
            logger.error("Tests FAILED!")
        
        # Clean up unless we want to keep the test data for inspection
        if os.environ.get("KEEP_TEST_DATA", "false").lower() != "true":
            clean_up()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.exception("Test failed with exception:")
        sys.exit(1) 