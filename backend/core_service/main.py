from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import redis.asyncio as redis
from routes import document_library
from core_routes import router as core_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MAGE Core Service",
    description="Core service for MAGE document management",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(core_router, prefix="/api/core", tags=["core"])
app.include_router(document_library.router, tags=["documents"])

# Additional root health check for debugging
@app.get("/health")
async def root_health():
    """Root health check (for debugging)."""
    return {"status": "healthy", "service": "core"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    ) 