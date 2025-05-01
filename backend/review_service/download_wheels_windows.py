#!/usr/bin/env python3
"""
Script to download Linux-compatible Python wheels for airgapped installation
on Windows systems. This script uses Docker to ensure the wheels are compatible
with the target Linux environment.
"""
import os
import subprocess
import sys
import zipfile
from pathlib import Path, PureWindowsPath


def download_wheels():
    """
    Download all wheels specified in requirements.txt to the wheels directory.
    Uses Docker to ensure Linux compatibility.
    """
    # Use Windows-compatible paths for local directories
    wheels_dir = Path("wheels").absolute()
    wheels_dir.mkdir(exist_ok=True)
    
    requirements_path = Path("requirements.txt").absolute()
    
    print("Downloading Linux-compatible wheels and source packages for airgapped installation...")
    
    # Convert Windows paths to Docker-compatible format
    docker_wheels_path = str(wheels_dir).replace("\\", "/").replace("C:", "/c")
    docker_requirements_path = str(requirements_path).replace("\\", "/").replace("C:", "/c")
    
    # Docker command to download wheels inside a container
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{docker_wheels_path}:/wheels",
        "-v", f"{docker_requirements_path}:/requirements.txt",
        "python:3.12-slim", "bash", "-c",
        "pip download --dest /wheels --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt"
    ]
    
    print("Running Docker to download Linux-compatible wheels and source packages...")
    
    try:
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
        
        # Ask if user wants to create a zip file for easy transfer
        create_zip = input("\nWould you like to create a ZIP file of the entire service for airgapped transfer? (y/n): ").lower().strip()
        if create_zip == 'y':
            print("\nCreating ZIP file for airgapped transfer...")
            zip_filename = "review_service_airgapped.zip"
            
            # Get all files in directory except the ZIP file itself and __pycache__
            def filter_files(path):
                return not (path.name == zip_filename or 
                           '__pycache__' in str(path) or
                           path.name.endswith('.pyc'))
            
            with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, _, files in os.walk('.'):
                    for file in files:
                        file_path = Path(root) / file
                        if filter_files(file_path):
                            zipf.write(file_path)
            
            print(f"Created {zip_filename} successfully.")
        
        print("\nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:")
        print("---------------------------------------------")
        print("1. This setup has been modified to be completely airgapped")
        print("2. The Dockerfile no longer requires internet access during build")
        print("3. All Python dependencies are provided as wheel files or source packages")
        print("\nTo use these packages in an airgapped environment:")
        print("1. Copy the entire review_service directory to the target machine")
        print("2. Build the Docker image using: docker build -t review_service .")
        print("3. Run the container using the appropriate Docker command")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    download_wheels() 