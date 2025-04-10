from core.vectorstore import VectorStoreManager
from config import get_config

config = get_config()

def get_vectorstore_manager():
    """
    Get a vector store manager instance.
    
    Returns:
        VectorStoreManager: Vector store manager instance
    """
    # Initialize with default value
    VECTORSTORE_DIR = config.get("VECTORSTORE_DIR", None)
    
    return VectorStoreManager(VECTORSTORE_DIR)