"""
Test script for verifying batched document processing.
"""
import os
import logging
import sys
import json
import uuid
from pathlib import Path
import shutil
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    # Import directly from app
    from app import (
        load_documents, 
        get_document_loader, 
        ParagraphTextSplitter, 
        RecursiveCharacterTextSplitter,
        VectorStoreManager,
        get_embedding_model
    )
except ImportError as e:
    logger.error(f"Error importing modules: {e}")
    logger.error("Make sure you're running this script from the embedding_service directory")
    raise

def create_dummy_files(temp_dir: Path, num_files: int = 10) -> List[Path]:
    """Create dummy text files for testing batch processing."""
    file_paths = []
    
    # Create temp directory if it doesn't exist
    os.makedirs(temp_dir, exist_ok=True)
    
    for i in range(num_files):
        # Create text with multiple paragraphs
        paragraphs = []
        for j in range(5):  # 5 paragraphs per file
            paragraphs.append(f"This is paragraph {j+1} in file {i+1}. " * 10)
        
        content = "\n\n".join(paragraphs)
        
        # Create the file
        file_path = temp_dir / f"test_file_{i+1}.txt"
        with open(file_path, 'w') as f:
            f.write(content)
        
        file_paths.append(file_path)
        logger.info(f"Created test file: {file_path}")
    
    return file_paths

def test_document_batch_processing():
    """Test document batch processing."""
    # Create temp directory for test files
    temp_dir = Path("./temp_test_files")
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Create test files
        num_files = 20
        file_paths = create_dummy_files(temp_dir, num_files)
        
        # Test batch processing with different batch sizes
        batch_sizes = [1, 5, 10, 20]
        
        for batch_size in batch_sizes:
            logger.info(f"\n\n----- Testing with batch size: {batch_size} -----")
            
            # Process documents in batches
            start_time = __import__('time').time()
            documents, skipped_files = load_documents(
                file_paths=[str(p) for p in file_paths],
                use_paragraph_chunking=True,
                max_paragraph_length=1500,
                min_paragraph_length=50,
                batch_size=batch_size
            )
            end_time = __import__('time').time()
            
            # Log results
            logger.info(f"Processed {len(documents)} documents in {end_time - start_time:.2f} seconds")
            logger.info(f"Number of skipped files: {len(skipped_files)}")
            logger.info(f"Average document length: {sum(len(doc.page_content) for doc in documents) / len(documents):.0f} chars")
        
        logger.info("\nDocument batch processing test completed successfully!")
        
    finally:
        # Clean up
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up test directory: {temp_dir}")

def test_vectorstore_batch_processing():
    """Test vector store creation with batched document processing."""
    # Create temp directories
    temp_dir = Path("./temp_test_files")
    vs_dir = Path("./temp_vectorstores")
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(vs_dir, exist_ok=True)
    
    try:
        # Create test files
        num_files = 15
        file_paths = create_dummy_files(temp_dir, num_files)
        
        # Get embedding model
        embedding_model = get_embedding_model("nomic-embed-text")
        
        # Process documents
        logger.info("Loading documents...")
        documents, skipped_files = load_documents(
            file_paths=[str(p) for p in file_paths],
            use_paragraph_chunking=True,
            max_paragraph_length=1500,
            min_paragraph_length=50,
            batch_size=5
        )
        
        # Create file infos for metadata
        file_infos = []
        for file_path in file_paths:
            file_info = {
                "filename": file_path.name,
                "original_path": str(file_path),
                "staged_path": str(file_path),
                "security_classification": "UNCLASSIFIED",
                "content_security_classification": "UNCLASSIFIED"
            }
            file_infos.append(file_info)
        
        # Create vector store manager
        manager = VectorStoreManager(vs_dir)
        
        # Test with different batch sizes
        doc_batch_sizes = [10, 25, 50]
        
        for batch_size in doc_batch_sizes:
            logger.info(f"\n\n----- Testing vector store creation with batch size: {batch_size} -----")
            
            # Create vector store
            start_time = __import__('time').time()
            vs_id = manager.create_vectorstore(
                name=f"Test VS Batch {batch_size}",
                description=f"Test vector store with batch size {batch_size}",
                documents=documents,
                embedding_model=embedding_model,
                model_name="nomic-embed-text",
                file_infos=file_infos,
                use_paragraph_chunking=True,
                max_paragraph_length=1500,
                min_paragraph_length=50,
                batch_size=batch_size
            )
            end_time = __import__('time').time()
            
            # Log results
            logger.info(f"Created vector store with ID: {vs_id}")
            logger.info(f"Creation time: {end_time - start_time:.2f} seconds")
            
            # Verify vector store
            vs_info = manager.get_vectorstore_info(vs_id)
            logger.info(f"Vector store metadata: {json.dumps(vs_info, indent=2)}")
        
        logger.info("\nVector store batch processing test completed successfully!")
        
    finally:
        # Clean up
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up test directory: {temp_dir}")
        
        if vs_dir.exists():
            shutil.rmtree(vs_dir)
            logger.info(f"Cleaned up vector store directory: {vs_dir}")

if __name__ == "__main__":
    logger.info("Starting batch processing tests...")
    
    # Test document batch processing
    test_document_batch_processing()
    
    # Test vector store batch processing
    test_vectorstore_batch_processing()
    
    logger.info("All batch processing tests completed successfully!") 