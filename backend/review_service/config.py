import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "data"
MODELS_DIR = BASE_DIR / "models"

# Specific paths
DATASET_DIR = DATA_DIR / "datasets"
EXTRACTION_DIR = DATA_DIR / "extraction"
UPLOAD_DIR = DATA_DIR / "uploads"
OUTPUT_DIR = DATA_DIR / "outputs"
LOG_DIR = DATA_DIR / "logs"

# Models directories
BASE_MODELS_DIR = MODELS_DIR / "base_models"

# Ensure directories exist
for dir_path in [DATASET_DIR, EXTRACTION_DIR, UPLOAD_DIR, OUTPUT_DIR, LOG_DIR, BASE_MODELS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Other configuration settings
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://core:8000")

