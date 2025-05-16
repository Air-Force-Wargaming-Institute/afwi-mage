import sys
import os
from pathlib import Path

# Add the parent directory (backend/) to the Python path
# This allows pytest (when run from backend/) to find the wargame_service package
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

print(f"\nINFO: Added {backend_dir} to sys.path for testing\n") 