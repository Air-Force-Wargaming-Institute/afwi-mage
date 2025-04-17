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

# Check if running in Docker
IN_DOCKER = os.path.exists('/.dockerenv')
if IN_DOCKER:
    logging.info("Running in Docker container")
else:
    logging.info("Running outside of Docker container")

# Define data directories
# If running in Docker, use /app/data as base dir, otherwise use relative path
if IN_DOCKER:
    BASE_DIR = Path('/app/data')
else:
    BASE_DIR = Path(os.environ.get("BASE_DIR", os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")))) # Adjusted relative path calculation

# Ensure paths are absolute
BASE_DIR = BASE_DIR.absolute()
WORKBENCH_DIR = BASE_DIR / "workbench"
WORKBENCH_SPREADSHEETS_DIR = WORKBENCH_DIR / "spreadsheets" # Consolidated directory

# External service URLs
CORE_SERVICE_URL = os.environ.get("CORE_SERVICE_URL", "http://core:8000")
EMBEDDING_SERVICE_URL = os.environ.get("EMBEDDING_SERVICE_URL", "http://embedding:8006")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
VLLM_BASE_URL = os.environ.get("VLLM_BASE_URL", "http://host.docker.internal:8007") # Default vLLM endpoint

# LLM configuration
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "ollama").lower() # 'ollama' or 'vllm'
DEFAULT_LLM_MODEL = os.environ.get("DEFAULT_LLM_MODEL", "/models/DeepSeek-R1-Distill-Llama-8B-abliterated")
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
        "WORKBENCH_SPREADSHEETS_DIR": str(WORKBENCH_SPREADSHEETS_DIR), # Updated directory
        "CORE_SERVICE_URL": CORE_SERVICE_URL,
        "EMBEDDING_SERVICE_URL": EMBEDDING_SERVICE_URL,
        "OLLAMA_BASE_URL": OLLAMA_BASE_URL,
        "DEFAULT_LLM_MODEL": DEFAULT_LLM_MODEL,
        "DEFAULT_EMBEDDING_MODEL": DEFAULT_EMBEDDING_MODEL,
        "LLM_PROVIDER": LLM_PROVIDER,
        "VLLM_BASE_URL": VLLM_BASE_URL,
        "MAX_CONCURRENT_JOBS": MAX_CONCURRENT_JOBS,
        "JOB_TIMEOUT_SECONDS": JOB_TIMEOUT_SECONDS,
        "IN_DOCKER": IN_DOCKER,
    }

def validate_config() -> None:
    """Validate the configuration and check required directories."""
    logger = logging.getLogger("workbench_service")

    # Log configuration
    logger.info(f"Service configuration: HOST={HOST}, PORT={PORT}, DEBUG={DEBUG}")
    logger.info(f"Running in Docker: {IN_DOCKER}")
    logger.info(f"Data directories (absolute paths):")
    logger.info(f"  BASE_DIR: {BASE_DIR.absolute()}")
    logger.info(f"  WORKBENCH_DIR: {WORKBENCH_DIR.absolute()}")
    logger.info(f"  WORKBENCH_SPREADSHEETS_DIR: {WORKBENCH_SPREADSHEETS_DIR.absolute()}") # Updated directory

    # Check critical directories
    os.makedirs(WORKBENCH_SPREADSHEETS_DIR, exist_ok=True) # Updated directory

    # Check if directories are writeable
    try:
        test_file = WORKBENCH_SPREADSHEETS_DIR / ".write_test" # Updated directory
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info(f"WORKBENCH_SPREADSHEETS_DIR is writable") # Updated directory
    except Exception as e:
        logger.error(f"WORKBENCH_SPREADSHEETS_DIR is not writable: {str(e)}") # Updated directory

    # Validate external service URLs
    logger.info(f"External services: CORE_SERVICE_URL={CORE_SERVICE_URL}")
    logger.info(f"LLM configuration: DEFAULT_LLM_MODEL={DEFAULT_LLM_MODEL}")
    logger.info(f"LLM Provider: {LLM_PROVIDER}")
    if LLM_PROVIDER == "ollama":
        logger.info(f"Ollama Base URL: {OLLAMA_BASE_URL}")
    elif LLM_PROVIDER == "vllm":
        logger.info(f"vLLM Base URL: {VLLM_BASE_URL}")
    else:
        logger.warning(f"Unsupported LLM_PROVIDER: {LLM_PROVIDER}. Defaulting behavior might be unexpected.")

    logger.info("Configuration validation complete") 