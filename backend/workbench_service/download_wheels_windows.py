#!/usr/bin/env python3
"""
Windows-friendly script to download Linux-compatible Python wheels for airgapped installation.
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
    
    # Get path for requirements.txt
    requirements_path = Path("requirements.txt").absolute()
    
    # Convert Windows paths to Docker-compatible paths
    docker_wheels_path = str(wheels_dir).replace("\\", "/").replace("C:", "/c")
    docker_req_path = str(requirements_path).replace("\\", "/").replace("C:", "/c")
    
    # Docker command to download wheels inside a container
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{docker_wheels_path}:/wheels",
        "-v", f"{docker_req_path}:/requirements.txt",
        "python:3.12-slim", "bash", "-c",
        "pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt"
    ]
    
    print("Running Docker to download Linux-compatible wheels...")
    print(f"Command: {' '.join(docker_cmd)}")
    
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
    print("1. Copy the entire workbench_service directory to the target machine")
    print("2. Build the Docker image using: docker build -t workbench_service .")
    print("3. Run the container using: docker run -p 8020:8020 workbench_service")
    
    # Create zip archive option
    create_zip = input("\nWould you like to create a zip archive for transfer? (y/n): ")
    if create_zip.lower() == 'y':
        import shutil
        archive_name = "workbench_service_airgapped.zip"
        print(f"Creating {archive_name}...")
        # Get all files and directories in current directory except the archive itself
        shutil.make_archive("workbench_service_airgapped", 'zip', ".")
        print(f"Created {archive_name}")
        print("Transfer this file to your airgapped environment.")


if __name__ == "__main__":
    download_wheels() 