from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Import config
from config import logger, BASE_DIR, DATA_DIR, REPORTS_DIR, TEMPLATES_DIR

# Import route handlers
from api import api_router

# Import error handlers
from utils.errors import http_exception_handler, general_exception_handler

# Import service initialization functions
from services.file_service import ensure_directories, migrate_legacy_data

# Import templates initialization
from init_templates import init_templates

# Create FastAPI app
app = FastAPI(title="Report Builder Service")

# CORS Middleware Configuration
origins = [
    "http://localhost:3000",  # Allow your frontend origin
    # Add other origins if needed, e.g., your deployed frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all standard methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers, including Authorization
)

# Add router for API endpoints
app.include_router(api_router)

# Add exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Root endpoint
@app.get("")
async def root():
    return {"message": "Report Builder Service is running"}

@app.get("/api/report_builder/health")
async def health_check():
    return {"status": "healthy"}

# Initialize service on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting Report Builder Service")
    
    # Ensure directories exist
    ensure_directories()
    
    # Migrate legacy data if it exists
    migrate_legacy_data()
    
    # Initialize templates
    init_templates()
    
    logger.info("Report Builder Service started successfully") 