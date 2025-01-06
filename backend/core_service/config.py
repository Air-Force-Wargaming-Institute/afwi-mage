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
FINE_TUNED_MODELS_DIR = MODELS_DIR / "fine-tuned_models"

# Ensure directories exist
for dir_path in [UPLOAD_DIR, DATASET_DIR, EXTRACTION_DIR, OUTPUT_DIR, LOG_DIR, BASE_MODELS_DIR, FINE_TUNED_MODELS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Other configuration settings
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/dbname")

# Microservice URLs
UPLOAD_SERVICE_URL = os.getenv("UPLOAD_SERVICE_URL", "http://upload:8005")
EXTRACTION_SERVICE_URL = os.getenv("EXTRACTION_SERVICE_URL", "http://extraction:8002")
GENERATION_SERVICE_URL = os.getenv("GENERATION_SERVICE_URL", "http://generation:8003")
AGENT_SERVICE_URL = os.getenv("AGENT_SERVICE_URL", "http://agent:8001")
REVIEW_SERVICE_URL = os.getenv("REVIEW_SERVICE_URL", "http://review:8004")
EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://embedding:8006")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth:8010")
