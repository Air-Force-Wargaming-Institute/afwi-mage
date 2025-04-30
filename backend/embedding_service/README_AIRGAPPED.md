# Airgapped Deployment for Embedding Service

This document provides instructions for deploying the embedding service in an airgapped environment where there is no internet connectivity.

## Prerequisites

- Docker installed on both preparation and deployment machines
- Python 3.12 installed on the preparation machine
- Access to an internet-connected machine for preparation
- Physical media or secure network transfer capability to move files between environments

## Important Notice: Dependency Challenges

The embedding service has dependencies that present significant challenges in airgapped environments:

⚠️ **Critical Dependency Issue:** The `unstructured-inference` package requires a specific version of onnx (1.14.1) which may not be available for download or installation in binary form. Our current scripts attempt to work around this by:

1. Downloading `unstructured-inference` without its dependencies
2. Downloading a newer version of `onnx` (≥1.16.0)

**This approach has limitations:**
- In a truly airgapped environment, this may cause installation failures during the Docker build
- The package will attempt to verify its dependencies and may reject incompatible versions

### Recommended Approaches

For truly airgapped deployments, consider:

1. **Pre-built Docker Image:** Create a complete Docker image in a connected environment and transfer it as a whole
2. **Modified Dependencies:** Fork and modify the `unstructured-inference` package to work with available onnx versions
3. **Reduced Functionality:** Configure the service to operate without the problematic dependencies

## Preparation (Internet-Connected Environment)

### 1. Download Dependency Wheels

Choose one of the following methods based on your operating system:

#### Linux/macOS:

```bash
# Navigate to the embedding_service directory
cd backend/embedding_service

# Run the download script
python3 download_wheels.py
```

#### Windows (PowerShell):

```powershell
# Navigate to the embedding_service directory
cd backend/embedding_service

# Option 1: Using the PowerShell script
.\download_wheels.ps1

# Option 2: Using the Python script for Windows
python download_wheels_windows.py
```

This will:
- Create a `wheels` directory if it doesn't exist
- Download all required Python packages as wheel files
- List the downloaded wheel files

### 2. Package for Transfer

The download scripts will offer to create a zip archive automatically.

Alternatively, you can manually create a package:

#### Linux/macOS:
```bash
tar -czvf embedding_service_airgapped.tar.gz .
```

#### Windows:
```powershell
Compress-Archive -Path ./* -DestinationPath ./embedding_service_airgapped.zip
```

### 3. Transfer Package

Transfer the archive file to the airgapped environment using approved methods (physical media, secure network transfer, etc.)

## Deployment (Airgapped Environment)

### 1. Extract the Package

#### Linux/macOS:
```bash
tar -xzvf embedding_service_airgapped.tar.gz -C /destination/directory
cd /destination/directory
```

#### Windows:
```powershell
Expand-Archive -Path embedding_service_airgapped.zip -DestinationPath C:\destination\directory
cd C:\destination\directory
```

### 2. Build and Run the Docker Image

Run the automated deployment script:

#### Linux/macOS:
```bash
./airgapped_deploy.sh
```

#### Windows:
```powershell
.\airgapped_deploy.ps1
```

The script will:
- Check if Docker is available
- Build the Docker image using local wheels
- Display commands for running the container

### 3. Manual Deployment (Alternative)

If you prefer not to use the provided scripts:

```bash
# Build the Docker image
docker build -t embedding_service .

# Run the container
docker run -d --name embedding_service -p 8000:8000 embedding_service
```

For data persistence, add a volume mount:
```bash
docker run -d --name embedding_service -p 8000:8000 -v /path/to/data:/app/data embedding_service
```

## Troubleshooting

### Dependency Conflicts

If you encounter errors related to dependency conflicts during Docker build:

1. **Error Pattern:** Messages about missing or incompatible versions of `onnx`
   - This is due to `unstructured-inference` requiring a specific version (1.14.1) that may not be available

2. **Potential Solutions:**
   - Try using an older version of the embedding service if available
   - Modify the requirements.txt to remove `unstructured-inference` (will reduce functionality)
   - Create a pre-built image in a connected environment and transfer the entire image

### Missing Wheel Files

If you encounter errors related to missing packages during the Docker build:

1. Ensure you're using the same Python version (3.12) for both preparation and deployment
2. Verify all wheels were downloaded correctly and are in the `wheels` directory 
3. If a package is missing, you may need to manually add it to the wheels directory from an offline source

### Container Startup Issues

If the container fails to start:

1. Check container logs: `docker logs embedding_service`
2. Verify that all required environment variables are set
3. Ensure the container has appropriate permissions for any mounted volumes

## Security Considerations

- The airgapped deployment ensures no internet communication is required
- All dependencies are pre-vetted during the preparation phase
- No dynamic code loading from external sources
- Container isolation provides additional security 