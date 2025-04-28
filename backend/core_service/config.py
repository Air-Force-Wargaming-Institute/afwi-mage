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
WORKBENCH_SERVICE_URL = os.getenv("WORKBENCH_SERVICE_URL", "http://workbench:8020")
DIRECT_CHAT_SERVICE_URL = os.getenv("DIRECT_CHAT_SERVICE_URL", "http://direct_chat_service:8011")

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# LLM Service Discovery Endpoints
def parse_url_list(env_var_name):
    urls = os.getenv(env_var_name, "")
    return [url.strip() for url in urls.split(',') if url.strip()]

def parse_instance_list(env_var_name):
    """Parses comma-separated 'url=task' strings into a list of (url, task) tuples."""
    instances_str = os.getenv(env_var_name, "")
    instances = []
    for item in instances_str.split(','):
        if '=' in item:
            url, task = item.split('=', 1)
            url = url.strip()
            task = task.strip().lower() # Normalize task to lowercase
            if url and task:
                instances.append((url, task))
        elif item.strip(): # Handle case where only URL is provided, assume default task
            url = item.strip()
            # Decide a default task (e.g., 'generate') if not specified
            # logger.warning(f"No task specified for VLLM instance {url}, assuming 'generate'.")
            instances.append((url, 'generate'))
    return instances

# VLLM_API_BASES = parse_url_list("VLLM_API_BASES") # Old format
VLLM_INSTANCES = parse_instance_list("VLLM_INSTANCES") # New format: list of (url, task)
OLLAMA_BASE_URLS = parse_url_list("OLLAMA_BASE_URLS")

# Redis keys for discovered models
REDIS_CHAT_MODELS_KEY = "available_chat_models"
REDIS_EMBEDDING_MODELS_KEY = "available_embedding_models"
