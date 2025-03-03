"""
Configuration settings for the embedding service.

This module provides a standardized way to access configuration settings
and validates required environment variables.
"""

import os
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import requests

# Set up logging
logger = logging.getLogger("embedding_service")

# Environment variable validation
def get_env(key: str, default: Any = None, required: bool = False) -> Any:
    """
    Get an environment variable with validation.
    
    Args:
        key: The environment variable name
        default: Default value if not found
        required: Whether the variable is required
        
    Returns:
        The environment variable value or default
        
    Raises:
        ValueError: If the variable is required but not found
    """
    value = os.environ.get(key)
    if value is None:
        if required:
            error_msg = f"Required environment variable {key} not set"
            logger.error(error_msg)
            raise ValueError(error_msg)
        return default
    return value


def get_env_int(key: str, default: Optional[int] = None, required: bool = False) -> int:
    """Get an environment variable as an integer."""
    value = get_env(key, None, required)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning(f"Environment variable {key} is not a valid integer, using default {default}")
        return default


def get_env_bool(key: str, default: bool = False) -> bool:
    """Get an environment variable as a boolean."""
    value = get_env(key, None)
    if value is None:
        return default
    return value.lower() in ('true', 'yes', '1', 't', 'y')


def get_env_list(key: str, default: List[str] = None, delimiter: str = ",") -> List[str]:
    """Get an environment variable as a list of strings."""
    if default is None:
        default = []
    value = get_env(key, None)
    if value is None:
        return default
    return [item.strip() for item in value.split(delimiter) if item.strip()]


# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = Path(get_env("DATA_DIR", str(BASE_DIR.parent.parent / "data")))
MODELS_DIR = Path(get_env("MODELS_DIR", str(BASE_DIR.parent.parent / "models")))

# Specific paths
DATASET_DIR = DATA_DIR / "datasets"
EXTRACTION_DIR = DATA_DIR / "extraction"
UPLOAD_DIR = Path(get_env("UPLOAD_DIR", str(DATA_DIR / "uploads")))
OUTPUT_DIR = DATA_DIR / "outputs"
LOG_DIR = DATA_DIR / "logs"
VECTORSTORE_DIR = Path(get_env("VECTORSTORE_DIR", str(DATA_DIR / "vectorstores")))
JOB_DIR = Path(get_env("JOB_DIR", str(DATA_DIR / "jobs")))

# Temporary PDF staging directory for processing
DOC_STAGING_DIR = Path(get_env("DOC_STAGING_DIR", str(BASE_DIR / "doc_staging")))

# Models directories
BASE_MODELS_DIR = MODELS_DIR / "base_models"

# Ensure directories exist
for dir_path in [DATASET_DIR, EXTRACTION_DIR, UPLOAD_DIR, OUTPUT_DIR, LOG_DIR, 
                 BASE_MODELS_DIR, VECTORSTORE_DIR, DOC_STAGING_DIR, JOB_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# External service configuration
CORE_SERVICE_URL = get_env("CORE_SERVICE_URL", "http://core:8000")
OLLAMA_BASE_URL = get_env("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
LLM_API_KEY = get_env("LLM_API_KEY", "")
LLM_BASE_URL = get_env("LLM_BASE_URL", "")

# Embedding model configurations
DEFAULT_EMBEDDING_MODEL = get_env("DEFAULT_EMBEDDING_MODEL", "nomic-embed-text")
EMBEDDING_MODEL_VERSION = get_env("EMBEDDING_MODEL_VERSION", "latest")
EMBEDDING_DIMENSION = get_env_int("EMBEDDING_DIMENSION", 768)

# Chunking default parameters
DEFAULT_CHUNK_SIZE = get_env_int("DEFAULT_CHUNK_SIZE", 1000)
DEFAULT_CHUNK_OVERLAP = get_env_int("DEFAULT_CHUNK_OVERLAP", 100)
DEFAULT_PARAGRAPH_MAX_LENGTH = get_env_int("DEFAULT_PARAGRAPH_MAX_LENGTH", 1500)
DEFAULT_PARAGRAPH_MIN_LENGTH = get_env_int("DEFAULT_PARAGRAPH_MIN_LENGTH", 50)

# Performance settings
MAX_WORKERS = get_env_int("MAX_WORKERS", 4)
BATCH_SIZE = get_env_int("BATCH_SIZE", 10)
VS_CACHE_SIZE = get_env_int("VS_CACHE_SIZE", 5)
MAX_BACKUPS_PER_VECTORSTORE = get_env_int("MAX_BACKUPS_PER_VECTORSTORE", 5)

# Service settings
HOST = get_env("HOST", "0.0.0.0")
PORT = get_env_int("PORT", 8002)
DEBUG = get_env_bool("DEBUG", False)
LOG_LEVEL = get_env("LOG_LEVEL", "INFO").upper()

# API settings
CORS_ORIGINS = get_env_list("CORS_ORIGINS", ["*"])
API_RATE_LIMIT = get_env_int("API_RATE_LIMIT", 100)
API_TIMEOUT = get_env_int("API_TIMEOUT", 60)

# Validate critical configuration
def validate_config():
    """Validate the configuration and log warnings for potential issues."""
    if DEBUG:
        logger.warning("DEBUG mode is enabled, not recommended for production")
    
    if "*" in CORS_ORIGINS:
        logger.warning("CORS is configured to allow all origins ('*'), consider restricting this in production")
    
    # Log Ollama configuration clearly
    logger.info(f"Ollama API URL configured as: {OLLAMA_BASE_URL}")
    
    if not LLM_API_KEY and (not OLLAMA_BASE_URL or "localhost" in OLLAMA_BASE_URL or "host.docker.internal" in OLLAMA_BASE_URL):
        logger.warning("Using local LLM setup, ensure Ollama is running if needed")
        # Check if Ollama is accessible
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
            if response.status_code == 200:
                logger.info("Successfully connected to Ollama API")
                models = response.json().get("models", [])
                logger.info(f"Available Ollama models: {[m.get('name') for m in models if 'name' in m]}")
            else:
                logger.warning(f"Ollama API responded with status code {response.status_code}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Could not connect to Ollama API: {str(e)}")
            logger.info("If using Docker, make sure 'host.docker.internal' resolves to your host machine")
    
    logger.info(f"Embedding service configured with model: {DEFAULT_EMBEDDING_MODEL}")
    logger.info(f"Vector store directory: {VECTORSTORE_DIR}")
    logger.info(f"Upload directory: {UPLOAD_DIR}")
    logger.info(f"Job directory: {JOB_DIR}")


# Configuration access functions
def get_config() -> Dict[str, Any]:
    """Get the complete configuration as a dictionary."""
    config_dict = {key: value for key, value in globals().items() 
                  if key.isupper() and not key.startswith('_')}
    # Convert Path objects to strings
    for key, value in config_dict.items():
        if isinstance(value, Path):
            config_dict[key] = str(value)
    return config_dict

