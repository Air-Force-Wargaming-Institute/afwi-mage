from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import agent_routes
import logging
from pathlib import Path

app = FastAPI()


log_dir = Path('/app/data/logs')
log_dir.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    filename=log_dir / 'agent_service.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agent_routes.router, prefix="/api/agents")

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE FineTune Agent Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
    logger.info("Agent Service API started")
