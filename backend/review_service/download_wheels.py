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
    
    # Docker command to download wheels inside a container
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{wheels_dir.as_posix()}:/wheels",
        "-v", f"{Path.cwd().absolute().as_posix()}/requirements.txt:/requirements.txt",
        "python:3.12-slim", "bash", "-c",
        "pip download --dest /wheels --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt"
    ]
    
    print("Running Docker to download Linux-compatible wheels and source packages...")
    result = subprocess.run(docker_cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error downloading packages: {result.stderr}")
        sys.exit(1)
    
    # List the downloaded packages
    wheels = list(wheels_dir.glob("*.whl"))
    tarballs = list(wheels_dir.glob("*.tar.gz"))
    zips = list(wheels_dir.glob("*.zip"))
    
    all_packages = wheels + tarballs + zips
    
    print(f"Downloaded {len(all_packages)} packages to {wheels_dir}:")
    print(f"  - {len(wheels)} wheel files")
    print(f"  - {len(tarballs)} source tarballs")
    print(f"  - {len(zips)} zip archives")
    
    for package in all_packages:
        print(f"  - {package.name}")
    
    print("\nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:")
    print("---------------------------------------------")
    print("1. This setup has been modified to be completely airgapped")
    print("2. The Dockerfile no longer requires internet access during build")
    print("3. All Python dependencies are provided as wheel files or source packages")
    print("\nTo use these packages in an airgapped environment:")
    print("1. Copy the entire review_service directory to the target machine")
    print("2. Build the Docker image using: docker build -t review_service .")
    print("3. Run the container using the appropriate Docker command")


if __name__ == "__main__":
    download_wheels() 