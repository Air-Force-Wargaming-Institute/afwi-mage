from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Tuple, Any, List
from datetime import datetime
from config import config
from vllm_chat import VLLMOpenAIChat
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
import aiofiles
from functools import partial
from concurrent.futures import ThreadPoolExecutor

# Add these imports for vectorstore functionality and fallback loading
from langchain_community.vectorstores import FAISS

# Update the import to use langchain_ollama
from langchain_ollama.embeddings import OllamaEmbeddings

log_dir = Path('/app/data/logs')
log_dir.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    filename=log_dir / 'direct_chat_service.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define constants for paths
SESSIONS_DIR = Path("sessions")
VECTORSTORES_DIR = Path("data/vectorstores")

# Setup FastAPI
app = FastAPI(
    title="Direct Chat Service",
    description="Service for direct chat interactions using Ollama and LangChain",
    version="1.0.0"
)

# Add API router (without prefix, as paths will be explicit)
router = APIRouter()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# Add after the imports, before app initialization
DEFAULT_USER = "admin"

# Initialize ChatLogger
chat_logger = ChatLogger(SESSIONS_DIR)

# Initialize ThreadPoolExecutor for blocking tasks
thread_pool = ThreadPoolExecutor(max_workers=4) # Adjust workers as needed

# Pydantic models
class Message(BaseModel):
    text: str
    sender: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    message: str
    timestamp: datetime

class DocumentState(BaseModel):
    isChecked: bool = False
    lastModified: datetime = Field(default_factory=datetime.now)
    markdownSize: int = 0
    originalName: str
    markdownPath: Optional[str] = None
    classification: str = "SELECT CLASSIFICATION"

class DocumentMetadata(BaseModel):
    originalName: str
    uploadedAt: datetime
    markdownSize: int
    status: str = "pending"
    error: Optional[str] = None

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

class UpdateSessionNameRequest(BaseModel):
    new_name: str

# Store active chat sessions
chat_sessions: Dict[str, ChatSession] = {}

# Add after the chat_sessions dictionary
document_metadata: Dict[str, Dict[str, DocumentMetadata]] = {}
histories: Dict[str, ChatMessageHistory] = {}

# Initialize LangChain components
llm = VLLMOpenAIChat(
    openai_api_base=config.vllm.chat_completion_url,
    openai_api_key="dummy-key",
    model_name=config.vllm.chat_model,
    temperature=config.vllm.temperature,
    top_p=config.vllm.top_p,
    max_tokens=config.vllm.context_window,
    stop=config.vllm.stop
)

# Create chat prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "At the beginning of your response, you should open with MY CONTEXT and tell the user a little about the documents you were provided as context to answer the user's question. If the documents that are provided to you do not contain information that clearly informs your answer to the user's question, then you should say so explicitly. If you do have any information from the documents that informs your answer to the user's question, then you should say so explicitly. This is to let the user know that you are not just guessing or making up an answer. This helps the user to understand the context you are working with. You are a helpful and professional assistant that does not embellish, is not verbose, and does not use emojis. Write all of your responses in markdown format. You are a deep thinking AI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

# Create the chain
chain = prompt | llm

# --- Async History Management --- #
async def reconstruct_chat_history(session_id: str, user_id: str = DEFAULT_USER) -> ChatMessageHistory:
    history = ChatMessageHistory()
    try:
        messages = await chat_logger.load_history(user_id, session_id)
        for msg in messages:
            if msg.get("sender") == "user":
                history.add_user_message(msg.get("content", ""))
            elif msg.get("sender") == "assistant": # Match the sender used in logging
                history.add_ai_message(msg.get("content", ""))
        logger.info(f"Reconstructed history for session {session_id} with {len(history.messages)} messages.")
        return history
    except Exception as e:
        logger.error(f"Error reconstructing chat history for session {session_id}: {str(e)}", exc_info=True)
        return history

async def get_or_create_history(session_id: str, user_id: str = DEFAULT_USER) -> ChatMessageHistory:
    if session_id not in histories:
        logger.info(f"History for session {session_id} not in memory, reconstructing...")
        histories[session_id] = await reconstruct_chat_history(session_id, user_id)
    return histories[session_id]

