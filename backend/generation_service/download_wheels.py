#!/usr/bin/env python3
"""
Script to download Linux-compatible Python wheels for airgapped installation.
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
    """
    wheels_dir = Path("wheels").absolute()
    wheels_dir.mkdir(exist_ok=True)
    
    print("Downloading Linux-compatible wheels for airgapped installation...")
    
    # Docker command to download wheels inside a container with the same base image as our Dockerfile
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{wheels_dir.as_posix()}:/wheels",
        "-v", f"{Path.cwd().absolute().as_posix()}/requirements.txt:/requirements.txt",
        "python:3.12-slim", "bash", "-c",
        "pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt"
    ]
    
    print("Running Docker to download Linux-compatible wheels...")
    result = subprocess.run(docker_cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error downloading wheels: {result.stderr}")
        sys.exit(1)
    
    # List the downloaded wheels
    wheels = list(wheels_dir.glob("*.whl"))
    
    print(f"Downloaded {len(wheels)} Linux-compatible wheel files to {wheels_dir}:")
    for wheel in wheels:
        print(f"  - {wheel.name}")
    
    print("\nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:")
    print("---------------------------------------------")
    print("1. This setup has been modified to be completely airgapped")
    print("2. The Dockerfile no longer requires internet access during build")
    print("3. All Python dependencies are provided as wheel files")
    print("\nTo use these wheels in an airgapped environment:")
    print("1. Copy the entire generation_service directory to the target machine")
    print("2. Build the Docker image using: docker build -t generation_service .")
    print("3. Run the container using: docker run -p 8003:8003 generation_service")


if __name__ == "__main__":
    download_wheels() 