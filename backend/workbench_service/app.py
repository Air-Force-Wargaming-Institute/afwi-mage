"""
Analysis Workbench Service - Main Application Entry Point

This service provides APIs for data analysis and visualization
using LLMs to assist analysts in working with spreadsheets and generating charts.
"""

import os
import logging
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import configuration
from config import (
    HOST, PORT, CORS_ORIGINS, LOG_LEVEL, DEBUG,
    WORKBENCH_UPLOADS_DIR, WORKBENCH_OUTPUTS_DIR
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("workbench_service")

# Create required directories
os.makedirs(WORKBENCH_UPLOADS_DIR, exist_ok=True)
os.makedirs(WORKBENCH_OUTPUTS_DIR, exist_ok=True)

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
    return {"status": "healthy", "service": "workbench"}

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