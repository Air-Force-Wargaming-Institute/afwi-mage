"""
API endpoints for maintenance operations.

This module provides endpoints for:
- Vector store backup management
- System resource reporting
- Maintenance tasks
"""

import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Import from core modules - handle both environments
try:
    # First try relative imports (development)
    from ..core.maintenance import cleanup_all_backups, log_system_resources
    from ..config import VECTORSTORE_DIR
except ImportError:
    # Fall back to absolute imports (Docker)
    from core.maintenance import cleanup_all_backups, log_system_resources
    from config import VECTORSTORE_DIR

# Set up logging
logger = logging.getLogger("embedding_service")

# Create router
router = APIRouter(tags=["Maintenance"])


class CleanupBackupsRequest(BaseModel):
    """Request to clean up vector store backups."""
    max_per_store: int = 3


class CleanupBackupsResponse(BaseModel):
    """Response from cleaning up vector store backups."""
    success: bool
    message: str
    removed_count: Optional[int] = None
    orphaned_count: Optional[int] = None
    errors: Optional[int] = None


class SystemResourcesResponse(BaseModel):
    """Response containing system resource information."""
    process: Dict[str, Any]
    system: Dict[str, Any]


@router.post("/cleanup-backups", response_model=CleanupBackupsResponse)
async def cleanup_vectorstore_backups(request: CleanupBackupsRequest):
    """
    Clean up old backup files for all vector stores.
    
    Args:
        request: Request containing the maximum number of backups to keep per vector store
        
    Returns:
        Response containing cleanup results
    """
    logger.info(f"Cleaning up vector store backups, max_per_store={request.max_per_store}")
    result = cleanup_all_backups(VECTORSTORE_DIR, request.max_per_store)
    return CleanupBackupsResponse(
        success=result.get("success", False),
        message=result.get("message", "Unknown error"),
        removed_count=result.get("removed_count", 0),
        orphaned_count=result.get("orphaned_count", 0),
        errors=result.get("errors", 0)
    )


@router.get("/system-resources", response_model=SystemResourcesResponse)
async def get_system_resources():
    """
    Get current system resource information.
    
    Returns:
        Response containing system resource information
    """
    logger.info("Getting system resource information")
    resources = log_system_resources("API request")
    return SystemResourcesResponse(
        process=resources.get("process", {}),
        system=resources.get("system", {})
    ) 