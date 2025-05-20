import os
from dotenv import load_dotenv

load_dotenv()

SERVICE_NAME = "transcription_service"
SERVICE_PORT = int(os.getenv("TRANSCRIPTION_SERVICE_PORT", 8021))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(',')
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# WhisperX specific config
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/app/.cache/whisperx") # Path inside container
HF_HOME = os.getenv("HF_HOME", "/app/.cache/huggingface") # Path inside container
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "large-v2") # WhisperX often defaults to larger models
DEVICE = os.getenv("DEVICE", "cuda") # Use 'cuda' for GPU, 'cpu' for CPU
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "float16") # e.g., float16, int8, float32
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 16))
# Get Hugging Face token from environment, needed for gated models like pyannote
HF_TOKEN = os.getenv("HF_TOKEN", None)

# WebSocket/Processing Config
WEBSOCKET_BUFFER_SECONDS = int(os.getenv("WEBSOCKET_BUFFER_SECONDS", 10))
DIARIZATION_MIN_CHUNK_MS = int(os.getenv("DIARIZATION_MIN_CHUNK_MS", 100))
AUDIO_FORMAT = os.getenv("AUDIO_FORMAT", "webm")
TARGET_SAMPLE_RATE = int(os.getenv("TARGET_SAMPLE_RATE", 16000))

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/transcriptiondb")

# Artifact Storage Path (Local within container)
# Base path where session data (audio, transcripts) will be stored.
# Ensure this path exists and is writable by the application.
ARTIFACT_STORAGE_BASE_PATH = os.getenv("ARTIFACT_STORAGE_BASE_PATH", "/app/data/sessions")

# Ensure model cache directory exists
# Note: This should ideally be handled in Dockerfile or init script
#       but adding here for robustness if running locally.
# os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

print(f"Starting {SERVICE_NAME} Configuration:")
print(f"  Port: {SERVICE_PORT}")
print(f"  Allowed CORS Origins: {CORS_ORIGINS}")
print(f"  Log Level: {LOG_LEVEL}")
print(f"  WhisperX Model Cache: {MODEL_CACHE_DIR}")
print(f"  HuggingFace Cache: {HF_HOME}")
print(f"  Default Model: {DEFAULT_MODEL}")
print(f"  Device: {DEVICE}")
print(f"  Compute Type: {COMPUTE_TYPE}")
print(f"  Batch Size: {BATCH_SIZE}")
print(f"  HF Token Provided: {'Yes' if HF_TOKEN else 'No'}")
print(f"  WebSocket Buffer Duration: {WEBSOCKET_BUFFER_SECONDS}s")
print(f"  Min Chunk Duration for Diarization: {DIARIZATION_MIN_CHUNK_MS}ms")
print(f"  Audio Format: {AUDIO_FORMAT}")
print(f"  Target Sample Rate: {TARGET_SAMPLE_RATE}Hz")
print(f"  Database URL Configured: {'Yes' if DATABASE_URL else 'No'}")
print(f"  Artifact Storage Path: {ARTIFACT_STORAGE_BASE_PATH}") 