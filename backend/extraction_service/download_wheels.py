#!/usr/bin/env python3
"""
Download Python wheels and source packages for airgapped deployment.
This script is for Linux and macOS environments.
"""

import os
import subprocess
import sys
import shutil
from pathlib import Path

# Current directory
BASE_DIR = Path(__file__).resolve().parent

# Wheels directory
WHEELS_DIR = BASE_DIR / "wheels"
NLTK_DATA_DIR = WHEELS_DIR / "nltk_data"

def main():
    print("Starting wheel download process for extraction_service...")
    
    # Create wheels directory if it doesn't exist
    if not WHEELS_DIR.exists():
        WHEELS_DIR.mkdir(parents=True)
    else:
        # Clean existing wheels
        print("Cleaning existing wheels directory...")
        for file in WHEELS_DIR.glob("*"):
            if file.name != ".gitkeep" and file.name != "nltk_data":
                file.unlink()
    
    # Create NLTK data directory
    if not NLTK_DATA_DIR.exists():
        NLTK_DATA_DIR.mkdir(parents=True)
    
    # Requirements file
    requirements_path = BASE_DIR / "requirements.txt"
    if not requirements_path.exists():
        print(f"Error: {requirements_path} not found!")
        sys.exit(1)
    
    # Convert to Docker paths
    docker_wheels_path = str(WHEELS_DIR).replace("\\", "/")
    if os.name == "nt":  # Windows
        docker_wheels_path = docker_wheels_path.replace("C:", "/c")
    
    docker_requirements_path = str(requirements_path).replace("\\", "/")
    if os.name == "nt":  # Windows
        docker_requirements_path = docker_requirements_path.replace("C:", "/c")
    
    docker_nltk_data_path = str(NLTK_DATA_DIR).replace("\\", "/")
    if os.name == "nt":  # Windows
        docker_nltk_data_path = docker_nltk_data_path.replace("C:", "/c")
    
    # Run Docker command to download wheels (binary only, no source)
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{docker_wheels_path}:/wheels",
        "-v", f"{docker_requirements_path}:/requirements.txt",
        "python:3.12-slim",
        "bash", "-c",
        "apt-get update && "
        "apt-get install -y build-essential && "
        "pip download --only-binary=:all: --dest /wheels --platform manylinux2014_x86_64 "
        "--python-version 3.12 -r /requirements.txt"
    ]
    
    print("Running Docker to download wheels (binary only)...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        process = subprocess.run(cmd, check=True)
        if process.returncode != 0:
            print("Wheel download failed!")
            sys.exit(1)
    except Exception as e:
        print(f"Error running Docker command: {e}")
        sys.exit(1)
    
    # Download NLTK data
    nltk_cmd = [
        "docker", "run", "--rm",
        "-v", f"{docker_nltk_data_path}:/nltk_data",
        "python:3.12-slim",
        "bash", "-c",
        "pip install nltk && "
        "python -m nltk.downloader -d /nltk_data punkt averaged_perceptron_tagger"
    ]
    
    print("\nDownloading NLTK data...")
    print(f"Command: {' '.join(nltk_cmd)}")
    
    try:
        nltk_process = subprocess.run(nltk_cmd, check=True)
        if nltk_process.returncode != 0:
            print("NLTK data download failed!")
            sys.exit(1)
    except Exception as e:
        print(f"Error downloading NLTK data: {e}")
        sys.exit(1)
    
    # Report success
    wheel_count = len(list(WHEELS_DIR.glob("*"))) - (1 if (WHEELS_DIR / ".gitkeep").exists() else 0) - 1  # Excluding nltk_data dir
    print("\nWheel download completed successfully!")
    print(f"Downloaded {wheel_count} binary wheel files to {WHEELS_DIR}")
    print(f"Downloaded NLTK data to {NLTK_DATA_DIR}")
    print("\nYou can now transfer the extraction_service directory to an airgapped environment.")
    print("Use airgapped_deploy.sh (Linux) or airgapped_deploy.ps1 (Windows) to deploy.")

if __name__ == "__main__":
    main() 