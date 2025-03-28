"""
Analysis Workbench Service - Main Application Entry Point

This service provides APIs for data analysis and visualization
using LLMs to assist analysts in working with spreadsheets and generating charts.
"""

import os
import json
import logging
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path

# Import configuration
from config import (
    HOST, PORT, CORS_ORIGINS, LOG_LEVEL, DEBUG, IN_DOCKER,
    WORKBENCH_UPLOADS_DIR, WORKBENCH_OUTPUTS_DIR, BASE_DIR, WORKBENCH_DIR
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("workbench_service")

# Log directory information with absolute paths
logger.info(f"BASE_DIR: {str(BASE_DIR)} (absolute: {os.path.abspath(BASE_DIR)})")
logger.info(f"WORKBENCH_DIR: {str(WORKBENCH_DIR)} (absolute: {os.path.abspath(WORKBENCH_DIR)})")
logger.info(f"WORKBENCH_UPLOADS_DIR: {str(WORKBENCH_UPLOADS_DIR)} (absolute: {os.path.abspath(WORKBENCH_UPLOADS_DIR)})")
logger.info(f"WORKBENCH_OUTPUTS_DIR: {str(WORKBENCH_OUTPUTS_DIR)} (absolute: {os.path.abspath(WORKBENCH_OUTPUTS_DIR)})")

# Create required directories with verbose logging
for directory in [WORKBENCH_DIR, WORKBENCH_UPLOADS_DIR, WORKBENCH_OUTPUTS_DIR]:
    try:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Ensured directory exists: {directory}")
    except Exception as e:
        logger.error(f"Failed to create directory {directory}: {str(e)}")

# Initialize metadata file if it doesn't exist
metadata_file = WORKBENCH_UPLOADS_DIR / "metadata.json"
logger.info(f"Metadata file path: {metadata_file} (absolute: {os.path.abspath(metadata_file)})")

if not os.path.exists(metadata_file):
    logger.info(f"Metadata file does not exist, creating empty metadata file")
    try:
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(metadata_file), exist_ok=True)
        
        # Create an empty metadata dict
        with open(metadata_file, 'w') as f:
            json.dump({}, f, indent=2)
        logger.info(f"Successfully created empty metadata file at {metadata_file}")
        
        # Verify file was created
        if os.path.exists(metadata_file):
            logger.info(f"Verified metadata file exists at {metadata_file}")
        else:
            logger.error(f"Metadata file was not created at {metadata_file}")
    except Exception as e:
        logger.error(f"Failed to create metadata file: {str(e)}")
        
        # Try alternative location as fallback
        try:
            alt_path = os.path.join(os.getcwd(), "metadata.json")
            logger.info(f"Attempting to create metadata at alternative location: {alt_path}")
            with open(alt_path, 'w') as f:
                json.dump({}, f, indent=2)
            logger.info(f"Successfully created metadata file at alternative location: {alt_path}")
        except Exception as alt_e:
            logger.error(f"Failed to create metadata at alternative location: {str(alt_e)}")
else:
    logger.info(f"Metadata file already exists at {metadata_file}")
    # Try to read the file to verify it's valid
    try:
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        logger.info(f"Successfully read metadata with {len(metadata)} entries")
    except Exception as e:
        logger.error(f"Error reading existing metadata file: {str(e)}")

# Create FastAPI app
app = FastAPI(
    title="Analysis Workbench Service",
    description="Service for data analysis and visualization",
    version="0.1.0",
    debug=DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Import routers
try:
    from api.spreadsheet import router as spreadsheet_router
    from api.visualization import router as visualization_router
    from api.jobs import router as jobs_router
    
    # Include routers
    app.include_router(spreadsheet_router, prefix="/api/workbench/spreadsheets", tags=["Spreadsheets"])
    app.include_router(visualization_router, prefix="/api/workbench/visualizations", tags=["Visualizations"])
    app.include_router(jobs_router, prefix="/api/workbench/jobs", tags=["Jobs"])
except ImportError as e:
    logger.warning(f"Could not import one or more routers: {e}")
    logger.warning("API endpoints will be limited until routers are properly implemented")

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    # Include file system status in health check
    fs_status = {
        "metadata_file_exists": os.path.exists(WORKBENCH_UPLOADS_DIR / "metadata.json"),
        "uploads_dir_exists": os.path.exists(WORKBENCH_UPLOADS_DIR),
        "uploads_dir_writable": os.access(WORKBENCH_UPLOADS_DIR, os.W_OK),
        "running_in_docker": IN_DOCKER
    }
    
    return {
        "status": "healthy", 
        "service": "workbench",
        "filesystem": fs_status
    }

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all uncaught exceptions."""
    logger.error(f"Uncaught exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting workbench service on {HOST}:{PORT}")
    uvicorn.run("app:app", host=HOST, port=PORT, reload=DEBUG) 