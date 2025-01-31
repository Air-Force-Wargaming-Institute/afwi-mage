from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.shared_state import shared_state
from config import load_config
from multiagent.processQuestion import process_question

class ChatMessage(BaseModel):
    message: str

app = FastAPI()

config = load_config()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat(message: ChatMessage):
    try:
        print(f"Received message: {message.message}")
        shared_state.QUESTION = message.message #TODO: add logic to ensure there is actually a question

        # TODO: Implement chat logic
        response = process_question(message.message)
        #response = {"response": f"Received message: {message.message}"}
        return {"response": response}
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)