from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set, Tuple, Any
from datetime import datetime
import httpx
from config import config
from langchain_community.chat_models import ChatOllama
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from fastapi import APIRouter
import uuid
import os
from pathlib import Path
import asyncio
import subprocess
import shutil
import json

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
SESSIONS_DIR = Path("sessions")

# Add after SESSIONS_DIR constant
DEFAULT_USER = "admin"

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

# Store active chat sessions
chat_sessions: Dict[str, ChatSession] = {}

# Add after the chat_sessions dictionary
document_metadata: Dict[str, Dict[str, DocumentMetadata]] = {}  # session_id -> {doc_id -> metadata}

# Initialize LangChain components
llm = ChatOllama(
    base_url=config.ollama.base_url,
    model=config.ollama.ollama_model,
    temperature=config.ollama.temperature,
    context_window=config.ollama.context_window,
    top_k=config.ollama.top_k,
    top_p=config.ollama.top_p,
    repeat_penalty=config.ollama.repeat_penalty,
    stop=config.ollama.stop,
    num_gpu=config.ollama.num_gpu,
    num_thread=config.ollama.num_thread,
    f16=config.ollama.f16
)

# Create chat prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful and professional assistant that does not embellish, is not verbose, and does not use emojis. Write all of your responses in markdown format."),
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

def get_or_create_history(session_id: str) -> ChatMessageHistory:
    """Get or create a message history for a session ID."""
    if session_id not in histories:
        histories[session_id] = ChatMessageHistory()
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
        
        # Get session data
        session = chat_sessions.get(session_id)
        if not session:
            return
            
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
                    "lastModified": state.lastModified.isoformat()
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
        
        # Save to file
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
    except Exception as e:
        print(f"Error saving session metadata: {str(e)}")

def load_session_metadata(session_id: str, user_id: str = DEFAULT_USER) -> Dict[str, Any]:
    """Load session metadata including document states from file"""
    try:
        session_dir = SESSIONS_DIR / user_id / session_id
        metadata_path = session_dir / "SessionMessages.metadata"
        
        if not metadata_path.exists():
            return {}
            
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
            
        # Convert document states to proper DocumentState objects
        if "document_states" in metadata:
            converted_states = {}
            for doc_id, state in metadata["document_states"].items():
                # Convert datetime string back to datetime object
                if "lastModified" in state:
                    state["lastModified"] = datetime.fromisoformat(state["lastModified"])
                converted_states[doc_id] = DocumentState(**state)
            metadata["document_states"] = converted_states
            
        # Convert document metadata to proper DocumentMetadata objects
        if "document_metadata" in metadata:
            converted_metadata = {}
            for doc_id, meta in metadata["document_metadata"].items():
                # Convert datetime string back to datetime object
                if "uploadedAt" in meta:
                    meta["uploadedAt"] = datetime.fromisoformat(meta["uploadedAt"])
                converted_metadata[doc_id] = DocumentMetadata(**meta)
            metadata["document_metadata"] = converted_metadata
            
        return metadata
            
    except Exception as e:
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
async def chat(request: ChatRequest):
    try:
        # Get response using the runnable
        response = chat_with_history.invoke(
            {"input": request.message},
            {"configurable": {"session_id": request.session_id}}
        )
        
        return ChatResponse(
            message=response.content,  # Changed from 'response' to 'message'
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, user_id: str = DEFAULT_USER):
    try:
        # Validate session directory with user_id
        is_valid, error = validate_session_directory(session_id, user_id)
        if not is_valid:
            raise HTTPException(status_code=404, detail=f"Invalid session: {error}")
        
        history = get_or_create_history(session_id)
        messages = []
        for msg in history.messages:
            if isinstance(msg, HumanMessage):
                sender = "user"
                text = msg.content
            elif isinstance(msg, AIMessage):
                sender = "ai"
                text = msg.content
            elif isinstance(msg, SystemMessage):
                continue  # Skip system messages
            else:
                continue  # Skip unknown message types
                
            messages.append({
                "id": str(uuid.uuid4()),
                "text": text,
                "sender": sender,
                "timestamp": datetime.now().isoformat()
            })
        return messages
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/session")
async def create_chat_session(user_id: str = DEFAULT_USER):
    try:
        session_id = str(uuid.uuid4())
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
        
        # Initialize message history
        get_or_create_history(session_id)
        
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
    
    # Check if UserDocs directory exists
    docs_dir = session_dir / "UserDocs"
    if not docs_dir.exists():
        return False, "UserDocs directory does not exist"
    
    # Check if metadata file exists
    metadata_path = session_dir / "SessionMessages.metadata"
    if not metadata_path.exists():
        return False, "Session metadata file does not exist"
    
    return True, None

# Add after the chat_sessions dictionary definition but before the router definitions

async def load_existing_sessions():
    """Load existing sessions from disk on startup"""
    try:
        print("Starting to load existing sessions...")
        if not SESSIONS_DIR.exists():
            print("No sessions directory found")
            return

        # Scan for user directories
        for user_dir in SESSIONS_DIR.iterdir():
            if not user_dir.is_dir():
                continue
                
            user_id = user_dir.name
            print(f"Loading sessions for user: {user_id}")
            
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
                    
                    # Initialize message history
                    get_or_create_history(session_id)
                    
                    print(f"Successfully loaded session: {session_id}")
                    
                except Exception as e:
                    print(f"Error loading session {session_id}: {str(e)}")
                    continue
                    
        print(f"Finished loading sessions. Total sessions loaded: {len(chat_sessions)}")
        
    except Exception as e:
        print(f"Error loading existing sessions: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    try:
        # Ensure base sessions directory exists
        SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Load existing sessions
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

# Include router in app
app.include_router(router)
