# Generation Service - Fully Airgapped Deployment Guide

This guide provides instructions for deploying the Generation Service in a completely airgapped environment without any internet access.

## Prerequisites

- Docker installed on both the preparation machine (with internet access) and the target airgapped machine
- For preparation: Windows, macOS, or Linux with Docker installed
- For deployment: Linux environment (the wheel files are specifically compiled for Linux)

## Preparation (On Machine with Internet Access)

1. Clone or copy the repository to your machine with internet access
2. Navigate to the generation_service directory:
   ```
   cd backend/generation_service
   ```
3. Run the appropriate wheel download script to fetch all Linux-compatible dependencies:
   
   **For Linux/macOS:**
   ```
   python download_wheels.py
   ```
   
   **For Windows:**
   
   Option 1 - PowerShell (may require execution policy changes):
   ```
   powershell -ExecutionPolicy Bypass -File .\download_wheels.ps1
   ```
   
   Option 2 - Using the Python alternative (recommended):
   ```
   python download_wheels_windows.py
   ```
   
   These scripts will use Docker to download all required wheel files to the `wheels` directory. The script ensures that all wheels are compatible with Linux environments since the final deployment will run on Linux.

   **Important:** The download scripts ensure that:
   - All Python dependencies are downloaded as Linux-compatible wheel files
   - Specific platform wheels are selected when available
   - All Python version requirements are met

4. Verify that the `wheels` directory contains all the necessary dependency files
5. Package the entire `generation_service` directory for transfer:
   
   **For Linux/macOS:**
   ```
   tar -czvf generation_service.tar.gz .
   ```
   
   **For Windows:**
   ```
   # The download scripts will offer to create a zip file for you
   # Or manually create a zip of the entire generation_service directory
   ```
   
6. Transfer the packaged file to the airgapped machine using approved methods (e.g., USB drive)

## Deployment (On Airgapped Linux Machine)

1. Create a directory for the service:
   ```
   mkdir -p generation_service
   ```
2. Extract the transferred package:
   ```
   tar -xzvf generation_service.tar.gz -C generation_service
   cd generation_service
   ```
   
   Or if using a zip file:
   ```
   unzip generation_service_airgapped.zip -d generation_service
   cd generation_service
   ```
   
3. Run the deployment script:
   ```
   bash airgapped_deploy.sh
   ```
   
   This script will:
   - Build the Docker image using the local Linux-compatible wheel files
   - No internet connection will be required during the build
   - Provide instructions for running the container

4. Start the service:
   ```
   docker run -d --name generation_service -p 8003:8003 generation_service
   ```

5. Verify the service is running:
   ```
   curl http://localhost:8003/api/generation/health
   ```
   This should return: `{"status": "healthy"}`

## Complete Airgapped Operation

The Dockerfile has been specifically designed to operate completely offline:

1. No `apt-get update` or package installations that require internet
2. All Python dependencies are pre-downloaded as wheel files
3. The base image (`python:3.12-slim`) must be available in your local Docker registry
   - You can pre-pull this image on a connected machine and transfer it:
     ```
     docker pull python:3.12-slim
     docker save python:3.12-slim > python-3.12-slim.tar
     # Transfer the .tar file to the airgapped machine
     docker load < python-3.12-slim.tar
     ```

## Multi-Stage Build Optimization

The Dockerfile uses a multi-stage build approach for better efficiency:

1. **First stage (builder):**
   - Installs all dependencies from wheel files
   - Creates a virtual environment with the installed packages
   
2. **Second stage (final image):**
   - Copies only the virtual environment from the builder stage
   - Wheel files are not included in the final image
   - Results in a significantly smaller image size
   - Faster container startup and better resource utilization

This optimized approach ensures that the wheel files, which can be large, are only used during the build process and are not included in the final image, saving disk space and improving performance.

## Data Persistence

To persist data between container restarts, mount a volume to the data directory:

```
docker run -d --name generation_service -p 8003:8003 -v /path/to/data:/app/data generation_service
```

## Troubleshooting

### Windows Download Issues

If you encounter issues with the PowerShell script:

1. PowerShell Execution Policy: Run PowerShell as administrator and set:
   ```
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

2. Path Issues: Use the alternative Python script:
   ```
   python download_wheels_windows.py
   ```

### Missing Dependencies

If the container fails to start due to missing dependencies:

1. Check the container logs:
   ```
   docker logs generation_service
   ```

2. If dependencies are missing, you may need to download additional wheels on the internet-connected machine and rebuild the image.

### Container Access

To access the running container for debugging:

```
docker exec -it generation_service /bin/bash
```

### Wheel Compatibility Issues

If you encounter wheel compatibility issues:

1. Make sure you used the Docker-based download scripts (`download_wheels.py`, `download_wheels.ps1`, or `download_wheels_windows.py`)
2. These scripts ensure all wheels are Linux-compatible by using a Docker container with python:3.12-slim
3. The scripts specify `--platform manylinux2014_x86_64 --python-version 3.12` to ensure compatibility

## Security Notes

- This container does not require internet access to function
- All dependencies are bundled within the image as Linux-compatible wheels
- The Dockerfile contains no operations that require internet access
- Ensure proper access controls are in place for the exposed service port (8003) 