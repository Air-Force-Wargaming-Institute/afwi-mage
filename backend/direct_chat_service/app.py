from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set, Tuple, Any
from datetime import datetime
from config import config
from langchain_ollama import ChatOllama
from langchain_ollama import OllamaEmbeddings
from langchain_community.llms.vllm import VLLMOpenAI
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from fastapi import APIRouter
import uuid
import os
from pathlib import Path
import asyncio
import shutil
import json
from chat_logger import ChatLogger
import logging

# Add these imports for vectorstore functionality and fallback loading
from langchain_community.vectorstores import FAISS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("direct_chat_service")

# Define constants for paths
SESSIONS_DIR = Path("sessions")
VECTORSTORES_DIR = Path("data/vectorstores")

# Setup FastAPI
app = FastAPI(
    title="Direct Chat Service",
    description="Service for direct chat interactions using Ollama and LangChain",
    version="1.0.0"
)

# Add API router with prefix
router = APIRouter(prefix=config.api.prefix)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicitly include DELETE and OPTIONS
    allow_headers=["*"],  # Allow all headers for simplicity
    expose_headers=["*"],  # Expose all headers
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Add after the imports, before app initialization
DEFAULT_USER = "admin"

# Initialize ChatLogger
chat_logger = ChatLogger(SESSIONS_DIR)

# Function to log messages to the chat history
def append_message_to_log(session_id, message_data, user_id=DEFAULT_USER):
    """
    Append a message to the chat log for the given session.
    
    Args:
        session_id (str): The session identifier
        message_data (dict): The message data to log
        user_id (str): The user identifier
    """
    try:
        # Use asyncio.create_task to run the async function in the background
        asyncio.create_task(chat_logger.log_message(user_id, session_id, message_data))
    except Exception as e:
        logging.error(f"Error logging message: {str(e)}")

# Pydantic models
class Message(BaseModel):
    text: str
    sender: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    message: str  # Changed from 'response' to match frontend expectation
    timestamp: datetime

class DocumentState(BaseModel):
    isChecked: bool = False
    lastModified: datetime = Field(default_factory=datetime.now)
    markdownSize: int = 0
    originalName: str
    markdownPath: Optional[str] = None
    classification: str = "SELECT CLASSIFICATION"  # Add new field with default value

class DocumentMetadata(BaseModel):
    originalName: str
    uploadedAt: datetime
    markdownSize: int
    status: str = "pending"  # pending, converted, failed
    error: Optional[str] = None  # Add error field

