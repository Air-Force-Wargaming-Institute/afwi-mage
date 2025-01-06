from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain.schema import Document, HumanMessage, AIMessage
from typing import List
import os
from fastapi import APIRouter
from config import API_KEY, BASE_URL, PERSIST_DIR, UPLOAD_DIR

EMBEDDINGS = OpenAIEmbeddings(check_embedding_ctx_length=False, api_key=API_KEY, base_url=BASE_URL, model="nomic-ai/nomic-embed-text-v1.5-GGUF")
FOLDER_PATH = "./pdfs"
PERSIST_DIR = "./vectorstore"

def load_documents(folder_path: str) -> List[Document]:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100, add_start_index=True)
    docs = []

    for f in os.listdir(folder_path):
        if f.lower().endswith('.pdf'):
            file_path = os.path.join(folder_path, f)
            print(f"Loading {file_path}")
            try:
                loader = PyPDFLoader(file_path)
                pdf_docs = loader.load_and_split(text_splitter=text_splitter)
                docs.extend(pdf_docs)
                print(f"Loaded {len(pdf_docs)} sections from {f}")
            except Exception as e:
                print(f"Error loading {f}: {str(e)}")
        else:
            print(f"Skipping non-PDF file: {f}")
        
    print(f"Total documents loaded: {len(docs)}")
    return docs

# Create the vector store if one does not exist, or add new documents to the existing store
def create_or_update_vectorstore(documents: List[Document], vector_store: FAISS = None) -> FAISS:
    if vector_store:
        print("Adding new documents to existing vector store")
        vector_store.add_documents(documents)
    else:
        print("Creating new vector store")
        vector_store = FAISS.from_documents(documents=documents, embedding=EMBEDDINGS)

    return vector_store

def main():
    vector_store = None
    if os.path.exists(PERSIST_DIR):
        print(f"Loading existing vector store from {PERSIST_DIR}")
        vector_store = FAISS.load_local(PERSIST_DIR, EMBEDDINGS, allow_dangerous_deserialization=True)

    # Load any documents the user wants to add to the vector store
    new_docs = load_documents(FOLDER_PATH)
    if new_docs:
        vector_store = create_or_update_vectorstore(new_docs, vector_store)
        vector_store.save_local(PERSIST_DIR)
    elif not vector_store:
        print("No documents supplied, and no existing knowledge base. Please supply an existing vector store, documents, or both and run again.\nProgram exiting...")
        return
    
if __name__ == "__main__":
    main()

router = APIRouter()
