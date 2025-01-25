from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from utils.shared_state import shared_state
from config import load_config
from utils.vector_store.vectorstore import check_for_vectorstore, load_local_vectorstore, create_retriever
from multiagent.processQuestion import process_question_stream

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_conversations: dict = {}  # Maps WebSocket to conversation_id

    async def connect(self, websocket: WebSocket, conversation_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # If conversation_id is provided, load that conversation
        if conversation_id:
            conversation = shared_state.conversation_manager.load_conversation(conversation_id)
            if conversation:
                self.connection_conversations[websocket] = conversation_id
        
        # If no conversation_id or loading failed, start a new conversation
        if websocket not in self.connection_conversations:
            new_conversation_id = shared_state.conversation_manager.start_new_conversation()
            self.connection_conversations[websocket] = new_conversation_id
            
        # Send the conversation ID to the client
        await websocket.send_json({
            "type": "conversation_id",
            "content": self.connection_conversations[websocket]
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connection_conversations:
            del self.connection_conversations[websocket]
        self.active_connections.remove(websocket)

    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_json(message)

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

app = FastAPI()
manager = ConnectionManager()

config = load_config()
VS_PERSIST_DIR = config['VS_PERSIST_DIR']
SEARCH_TYPE = config['SEARCH_TYPE']
K = config['K']

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check if a vector store exists at the VS_PERSIST_DIR location
if check_for_vectorstore(VS_PERSIST_DIR):
    shared_state.VECTOR_STORE = load_local_vectorstore(VS_PERSIST_DIR)
else:
    shared_state.VECTOR_STORE = None

# If a vector store exists, create a retriever
if shared_state.VECTOR_STORE:
    shared_state.RETRIEVER = create_retriever(type=SEARCH_TYPE, vector_store=shared_state.VECTOR_STORE, k=K)
else:
    shared_state.RETRIEVER = None

@app.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: Optional[str] = Query(None)
):
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            message = await websocket.receive_text()
            print(f"Received message via WebSocket: {message}")
            
            shared_state.QUESTION = message
            
            try:
                # Process the question and stream results
                async for output in process_question_stream():
                    await manager.send_message(output, websocket)
                    
            except Exception as e:
                error_message = {"type": "error", "content": str(e)}
                await manager.send_message(error_message, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/chat")
async def chat(message: ChatMessage):
    """Legacy REST endpoint - maintained for backward compatibility"""
    try:
        print(f"Received message: {message.message}")
        shared_state.QUESTION = message.message
        
        # Load conversation if ID provided
        if message.conversation_id:
            shared_state.conversation_manager.load_conversation(message.conversation_id)
        else:
            shared_state.conversation_manager.start_new_conversation()

        response = process_question()
        return {
            "response": response,
            "conversation_id": shared_state.conversation_manager.current_conversation_id
        }
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)