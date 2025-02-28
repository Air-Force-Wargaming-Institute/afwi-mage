import os
from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_core.retrievers import BaseRetriever
from langchain_openai import OpenAIEmbeddings
from pathlib import Path
from config_ import load_config


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
    

def load_local_vectorstore(vector_store_path: str) -> FAISS:
    """
    Load a vectorstore from the given path
    
    Args:
        vector_store_path: The name or path of the vectorstore
        
    Returns:
        The loaded vectorstore, or None if it couldn't be loaded
    """
    config = load_config()
    API_KEY = config['API_KEY']
    BASE_URL = config['BASE_URL']
    #EMBEDDINGS = OpenAIEmbeddings(check_embedding_ctx_length=False, api_key=API_KEY, base_url=BASE_URL, model="nomic-ai/nomic-embed-text-v1.5-GGUF")
    EMBEDDINGS = OpenAIEmbeddings(check_embedding_ctx_length=False, api_key=API_KEY, base_url=BASE_URL, model="nomic-embed-text:latest")

    # Standardize the path
    path = get_vectorstore_path(vector_store_path)
    
    try:
        return FAISS.load_local(path, EMBEDDINGS, allow_dangerous_deserialization=True)
    except Exception as e:
        return None 
    

def update_vectorstore(vector_store: FAISS, documents: List[Document]) -> FAISS:
    pass
