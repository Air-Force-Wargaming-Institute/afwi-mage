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
- Pre-download all Python package dependencies (both binary wheels and source packages) into a central `backend_wheels` directory using the PowerShell scripts described in Section 3. This includes service-specific `download_wheels.ps1` scripts generating a `downloaded_wheels_list.txt`.
- **Local Wheel Collection**: For each service, the `copy_wheels_from_list.ps1` script is run. This script reads the service's `downloaded_wheels_list.txt` and copies the required wheels from the central `backend_wheels` directory into the service's local `wheels/` directory. This ensures each service package contains only its necessary dependencies.
- Ensure compatibility of all downloaded dependencies with the target Linux environment by using Docker during the download process.
- Package all application code, configuration files, the service-local `wheels/` directory, and other necessary resources (like NLTK data for `extraction_service`) into a transfer archive (e.g., `${ServiceName}_airgapped.zip`).

#### Phase 2: Deployment (Airgapped Environment)
- Build Docker images using only local resources (no internet access)
- Install dependencies from pre-downloaded wheels and source packages
- Run services with required configuration

### 2. Multi-Stage Docker Builds

To optimize the final image size and performance, both services utilize multi-stage Docker builds:

```dockerfile
# First stage: Install dependencies from wheels
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies for source packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

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
- Wheels and source packages are used only during the build and not included in the final image
- Significantly reduced final image size
- Improved startup performance and resource efficiency

### 3. Dependency Preparation Scripts (Phase 1)

The preparation of dependencies in a connected environment primarily relies on a PowerShell-centric scripting ecosystem. This includes:

1.  **`download_all_wheels.ps1` (Centralized Script)**: A top-level PowerShell script responsible for orchestrating the download of all required Python dependencies for all services. This script typically iterates through services and invokes their specific download scripts.
2.  **Service-Specific `download_wheels.ps1` Scripts**: Each airgappable service contains its own `download_wheels.ps1` script. These PowerShell scripts are tailored to:
    *   Identify the specific Python packages required by the service (from its `requirements.txt`).
    *   Utilize Docker to download Linux-compatible binary wheels (`.whl`) and source packages (`.tar.gz`, `.zip`) into a common, centralized `backend_wheels` directory. This ensures that dependencies are compatible with the target Linux-based Docker environment.
    *   Generate a `downloaded_wheels_list.txt` file, which lists the successfully downloaded wheel files for that service. This list is later used by the `copy_wheels_from_list.ps1` script.

Key features of these scripts:
- **Docker for Compatibility**: All downloads are performed within a Docker container (e.g., `python:3.12-slim` based on `manylinux` standards) to ensure the wheels are compatible with the Linux environment where the services will eventually run.
- **Comprehensive Dependency Gathering**: They aim to fetch both binary wheels (preferred for faster installation) and source distributions (as a fallback if a wheel isn't available or for packages that need compilation).
- **Platform-Specific Handling**: While the core download logic runs in Linux Docker containers, the PowerShell scripts manage execution and path handling on the host (Windows, macOS, Linux).
- **Logging and Error Handling**: Scripts include mechanisms for logging the download process and handling potential errors.
- **Archive Preparation**: The overall process culminates in creating archives that bundle the application code and the downloaded dependencies for easy transfer to the airgapped environment.

*(Note: While the primary approach is PowerShell-centric, helper scripts in Python or other languages might still be used for specific auxiliary tasks if beneficial.)*

### 4. Deployment Scripts

Deployment scripts simplify the process in the airgapped environment:

1. **airgapped_deploy.sh** - Bash script for Linux
2. **airgapped_deploy.ps1** - PowerShell script for Windows

These scripts:
- Verify prerequisites (Docker)
- Provide information about the available wheels and source packages
- Build the Docker image
- Provide clear instructions for running the container
- Include options for persistent storage

### 5. Git Management of Wheel Files

Since wheel files are binary and potentially large, they should not be tracked in git. The project follows these conventions:

1. All wheel files in `backend/*/wheels/` directories are excluded in `.gitignore`
2. Empty `.gitkeep` files are included in each wheels directory to ensure the directory structure is preserved
3. Services with airgapped support currently include:
   - agent_service
   - auth_service
   - chat_service
   - core_service
   - direct_chat_service
   - embedding_service
   - extraction_service
   - generation_service
   - review_service
   - upload_service
   - workbench_service

To add airgapped support to a new service:
1. Create the wheels directory with a `.gitkeep` file
2. Add the wheels path to `.gitignore` (e.g., `/backend/new_service/wheels/*`)
3. Implement the download and deployment scripts following existing patterns

### 6. Platform Configuration

#### Agent Service
- Focused on RESTful API endpoints
- Built on FastAPI and Uvicorn
- Data stored in local file system

#### Auth Service
- Provides authentication and authorization
- Requires PostgreSQL database
- Implements secure token management
- Uses entrypoint script for initialization

#### Core Service
- Provides central API functionality
- Built on FastAPI and Uvicorn
- Handles core application logic

## Dependency Challenges and Limitations

### Strict Version Constraints

Some packages present significant challenges in airgapped environments due to strict version requirements:

1. **Version-Specific Dependencies**: Packages like `unstructured-inference` that require exact versions (e.g., `onnx==1.14.1`) can be problematic when those specific versions are no longer available or cannot be downloaded in binary form for the target platform.

2. **Build Dependency Chains**: Packages that require complex build dependencies in a specific order, which may not be possible to resolve in an airgapped environment without internet access to resolve transitive dependencies.

### Strategies for Addressing Dependency Challenges

In a truly airgapped environment, the following approaches should be considered:

1. **Package Modification**: For services like the embedding_service that depend on problematic packages:
   - Consider forking and modifying dependency requirements to use available versions
   - Test thoroughly with alternative version numbers before deployment
   - Document all modifications in a service-specific README

2. **Package Freezing**: For each service:
   - Maintain a carefully managed `requirements.txt` with pinned versions
   - Create a comprehensive test suite to verify that all dependencies work together
   - Periodically review and update dependencies to ensure security and compatibility

3. **Pre-built Docker Images**: For the most challenging services:
   - Consider creating and distributing pre-built Docker images that already contain all dependencies
   - This eliminates the need to resolve dependencies during deployment
   - Images can be transferred to airgapped environments as complete units

4. **Fall-back Options**: Provide alternative configurations that:
   - Remove problematic dependencies
   - Offer reduced functionality that can operate reliably in airgapped environments
   - Clearly document the limitations and differences

**IMPORTANT NOTE**: In the case of services like the embedding_service that require packages with strict version dependencies (such as unstructured-inference requiring onnx==1.14.1), attempts to use alternative download approaches (e.g., downloading without dependencies and then downloading newer onnx versions) will likely fail at Docker build time in a truly airgapped environment. This is because these packages will attempt to verify their dependencies during installation.

## Implementation Details

### Dependency Management Logic

1. **Package Download Strategy**:
   ```python
   # Install build dependencies for compiling source packages
   apt-get update && apt-get install -y build-essential
   
   # Download both wheel and source packages
   pip download --dest /wheels --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt
   ```

2. **Docker-Based Installation**:
   ```dockerfile
   # Install build dependencies for source packages
   RUN apt-get update && apt-get install -y --no-install-recommends \
       build-essential \
       gcc \
       python3-dev

   # Using --no-index ensures no internet access is attempted
   # --find-links points to the local wheel/source directory
   RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt
   ```

3. **Virtual Environment Isolation**:
   ```dockerfile
   # Create isolated Python environment
   RUN python -m venv /venv
   ENV PATH="/venv/bin:$PATH"
   ```

### Container Size Optimization

1. **Multi-Stage Build** - Eliminates build tools and package files from final image
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
   - Verify wheels and source packages in wheels/ directory
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

However, for services with complex dependency requirements involving specific package versions, it may be necessary to develop custom solutions or pre-built images that can be transferred to airgapped environments as complete units.
