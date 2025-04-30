#!/usr/bin/env python3
"""
Script to download Linux-compatible Python wheels for airgapped installation on Windows.
This script uses Docker to ensure the wheels are compatible with the target Linux environment.
"""
import os
import subprocess
import sys
from pathlib import Path

def download_wheels():
    """
    Download all wheels specified in requirements.txt to the wheels directory.
    Uses Docker to ensure Linux compatibility.
    Adapts paths for Windows environments.
    """
    # Create wheels directory if it doesn't exist
    wheels_dir = Path("wheels").absolute()
    wheels_dir.mkdir(exist_ok=True)
    
    requirements_path = Path.cwd() / "requirements.txt"

    # Convert Windows paths to Docker-compatible format
    docker_wheels_path = str(wheels_dir).replace("\\", "/").replace("C:", "/c")
    docker_requirements_path = str(requirements_path).replace("\\", "/").replace("C:", "/c")
    
    print("Downloading Linux-compatible wheels for airgapped installation...")
    
    # Docker command to download wheels inside a container
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{docker_wheels_path}:/wheels",
        "-v", f"{docker_requirements_path}:/requirements.txt",
        "python:3.12-slim", "bash", "-c",
        "pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt"
    ]
    
    print("Running Docker to download Linux-compatible wheels...")
    print(f"Docker Command: {' '.join(docker_cmd)}")
    
    try:
        result = subprocess.run(docker_cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running Docker command: {e}")
        print(f"Error output: {e.stderr}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)
    
    # List the downloaded wheels
    wheels = list(wheels_dir.glob("*.whl"))
    
    print(f"\nDownloaded {len(wheels)} Linux-compatible wheel files to {wheels_dir}:")
    for wheel in wheels:
        print(f"  - {wheel.name}")
    
    print("\nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:")
    print("---------------------------------------------")
    print("1. This setup has been modified to be completely airgapped")
    print("2. The Dockerfile no longer requires internet access during build")
    print("3. All Python dependencies are provided as wheel files")
    print("\nTo use these wheels in an airgapped environment:")
    print("1. Copy the entire chat_service directory to the target machine")
    print("2. Build the Docker image using: docker build -t chat_service .")
    print("3. Run the container using: docker run -p 8009:8009 chat_service")


if __name__ == "__main__":
    download_wheels() 