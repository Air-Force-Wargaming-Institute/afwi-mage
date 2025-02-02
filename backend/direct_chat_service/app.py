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
    response: str
    timestamp: datetime

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
    ("system", "You are a helpful AI assistant."),
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

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Get response using the runnable
        response = chat_with_history.invoke(
            {"input": request.message},
            {"configurable": {"session_id": request.session_id}}
        )
        
        return ChatResponse(
            response=response.content,
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
async def reset_conversation(session_id: str = "default"):
    try:
        if session_id in histories:
            histories[session_id] = ChatMessageHistory()
        return {"status": "success", "message": "Conversation reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_history(session_id: str = "default"):
    try:
        history = get_or_create_history(session_id)
        return {
            "history": history.messages,
            "timestamp": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include router in app
app.include_router(router)