class ChatSession(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    documentStates: Dict[str, DocumentState] = Field(default_factory=dict)

class UpdateDocumentClassificationRequest(BaseModel):
    classification: str

class SetVectorstoreRequest(BaseModel):
    vectorstore: str

# Store active chat sessions
chat_sessions: Dict[str, ChatSession] = {}

# Add after the chat_sessions dictionary
document_metadata: Dict[str, Dict[str, DocumentMetadata]] = {}  # session_id -> {doc_id -> metadata}

# Initialize LangChain components
llm = VLLMOpenAI(
    openai_api_base="http://host.docker.internal:8007/v1", # Connect to local vLLM server running on port 8000
    openai_api_key="dummy-key",  # Required by the wrapper but not actually verified by vLLM
    model_name=config.model_service.default_model,
    temperature=config.model_service.temperature,
    top_p=config.model_service.top_p,
    max_tokens=config.model_service.context_window,  # Using context_window as max_tokens
    stop=config.model_service.stop
)

# Create chat prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "At the beginning of your response, you should open with MY CONTEXT and tell the user a little about the documents you were provided as context to answer the user's question. If the documents that are provided to you do not contain information that clearly informs your answer to the user's question, then you should say so explicitly. If you do have any information from the documents that informs your answer to the user's question, then you should say so explicitly. This is to let the user know that you are not just guessing or making up an answer. This helps the user to understand the context you are working with. You are a helpful and professional assistant that does not embellish, is not verbose, and does not use emojis. Write all of your responses in markdown format. You are a deep thinking AI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

# Create the chain
chain = prompt | llm

# Store message histories
histories: Dict[str, ChatMessageHistory] = {}

# Create runnable with message history
chat_with_history = RunnableWithMessageHistory(
    chain,
    lambda session_id: get_or_create_history(session_id),
    input_messages_key="input",
    history_messages_key="history"
)

async def reconstruct_chat_history(session_id: str, user_id: str = DEFAULT_USER) -> ChatMessageHistory:
    """Reconstruct a ChatMessageHistory object from the JSONL log file."""
    try:
        history = ChatMessageHistory()
        messages = await chat_logger.load_history(user_id, session_id)
        
        for msg in messages:
            if msg["sender"] == "user":
                history.add_user_message(msg["content"])
            elif msg["sender"] == "ai":
                history.add_ai_message(msg["content"])
            # Skip system messages or unknown types
        
        return history
    except Exception as e:
        print(f"Error reconstructing chat history for session {session_id}: {str(e)}")
        return ChatMessageHistory()  # Return empty history on error

def get_or_create_history(session_id: str, user_id: str = DEFAULT_USER) -> ChatMessageHistory:
    """Get or create a message history for a session ID."""
    if session_id not in histories:
        # Try to load existing history from file
        loop = asyncio.get_event_loop()
        histories[session_id] = loop.run_until_complete(
            reconstruct_chat_history(session_id, user_id)
        )
    return histories[session_id]

# Add before the router definitions
def ensure_session_directory(session_id: str, user_id: str = DEFAULT_USER) -> Path:
    """Ensure the base session directory exists with all required subdirectories"""
    # Create user directory
    user_path = SESSIONS_DIR / user_id
    user_path.mkdir(parents=True, exist_ok=True)
    
    # Create session directory
    session_path = user_path / session_id
    session_path.mkdir(exist_ok=True)
    
    # Create UserDocs subdirectory
    docs_path = session_path / "UserDocs"
    docs_path.mkdir(exist_ok=True)
    
    # Create a .gitkeep file in the UserDocs directory to ensure Git tracks it
    gitkeep_path = docs_path / ".gitkeep"
    if not gitkeep_path.exists():
        with open(gitkeep_path, 'w') as f:
            pass  # Create an empty file
    
    return session_path

def ensure_session_docs_directory(session_id: str, user_id: str = DEFAULT_USER) -> Path:
    """Ensure the session's document directory exists"""
    return (SESSIONS_DIR / user_id / session_id / "UserDocs").resolve()

def get_document_size(file_path: Path) -> int:
    """Get file size in bytes"""
    try:
        return file_path.stat().st_size
    except FileNotFoundError:
        return 0

@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@router.put("/chat/session/{session_id}/documents/{doc_id}/toggle")
async def toggle_document_state(
    session_id: str,
    doc_id: str,
    user_id: str = DEFAULT_USER
):
    """Toggle the checked state of a document"""
    try:
        if session_id not in chat_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = chat_sessions[session_id]
        
        if doc_id not in session.documentStates:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Ensure we're working with a proper DocumentState object
        doc_state = session.documentStates[doc_id]
        if not isinstance(doc_state, DocumentState):
            if isinstance(doc_state, dict):
                doc_state = DocumentState(**doc_state)
                session.documentStates[doc_id] = doc_state
        
        # Toggle the checked state
        doc_state.isChecked = not doc_state.isChecked
        doc_state.lastModified = datetime.now()
        
        # Save the updated metadata
        save_session_metadata(session_id, user_id)
        
        return {"docId": doc_id, "isChecked": doc_state.isChecked}
        
    except Exception as e:
        print(f"Error in toggle_document_state: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/session/{session_id}/documents/states")
async def get_document_states(session_id: str):
    """Get all document states for a session"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = chat_sessions[session_id]
    return session.documentStates

# Add before the router definitions
async def convert_to_markdown(file_path: Path, output_path: Path) -> Optional[str]:
    """Convert a document to markdown format"""
    try:
        # For now, just copy text files as-is
        if file_path.suffix.lower() in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return None
            
        # For other file types, we'll need to implement conversion
        # This is a placeholder for future implementation
        raise NotImplementedError(f"Conversion not implemented for {file_path.suffix} files")
        
    except Exception as e:
        return str(e)

async def process_document(session_id: str, doc_id: str, user_id: str = DEFAULT_USER):
    """Process an uploaded document"""
    if session_id not in chat_sessions or doc_id not in chat_sessions[session_id].documentStates:
        return
    
    session = chat_sessions[session_id]
    doc_state = session.documentStates[doc_id]
    docs_dir = ensure_session_docs_directory(session_id, user_id)
    
    original_path = docs_dir / f"original_{doc_state.originalName}"
    markdown_path = docs_dir / f"{doc_id}.md"
    
    # Update metadata status
    document_metadata[session_id][doc_id].status = "processing"
    save_session_metadata(session_id, user_id)  # Save initial processing state
    
    try:
        # Convert document
        error = await convert_to_markdown(original_path, markdown_path)
        
        if error:
            document_metadata[session_id][doc_id].status = "failed"
            document_metadata[session_id][doc_id].error = error
        else:
            # Update document state
            doc_state.markdownPath = str(markdown_path)
            doc_state.markdownSize = get_document_size(markdown_path)
            doc_state.lastModified = datetime.now()
            
            # Update metadata
            document_metadata[session_id][doc_id].status = "ready"
            document_metadata[session_id][doc_id].markdownSize = doc_state.markdownSize
            document_metadata[session_id][doc_id].error = None
    except Exception as e:
        document_metadata[session_id][doc_id].status = "failed"
        document_metadata[session_id][doc_id].error = str(e)
    finally:
        # Save final state
        save_session_metadata(session_id, user_id)

# Add after the imports
from fastapi import HTTPException, UploadFile, File, BackgroundTasks

# Add before the router definitions
def cleanup_session_files(session_id: str, user_id: str = DEFAULT_USER):
    """Clean up files for a session"""
    try:
        session_dir = SESSIONS_DIR / user_id / session_id
        if session_dir.exists():
            shutil.rmtree(session_dir)
    except Exception as e:
        print(f"Error cleaning up session {session_id}: {str(e)}")

def cleanup_document_files(session_id: str, doc_id: str, user_id: str = DEFAULT_USER, cleanup_info: dict = None):
    """Clean up files for a document"""
    try:
        print(f"Starting cleanup for document {doc_id} in session {session_id}")
        docs_dir = ensure_session_docs_directory(session_id, user_id)
        print(f"Documents directory: {docs_dir}")
        
        if cleanup_info:
            # Use the stored info to delete files
            original_name = cleanup_info["original_name"]
            markdown_path = cleanup_info["markdown_path"]
            
            # Remove original file
            original_path = docs_dir / f"original_{original_name}"
            print(f"Attempting to delete original file: {original_path}")
            if original_path.exists():
                original_path.unlink()
                print(f"Deleted original file: {original_path}")
            else:
                print(f"Original file not found: {original_path}")
            
            # Remove markdown file if it exists
            if markdown_path:
                # Convert absolute path to relative path if needed
                markdown_path = Path(markdown_path)
                if markdown_path.is_absolute():
                    try:
                        relative_path = markdown_path.relative_to('/app/sessions')
                        markdown_path = SESSIONS_DIR / relative_path
                    except ValueError:
                        markdown_path = docs_dir / f"{doc_id}.md"
                print(f"Attempting to delete markdown file: {markdown_path}")
                if markdown_path.exists():
                    markdown_path.unlink()
                    print(f"Deleted markdown file: {markdown_path}")
                else:
                    print(f"Markdown file not found: {markdown_path}")
            else:
                # Try default markdown path
                markdown_path = docs_dir / f"{doc_id}.md"
                print(f"Attempting to delete default markdown file: {markdown_path}")
                if markdown_path.exists():
                    markdown_path.unlink()
                    print(f"Deleted default markdown file: {markdown_path}")
                else:
                    print(f"Default markdown file not found: {markdown_path}")
        else:
            print(f"No cleanup info provided for document {doc_id}")
                
    except Exception as e:
        print(f"Error cleaning up document {doc_id} in session {session_id}: {str(e)}")
        print(f"Exception type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

# Add new endpoints for document management
@router.delete("/chat/session/{session_id}/documents/{doc_id}")
async def delete_document(
    session_id: str,
    doc_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = DEFAULT_USER
):
    """Delete a document and its files"""
    try:
        if session_id not in chat_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = chat_sessions[session_id]
        
        if doc_id not in session.documentStates:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Ensure we're working with proper DocumentState object
        doc_state = session.documentStates[doc_id]
        if not isinstance(doc_state, DocumentState):
            # Convert dict to DocumentState if necessary
            if isinstance(doc_state, dict):
                if "lastModified" in doc_state and isinstance(doc_state["lastModified"], str):
                    doc_state["lastModified"] = datetime.fromisoformat(doc_state["lastModified"])
                doc_state = DocumentState(**doc_state)
                session.documentStates[doc_id] = doc_state
        
        # Create cleanup info
        cleanup_info = {
            "original_name": doc_state.originalName,
            "markdown_path": doc_state.markdownPath
        }
        
        # Remove document state
        del session.documentStates[doc_id]
        
        # Remove metadata
        if session_id in document_metadata and doc_id in document_metadata[session_id]:
            del document_metadata[session_id][doc_id]
        
        # Save updated metadata
        save_session_metadata(session_id, user_id)
        
        # Schedule cleanup with the stored info
        background_tasks.add_task(cleanup_document_files, session_id, doc_id, user_id, cleanup_info)
        
        return {"status": "success", "message": "Document deleted successfully"}
    except Exception as e:
        print(f"Error in delete_document: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/session/{session_id}")
async def delete_session(
    session_id: str,
    background_tasks: BackgroundTasks
):
    """Delete a session and all its files"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remove session
    del chat_sessions[session_id]
    
    # Remove metadata
    if session_id in document_metadata:
        del document_metadata[session_id]
    
    # Schedule cleanup
    background_tasks.add_task(cleanup_session_files, session_id)
    
    return {"status": "success"}

# Add after the imports
import json
from typing import Dict, Any

def save_session_metadata(session_id: str, user_id: str = DEFAULT_USER) -> None:
    """Save session metadata including document states to file"""
    try:
        session_dir = SESSIONS_DIR / user_id / session_id
        metadata_path = session_dir / "SessionMessages.metadata"
        
        logger.info(f"Saving metadata for session {session_id} to {metadata_path}")
        
        # Get session data
        session = chat_sessions.get(session_id)
        if not session:
            logger.warning(f"Session {session_id} not found in chat_sessions, skipping metadata save")
            return
            
        # Load existing metadata to get vectorstore setting
        existing_metadata = {}
        if metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    existing_metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load existing metadata for session {session_id}: {str(e)}")
        
        # Get the vectorstore from existing metadata
        vectorstore = existing_metadata.get("vectorstore", None)
        
        # Prepare metadata
        metadata = {
            "session_info": {
                "id": session.id,
                "name": session.name,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat()
            },
            "document_states": {
                doc_id: {
                    "originalName": state.originalName,
                    "markdownSize": state.markdownSize,
                    "markdownPath": state.markdownPath,
                    "isChecked": state.isChecked,
                    "lastModified": state.lastModified.isoformat(),
                    "classification": state.classification
                }
                for doc_id, state in session.documentStates.items()
            },
            "document_metadata": {
                doc_id: {
                    "originalName": meta.originalName,
                    "uploadedAt": meta.uploadedAt.isoformat(),
                    "markdownSize": meta.markdownSize,
                    "status": meta.status,
                    "error": meta.error
                }
                for doc_id, meta in document_metadata.get(session_id, {}).items()
            }
        }
        
        # Preserve the vectorstore setting if it exists
        if vectorstore is not None:
            # Include at top level for backward compatibility
            metadata["vectorstore"] = vectorstore
            # Also include in session_info for future consistency
            metadata["session_info"]["vectorstore"] = vectorstore
            logger.info(f"Session {session_id} saving with vectorstore: {vectorstore} (in both locations)")
        
        # Save to file
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Metadata saved successfully for session {session_id}")
            
    except Exception as e:
        logger.error(f"Error saving session metadata for session {session_id}: {str(e)}")
        print(f"Error saving session metadata: {str(e)}")

def load_session_metadata(session_id: str, user_id: str = DEFAULT_USER) -> Dict[str, Any]:
    """Load session metadata including document states from file"""
    try:
        session_dir = SESSIONS_DIR / user_id / session_id
        metadata_path = session_dir / "SessionMessages.metadata"
        
        logger.info(f"Loading metadata for session {session_id} from {metadata_path}")
        
        if not metadata_path.exists():
            logger.warning(f"Metadata file {metadata_path} does not exist for session {session_id}")
            return {}
            
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            
        # Check for vectorstore in both top-level and session_info
        vectorstore = None
        if "vectorstore" in metadata:
            vectorstore = metadata["vectorstore"]
            logger.info(f"Loaded session {session_id} with top-level vectorstore: {vectorstore}")
        elif "session_info" in metadata and isinstance(metadata["session_info"], dict) and "vectorstore" in metadata["session_info"]:
            vectorstore = metadata["session_info"]["vectorstore"]
            # Copy to top level for consistency
            metadata["vectorstore"] = vectorstore
            logger.info(f"Loaded session {session_id} with nested vectorstore: {vectorstore}")
        else:
            logger.info(f"Loaded session {session_id} has no vectorstore configured")
            
        # Convert document states to proper DocumentState objects
        if "document_states" in metadata:
            doc_count = len(metadata["document_states"])
            logger.info(f"Loaded {doc_count} document states for session {session_id}")
            
            converted_states = {}
            for doc_id, state in metadata["document_states"].items():
                # Convert datetime string back to datetime object
                if "lastModified" in state:
                    state["lastModified"] = datetime.fromisoformat(state["lastModified"])
                # Ensure classification has a default value if not present
                if "classification" not in state:
                    state["classification"] = "SELECT CLASSIFICATION"
                converted_states[doc_id] = DocumentState(**state)
            metadata["document_states"] = converted_states
            
        # Convert document metadata to proper DocumentMetadata objects
        if "document_metadata" in metadata:
            meta_count = len(metadata["document_metadata"])
            logger.info(f"Loaded {meta_count} document metadata entries for session {session_id}")
            
            converted_metadata = {}
            for doc_id, meta in metadata["document_metadata"].items():
                # Convert datetime string back to datetime object
                if "uploadedAt" in meta:
                    meta["uploadedAt"] = datetime.fromisoformat(meta["uploadedAt"])
                converted_metadata[doc_id] = DocumentMetadata(**meta)
            metadata["document_metadata"] = converted_metadata
            
        logger.info(f"Metadata loaded successfully for session {session_id}")
        return metadata
            
    except Exception as e:
        logger.error(f"Error loading session metadata for session {session_id}: {str(e)}")
        print(f"Error loading session metadata: {str(e)}")
        return {}

# Update the upload_document endpoint to save metadata after successful upload
@router.post("/chat/session/{session_id}/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    session_id: str,
    file: UploadFile = File(...),
    user_id: str = DEFAULT_USER
):
    """Upload a document and create its state"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = chat_sessions[session_id]
    docs_dir = ensure_session_docs_directory(session_id, user_id)
    
    # Check file size (100MB limit)
    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:  # 100MB
        raise HTTPException(status_code=400, detail="File too large (max 100MB)")
    
    # Generate unique document ID
    doc_id = f"{uuid.uuid4()}"
    
    # Save original file
    file_path = docs_dir / f"original_{file.filename}"
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    try:
        # Create document state
        doc_state = DocumentState(
            originalName=file.filename,
            markdownSize=get_document_size(file_path),
            markdownPath=None  # Will be set after conversion
        )
        
        # Update session
        session.documentStates[doc_id] = doc_state
        session.updated_at = datetime.now()
        
        # Create metadata entry
        if session_id not in document_metadata:
            document_metadata[session_id] = {}
        
        document_metadata[session_id][doc_id] = DocumentMetadata(
            originalName=file.filename,
            uploadedAt=datetime.now(),
            markdownSize=doc_state.markdownSize,
            status="pending"
        )
        
        # Save metadata to file
        save_session_metadata(session_id, user_id)
        
        # Start processing in background
        background_tasks.add_task(process_document, session_id, doc_id, user_id)
        
        return {
            "docId": doc_id,
            "state": doc_state,
            "metadata": document_metadata[session_id][doc_id]
        }
        
    except Exception as e:
        # Clean up on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

# Add endpoint to check document processing status
@router.get("/chat/session/{session_id}/documents/{doc_id}/status")
async def get_document_status(session_id: str, doc_id: str):
    """Get the processing status of a document"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session_id not in document_metadata or doc_id not in document_metadata[session_id]:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document_metadata[session_id][doc_id]

# Add a root health check endpoint
@app.get("/health")
async def root_health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@router.post("/chat/message", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = DEFAULT_USER):
    try:
        # Ensure we have a valid history for this session
        if request.session_id not in histories:
            # Try to load existing history first
            histories[request.session_id] = await reconstruct_chat_history(request.session_id, user_id)

        # Create message data for logging
        user_message_data = {
            "message_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "sender": "user",
            "content": request.message,
            "metadata": {
                "session_id": request.session_id,
                "user_id": user_id
            }
        }

        # Log user message
        append_message_to_log(request.session_id, user_message_data, user_id)

        # Load session metadata to check for vectorstore
        metadata = load_session_metadata(request.session_id, user_id)
        logger.info(f"Session {request.session_id} metadata keys: {', '.join(metadata.keys())}")
        
        # Check for vectorstore in metadata (either top-level or in session_info)
        vectorstore_id = metadata.get("vectorstore")
        if vectorstore_id is None and "session_info" in metadata:
            vectorstore_id = metadata["session_info"].get("vectorstore")
            
        # Check if we should use retrieval
        if vectorstore_id:
            logger.info(f"Session {request.session_id}: Vectorstore '{vectorstore_id}' selected for retrieval")
            
            try:
                # Load the vectorstore
                vectorstore_path = Path(VECTORSTORES_DIR) / vectorstore_id
                logger.info(f"Session {request.session_id}: Attempting to load vectorstore from path: {vectorstore_path}")
                logger.info(f"Session {request.session_id}: Path exists: {vectorstore_path.exists()}")
                
                # Initialize embeddings using Ollama's API instead of a separate embedding service
                # This approach is similar to what chat_service uses
                logger.info(f"Session {request.session_id}: Initializing embeddings with Ollama at: {config.ollama.base_url}")
                embeddings = OllamaEmbeddings(
                    base_url=config.ollama.base_url,
                    model="nomic-embed-text"  # Use specific embedding model that's available
                )
                
                # Load the FAISS vectorstore using the correct method for these versions
                logger.info(f"Session {request.session_id}: Loading FAISS vectorstore from {vectorstore_path}")
                
                # Try to load the vectorstore, with multiple fallback approaches
                try:
                    vectorstore = FAISS.load_local(
                        folder_path=str(vectorstore_path),
                        embeddings=embeddings,
                        allow_dangerous_deserialization=True
                    )
                    logger.info(f"Session {request.session_id}: Successfully loaded vectorstore")
                except Exception as inner_error:
                    logger.warning(f"Session {request.session_id}: Error loading vectorstore with standard approach: {str(inner_error)}")
                    logger.info(f"Session {request.session_id}: Attempting to load with alternative approach")
                    
                    # Fall back to a more direct approach if needed
                    try:
                        import faiss
                        import pickle
                        
                        # Load the FAISS index
                        index_path = str(Path(vectorstore_path) / "index.faiss")
                        docstore_path = str(Path(vectorstore_path) / "docstore.pkl")
                        
                        logger.info(f"Session {request.session_id}: Loading FAISS index from {index_path}")
                        logger.info(f"Session {request.session_id}: Checking if index file exists: {os.path.exists(index_path)}")
                        
                        index = faiss.read_index(index_path)
                        logger.info(f"Session {request.session_id}: Successfully loaded FAISS index")
                        
                        # Load the docstore
                        logger.info(f"Session {request.session_id}: Loading docstore from {docstore_path}")
                        logger.info(f"Session {request.session_id}: Checking if docstore file exists: {os.path.exists(docstore_path)}")
                        
                        with open(docstore_path, "rb") as f:
                            docstore = pickle.load(f)
                        logger.info(f"Session {request.session_id}: Successfully loaded docstore")
                            
                        # Create FAISS instance directly
                        vectorstore = FAISS(embeddings, index, docstore, {})
                        logger.info(f"Session {request.session_id}: Successfully loaded vectorstore using fallback method")
                    except Exception as fallback_error:
                        logger.error(f"Session {request.session_id}: Fallback loading also failed: {str(fallback_error)}")
                        raise fallback_error
                
                # Perform retrieval for the user's question
                logger.info(f"Session {request.session_id}: Performing retrieval for question: '{request.message}'")
                
                try:
                    k = 20
                    search_type = "mmr"
                    retriever = vectorstore.as_retriever(search_type=search_type, search_kwargs={"k": k})
                    docs = retriever.invoke(request.message)
                        
                    logger.info(f"Session {request.session_id}: Successfully retrieved {len(docs)} documents")
                    
                    # Print document contents for debugging
                    for i, doc in enumerate(docs):
                        logger.info(f"Session {request.session_id}: Document {i} content: {doc.page_content[:]}...")
                        
                    # Process with relevant context
                    context = "\n\n".join([doc.page_content for doc in docs])
                    
                except Exception as retrieve_error:
                    logger.error(f"Session {request.session_id}: Error retrieving documents: {str(retrieve_error)}")
                    logger.error(f"Session {request.session_id}: Error type: {type(retrieve_error).__name__}")
                    import traceback
                    logger.error(f"Session {request.session_id}: Error traceback: {traceback.format_exc()}")
                    raise Exception(f"Error using vectorstore: {str(retrieve_error)}")
                
                # Enhance the prompt with retrieved documents
                enhanced_prompt = f"""Answer the question based on the context below. If the documents do not contain information that clearly informs your answer to the user's question, then you should say so. If you do have any information from the documents that informs your answer to the user's question, then you should say so. This is to let the user know that you are not just guessing or making up an answer. This helps the user to understand the context you are working with.

Context:
{context}

Question: {request.message}

Answer:"""
                
                # Use enhanced prompt for the LLM with chat history
                logger.info(f"Session {request.session_id}: Using enhanced prompt with retrieved context")
                response = chat_with_history.invoke(
                    {"input": enhanced_prompt},
                    {"configurable": {"session_id": request.session_id}}
                )
                
            except Exception as e:
                logger.error(f"Session {request.session_id}: Error using vectorstore: {str(e)}")
                logger.info(f"Session {request.session_id}: Falling back to regular chat due to vectorstore error")
                # Fall back to regular chat
                response = chat_with_history.invoke(
                    {"input": request.message},
                    {"configurable": {"session_id": request.session_id}}
                )
        else:
            # Regular chat without retrieval
            logger.info(f"Session {request.session_id}: No vectorstore configured, using regular chat")
            response = chat_with_history.invoke(
                {"input": request.message},
                {"configurable": {"session_id": request.session_id}}
            )

        # Create timestamp
        timestamp = datetime.now()

        # Extract content from response if it's a complex object
        if hasattr(response, 'content'):
            response_content = response.content
        else:
            response_content = str(response)

        # Create message data for logging
        ai_message_data = {
            "message_id": str(uuid.uuid4()),
            "timestamp": timestamp.isoformat(),
            "sender": "assistant",
            "content": response_content,
            "metadata": {
                "session_id": request.session_id,
                "user_id": user_id
            }
        }

        # Log AI message
        append_message_to_log(request.session_id, ai_message_data, user_id)

        # Return response
        return ChatResponse(message=response_content, timestamp=timestamp)
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, user_id: str = DEFAULT_USER):
    try:
        # Validate session directory with user_id
        is_valid, error = validate_session_directory(session_id, user_id)
        if not is_valid:
            raise HTTPException(status_code=404, detail=f"Invalid session: {error}")
        
        # Load messages directly from JSONL file using chat_logger
        messages = await chat_logger.load_history(user_id, session_id)
        
        # Convert the loaded messages to the expected format
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "id": msg["message_id"],
                "text": msg["content"],
                "sender": msg["sender"],
                "timestamp": msg["timestamp"]
            })
        
        # Reconstruct chat history for future interactions
        if session_id not in histories:
            histories[session_id] = await reconstruct_chat_history(session_id, user_id)
            print(f"Loaded chat history for session: {session_id}")
            
        return formatted_messages
        
    except Exception as e:
        print(f"Error in get_chat_history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/session")