# --- Async Helper Functions --- #
async def load_session_metadata_async(session_id: str, user_id: str = DEFAULT_USER) -> Dict[str, Any]:
    metadata_path = SESSIONS_DIR / user_id / session_id / "SessionMessages.metadata" # Using the original filename
    try:
        if not await asyncio.to_thread(metadata_path.exists):
            logger.warning(f"Metadata file not found: {metadata_path}. Returning empty dict.")
            return {}
        
        async with aiofiles.open(metadata_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            metadata = json.loads(content)
            logger.info(f"Successfully loaded metadata from {metadata_path}")
            # Convert relevant fields back from ISO strings if needed (e.g., datetimes)
            # This part was missing in the previous implementation but might be important
            # Example for session_info (adapt for documentStates, document_metadata)
            if "session_info" in metadata and isinstance(metadata["session_info"], dict):
                for key in ["created_at", "updated_at"]:
                    if key in metadata["session_info"] and isinstance(metadata["session_info"][key], str):
                        try:
                            metadata["session_info"][key] = datetime.fromisoformat(metadata["session_info"][key])
                        except ValueError:
                            logger.warning(f"Could not parse datetime string for {key} in session_info for {session_id}")
                            
            # Convert documentStates (similar logic)
            if "document_states" in metadata and isinstance(metadata["document_states"], dict):
                temp_states = {}
                for doc_id, state_dict in metadata["document_states"].items():
                    if isinstance(state_dict, dict):
                        if "lastModified" in state_dict and isinstance(state_dict["lastModified"], str):
                            try:
                                state_dict["lastModified"] = datetime.fromisoformat(state_dict["lastModified"])
                            except ValueError:
                                logger.warning(f"Could not parse datetime string for lastModified in doc state {doc_id} for {session_id}")
                                state_dict["lastModified"] = datetime.now() # Default or handle error
                        # Ensure classification default
                        state_dict.setdefault("classification", "SELECT CLASSIFICATION")
                        try:
                            temp_states[doc_id] = DocumentState(**state_dict)
                        except Exception as pydantic_err:
                            logger.error(f"Pydantic error creating DocumentState for {doc_id} in {session_id}: {pydantic_err}")
                    else:
                        logger.warning(f"Skipping invalid document state format for {doc_id} in {session_id}")
                metadata["document_states"] = temp_states
                
            # Convert document_metadata (similar logic)
            if "document_metadata" in metadata and isinstance(metadata["document_metadata"], dict):
                temp_meta = {}
                for doc_id, meta_dict in metadata["document_metadata"].items():
                    if isinstance(meta_dict, dict):
                        if "uploadedAt" in meta_dict and isinstance(meta_dict["uploadedAt"], str):
                            try:
                                meta_dict["uploadedAt"] = datetime.fromisoformat(meta_dict["uploadedAt"])
                            except ValueError:
                                logger.warning(f"Could not parse datetime string for uploadedAt in doc meta {doc_id} for {session_id}")
                                meta_dict["uploadedAt"] = datetime.now() # Default or handle error
                        try:
                            temp_meta[doc_id] = DocumentMetadata(**meta_dict)
                        except Exception as pydantic_err:
                            logger.error(f"Pydantic error creating DocumentMetadata for {doc_id} in {session_id}: {pydantic_err}")
                    else:
                        logger.warning(f"Skipping invalid document metadata format for {doc_id} in {session_id}")
                metadata["document_metadata"] = temp_meta
                
            return metadata
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding metadata JSON from {metadata_path}: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Error loading session metadata from {metadata_path}: {str(e)}", exc_info=True)
        return {} # Return empty dict on other errors

async def save_session_metadata_async(session_id: str, metadata: Dict[str, Any], user_id: str = DEFAULT_USER) -> None:
    metadata_path = SESSIONS_DIR / user_id / session_id / "SessionMessages.metadata" # Using original filename
    try:
        # Ensure parent directory exists (synchronous is ok here)
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert datetime objects to ISO strings for JSON serialization
        serializable_metadata = json.loads(json.dumps(metadata, default=str)) # Simple conversion for datetimes

        async with aiofiles.open(metadata_path, mode='w', encoding='utf-8') as f:
            await f.write(json.dumps(serializable_metadata, indent=2))
        logger.info(f"Successfully saved metadata to {metadata_path}")
    except Exception as e:
        logger.error(f"Error saving session metadata to {metadata_path}: {str(e)}", exc_info=True)

def _load_faiss_sync(folder_path: str, embeddings: Any) -> FAISS:
    logger.info(f"Attempting synchronous FAISS load from: {folder_path}")
    return FAISS.load_local(
        folder_path=folder_path,
        embeddings=embeddings,
        allow_dangerous_deserialization=True
    )

async def load_vectorstore_async(vectorstore_path: Path, embeddings) -> FAISS:
    loop = asyncio.get_running_loop()
    try:
        vectorstore = await loop.run_in_executor(
            thread_pool,
            partial(_load_faiss_sync, str(vectorstore_path), embeddings)
        )
        logger.info(f"Successfully loaded vectorstore from {vectorstore_path} asynchronously.")
        return vectorstore
    except Exception as e:
        logger.error(f"Error loading vectorstore asynchronously from {vectorstore_path}: {str(e)}", exc_info=True)
        raise

def _retriever_invoke_sync(retriever: Any, message: str) -> Any:
    logger.info(f"Attempting synchronous retriever invoke for message: '{message[:50]}...'")
    return retriever.invoke(message)

async def remove_dir_async(path: Path):
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(thread_pool, shutil.rmtree, path)
        logger.info(f"Successfully deleted directory: {path}")
    except Exception as e:
        logger.error(f"Error deleting directory {path}: {str(e)}", exc_info=True)

async def _convert_to_markdown_sync(file_path: Path, output_path: Path) -> Optional[str]:
    """Placeholder for synchronous document conversion."""
    try:
        if file_path.suffix.lower() in ['.txt', '.md']:
            # Simple copy for text/md
            shutil.copyfile(file_path, output_path)
            logger.info(f"Copied text/md file {file_path} to {output_path}")
            return None
        else:
            # Placeholder for actual conversion logic (e.g., using pandoc, mammoth)
            logger.warning(f"Conversion not implemented for {file_path.suffix}, creating empty file at {output_path}")
            output_path.touch() # Create empty file
            # return f"Conversion not implemented for {file_path.suffix}" # Or return error message
            return None # Treat as success for now
    except Exception as e:
        logger.error(f"Error during dummy conversion of {file_path}: {e}", exc_info=True)
        return str(e)

async def process_document_async(session_id: str, doc_id: str, user_id: str = DEFAULT_USER):
    logger.info(f"Starting async processing for doc {doc_id} in session {session_id}")
    session_metadata = await load_session_metadata_async(session_id, user_id)
    
    # Use the loaded, possibly converted Pydantic objects
    doc_state = session_metadata.get("document_states", {}).get(doc_id)
    doc_meta = session_metadata.get("document_metadata", {}).get(doc_id)

    if not doc_state or not doc_meta:
        logger.error(f"Could not find state or metadata for doc {doc_id} in session {session_id} during processing.")
        return

    docs_dir = SESSIONS_DIR / user_id / session_id / "UserDocs"
    docs_dir.mkdir(exist_ok=True) # Ensure dir exists
    
    original_path = docs_dir / f"original_{doc_state.originalName}"
    markdown_path = docs_dir / f"{doc_id}.md"
    
    # Update status to processing
    doc_meta.status = "processing"
    await save_session_metadata_async(session_id, session_metadata, user_id)
    
    try:
        # Run conversion in thread pool
        loop = asyncio.get_running_loop()
        error = await loop.run_in_executor(
            thread_pool,
            partial(_convert_to_markdown_sync, original_path, markdown_path)
        )
        
        # Reload metadata to get latest state before updating
        session_metadata = await load_session_metadata_async(session_id, user_id)
        doc_state = session_metadata.get("document_states", {}).get(doc_id)
        doc_meta = session_metadata.get("document_metadata", {}).get(doc_id)
        
        if not doc_state or not doc_meta:
            logger.error(f"State/metadata disappeared for doc {doc_id} after conversion attempt.")
            return # Avoid further processing if state vanished

        if error:
            logger.error(f"Conversion failed for doc {doc_id} in session {session_id}: {error}")
            doc_meta.status = "failed"
            doc_meta.error = error
        else:
            logger.info(f"Conversion successful for doc {doc_id} in session {session_id}")
            doc_state.markdownPath = str(markdown_path)
            try:
                # Use asyncio.to_thread for stat() as it can block
                stat_result = await asyncio.to_thread(markdown_path.stat)
                doc_state.markdownSize = stat_result.st_size
            except FileNotFoundError:
                logger.error(f"Markdown file {markdown_path} not found after conversion.")
                doc_state.markdownSize = 0
                doc_meta.status = "failed"
                doc_meta.error = "Markdown file missing after conversion."
            except Exception as stat_err:
                logger.error(f"Error stating markdown file {markdown_path}: {stat_err}")
                doc_state.markdownSize = 0
                doc_meta.status = "failed"
                doc_meta.error = f"Error accessing markdown file: {stat_err}"
            else:
                doc_meta.status = "ready"
                doc_meta.error = None
                
            doc_state.lastModified = datetime.now()
            # Update doc_meta.markdownSize too if needed
            if doc_meta.status == "ready":
                doc_meta.markdownSize = doc_state.markdownSize

    except Exception as e:
        logger.error(f"Unexpected error during document processing task for doc {doc_id}: {e}", exc_info=True)
        if doc_meta: # Check if doc_meta still exists
            doc_meta.status = "failed"
            doc_meta.error = f"Unexpected processing error: {str(e)}"
    finally:
        # Always save the final state (or attempt to)
        if doc_state and doc_meta: # Check if state exists before saving
            await save_session_metadata_async(session_id, session_metadata, user_id)
        else:
            logger.error(f"Could not save final metadata for doc {doc_id} as state/meta was missing.")

async def cleanup_document_files_async(session_id: str, doc_id: str, user_id: str = DEFAULT_USER, cleanup_info: dict = None):
    logger.info(f"Starting async cleanup for doc {doc_id} in session {session_id}")
    docs_dir = SESSIONS_DIR / user_id / session_id / "UserDocs"
    
    if not cleanup_info:
        logger.warning(f"No cleanup info provided for doc {doc_id}, cannot perform file cleanup.")
        return
        
    original_name = cleanup_info.get("original_name")
    markdown_path_str = cleanup_info.get("markdown_path")
    loop = asyncio.get_running_loop()

    async def _delete_file(file_path: Path):
        try:
            if await asyncio.to_thread(file_path.exists):
                await asyncio.to_thread(file_path.unlink)
                logger.info(f"Deleted file: {file_path}")
            else:
                logger.warning(f"File not found for deletion: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}", exc_info=True)

    # Delete original file
    if original_name:
        original_path = docs_dir / f"original_{original_name}"
        await _delete_file(original_path)
    else:
        logger.warning(f"Original name missing in cleanup_info for doc {doc_id}")

    # Delete markdown file
    if markdown_path_str:
        markdown_path = Path(markdown_path_str)
        # Handle potential absolute paths stored previously
        if markdown_path.is_absolute():
            try:
                relative_path = await asyncio.to_thread(markdown_path.relative_to, Path("/app/sessions").resolve())
                markdown_path = SESSIONS_DIR / relative_path
            except ValueError:
                logger.warning(f"Could not make absolute path relative: {markdown_path_str}, using default name.")
                markdown_path = docs_dir / f"{doc_id}.md"
        await _delete_file(markdown_path)
    else:
        # Try default markdown path if specific one wasn't stored
        default_markdown_path = docs_dir / f"{doc_id}.md"
        await _delete_file(default_markdown_path)
        logger.info(f"Markdown path missing in cleanup_info for doc {doc_id}, attempted default path deletion.")

# --- FastAPI Endpoints (Using Explicit Paths) --- #

@app.on_event("startup")
async def startup_event():
    logger.info("Direct Chat Service starting up.")
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    VECTORSTORES_DIR.mkdir(parents=True, exist_ok=True)
    # Load existing sessions (make this async if needed, synchronous might block startup)
    # await load_existing_sessions_async() # If implemented
    logger.info("Startup sequence complete.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Direct Chat Service shutting down.")
    thread_pool.shutdown(wait=True) # Cleanly shutdown the thread pool
    if hasattr(llm, 'aclose'):
        await llm.aclose()
    logger.info("Thread pool and LLM client session shut down.")

# --- Health Check --- #
@router.get("/api/direct_chat/health")
async def health_check():
    """Health check endpoint for the service."""
    return {"status": "healthy", "timestamp": datetime.now()}

# --- Chat Endpoint (Manual History Handling - Corrected) --- #
@router.post("/api/direct_chat/chat/message", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = DEFAULT_USER):
    session_id = request.session_id
    logger.info(f"Received chat request for session: {session_id}, user: {user_id}")
    try:
        # Step 1: Explicitly fetch/create history
        current_history = await get_or_create_history(session_id, user_id)
        history_messages = current_history.messages # Get messages for invocation
        logger.debug(f"Fetched history for session {session_id} with {len(history_messages)} messages.")

        # Log user message (async task)
        user_message_data = {
            "message_id": str(uuid.uuid4()), "timestamp": datetime.now().isoformat(),
            "sender": "user", "content": request.message,
            "metadata": {"session_id": session_id, "user_id": user_id}
        }
        asyncio.create_task(chat_logger.log_message(user_id, session_id, user_message_data))
        
        metadata = await load_session_metadata_async(session_id, user_id)
        vectorstore_id = metadata.get("vectorstore")
        ai_response_obj = None
        retrieval_attempted = False
        input_for_llm = request.message # Default input
        context_used = None # Store context if used

        # --- Retrieval Logic --- #
        if vectorstore_id:
            retrieval_attempted = True
            logger.info(f"Session {session_id}: Vectorstore '{vectorstore_id}' found. Attempting retrieval.")
            vectorstore_path = VECTORSTORES_DIR / vectorstore_id
            # Use asyncio.to_thread for exists() check
            if not await asyncio.to_thread(vectorstore_path.exists):
                 logger.error(f"Session {session_id}: Vectorstore path does not exist: {vectorstore_path}. Skipping retrieval.")
                 vectorstore_id = None # Ensure we skip the try block below
            else:
                try:
                    embeddings = OllamaEmbeddings(
                        model=config.ollama.embedding_model,
                        base_url=config.ollama.embedding_url
                    )
                    vectorstore = await load_vectorstore_async(vectorstore_path, embeddings)
                    k = metadata.get("retriever_k", 20)
                    search_type = metadata.get("retriever_search_type", "mmr")
                    retriever = vectorstore.as_retriever(search_type=search_type, search_kwargs={"k": k})
                    
                    loop = asyncio.get_running_loop()
                    docs = await loop.run_in_executor(
                        thread_pool, partial(_retriever_invoke_sync, retriever, request.message)
                    )
                    logger.info(f"Session {session_id}: Retrieved {len(docs)} documents.")
                    
                    context_used = "\n\n".join([doc.page_content for doc in docs])
                    enhanced_prompt = f"""Answer the question based ONLY on the context provided below. If the context does not contain information to answer the question, state that explicitly. Do not use prior knowledge. Indicate which parts of the context support your answer.

Context:
{context_used}

Question: {request.message}

Answer:"""
                    
                    input_for_llm = enhanced_prompt # Use enhanced prompt as input
                    
                except Exception as e:
                    logger.error(f"Session {session_id}: Error during retrieval: {e}", exc_info=True)
                    vectorstore_id = None # Fallback to non-retrieval
                    input_for_llm = request.message # Ensure input is original message on error
                    context_used = None # No context was successfully used

        # --- LLM Invocation (handles both retrieval success/failure and no retrieval) --- #
        logger.info(f"Session {session_id}: Invoking LLM chain directly.")
        try:
            # Step 2: Invoke chain directly, passing history
            ai_response_obj = await chain.ainvoke({
                "input": input_for_llm,
                "history": history_messages 
            })
        except Exception as e:
             logger.error(f"Session {session_id}: Error during chain invocation: {e}", exc_info=True)
             raise HTTPException(status_code=500, detail="Error processing chat request with LLM.")

        # --- Process Response and Log --- #
        if ai_response_obj:
             response_content = ai_response_obj.content if hasattr(ai_response_obj, 'content') else str(ai_response_obj)
        else:
            # This case should ideally not happen if exceptions are handled or raised properly
            logger.error(f"Session {session_id}: LLM did not produce a response object.")
            raise HTTPException(status_code=500, detail="Failed to get response from LLM.")

        # Step 3: Manually update history object
        current_history.add_user_message(request.message)
        current_history.add_ai_message(response_content)
        logger.debug(f"Manually updated history for session {session_id}. New length: {len(current_history.messages)}")

        timestamp = datetime.now()
        ai_message_data = {
            "message_id": str(uuid.uuid4()), "timestamp": timestamp.isoformat(),
            "sender": "assistant", "content": response_content,
            "metadata": {
                "session_id": session_id, 
                "user_id": user_id, 
                "retrieval_attempted": retrieval_attempted,
                "retrieval_succeeded": bool(context_used is not None) # Flag if context was actually used
            }
        }
        asyncio.create_task(chat_logger.log_message(user_id, session_id, ai_message_data))

        logger.info(f"Successfully processed chat request for session {session_id}. Returning response.")
        return ChatResponse(message=response_content, timestamp=timestamp)

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions directly
        raise http_exc
    except Exception as e:
        logger.error(f"Unhandled error in chat endpoint for session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")

# --- Session Management Endpoints --- #
@router.post("/api/direct_chat/chat/session", response_model=ChatSession, status_code=201)
async def create_session(background_tasks: BackgroundTasks, user_id: str = DEFAULT_USER):
    session_id = str(uuid.uuid4())
    now = datetime.now()
    try:
        # Ensure directories are created (sync is ok for mkdir)
        session_path = SESSIONS_DIR / user_id / session_id
        (session_path / "UserDocs").mkdir(parents=True, exist_ok=True)
        # Add .gitkeep to UserDocs
        (session_path / "UserDocs" / ".gitkeep").touch(exist_ok=True)
        logger.info(f"Ensured directories for new session {session_id}")

        new_session = ChatSession(
            id=session_id,
            name=f"Session {session_id[:8]}",
            created_at=now,
            updated_at=now,
            documentStates={}
        )
        # Store in memory (replace with persistent storage later)
        chat_sessions[session_id] = new_session
        
        initial_metadata = {
            "session_info": new_session.dict(exclude={'documentStates'}),
            "vectorstore": None,
            "document_states": {},
            "document_metadata": {}
        }
        # Save metadata async
        background_tasks.add_task(save_session_metadata_async, session_id, initial_metadata, user_id)
        
        logger.info(f"Created new session: {session_id} for user: {user_id}")
        return new_session
    except Exception as e:
        logger.error(f"Error creating session {session_id}: {e}", exc_info=True)
        # Attempt cleanup if dir was created
        session_path = SESSIONS_DIR / user_id / session_id
        if await asyncio.to_thread(session_path.exists):
            await remove_dir_async(session_path)
        raise HTTPException(status_code=500, detail="Failed to create session.")

@router.get("/api/direct_chat/chat/sessions", response_model=List[ChatSession])
async def list_sessions(user_id: str = DEFAULT_USER):
    # This implementation loads from disk each time.
    # Consider caching or a more robust session management strategy.
    logger.info(f"Listing sessions for user: {user_id}")
    user_session_dir = SESSIONS_DIR / user_id
    sessions = []
    if not await asyncio.to_thread(user_session_dir.exists):
        return [] # No sessions for this user
    
    try:
        # Use asyncio.to_thread for listdir as it can block on network drives/many files
        session_dirs = await asyncio.to_thread(list, user_session_dir.iterdir())
        
        load_tasks = []
        for session_path in session_dirs:
            if await asyncio.to_thread(session_path.is_dir):
                session_id = session_path.name
                load_tasks.append(load_session_metadata_async(session_id, user_id))
                
        metadata_list = await asyncio.gather(*load_tasks)
        
        for metadata in metadata_list:
            if metadata and "session_info" in metadata:
                try:
                    session_info = metadata["session_info"]
                    # Ensure datetimes are objects, not strings (conversion happens in load_)
                    created_at = session_info.get('created_at')
                    updated_at = session_info.get('updated_at')
                    
                    sessions.append(ChatSession(
                        id=session_info.get('id'),
                        name=session_info.get('name'),
                        created_at=created_at if isinstance(created_at, datetime) else datetime.now(), # Default if conversion failed
                        updated_at=updated_at if isinstance(updated_at, datetime) else datetime.now(), # Default if conversion failed
                        documentStates=metadata.get('document_states', {})
                    ))
                except Exception as e:
                    logger.error(f"Error reconstructing session from metadata: {metadata.get('session_info',{}).get('id', 'UNKNOWN')}: {e}")
            # else: logger.warning(f"Metadata or session_info missing when listing session")
            
        logger.info(f"Returning {len(sessions)} sessions for user {user_id}")
        return sessions
    except Exception as e:
        logger.error(f"Error listing sessions for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list sessions.")

@router.get("/api/direct_chat/chat/session/{session_id}", response_model=ChatSession)
async def get_session(session_id: str, user_id: str = DEFAULT_USER):
    logger.info(f"Getting session details for session: {session_id}, user: {user_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata or "session_info" not in metadata:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    
    try:
        session_info = metadata["session_info"]
        created_at = session_info.get('created_at')
        updated_at = session_info.get('updated_at')
        return ChatSession(
            id=session_info.get('id'),
            name=session_info.get('name'),
            created_at=created_at if isinstance(created_at, datetime) else datetime.now(),
            updated_at=updated_at if isinstance(updated_at, datetime) else datetime.now(),
            documentStates=metadata.get('document_states', {})
        )
    except Exception as e:
        logger.error(f"Error reconstructing session {session_id} during get: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load session details.")

@router.put("/api/direct_chat/chat/session/{session_id}/name")
async def update_session_name(
    session_id: str,
    request: UpdateSessionNameRequest,
    background_tasks: BackgroundTasks, # Add background tasks
    user_id: str = DEFAULT_USER
):
    logger.info(f"Updating name for session: {session_id} to '{request.new_name}'")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata or "session_info" not in metadata:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
        
    try:
        now = datetime.now()
        metadata["session_info"]["name"] = request.new_name
        metadata["session_info"]["updated_at"] = now # Update timestamp
        
        # Update in-memory cache if used (currently chat_sessions)
        if session_id in chat_sessions:
            chat_sessions[session_id].name = request.new_name
            chat_sessions[session_id].updated_at = now
            
        # Save metadata asynchronously
        background_tasks.add_task(save_session_metadata_async, session_id, metadata, user_id)
        
        # Return the updated session info (reconstruct from potentially updated metadata)
        updated_session_info = metadata["session_info"]
        return ChatSession(
            id=updated_session_info.get('id'),
            name=updated_session_info.get('name'),
            created_at=updated_session_info.get('created_at') if isinstance(updated_session_info.get('created_at'), datetime) else datetime.now(),
            updated_at=updated_session_info.get('updated_at') if isinstance(updated_session_info.get('updated_at'), datetime) else datetime.now(),
            documentStates=metadata.get('document_states', {})
        )
    except Exception as e:
        logger.error(f"Error updating session name for {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update session name.")

@router.delete("/api/direct_chat/chat/session/{session_id}", status_code=204)
async def delete_session(session_id: str, background_tasks: BackgroundTasks, user_id: str = DEFAULT_USER):
    logger.info(f"Deleting session: {session_id} for user: {user_id}")
    session_dir = SESSIONS_DIR / user_id / session_id
    if not await asyncio.to_thread(session_dir.exists):
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    
    # Remove from in-memory stores safely
    histories.pop(session_id, None)
    chat_sessions.pop(session_id, None)
    document_metadata.pop(session_id, None)
    
    # Schedule directory deletion
    background_tasks.add_task(remove_dir_async, session_dir)
    logger.info(f"Scheduled deletion for session directory: {session_dir}")
    return # Return 204 No Content

# --- History Endpoint --- #
@router.get("/api/direct_chat/chat/history/{session_id}", response_model=List[Message])
async def get_chat_history(session_id: str, user_id: str = DEFAULT_USER):
    logger.info(f"Fetching chat history for session: {session_id}, user: {user_id}")
    try:
        raw_messages = await chat_logger.load_history(user_id, session_id)
        formatted_messages = []
        for msg in raw_messages:
            try:
                ts = msg.get("timestamp")
                timestamp_obj = datetime.fromisoformat(ts) if ts else None
                formatted_messages.append(Message(
                    text=msg.get("content", ""),
                    sender=msg.get("sender", "unknown"),
                    timestamp=timestamp_obj
                ))
            except Exception as e:
                logger.warning(f"Skipping message due to formatting error in history {session_id}: {e} - Msg: {msg}")
        
        logger.info(f"Returning {len(formatted_messages)} messages for history of session {session_id}")
        return formatted_messages
    except Exception as e:
        logger.error(f"Error retrieving chat history for session {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history.")

# --- Document Management Endpoints --- #
@router.post("/api/direct_chat/chat/session/{session_id}/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    session_id: str,
    file: UploadFile = File(...),
    user_id: str = DEFAULT_USER
):
    logger.info(f"Uploading document '{file.filename}' to session: {session_id}, user: {user_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata: # Check if session exists by checking metadata
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

    docs_dir = SESSIONS_DIR / user_id / session_id / "UserDocs"
    docs_dir.mkdir(exist_ok=True) # Ensure directory exists
    
    file_path = docs_dir / f"original_{file.filename}"
    doc_id = str(uuid.uuid4())
    now = datetime.now()

    try:
        # Read file content into memory (consider streaming for large files)
        contents = await file.read()
        if len(contents) > 100 * 1024 * 1024:  # 100MB limit
            raise HTTPException(status_code=413, detail="File too large (max 100MB)")

        # Save original file asynchronously
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(contents)
        logger.info(f"Saved original file to {file_path}")

        # Create document state and metadata
        doc_state = DocumentState(originalName=file.filename, markdownSize=len(contents)) # Initial size
        doc_meta = DocumentMetadata(originalName=file.filename, uploadedAt=now, markdownSize=len(contents), status="pending")

        # Update metadata structure (ensure keys exist)
        metadata.setdefault("document_states", {})[doc_id] = doc_state
        metadata.setdefault("document_metadata", {})[doc_id] = doc_meta
        metadata.setdefault("session_info", {})["updated_at"] = now # Update session timestamp
        
        # Save updated metadata and start processing
        await save_session_metadata_async(session_id, metadata, user_id) # Save immediately before background task
        background_tasks.add_task(process_document_async, session_id, doc_id, user_id)
        logger.info(f"Scheduled processing for doc {doc_id} in session {session_id}")

        return {
            "docId": doc_id,
            "state": doc_state.dict(), # Return dict representation
            "metadata": doc_meta.dict()
        }
        
    except HTTPException as http_exc:
        raise http_exc # Re-raise file size error
    except Exception as e:
        logger.error(f"Error uploading/processing document for session {session_id}: {e}", exc_info=True)
        # Attempt cleanup of saved file if upload failed mid-process
        if await asyncio.to_thread(file_path.exists):
            await asyncio.to_thread(file_path.unlink)
        raise HTTPException(status_code=500, detail=f"Failed to upload document.")

@router.get("/api/direct_chat/chat/session/{session_id}/documents/states")
async def get_document_states(session_id: str, user_id: str = DEFAULT_USER):
    logger.info(f"Fetching document states for session: {session_id}, user: {user_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")
    
    # Return the states, ensuring they are dicts for JSON response
    doc_states = metadata.get("document_states", {})
    return {doc_id: state.dict() if isinstance(state, DocumentState) else state for doc_id, state in doc_states.items()}

@router.get("/api/direct_chat/chat/session/{session_id}/documents/{doc_id}/status")
async def get_document_status(session_id: str, doc_id: str, user_id: str = DEFAULT_USER):
    logger.info(f"Fetching status for doc: {doc_id} in session: {session_id}, user: {user_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata or "document_metadata" not in metadata or doc_id not in metadata["document_metadata"]:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found in session {session_id}.")
    
    doc_meta = metadata["document_metadata"][doc_id]
    return doc_meta.dict() if isinstance(doc_meta, DocumentMetadata) else doc_meta

@router.delete("/api/direct_chat/chat/session/{session_id}/documents/{doc_id}")
async def delete_document(
    session_id: str,
    doc_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = DEFAULT_USER
):
    logger.info(f"Deleting doc: {doc_id} from session: {session_id}, user: {user_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata or "document_states" not in metadata or doc_id not in metadata["document_states"]:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found in session {session_id}.")

    doc_state = metadata["document_states"].get(doc_id)
    cleanup_info = None
    if isinstance(doc_state, DocumentState):
        cleanup_info = {
            "original_name": doc_state.originalName,
            "markdown_path": doc_state.markdownPath
        }
    else:
        logger.warning(f"Document state for {doc_id} in {session_id} was not a DocumentState object, cleanup might be incomplete.")
        # Try to get originalName if state is a dict
        if isinstance(doc_state, dict):
            cleanup_info = {
                "original_name": doc_state.get("originalName"),
                "markdown_path": doc_state.get("markdownPath")
            }

    # Remove state and metadata
    metadata.get("document_states", {}).pop(doc_id, None)
    metadata.get("document_metadata", {}).pop(doc_id, None)
    metadata.setdefault("session_info", {})["updated_at"] = datetime.now() # Update session timestamp

    # Save updated metadata and schedule cleanup
    await save_session_metadata_async(session_id, metadata, user_id)
    if cleanup_info:
        background_tasks.add_task(cleanup_document_files_async, session_id, doc_id, user_id, cleanup_info)
        logger.info(f"Scheduled file cleanup for doc {doc_id}")
    else:
        logger.warning(f"Skipping file cleanup for doc {doc_id} due to missing info.")

    return {"status": "success", "message": "Document deletion scheduled."}

@router.put("/api/direct_chat/chat/session/{session_id}/documents/{doc_id}/toggle")
async def toggle_document_state(
    session_id: str,
    doc_id: str,
    background_tasks: BackgroundTasks, # Use background tasks for saving
    user_id: str = DEFAULT_USER
):
    logger.info(f"Toggling state for doc: {doc_id} in session: {session_id}, user: {user_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata or "document_states" not in metadata or doc_id not in metadata["document_states"]:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found in session {session_id}.")

    doc_state = metadata["document_states"].get(doc_id)
    if not isinstance(doc_state, DocumentState):
        logger.error(f"Document state for {doc_id} in {session_id} is not a valid object.")
        raise HTTPException(status_code=500, detail="Invalid document state found.")

    # Toggle and update timestamp
    doc_state.isChecked = not doc_state.isChecked
    doc_state.lastModified = datetime.now()
    metadata.setdefault("session_info", {})["updated_at"] = doc_state.lastModified
    
    # Save metadata asynchronously
    background_tasks.add_task(save_session_metadata_async, session_id, metadata, user_id)
    
    logger.info(f"Doc {doc_id} toggled to isChecked={doc_state.isChecked}")
    return {"docId": doc_id, "isChecked": doc_state.isChecked}

@router.put("/api/direct_chat/chat/session/{session_id}/documents/{doc_id}/classification")
async def update_document_classification(
    session_id: str,
    doc_id: str,
    request: UpdateDocumentClassificationRequest,
    background_tasks: BackgroundTasks, # Use background tasks for saving
    user_id: str = DEFAULT_USER
):
    logger.info(f"Updating classification for doc: {doc_id} to '{request.classification}' in session: {session_id}")
    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata or "document_states" not in metadata or doc_id not in metadata["document_states"]:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found in session {session_id}.")

    doc_state = metadata["document_states"].get(doc_id)
    if not isinstance(doc_state, DocumentState):
        logger.error(f"Document state for {doc_id} in {session_id} is not a valid object.")
        raise HTTPException(status_code=500, detail="Invalid document state found.")

    # Update classification and timestamp
    doc_state.classification = request.classification
    doc_state.lastModified = datetime.now()
    metadata.setdefault("session_info", {})["updated_at"] = doc_state.lastModified
    
    # Save metadata asynchronously
    background_tasks.add_task(save_session_metadata_async, session_id, metadata, user_id)
    
    logger.info(f"Classification for doc {doc_id} updated to {request.classification}")
    return {"success": True, "message": "Document classification updated"}

# --- Vectorstore Endpoints --- #
@router.get("/api/direct_chat/vectorstores")
async def list_vectorstores():
    logger.info("Listing available vectorstores")
    vectorstores = []
    if not await asyncio.to_thread(VECTORSTORES_DIR.exists):
        logger.warning(f"Vectorstore directory not found: {VECTORSTORES_DIR}")
        return {"vectorstores": []}
    
    try:
        # Use asyncio.to_thread for potentially blocking OS calls
        store_dirs = await asyncio.to_thread(list, VECTORSTORES_DIR.iterdir())
        
        for vs_dir in store_dirs:
            if await asyncio.to_thread(vs_dir.is_dir):
                vs_id = vs_dir.name
                vs_name = vs_id # Default name
                metadata_path = vs_dir / "metadata.json"
                if await asyncio.to_thread(metadata_path.exists):
                    try:
                        async with aiofiles.open(metadata_path, 'r') as f:
                            content = await f.read()
                            vs_meta = json.loads(content)
                            vs_name = vs_meta.get("name", vs_id)
                    except Exception as e:
                        logger.error(f"Error reading metadata for vectorstore {vs_id}: {e}")
                vectorstores.append({"id": vs_id, "name": vs_name})
                
        logger.info(f"Found {len(vectorstores)} vectorstores.")
        return {"vectorstores": vectorstores}
    except Exception as e:
        logger.error(f"Error listing vectorstores: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list vectorstores.")

@router.put("/api/direct_chat/chat/session/{session_id}/vectorstore")
async def set_session_vectorstore(
    session_id: str,
    request: SetVectorstoreRequest,
    background_tasks: BackgroundTasks,
    user_id: str = DEFAULT_USER
):
    vectorstore_id = request.vectorstore
    logger.info(f"Setting vectorstore for session {session_id} to '{vectorstore_id}' for user {user_id}")

    # Validate vectorstore existence (async check)
    if vectorstore_id: # Allow setting to None/empty
        vectorstore_path = VECTORSTORES_DIR / vectorstore_id
        if not await asyncio.to_thread(vectorstore_path.exists) or not await asyncio.to_thread(vectorstore_path.is_dir):
            logger.error(f"Attempted to set non-existent vectorstore: {vectorstore_id}")
            raise HTTPException(status_code=404, detail=f"Vectorstore '{vectorstore_id}' not found.")

    metadata = await load_session_metadata_async(session_id, user_id)
    if not metadata:
        # Handle case where session metadata doesn't exist yet (e.g., error during creation)
        # Option 1: Raise 404
        # raise HTTPException(status_code=404, detail=f"Session {session_id} metadata not found.")
        # Option 2: Create default metadata (as done previously)
        logger.warning(f"Metadata not found for session {session_id} when setting vectorstore. Creating default.")
        metadata = {"session_info": {"id": session_id, "name": f"Session {session_id[:8]}", "created_at": datetime.now(), "updated_at": datetime.now()}, "document_states": {}, "document_metadata": {}}
        
    # Update vectorstore setting and timestamp
    metadata["vectorstore"] = vectorstore_id if vectorstore_id else None # Store None if empty
    now = datetime.now()
    metadata.setdefault("session_info", {})["updated_at"] = now
    # Ensure vectorstore is also in session_info for consistency (optional)
    metadata["session_info"]["vectorstore"] = metadata["vectorstore"]
    
    # Save updated metadata asynchronously
    background_tasks.add_task(save_session_metadata_async, session_id, metadata, user_id)
    
    logger.info(f"Vectorstore for session {session_id} updated to '{metadata['vectorstore']}'")
    return {"message": f"Vectorstore for session {session_id} set to '{metadata['vectorstore'] or 'None'}'"}

# Add the router to the app
app.include_router(router)

# --- Main Execution Guard --- #
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Direct Chat Service using Uvicorn...")
    host = getattr(config.server, 'host', '0.0.0.0')
    port = getattr(config.server, 'port', 8011) # Defaulting to 8011 if not specified
    workers = getattr(config.server, 'workers', 1)
    reload = getattr(config.server, 'reload', False)
    log_level = getattr(config.server, 'log_level', 'info')
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        workers=workers,
        reload=reload,
        log_level=log_level
    )
