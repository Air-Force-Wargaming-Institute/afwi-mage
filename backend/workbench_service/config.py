"""
Configuration settings for the Analysis Workbench Service.

This module loads configuration from environment variables with sensible defaults.
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any

# Basic service configuration
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8020"))
DEBUG = os.environ.get("DEBUG", "0") in ("1", "true", "yes")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# CORS configuration
CORS_ORIGINS_STR = os.environ.get("CORS_ORIGINS", "*")
CORS_ORIGINS: List[str] = [origin.strip() for origin in CORS_ORIGINS_STR.split(",")]

# Define data directories
BASE_DIR = Path(os.environ.get("BASE_DIR", "/app/data"))
WORKBENCH_DIR = BASE_DIR / "workbench"
WORKBENCH_UPLOADS_DIR = WORKBENCH_DIR / "uploads"
WORKBENCH_OUTPUTS_DIR = WORKBENCH_DIR / "outputs"

# External service URLs
CORE_SERVICE_URL = os.environ.get("CORE_SERVICE_URL", "http://core:8000")
EMBEDDING_SERVICE_URL = os.environ.get("EMBEDDING_SERVICE_URL", "http://embedding:8006")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")

# LLM configuration
DEFAULT_LLM_MODEL = os.environ.get("DEFAULT_LLM_MODEL", "mistral")
DEFAULT_EMBEDDING_MODEL = os.environ.get("DEFAULT_EMBEDDING_MODEL", "nomic-embed-text")

# Job configuration
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "5"))
JOB_TIMEOUT_SECONDS = int(os.environ.get("JOB_TIMEOUT_SECONDS", "300"))

def get_config() -> Dict[str, Any]:
    """Get the full configuration as a dictionary."""
    return {
        "HOST": HOST,
        "PORT": PORT,
        "DEBUG": DEBUG,
        "LOG_LEVEL": LOG_LEVEL,
        "CORS_ORIGINS": CORS_ORIGINS,
        "BASE_DIR": str(BASE_DIR),
        "WORKBENCH_DIR": str(WORKBENCH_DIR),
        "WORKBENCH_UPLOADS_DIR": str(WORKBENCH_UPLOADS_DIR),
        "WORKBENCH_OUTPUTS_DIR": str(WORKBENCH_OUTPUTS_DIR),
        "CORE_SERVICE_URL": CORE_SERVICE_URL,
        "EMBEDDING_SERVICE_URL": EMBEDDING_SERVICE_URL,
        "OLLAMA_BASE_URL": OLLAMA_BASE_URL,
        "DEFAULT_LLM_MODEL": DEFAULT_LLM_MODEL,
        "DEFAULT_EMBEDDING_MODEL": DEFAULT_EMBEDDING_MODEL,
        "MAX_CONCURRENT_JOBS": MAX_CONCURRENT_JOBS,
        "JOB_TIMEOUT_SECONDS": JOB_TIMEOUT_SECONDS,
    }

def validate_config() -> None:
    """Validate the configuration and check required directories."""
    logger = logging.getLogger("workbench_service")
    
    # Log configuration
    logger.info(f"Service configuration: HOST={HOST}, PORT={PORT}, DEBUG={DEBUG}")
    logger.info(f"Data directories: WORKBENCH_DIR={WORKBENCH_DIR}")
    
    # Check critical directories
    os.makedirs(WORKBENCH_UPLOADS_DIR, exist_ok=True)
    os.makedirs(WORKBENCH_OUTPUTS_DIR, exist_ok=True)
    
    # Validate external service URLs
    logger.info(f"External services: CORE_SERVICE_URL={CORE_SERVICE_URL}")
    logger.info(f"LLM configuration: DEFAULT_LLM_MODEL={DEFAULT_LLM_MODEL}")
    
    logger.info("Configuration validation complete") 