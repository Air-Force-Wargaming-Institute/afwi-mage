"""
Test script to verify vector store creation functionality.
"""

import os
import sys
import logging
from pathlib import Path
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Import necessary modules
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.embeddings import Embeddings

# Define a mock embedding model for testing
class MockEmbeddings(Embeddings):
    """Mock embeddings class for testing."""
    def embed_documents(self, texts):
        return [[0.1] * 10 for _ in texts]
    
    def embed_query(self, text):
        return [0.1] * 10

def test_vectorstore_creation():
    """Test creating a simple vector store."""
    # Create a temporary directory for the test
    test_dir = Path("./test_vectorstore_tmp")
    if test_dir.exists():
        shutil.rmtree(test_dir)
    test_dir.mkdir(exist_ok=True)
    
    try:
        logger.info("Testing vector store creation...")
        
        # Create some sample documents
        sample_texts = [
            "This is a test document about artificial intelligence.",
            "Vector databases are used to store embeddings.",
            "Embeddings represent text as numerical vectors.",
            "Machine learning models can process these vectors efficiently."
        ]
        
        documents = [Document(page_content=text, metadata={"source": f"sample_{i}"}) 
                     for i, text in enumerate(sample_texts)]
        
        # Use mock embedding model for testing
        embedding_model = MockEmbeddings()
        logger.info("Using mock embedding model for testing")
        
        # Create vector store directly with FAISS
        logger.info("Creating FAISS vector store...")
        vectorstore = FAISS.from_documents(documents, embedding_model)
        
        # Save the vector store
        vs_path = test_dir / "test_vs"
        vs_path.mkdir(exist_ok=True)
        vectorstore.save_local(str(vs_path))
        logger.info(f"Vector store saved to {vs_path}")
        
        # Load the vector store again to verify it works
        loaded_vectorstore = FAISS.load_local(str(vs_path), embedding_model)
        logger.info("Successfully loaded vector store")
        
        # Test similarity search
        query = "What is artificial intelligence?"
        results = loaded_vectorstore.similarity_search(query, k=2)
        logger.info(f"Similarity search results count: {len(results)}")
        for i, doc in enumerate(results):
            logger.info(f"Result {i+1}: {doc.page_content[:50]}...")
        
        logger.info("Vector store test completed successfully!")
        return True
    
    except Exception as e:
        logger.error(f"Error in vector store test: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up the test directory
        if test_dir.exists():
            shutil.rmtree(test_dir)
            logger.info(f"Cleaned up test directory: {test_dir}")

if __name__ == "__main__":
    success = test_vectorstore_creation()
    if success:
        logger.info("✓ Vector store test passed")
    else:
        logger.error("✗ Vector store test failed")
        sys.exit(1) 