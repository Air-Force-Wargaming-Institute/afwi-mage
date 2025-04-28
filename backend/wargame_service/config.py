from pathlib import Path

# Define the storage path within the container
STORAGE_DIR = Path("/app/data/wargames")

# Ensure the directory exists
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Add other configurations as needed, e.g.:
# from pydantic_settings import BaseSettings
# class Settings(BaseSettings):
#     database_url: str = "default_value"
#     secret_key: str = "default_secret"
#     # ... other settings
#     class Config:
#         env_file = ".env"
# settings = Settings()
