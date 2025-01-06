import os
from pathlib import Path

# Base paths
BASE_DIR = Path("/app")  # This is the mounted path in the Docker container
DATA_DIR = Path("/app/data")  # Direct path to data directory
MODELS_DIR = BASE_DIR / "models"

# Specific paths
UPLOAD_DIR = DATA_DIR / "uploads"
EXTRACTION_DIR = DATA_DIR / "extraction"
DATASET_DIR = DATA_DIR / "datasets"
OUTPUT_DIR = DATA_DIR / "outputs"
LOG_DIR = DATA_DIR / "logs"

# Models directories
BASE_MODELS_DIR = MODELS_DIR / "base_models"
FINE_TUNED_MODELS_DIR = MODELS_DIR / "fine-tuned_models"

# Ensure directories exist
for dir_path in [UPLOAD_DIR, EXTRACTION_DIR, DATASET_DIR, OUTPUT_DIR, LOG_DIR, BASE_MODELS_DIR, FINE_TUNED_MODELS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Other configuration settings
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

# Service URLs
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://core:8000")

# Add debug logging
print(f"Upload directory path: {UPLOAD_DIR}")
print(f"Files in upload directory: {list(UPLOAD_DIR.glob('*.pdf'))}")
