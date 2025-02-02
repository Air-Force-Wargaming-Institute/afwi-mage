from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
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
    allow_methods=config.cors.allowed_methods,
    allow_headers=config.cors.allowed_headers,
)

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

class ChatSession(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime

# Store active chat sessions
chat_sessions: Dict[str, ChatSession] = {}

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

@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

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
async def get_chat_history(session_id: str):
    try:
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
                "id": str(uuid.uuid4()),  # Generate unique ID for each message
                "text": text,
                "sender": sender,
                "timestamp": datetime.now().isoformat()
            })
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/session")
async def create_chat_session():
    try:
        session_id = str(uuid.uuid4())
        now = datetime.now()
        session = ChatSession(
            id=session_id,
            name=f"New Chat {len(chat_sessions) + 1}",
            created_at=now,
            updated_at=now
        )
        chat_sessions[session_id] = session
        # Initialize message history for the session
        get_or_create_history(session_id)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/sessions")
async def get_chat_sessions():
    try:
        return list(chat_sessions.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chat/session/{session_id}")
async def delete_chat_session(session_id: str):
    try:
        if session_id in chat_sessions:
            del chat_sessions[session_id]
        if session_id in histories:
            del histories[session_id]
        return {"status": "success", "message": "Chat session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include router in app
app.include_router(router)
