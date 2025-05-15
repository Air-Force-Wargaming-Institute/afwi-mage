import os
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("report_builder_service")

# --- LLM Integration Constants ---
REPORT_SECTION_SYSTEM_PROMPT = (
    "You are an AI assistant tasked with generating a specific section of a report. "
    "Use the provided user instructions and any accompanying context to create accurate and relevant content. "
    "Ensure your output is formatted in plain Markdown."
)
# --- End LLM Integration Constants ---

# Define directory structure
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
TEMPLATES_DIR = DATA_DIR / "templates"
LEGACY_REPORTS_DATA_FILE = BASE_DIR / "reports_data.json"

# Ensure this matches your docker-compose service name and port for embedding_service
EMBEDDING_SERVICE_BASE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://embedding_service:8006")

# Configuration for vLLM
VLLM_CHAT_COMPLETIONS_URL = os.getenv("VLLM_CHAT_COMPLETIONS_URL", "http://vllm:8000/v1/chat/completions")
VLLM_MODEL_NAME = os.getenv("VLLM_MODEL_NAME", "/models/DeepHermes-3-Llama-3-8B-Preview-abliterated") # Default from direct_chat_service
VLLM_MAX_TOKENS = int(os.getenv("VLLM_MAX_TOKENS", "2048")) # Max tokens for the generated response
VLLM_TEMPERATURE = float(os.getenv("VLLM_TEMPERATURE", "0.7"))
VLLM_REQUEST_TIMEOUT = int(os.getenv("VLLM_REQUEST_TIMEOUT", "300")) # Seconds
VLLM_API_KEY = os.getenv("VLLM_API_KEY", None) # API Key for the LLM service, if required

# Token limits for context
TOKEN_LIMIT = 1000  # Standard token limit for preceding context
REGENERATION_TOKEN_LIMIT = 1500  # Increased token limit for regeneration 