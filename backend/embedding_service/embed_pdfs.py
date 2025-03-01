from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain.schema import Document, HumanMessage, AIMessage
from typing import List
import os
from fastapi import APIRouter, Request
from config import API_KEY, BASE_URL, PERSIST_DIR, UPLOAD_DIR
from fastapi.responses import JSONResponse
import json
import shutil
import datetime

EMBEDDINGS = OpenAIEmbeddings(check_embedding_ctx_length=False, api_key=API_KEY, base_url=BASE_URL, model="nomic-embed-text")
FOLDER_PATH = "./pdfs"
PERSIST_DIR = "../data/vectorstores"

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

@router.post("/create-vectorstore")
async def create_vectorstore(request: Request):
    try:
        data = await request.json()
        name = data.get("name")
        description = data.get("description", "")
        files = data.get("files", [])
        embedding_model = data.get("embedding_model", "nomic-embed-text")
        chunk_size = data.get("chunk_size", 1000)
        chunk_overlap = data.get("chunk_overlap", 100)
        
        if not name:
            return JSONResponse(
                status_code=400,
                content={"detail": "Vector store name is required"}
            )
        
        if not files:
            return JSONResponse(
                status_code=400,
                content={"detail": "At least one file must be selected"}
            )
            
        # Define a path for storing the PDFs based on the vector store name
        vs_pdfs_dir = os.path.join(FOLDER_PATH, name)
        os.makedirs(vs_pdfs_dir, exist_ok=True)
        
        # Copy selected files to the PDF folder for this vector store
        for file_path in files:
            source_path = os.path.join("../data/uploads", file_path)
            if os.path.exists(source_path):
                dest_filename = os.path.basename(file_path)
                dest_path = os.path.join(vs_pdfs_dir, dest_filename)
                shutil.copy2(source_path, dest_path)
        
        # Load documents from the folder
        documents = load_documents(vs_pdfs_dir)
        
        if not documents:
            return JSONResponse(
                status_code=400,
                content={"detail": "No valid documents were found or could be processed"}
            )
        
        # Use the appropriate embedding model based on selection
        if embedding_model == "text-embedding-ada-002":
            embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")
        elif embedding_model == "text-embedding-3-small":
            embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        elif embedding_model == "text-embedding-3-large":
            embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        else:  # Default to nomic-embed-text
            embeddings = OpenAIEmbeddings(model="nomic-embed-text")
        
        # Set the vector store directory based on name
        vs_dir = os.path.join(PERSIST_DIR, name)
        
        # Create text splitter with specified chunk settings
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        # Split documents into chunks
        splits = text_splitter.split_documents(documents)
        
        # Create the vector store
        vectorstore = FAISS.from_documents(splits, embeddings)
        
        # Save the vector store
        vectorstore.save_local(vs_dir)
        
        # Save metadata
        metadata = {
            "name": name,
            "description": description,
            "embedding_model": embedding_model,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap,
            "file_count": len(files),
            "created_at": datetime.datetime.now().isoformat(),
            "files": files
        }
        
        with open(os.path.join(vs_dir, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"Vector store '{name}' successfully created!",
                "name": name,
                "file_count": len(files)
            }
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error creating vector store: {str(e)}"}
        )

@router.get("/vectorstores")
async def list_vectorstores():
    try:
        vs_list = []
        for vs_name in os.listdir(PERSIST_DIR):
            vs_path = os.path.join(PERSIST_DIR, vs_name)
            if os.path.isdir(vs_path):
                metadata_path = os.path.join(vs_path, "metadata.json")
                metadata = {}
                if os.path.exists(metadata_path):
                    with open(metadata_path, "r") as f:
                        metadata = json.load(f)
                
                vs_list.append({
                    "name": vs_name,
                    "description": metadata.get("description", ""),
                    "file_count": metadata.get("file_count", 0),
                    "created_at": metadata.get("created_at", ""),
                    "embedding_model": metadata.get("embedding_model", ""),
                })
        
        return JSONResponse(
            status_code=200,
            content=vs_list
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error listing vector stores: {str(e)}"}
        )

@router.delete("/vectorstores/{vectorstore_name}")
async def delete_vectorstore(vectorstore_name: str):
    try:
        vs_path = os.path.join(PERSIST_DIR, vectorstore_name)
        if not os.path.exists(vs_path):
            return JSONResponse(
                status_code=404,
                content={"detail": f"Vector store '{vectorstore_name}' not found"}
            )
        
        # Delete the vector store directory
        shutil.rmtree(vs_path)
        
        # Also delete associated PDF folder if it exists
        vs_pdfs_dir = os.path.join(FOLDER_PATH, vectorstore_name)
        if os.path.exists(vs_pdfs_dir):
            shutil.rmtree(vs_pdfs_dir)
        
        return JSONResponse(
            status_code=200,
            content={"message": f"Vector store '{vectorstore_name}' successfully deleted"}
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error deleting vector store: {str(e)}"}
        )
