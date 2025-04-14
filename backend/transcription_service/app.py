from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from transcribe_routes import router as transcribe_router
from config import SERVICE_NAME, SERVICE_PORT, CORS_ORIGINS, LOG_LEVEL
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=LOG_LEVEL.upper())
logger = logging.getLogger(__name__)

app = FastAPI(title=SERVICE_NAME)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transcribe_router, prefix="/api/transcribe") # Add prefix for clarity


@app.get("/")
async def root():
    return {"message": f"Welcome to the {SERVICE_NAME} API"}

@app.get("/health") # Simpler health check endpoint path
async def health_check():
    """Health check endpoint for the transcription service."""
    logger.info("Health check endpoint called.")
    # Add more sophisticated checks if needed (e.g., model loaded status)
    return {"status": "healthy", "service": SERVICE_NAME}

if __name__ == "__main__":
    logger.info(f"Starting {SERVICE_NAME} on port {SERVICE_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT, log_level=LOG_LEVEL.lower()) 