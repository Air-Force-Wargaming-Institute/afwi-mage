"""
Configuration settings for the embedding service.
"""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR.parent.parent / "data"
MODELS_DIR = BASE_DIR.parent.parent / "models"

# Specific paths
DATASET_DIR = DATA_DIR / "datasets"
EXTRACTION_DIR = DATA_DIR / "extraction"
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(DATA_DIR / "uploads"))
OUTPUT_DIR = DATA_DIR / "outputs"
LOG_DIR = DATA_DIR / "logs"
VECTORSTORE_DIR = os.environ.get("VECTORSTORE_DIR", str(DATA_DIR / "vectorstores"))

# Temporary PDF staging directory for processing
DOC_STAGING_DIR = os.environ.get("DOC_STAGING_DIR", str(BASE_DIR / "doc_staging"))

# Models directories
BASE_MODELS_DIR = MODELS_DIR / "base_models"

# Ensure directories exist
for dir_path in [DATASET_DIR, EXTRACTION_DIR, Path(UPLOAD_DIR), OUTPUT_DIR, LOG_DIR, 
                 BASE_MODELS_DIR, Path(VECTORSTORE_DIR), Path(DOC_STAGING_DIR)]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Other configuration settings
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://core:8000")
API_KEY = os.getenv("API_KEY", "None")
BASE_URL = os.getenv("BASE_URL", "http://host.docker.internal:11434/v1")

# Embedding model configurations
DEFAULT_EMBEDDING_MODEL = os.environ.get("DEFAULT_EMBEDDING_MODEL", "nomic-embed-text")
EMBEDDING_MODEL_VERSION = "latest"  # Use latest version by default

# Chunking default parameters
DEFAULT_CHUNK_SIZE = int(os.environ.get("DEFAULT_CHUNK_SIZE", 1000))
DEFAULT_CHUNK_OVERLAP = int(os.environ.get("DEFAULT_CHUNK_OVERLAP", 100))

# Service settings
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8002))

# API settings
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