async def create_chat_session(user_id: str = DEFAULT_USER):
    """Create a new chat session"""
    session_id = str(uuid.uuid4())  # Move this outside the try block
    try:
        now = datetime.now()
        
        # Create session directories with user ID
        session_dir = ensure_session_directory(session_id, user_id)
        
        # Create session object with more meaningful name
        short_id = session_id.split('-')[0]  # Get first part of UUID
        session = ChatSession(
            id=session_id,
            name=f"Chat Session {short_id}",  # More meaningful name with ID reference
            created_at=now,
            updated_at=now
        )
        chat_sessions[session_id] = session
        
        # Initialize and save session metadata
        metadata = {
            "session_info": {
                "id": session.id,
                "name": session.name,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat()
            },
            "document_states": {},
            "document_metadata": {}
        }
        
        metadata_path = session_dir / "SessionMessages.metadata"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return session
    except Exception as e:
        # Clean up on error
        cleanup_session_files(session_id, user_id)
        print(f"Error creating chat session: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/sessions")
async def get_chat_sessions(user_id: str = DEFAULT_USER):
    try:
        # Validate all session directories
        invalid_sessions = []
        for session_id in list(chat_sessions.keys()):
            is_valid, error = validate_session_directory(session_id, user_id)
            if not is_valid:
                print(f"Warning: Invalid session directory for {session_id}: {error}")
                invalid_sessions.append(session_id)
                continue
                
            # Load metadata for valid sessions
            metadata = load_session_metadata(session_id, user_id)
            if metadata:
                session = chat_sessions[session_id]
                if "document_states" in metadata:
                    # Update document states from metadata (already converted to proper objects)
                    session.documentStates = metadata["document_states"]
                if "document_metadata" in metadata:
                    # Update document metadata from metadata (already converted to proper objects)
                    document_metadata[session_id] = metadata["document_metadata"]
        
        # Remove invalid sessions from memory
        for session_id in invalid_sessions:
            del chat_sessions[session_id]
            if session_id in document_metadata:
                del document_metadata[session_id]
            if session_id in histories:
                del histories[session_id]
        
        return list(chat_sessions.values())
    except Exception as e:
        print(f"Error in get_chat_sessions: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# Add before the router definitions
def validate_session_directory(session_id: str, user_id: str = DEFAULT_USER) -> Tuple[bool, Optional[str]]:
    """Validate that a session directory has the correct structure"""
    session_dir = SESSIONS_DIR / user_id / session_id
    
    # Check if session directory exists
    if not session_dir.exists():
        return False, "Session directory does not exist"
    
    # Check if UserDocs directory exists, create it if it doesn't
    docs_dir = session_dir / "UserDocs"
    if not docs_dir.exists():
        # Create UserDocs directory and add .gitkeep file
        docs_dir.mkdir(exist_ok=True)
        gitkeep_path = docs_dir / ".gitkeep"
        with open(gitkeep_path, 'w') as f:
            pass  # Create an empty file
        print(f"Created missing UserDocs directory for session {session_id}")
    
    # Check if metadata file exists
    metadata_path = session_dir / "SessionMessages.metadata"
    if not metadata_path.exists():
        return False, "Session metadata file does not exist"
    
    return True, None

# Add after the chat_sessions dictionary definition but before the router definitions

async def load_existing_sessions():
    """Load existing sessions metadata from disk on startup"""
    try:
        print("Starting to load existing sessions metadata...")
        if not SESSIONS_DIR.exists():
            print("No sessions directory found")
            return

        # Scan for user directories
        for user_dir in SESSIONS_DIR.iterdir():
            if not user_dir.is_dir():
                continue
                
            user_id = user_dir.name
            print(f"Loading session metadata for user: {user_id}")
            
            # Scan for session directories
            for session_dir in user_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                    
                session_id = session_dir.name
                print(f"Found session directory: {session_id}")
                
                try:
                    # Validate session directory
                    is_valid, error = validate_session_directory(session_id, user_id)
                    if not is_valid:
                        print(f"Invalid session directory {session_id}: {error}")
                        continue
                    
                    # Load session metadata
                    metadata = load_session_metadata(session_id, user_id)
                    if not metadata or "session_info" not in metadata:
                        print(f"Invalid metadata for session {session_id}")
                        continue
                    
                    # Create session object
                    session_info = metadata["session_info"]
                    session = ChatSession(
                        id=session_info["id"],
                        name=session_info["name"],
                        created_at=datetime.fromisoformat(session_info["created_at"]),
                        updated_at=datetime.fromisoformat(session_info["updated_at"]),
                        documentStates=metadata.get("document_states", {})
                    )
                    
                    # Store session
                    chat_sessions[session_id] = session
                    
                    # Store document metadata
                    if "document_metadata" in metadata:
                        document_metadata[session_id] = metadata["document_metadata"]
                    
                    print(f"Successfully loaded session metadata: {session_id}")
                    
                except Exception as e:
                    print(f"Error loading session {session_id}: {str(e)}")
                    continue
                    
        print(f"Finished loading session metadata. Total sessions loaded: {len(chat_sessions)}")
        
    except Exception as e:
        print(f"Error loading existing sessions: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

async def ensure_gitkeep_in_all_userdocs():
    """Create .gitkeep files in all UserDocs directories to ensure they're tracked by Git"""
    try:
        if not SESSIONS_DIR.exists():
            return
            
        count = 0
        # Scan for user directories
        for user_dir in SESSIONS_DIR.iterdir():
            if not user_dir.is_dir():
                continue
                
            user_id = user_dir.name
            
            # Scan for session directories
            for session_dir in user_dir.iterdir():
                if not session_dir.is_dir():
                    continue
                    
                session_id = session_dir.name
                
                # Check for UserDocs directory
                docs_dir = session_dir / "UserDocs"
                if not docs_dir.exists():
                    docs_dir.mkdir(exist_ok=True)
                
                # Create .gitkeep file if it doesn't exist
                gitkeep_path = docs_dir / ".gitkeep"
                if not gitkeep_path.exists():
                    with open(gitkeep_path, 'w') as f:
                        pass  # Create an empty file
                    count += 1
        
        if count > 0:
            print(f"Created {count} missing .gitkeep files in UserDocs directories")
            
    except Exception as e:
        print(f"Error ensuring .gitkeep files: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    try:
        # Ensure base sessions directory exists
        SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Ensure .gitkeep files exist in all UserDocs directories
        await ensure_gitkeep_in_all_userdocs()
        
        # Load existing sessions metadata only
        await load_existing_sessions()
        
    except Exception as e:
        print(f"Error during startup: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

# Add this Pydantic model for the request body
class UpdateSessionNameRequest(BaseModel):
    new_name: str

@router.put("/chat/session/{session_id}/name")
async def update_session_name(
    session_id: str,
    request: UpdateSessionNameRequest,
    user_id: str = DEFAULT_USER
):
    """Update the name of a chat session"""
    try:
        if session_id not in chat_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = chat_sessions[session_id]
        session.name = request.new_name
        session.updated_at = datetime.now()
        
        # Save the updated metadata
        save_session_metadata(session_id, user_id)
        
        return {"status": "success", "session": session}
        
    except Exception as e:
        print(f"Error in update_session_name: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/chat/session/{session_id}/documents/{doc_id}/classification")
async def update_document_classification(
    session_id: str,
    doc_id: str,
    request: UpdateDocumentClassificationRequest,
    user_id: str = DEFAULT_USER
):
    try:
        # Get the session directory
        session_dir = ensure_session_directory(session_id, user_id)
        
        # Load session metadata
        session_metadata = load_session_metadata(session_id, user_id)
        
        # Update classification in document states
        if "documentStates" in session_metadata and doc_id in session_metadata["documentStates"]:
            session_metadata["documentStates"][doc_id]["classification"] = request.classification
            
            # Save session metadata
            save_session_metadata(session_id, user_id)
            
            return {"success": True, "message": "Document classification updated"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test/thinking-format")
async def test_thinking_format():
    return {
        "response": "Here is a sample response with thinking process.\n\n<details><summary>Thinking Process</summary>\n\nThis is where the thinking process would go.\n\n</details>"
    }

@router.get("/vectorstores")
async def list_vectorstores():
    """List all available vectorstores in the data/vectorstores directory with their names"""
    try:
        logger.info("Listing all available vectorstores")
        
        # Look for vectorstores in the data directory
        vectorstore_path = Path("/app/data/vectorstores")
        if not vectorstore_path.exists():
            # For local development/testing
            vectorstore_path = Path("../data/vectorstores")
            if not vectorstore_path.exists():
                vectorstore_path = Path("data/vectorstores")
        
        logger.info(f"Checking vectorstore path: {vectorstore_path}")
        logger.info(f"Path exists: {vectorstore_path.exists()}")
        
        if not vectorstore_path.exists():
            logger.warning(f"Vectorstore path {vectorstore_path} does not exist, returning empty list")
            return {"vectorstores": []}
            
        # Get all directories in the vectorstore path
        vectorstore_dirs = [d for d in vectorstore_path.iterdir() if d.is_dir()]
        logger.info(f"Found {len(vectorstore_dirs)} vectorstore directories")
        
        # Build vectorstore info with metadata if available
        vectorstore_info = []
        for vs_dir in vectorstore_dirs:
            vs_id = vs_dir.name
            vs_name = vs_id  # Default to ID if no metadata
            
            # Try to read metadata.json if it exists
            metadata_path = vs_dir / "metadata.json"
            has_metadata = metadata_path.exists()
            logger.info(f"Vectorstore {vs_id} - Metadata file exists: {has_metadata}")
            
            if has_metadata:
                try:
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        vs_name = metadata.get("name", vs_id)
                        logger.info(f"Vectorstore {vs_id} - Name from metadata: {vs_name}")
                except Exception as e:
                    logger.error(f"Error reading metadata for {vs_id}: {str(e)}")
                    print(f"Error reading metadata for {vs_id}: {str(e)}")
            
            vectorstore_info.append({
                "id": vs_id,
                "name": vs_name
            })
            
        logger.info(f"Returning list of {len(vectorstore_info)} vectorstores")
        return {"vectorstores": vectorstore_info}
    except Exception as e:
        logger.error(f"Error listing vectorstores: {str(e)}")
        print(f"Error listing vectorstores: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add this Pydantic model for the request body
class SetVectorstoreRequest(BaseModel):
    vectorstore: str

@router.put("/chat/session/{session_id}/vectorstore")
async def set_session_vectorstore(
    session_id: str,
    request: SetVectorstoreRequest,
    user_id: str = DEFAULT_USER
):
    """Set the vectorstore to use for retrieval in a chat session"""
    try:
        logger.info(f"Setting vectorstore for session {session_id} to '{request.vectorstore}'")
        
        # Get the session directory
        session_dir = ensure_session_directory(session_id, user_id)
        logger.info(f"Session directory: {session_dir}")
        
        # Load session metadata
        session_metadata = load_session_metadata(session_id, user_id)
        
        # Update vectorstore in session metadata
        previous_vectorstore = session_metadata.get("vectorstore", "None")
        session_metadata["vectorstore"] = request.vectorstore
        logger.info(f"Updated session {session_id} vectorstore from '{previous_vectorstore}' to '{request.vectorstore}'")
        
        # Directly update the metadata file to ensure vectorstore is saved
        metadata_path = session_dir / "SessionMessages.metadata"
        if metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    existing_metadata = json.load(f)
                
                # Update the vectorstore setting
                existing_metadata["vectorstore"] = request.vectorstore
                
                # Write the updated metadata back to the file
                with open(metadata_path, 'w') as f:
                    json.dump(existing_metadata, f, indent=2)
                
                logger.info(f"Directly updated vectorstore in metadata file for session {session_id}")
            except Exception as e:
                logger.warning(f"Could not directly update metadata file, falling back to save_session_metadata: {str(e)}")
                # Fall back to save_session_metadata
                save_session_metadata(session_id, user_id)
        else:
            # If metadata file doesn't exist yet, use save_session_metadata
            save_session_metadata(session_id, user_id)
            
        logger.info(f"Saved session metadata for session {session_id}")
        
        return {"success": True, "message": f"Session vectorstore set to {request.vectorstore}"}
    except Exception as e:
        logger.error(f"Error setting vectorstore for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/session/{session_id}/metadata")
async def get_session_metadata(
    session_id: str,
    user_id: str = DEFAULT_USER
):
    """Get the metadata for a chat session"""
    try:
        logger.info(f"Getting metadata for session {session_id}")
        
        # Load session metadata
        session_metadata = load_session_metadata(session_id, user_id)
        
        # Log relevant information about the metadata
        vectorstore = session_metadata.get("vectorstore", "None")
        logger.info(f"Session {session_id} has vectorstore: {vectorstore}")
        
        # Log document states if available
        if "document_states" in session_metadata:
            doc_count = len(session_metadata["document_states"])
            logger.info(f"Session {session_id} has {doc_count} document states")
        
        return session_metadata
    except Exception as e:
        logger.error(f"Error getting metadata for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Register the router with the app AFTER all endpoints are defined
app.include_router(router)
