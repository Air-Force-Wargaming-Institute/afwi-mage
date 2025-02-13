from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
import logging
from pathlib import Path
import os
from concurrent.futures import ThreadPoolExecutor
import asyncio
import shutil
from config_ import load_config
from multiagent.processQuestion import process_question
from typing import Optional
from multiagent.session_manager import SessionManager

config = load_config()

# Ensure log directory exists
log_dir = Path(config['LOG_PATH'])
log_dir.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    filename=log_dir / 'chat_service.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    message: str
    team_id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Increase the number of workers based on your server capacity
executor = ThreadPoolExecutor(max_workers=20)

# Create a semaphore to limit concurrent API calls if needed
MAX_CONCURRENT_REQUESTS = 10
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

@app.post("/chat")
async def chat_endpoint(request_data: ChatMessage):
    try:
        # Use Pydantic model for request validation
        logger.info(f"Received chat message: {request_data.message}")
        
        logger.info(f"session_id: {request_data.session_id}")
        async with semaphore:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                executor,
                lambda: asyncio.run(process_question(
                    question=request_data.message,
                    user_id=request_data.user_id,
                    session_id=request_data.session_id,
                    team_id=request_data.team_id
                ))
            )
            logger.info(f"Response: {response}")
            return response
            
    except ValidationError as e:
        logger.error(f"Invalid request data: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete_team/{team_name}")
async def delete_team(team_name: str):
    try:
        # Get path to team directory in chat_teams
        chat_teams_dir = Path(__file__).parent / "chat_teams"
        team_dir = chat_teams_dir / team_name

        # Remove team directory if it exists
        if team_dir.exists():
            shutil.rmtree(team_dir)
            return {"message": f"Team {team_name} deleted successfully from chat service"}
        else:
            return {"message": f"Team {team_name} not found in chat service"}

    except Exception as e:
        print(f"Error deleting team: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    try:
        session_manager = SessionManager()
        session = session_manager.get_session(session_id)
        if session:
            return session
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error retrieving session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions():
    try:
        session_manager = SessionManager()
        return session_manager.list_sessions()
    except Exception as e:
        logger.error(f"Error listing sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        session_manager = SessionManager()
        if session_manager.delete_session(session_id):
            return {"message": f"Session {session_id} deleted successfully"}
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)