from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from transcribe_routes import router as transcribe_router
from websocket_routes import router as websocket_router
from config import SERVICE_NAME, SERVICE_PORT, CORS_ORIGINS, LOG_LEVEL
from model_loader import load_all_models, are_models_loaded
from database import create_tables
import uvicorn
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=LOG_LEVEL.upper())
logger = logging.getLogger(__name__)

# --- Application Lifecycle --- 
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models
    logger.info("Application startup: Loading models...")
    load_all_models() # Load with default language 'en'
    # Startup: Create database tables
    logger.info("Application startup: Ensuring database tables exist...")
    await create_tables()
    yield
    # Shutdown: (Optional) Clean up resources if needed
    logger.info("Application shutdown.")

app = FastAPI(title=SERVICE_NAME, lifespan=lifespan)

@app.get("/api/transcription/health") # Simpler health check endpoint path
async def health_check():
    """Health check endpoint for the transcription service."""
    logger.info("Health check endpoint called.")
    # Check model status
    model_status = "loaded" if are_models_loaded() else "not loaded"
    # return {"status": "healthy", "service": SERVICE_NAME, "models": model_status}
    return {"status": "healthy"}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transcribe_router, tags=["Transcription (File Upload)"])
app.include_router(websocket_router, tags=["Transcription (WebSocket)"])


@app.get("/")
async def root():
    return {"message": f"Welcome to the {SERVICE_NAME} API"}
