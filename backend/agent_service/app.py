from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import agent_routes
from routers import generation
import logging
from pathlib import Path
import os
from config import settings, LOG_DIR

app = FastAPI(
    title="Agent Service",
    description="Service for managing AI agents, including AI generation.",
    version="0.1.0"
)

log_dir = Path('/app/data/logs')
log_dir.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    filename=LOG_DIR / 'agent_service.log',
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
# app.include_router(agent_routes.router, prefix="/api/agent")
app.include_router(agent_routes.router)
app.include_router(generation.router)

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE FineTune Agent Service API"}

@app.get("/api/agent/health")
async def health_check():
    """Health check endpoint for the API gateway."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
    logger.info("Agent Service API started")

