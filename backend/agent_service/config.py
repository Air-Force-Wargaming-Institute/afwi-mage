import os
from pathlib import Path

# Base paths
BASE_DIR = Path("/app")
AGENTS_DIR = BASE_DIR / "agents"
DATA_DIR = Path("/app/data")  # Direct path to data directory

# Specific paths
INDIVIDUAL_AGENTS_PATH = AGENTS_DIR / "individual_agents"
TEAMS_PATH = AGENTS_DIR / "teams"
SYSTEM_AGENTS_PATH = AGENTS_DIR / "system_agents"
TEMPLATES_PATH = AGENTS_DIR / "templates"
BUILDER_DIR = DATA_DIR / "builder"

# Ensure directories exist  
for dir_path in [INDIVIDUAL_AGENTS_PATH, TEAMS_PATH, SYSTEM_AGENTS_PATH, TEMPLATES_PATH, BUILDER_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Other configuration settings
CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://core:8000")
