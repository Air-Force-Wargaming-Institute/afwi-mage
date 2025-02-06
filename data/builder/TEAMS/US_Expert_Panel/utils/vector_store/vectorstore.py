import os
from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_core.retrievers import BaseRetriever
from langchain_openai import OpenAIEmbeddings

from team_config import load_config


def check_for_vectorstore(vector_store_path: str) -> bool:
    return os.path.exists(vector_store_path)

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
    config = load_config()
    API_KEY = config['API_KEY']
    BASE_URL = config['BASE_URL']
    #EMBEDDINGS = OpenAIEmbeddings(check_embedding_ctx_length=False, api_key=API_KEY, base_url=BASE_URL, model="nomic-ai/nomic-embed-text-v1.5-GGUF")
    EMBEDDINGS = OpenAIEmbeddings(check_embedding_ctx_length=False, api_key=API_KEY, base_url=BASE_URL, model="nomic-embed-text:latest")

    try:
        return FAISS.load_local(vector_store_path, EMBEDDINGS, allow_dangerous_deserialization=True)
    except Exception as e:
        return None 
    
def update_vectorstore(vector_store: FAISS, documents: List[Document]) -> FAISS:
    pass
