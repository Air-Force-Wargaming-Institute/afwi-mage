from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.shared_state import shared_state
from config import load_config
from utils.vector_store.vectorstore import check_for_vectorstore, load_local_vectorstore, create_retriever
from multiagent.processQuestion import process_question


class ChatMessage(BaseModel):
    message: str

app = FastAPI()

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

@app.post("/chat")
async def chat(message: ChatMessage):
    try:
        print(f"Received message: {message.message}")
        shared_state.QUESTION = message.message #TODO: add logic to ensure there is actually a question

        # TODO: Implement chat logic
        response = process_question()
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