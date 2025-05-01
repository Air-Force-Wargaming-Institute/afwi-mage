# Review Service - Fully Airgapped Deployment Guide

This guide provides instructions for deploying the Review Service in a completely airgapped environment without any internet access.

## Prerequisites

- Docker installed on both the preparation machine (with internet access) and the target airgapped machine
- For preparation: Windows, macOS, or Linux with Docker installed
- For deployment: Linux environment (the wheel files are specifically compiled for Linux)

## Preparation (On Machine with Internet Access)

1. Clone or copy the repository to your machine with internet access
2. Navigate to the review_service directory:
   ```
   cd backend/review_service
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
   
   These scripts will use Docker to download all required wheel files and source packages to the `wheels` directory. The script ensures that all dependencies are compatible with Linux environments since the final deployment will run on Linux.

   **Important:** The download scripts ensure that:
   - All Python dependencies are downloaded as Linux-compatible wheel files or source packages
   - Specific platform wheels are selected when available
   - All Python version requirements are met
   - No internet connection will be required during the Docker build

4. Verify that the `wheels` directory contains all the necessary dependency files
5. Package the entire `review_service` directory for transfer:
   
   **For Linux/macOS:**
   ```
   tar -czvf review_service.tar.gz .
   ```
   
   **For Windows:**
   ```
   # The download scripts will offer to create a zip file for you
   # Or manually create a zip of the entire review_service directory
   ```
   
6. Transfer the packaged file to the airgapped machine using approved methods (e.g., USB drive)

## Deployment (On Airgapped Linux Machine)

1. Create a directory for the service:
   ```
   mkdir -p review_service
   ```
2. Extract the transferred package:
   ```
   tar -xzvf review_service.tar.gz -C review_service
   cd review_service
   ```
   
   Or if using a zip file:
   ```
   unzip review_service_airgapped.zip -d review_service
   cd review_service
   ```
   
3. Run the deployment script:
   ```
   bash airgapped_deploy.sh
   ```
   
   This script will:
   - Build the Docker image using the local Linux-compatible wheel files and source packages
   - No internet connection will be required during the build
   - Provide instructions for running the container

4. Start the service:
   ```
   docker run -d --name review_service -p 8004:8004 review_service
   ```

5. Verify the service is running:
   ```
   curl http://localhost:8004/health
   ```
   This should return a health status response.

## Complete Airgapped Operation

The Dockerfile has been specifically designed to operate completely offline:

1. No `apt-get update` or package installations that require internet
2. No commands that attempt to access the internet at all
3. All Python dependencies are pre-downloaded as wheel files and source packages
4. The base image (`python:3.12-slim`) must be available in your local Docker registry
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
   - Installs all dependencies from wheel files and source packages
   - Creates a virtual environment with the installed packages
   - Uses `--no-index` to ensure no internet access is attempted
   
2. **Second stage (final image):**
   - Copies only the virtual environment from the builder stage
   - Dependency files are not included in the final image
   - Results in a significantly smaller image size
   - Faster container startup and better resource utilization

This optimized approach ensures that the dependency files, which can be large, are only used during the build process and are not included in the final image, saving disk space and improving performance.

## Data Persistence

To persist data between container restarts, mount a volume to the data directory:

```
docker run -d --name review_service -p 8004:8004 -v /path/to/data:/app/data review_service
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
   docker logs review_service
   ```

2. If dependencies are missing, you may need to download additional packages on the internet-connected machine and rebuild the image.

3. If you encounter errors related to missing build tools, make sure you downloaded both wheels and source packages during preparation.

### Container Access

To access the running container for debugging:

```
docker exec -it review_service /bin/bash
```

### Package Compatibility Issues

If you encounter package compatibility issues:

1. Make sure you used the Docker-based download scripts (`download_wheels.py`, `download_wheels.ps1`, or `download_wheels_windows.py`)
2. These scripts ensure all packages are Linux-compatible by using a Docker container with python:3.12-slim
3. The scripts specify `--platform manylinux2014_x86_64 --python-version 3.12` to ensure compatibility

## Security Notes

- This container does not require internet access to function at any point
- All dependencies are bundled within the image as Linux-compatible wheel files and source packages
- The Dockerfile contains no operations that require internet access
- All build operations use `--no-index` to ensure no internet lookups are attempted
- Ensure proper access controls are in place for the exposed service port (8004)
- In production environments, always use proper authentication and secure communication 