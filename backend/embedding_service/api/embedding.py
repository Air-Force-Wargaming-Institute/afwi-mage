"""
API endpoints for managing embedding models in the embedding service.

This module provides API endpoints for:
- Listing available embedding models
- Getting embedding model details
"""

import sys
from typing import List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

# Import from the core module with better error handling
try:
    # Try relative import first (development)
    from ..core.embedding import get_available_embedding_models
except ImportError as e:
    print(f"Relative import failed: {e}")
    try:
        # Try direct import (Docker)
        from core.embedding import get_available_embedding_models
    except ImportError as e:
        print(f"Direct import from core failed: {e}")
        # Last resort - for Docker with different path structure
        import os
        module_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if module_dir not in sys.path:
            sys.path.insert(0, module_dir)
        try:
            from core.embedding import get_available_embedding_models
        except ImportError as e:
            print(f"All import attempts failed for core.embedding: {e}")
            print(f"Current sys.path: {sys.path}")
            raise

# Set up router
# router = APIRouter(prefix="/models", tags=["embedding models"])
router = APIRouter(tags=["embedding models"])


class EmbeddingModelInfo(BaseModel):
    """Information about an embedding model."""
    id: str
    name: str
    description: str
    provider: str
    
    model_config = {
        "extra": "ignore",  # Equivalent to the old Config.extra = "ignore"
        "json_schema_extra": {
            "example": {
                "id": "/models/bge-base-en-v1.5",
                "name": "BGE Base English v1.5",
                "description": "BGE Base embedding model optimized for English text",
                "provider": "vLLM"
            }
        }
    }


@router.get("/api/embedding/models", response_model=List[EmbeddingModelInfo])
async def get_models():
    """
    Get a list of available embedding models.
    
    Returns:
        List of available embedding models
    """
    models = get_available_embedding_models()
    return models
