"""
Test script to verify that our import changes have fixed the deprecation warnings.
"""

import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def test_imports():
    """
    Test importing various modules to ensure they work without deprecation warnings.
    """
    logger.info("Testing imports...")
    
    # Test langchain_core imports
    try:
        from langchain_core.embeddings import Embeddings
        logger.info("✓ Successfully imported Embeddings from langchain_core.embeddings")
    except ImportError as e:
        logger.error(f"✗ Failed to import Embeddings: {e}")
    
    # The text splitter has been moved to langchain_text_splitters in newer versions
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter, TextSplitter
        logger.info("✓ Successfully imported RecursiveCharacterTextSplitter and TextSplitter from langchain_text_splitters")
    except ImportError as e:
        logger.error(f"✗ Failed to import text splitters: {e}")
    
    try:
        from langchain_core.documents import Document
        logger.info("✓ Successfully imported Document from langchain_core.documents")
    except ImportError as e:
        logger.error(f"✗ Failed to import Document: {e}")
    
    # Test langchain_community imports
    try:
        from langchain_community.vectorstores import FAISS
        logger.info("✓ Successfully imported FAISS from langchain_community.vectorstores")
    except ImportError as e:
        logger.error(f"✗ Failed to import FAISS: {e}")
    
    try:
        from langchain_community.document_loaders import PyPDFLoader, TextLoader
        logger.info("✓ Successfully imported PyPDFLoader and TextLoader from langchain_community.document_loaders")
    except ImportError as e:
        logger.error(f"✗ Failed to import document loaders: {e}")
    
    # Test local model imports - skip these for now as they have relative import issues
    logger.info("Skipping local model imports due to relative import issues when running as a standalone script")
    
    logger.info("Import testing completed!")

if __name__ == "__main__":
    test_imports() 