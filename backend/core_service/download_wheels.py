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
    
    # Separately download PyPDF4 which doesn't have binary distributions
    print("\nSeparately downloading PyPDF4 (source-only package)...")
    pypdf4_cmd = [
        "docker", "run", "--rm",
        "-v", f"{wheels_dir.as_posix()}:/wheels",
        "python:3.12-slim", "pip", "download", 
        "--dest", "/wheels", "PyPDF4>=1.27.0"
    ]
    
    result = subprocess.run(pypdf4_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Warning: Could not download PyPDF4: {result.stderr}")
        print("The build may fail if PyPDF4 is required.")
    else:
        print("PyPDF4 downloaded successfully as source package.")
    
    # List the downloaded wheels
    wheels = list(wheels_dir.glob("*.whl"))
    source_packages = list(wheels_dir.glob("*.tar.gz")) + list(wheels_dir.glob("*.zip"))
    
    print(f"\nDownloaded {len(wheels)} wheel files to {wheels_dir}:")
    for wheel in wheels:
        print(f"  - {wheel.name}")
    
    print(f"\nDownloaded {len(source_packages)} source packages to {wheels_dir}:")
    for pkg in source_packages:
        print(f"  - {pkg.name}")
    
    print("\nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:")
    print("---------------------------------------------")
    print("1. This setup has been modified to be completely airgapped")
    print("2. The Dockerfile no longer requires internet access during build")
    print("3. All Python dependencies are provided as wheel files and source packages")
    print("4. Source-only packages like PyPDF4 are handled separately")
    print("\nTo use these packages in an airgapped environment:")
    print("1. Copy the entire core_service directory to the target machine")
    print("2. Build the Docker image using: docker build -t core_service .")
    print("3. Run the container using: docker run -p 8000:8000 core_service")


if __name__ == "__main__":
    download_wheels() 