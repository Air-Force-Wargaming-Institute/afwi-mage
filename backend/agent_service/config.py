import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# --- Settings Loading from .env ---
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env', 
        env_file_encoding='utf-8', 
        extra='ignore' # Ignore extra environment variables not defined in the model
    )

    # Authentication (MUST MATCH auth_service configuration)
    jwt_secret_key: str = "default_secret_key" # Provide a default for safety, but MUST be overridden by .env
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30 # Or match your auth_service setting

    # Ollama
    ollama_base_url: str = "http://ollama:11434"

    # Core Service (Now loaded via pydantic-settings)
    core_service_url: str = "http://core:8000" # Default value if not in .env

# Load the settings
settings = Settings()

# --- Existing Path Definitions ---
# (Keep this section exactly as it was)
BASE_DIR = Path("/app")
AGENTS_DIR = BASE_DIR / "agents"
DATA_DIR = Path("/app/data")  # Direct path to data directory

# Specific paths
INDIVIDUAL_AGENTS_PATH = AGENTS_DIR / "individual_agents"
TEAMS_PATH = AGENTS_DIR / "teams"
SYSTEM_AGENTS_PATH = AGENTS_DIR / "system_agents"
TEMPLATES_PATH = AGENTS_DIR / "templates"
BUILDER_DIR = DATA_DIR / "builder"
LOG_DIR = DATA_DIR / "logs" # Define LOG_DIR if used by logging in app.py

# Ensure directories exist  
# Added LOG_DIR to the list
for dir_path in [INDIVIDUAL_AGENTS_PATH, TEAMS_PATH, SYSTEM_AGENTS_PATH, TEMPLATES_PATH, BUILDER_DIR, LOG_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Expose the core service URL from loaded settings for any code still using the old variable name
CORE_SERVICE_URL = settings.core_service_url
