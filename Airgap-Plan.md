# Airgap Deployment Design for AFWI Multi-Agent Generative Engine

This document outlines the design, implementation strategy, and technical considerations for making the AFWI Multi-Agent Generative Engine capable of running in completely airgapped environments.

## Overview

The airgapped deployment solution enables the AFWI backend services (agent_service and auth_service) to be deployed and operated in environments with no internet connectivity. The design follows these core principles:

1. **Complete Independence**: No internet access required at any stage of deployment or operation
2. **Deployment Simplicity**: Easy-to-follow procedures for both preparation and deployment
3. **Resource Efficiency**: Optimized container size and resource utilization
4. **Cross-Platform Preparation**: Support for preparing deployment packages on Windows, macOS, and Linux

## Technical Design

### 1. Dependency Management

The core challenge of airgapped deployment is managing dependencies without internet access. The approach uses a two-phase strategy:

#### Phase 1: Preparation (Connected Environment)
- Pre-download all Python package dependencies as wheel files
- Ensure wheels are Linux-compatible by using Docker during the download
- Package all application code, configuration, and wheel files for transfer

#### Phase 2: Deployment (Airgapped Environment)
- Build Docker images using only local resources (no internet access)
- Install dependencies from pre-downloaded wheel files
- Run services with required configuration

### 2. Multi-Stage Docker Builds

To optimize the final image size and performance, both services utilize multi-stage Docker builds:

```dockerfile
# First stage: Install dependencies from wheels
FROM python:3.12-slim AS builder

WORKDIR /build

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Install dependencies from local wheels
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Create a new virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies into the virtual environment
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Second stage: Create the final image
FROM python:3.12-slim

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Create necessary directories
RUN mkdir -p /app/data

# Copy application code
COPY . /app/

# (Service-specific configuration follows...)
```

This approach provides several benefits:
- Wheel files are used only during the build and not included in the final image
- Significantly reduced final image size
- Improved startup performance and resource efficiency

### 3. Cross-Platform Scripts

Three different wheel download scripts support various environments:

1. **download_wheels.py** - Linux/macOS Python script
2. **download_wheels_windows.py** - Windows-friendly Python script
3. **download_wheels.ps1** - PowerShell script for Windows

All scripts:
- Use Docker to ensure Linux compatibility of wheels
- Apply platform-specific path handling
- Include detailed logging and error handling
- Offer archive creation for easy transfer

### 4. Deployment Scripts

Deployment scripts simplify the process in the airgapped environment:

1. **airgapped_deploy.sh** - Bash script for Linux
2. **airgapped_deploy.ps1** - PowerShell script for Windows

These scripts:
- Verify prerequisites (Docker)
- Build the Docker image
- Provide clear instructions for running the container
- Include options for persistent storage

### 5. Platform Configuration

#### Agent Service
- Focused on RESTful API endpoints
- Built on FastAPI and Uvicorn
- Data stored in local file system

#### Auth Service
- Provides authentication and authorization
- Requires PostgreSQL database
- Implements secure token management
- Uses entrypoint script for initialization

## Implementation Details

### Dependency Management Logic

1. **Platform-Specific Wheel Targeting**:
   ```python
   # Ensure wheels are compatible with Linux target environment
   pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt
   ```

2. **Docker-Based Installation**:
   ```dockerfile
   # Using --no-index ensures no internet access is attempted
   # --find-links points to the local wheel directory
   RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt
   ```

3. **Virtual Environment Isolation**:
   ```dockerfile
   # Create isolated Python environment
   RUN python -m venv /venv
   ENV PATH="/venv/bin:$PATH"
   ```

### Container Size Optimization

1. **Multi-Stage Build** - Eliminates build tools and wheel files from final image
2. **Minimal Base Image** - Uses python:3.12-slim instead of larger alternatives
3. **Dependency Isolation** - Only required Python packages are installed

### Cross-Platform Compatibility

1. **Path Normalization** (Windows to Docker):
   ```python
   # Convert Windows paths to Docker-compatible format
   docker_wheels_path = str(wheels_dir).replace("\\", "/").replace("C:", "/c")
   ```

2. **PowerShell Escaping**:
   ```powershell
   # Handle colons in paths for PowerShell
   $dockerCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' -v '$normalizedRequirementsPath`:/requirements.txt' ..."
   ```

3. **Archives for Transfer**:
   - Linux: `tar -czvf service.tar.gz .`
   - Windows: `Compress-Archive -Path ./* -DestinationPath ./service_airgapped.zip`

## Usage Flow

1. **Preparation** (internet-connected environment):
   - Clone/download repository
   - Run appropriate download_wheels script for platform
   - Verify wheels in wheels/ directory
   - Create transfer archive

2. **Transfer**:
   - Move archive to airgapped environment using physical media

3. **Deployment** (airgapped environment):
   - Extract archive
   - Run deployment script (airgapped_deploy.sh or .ps1)
   - Start service container with appropriate configuration

4. **Operation**:
   - Services run without internet dependency
   - Data stored in mounted volumes for persistence

## Security Considerations

1. **No Internet Communication**:
   - Services have no ability to "phone home" or download content
   - No dynamic code loading from external sources

2. **Dependency Verification**:
   - All dependencies are pre-vetted during preparation phase
   - No third-party package sources during deployment

3. **Image Isolation**:
   - Minimal containers with only required components
   - Proper permissions and access controls

## Conclusion

This airgapped deployment design enables the AFWI Multi-Agent Generative Engine to operate securely in environments with strict network isolation requirements. The approach balances security, usability, and efficiency while maintaining full functionality of the services.

The multi-stage Docker builds provide an optimized deployment that minimizes resource usage while ensuring all dependencies are available without internet access. Cross-platform preparation scripts make it easy to prepare deployment packages in various environments.
