"""
Main application entry point for the embedding service.

This file initializes the FastAPI app and includes all routers.
It's designed to replace the monolithic app.py with a more modular structure.
"""

import os
import gc
import sys
import logging
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure the current directory is in the path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
    print(f"Added current directory to Python path: {current_dir}")

# Import the API router with robust error handling
try:
    # Try direct import first
    from api import main_router
    print("Successfully imported main_router directly")
except ImportError as e:
    print(f"ERROR importing api.main_router: {e}")
    # Try with explicit path to Docker container's app directory
    sys.path.append('/app')
    print(f"Added /app to Python path, current path: {sys.path}")
    try:
        from api import main_router
        print("Successfully imported main_router with /app in path")
    except ImportError as e2:
        print(f"CRITICAL: Could not import api.main_router even with /app in path: {e2}")
        # One last attempt - try importing as a relative module
        try:
            import api
            print(f"Successfully imported api module, attempting to access main_router")
            main_router = api.main_router
        except (ImportError, AttributeError) as e3:
            print(f"All attempts to import main_router failed: {e3}")
            print(f"Current sys.path: {sys.path}")
            raise

# Import configuration
from config import (
    HOST, PORT, CORS_ORIGINS, LOG_LEVEL, DEBUG,
    VECTORSTORE_DIR, DOC_STAGING_DIR, UPLOAD_DIR, JOB_DIR,
    validate_config, get_config
)

# Configure logging first before any other operations
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("embedding_service")

# Make sure directories exist
Path(VECTORSTORE_DIR).mkdir(exist_ok=True)
Path(DOC_STAGING_DIR).mkdir(exist_ok=True)
Path(UPLOAD_DIR).mkdir(exist_ok=True)
Path(JOB_DIR).mkdir(exist_ok=True)

# Create the FastAPI application
app = FastAPI(
    title="Embedding Service", 
    version="1.0.0",
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

# Include the main API router
app.include_router(main_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/api/embedding/system/status")
async def get_system_status():
    """Get system status."""
    import psutil
    import platform
    
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    status = {
        "cpu": {
            "cores": psutil.cpu_count(logical=False),
            "logical_cores": psutil.cpu_count(logical=True),
            "usage_percent": psutil.cpu_percent(interval=0.1)
        },
        "memory": {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent
        },
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        },
        "python": {
            "version": platform.python_version(),
            "implementation": platform.python_implementation()
        },
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine()
        }
    }
    
    # Check if GPU is available
    try:
        import torch
        status["gpu"] = {
            "available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() and torch.cuda.device_count() > 0 else None,
            "current_device": torch.cuda.current_device() if torch.cuda.is_available() else None
        }
        
        if torch.cuda.is_available():
            # Get memory info for each device
            status["gpu"]["devices"] = []
            for i in range(torch.cuda.device_count()):
                torch.cuda.set_device(i)
                memory_allocated = torch.cuda.memory_allocated(i)
                memory_reserved = torch.cuda.memory_reserved(i)
                status["gpu"]["devices"].append({
                    "id": i,
                    "name": torch.cuda.get_device_name(i),
                    "memory_allocated": memory_allocated,
                    "memory_reserved": memory_reserved
                })
    except ImportError:
        status["gpu"] = {"available": False}
    
    # Add configuration info
    status["config"] = {
        "vectorstore_dir": str(VECTORSTORE_DIR),
        "upload_dir": str(UPLOAD_DIR),
        "job_dir": str(JOB_DIR),
        "debug": DEBUG
    }
    
    return status


@app.get("/api/embedding/config")
async def get_app_config():
    """Return the current configuration (excluding sensitive data)."""
    config = get_config()
    
    # Remove sensitive data
    for key in list(config.keys()):
        if "key" in key.lower() or "secret" in key.lower() or "password" in key.lower():
            config[key] = "********"
    
    return config


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all uncaught exceptions."""
    logger.error(f"Uncaught exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


@app.on_event("startup")
async def startup_event():
    """Run tasks on application startup."""
    logger.info("Starting embedding service")
    
    # Validate the configuration
    validate_config()
    
    # Initialize core components
    from core.job import initialize_job_manager
    initialize_job_manager(JOB_DIR)

    # Run migrations
    from core.maintenance import migrate_index_files, log_system_resources
    migrate_index_files(VECTORSTORE_DIR)
    
    # Log system information
    log_system_resources("startup")
    import platform
    logger.info(f"System: {platform.system()} {platform.release()}")
    logger.info(f"Python version: {platform.python_version()}")
    
    # Check if GPU is available
    try:
        import torch
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            logger.info(f"GPU available: {device_count} device(s)")
            for i in range(device_count):
                logger.info(f"  Device {i}: {torch.cuda.get_device_name(i)}")
        else:
            logger.info("GPU not available")
    except ImportError:
        logger.info("PyTorch not installed, GPU availability check skipped")
    
    # Check FAISS GPU support
    try:
        import faiss
        if hasattr(faiss, 'StandardGpuResources'):
            logger.info("FAISS GPU support is available")
            
            # Try to initialize a GPU resource
            try:
                res = faiss.StandardGpuResources()
                logger.info("Successfully initialized FAISS GPU resources")
            except Exception as e:
                logger.warning(f"Failed to initialize FAISS GPU resources: {str(e)}")
        else:
            logger.warning("FAISS is installed but GPU support is not available")
    except ImportError:
        logger.warning("FAISS could not be imported, using CPU only")
    except Exception as e:
        logger.warning(f"Error checking FAISS GPU support: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run tasks on application shutdown."""
    logger.info("Shutting down embedding service")
    # Clear any cached objects
    gc.collect()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=DEBUG) 