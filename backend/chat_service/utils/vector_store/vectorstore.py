import os
from typing import List, Optional
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_core.retrievers import BaseRetriever
from langchain_core.embeddings import Embeddings
from langchain_ollama.embeddings import OllamaEmbeddings
from pathlib import Path
from config_ import load_config
import logging

logger = logging.getLogger(__name__)

def get_vectorstore_path(vectorstore_name: str) -> str:
    """
    Standardize the vectorstore path to always be /app/data/vectorstores/{vectorstore_name}/
    
    Args:
        vectorstore_name: The name of the vectorstore
        
    Returns:
        The standardized path to the vectorstore
    """
    # Ensure we're just using the name without any path components
    vectorstore_name = os.path.basename(vectorstore_name)
    return str(Path("/app/data/vectorstores") / vectorstore_name)


def check_for_vectorstore(vector_store_path: str) -> bool:
    """
    Check if a vectorstore exists at the given path
    
    Args:
        vector_store_path: The name or path of the vectorstore
        
    Returns:
        True if the vectorstore exists, False otherwise
    """
    # Standardize the path
    path = get_vectorstore_path(vector_store_path)
    return os.path.exists(path)


def create_retriever(type: str, vector_store: FAISS, k: int=10) -> BaseRetriever:
    if type == "similarity":
        return vector_store.as_retriever(search_kwargs={"k": k})
    elif type == "mmr":
        return vector_store.as_retriever(search_type="mmr", search_kwargs={"k": k})
    elif type == "similarity_score_threshold":
        return vector_store.as_retriever(search_type="similarity_score_threshold", search_kwargs={"k": k, "score_threshold": 0.5})
    else:
        raise ValueError("Invalid retriever type")
    

def load_local_vectorstore(
    texts: Optional[List[Document]] = None,
    embeddings: Optional[Embeddings] = None,
    persist_directory: Optional[str] = None,
    index_name: str = "index",
    allow_dangerous_deserialization: bool = True,
) -> FAISS:
    """
    Load a vectorstore from the given path or create a new one if texts are provided
    """
    config = load_config()
    
    if embeddings is None:
        embeddings = OllamaEmbeddings(
            model="nomic-embed",
            base_url="http://ollama:11434"
        )

    # Standardize the path
    path = get_vectorstore_path(persist_directory) if persist_directory else None
    
    try:
        if path and os.path.exists(path):
            logger.info(f"Loading existing vectorstore from {path}")
            return FAISS.load_local(path, embeddings, allow_dangerous_deserialization=allow_dangerous_deserialization)
        elif texts:
            logger.info("Creating new vectorstore from texts")
            vectorstore = FAISS.from_documents(texts, embeddings)
            if path:
                logger.info(f"Saving vectorstore to {path}")
                vectorstore.save_local(path)
            return vectorstore
        else:
            logger.warning("No existing vectorstore found and no texts provided")
            return None
    except Exception as e:
        logger.error(f"Error loading/creating vectorstore: {e}")
        return None


def update_vectorstore(vector_store: FAISS, documents: List[Document]) -> FAISS:
    pass
