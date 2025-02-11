from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from pathlib import Path
import os
from concurrent.futures import ThreadPoolExecutor
import asyncio

from config import load_config
from multiagent.processQuestion import process_question

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
async def chat_endpoint(request_data: dict):
    message = request_data.get("message")
    user_id = request_data.get("user_id")
    session_id = request_data.get("session_id")
    
    logger.info(f"Received chat message: {message}")
    
    async with semaphore:  # Limit concurrent requests
        try:
            # Process the question in a thread pool
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                executor,
                lambda: asyncio.run(process_question(
                    question=message,
                    user_id=user_id,
                    session_id=session_id
                ))
            )
            
            logger.info(f"Generated response with session {response.get('session_id')}")
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)