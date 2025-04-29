# MAGE Offline Build Guide

This guide explains how to prepare, transfer, and run MAGE in an environment with no internet access.

## Overview

The offline build process is divided into three phases:
1. **Preparation** (Internet connection required)
2. **Transfer** to airgapped environment
3. **Build and deployment** in the airgapped environment

## Phase 1: Preparation (Internet Connection Required)

Execute these steps on a machine with internet access:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/afwi-multi-agent-generative-engine.git
   cd afwi-multi-agent-generative-engine
   ```

2. Run the preparation script:
   ```bash
   .\prepare_offline_build.ps1
   ```

   This script will:
   - Create the necessary directory structure
   - Download and save required Docker images
   - Download Python wheel packages
   - Download NLTK data
   - Prepare frontend node modules
   - Download the LLM model

3. Verify that the `offline_packages` directory contains the following:
   - `images/` - Docker image tarballs
   - `backend_wheels/` - Python wheel packages
   - `nltk_data/` - NLTK data files
   - `frontend_node_modules.tar.gz` - Frontend dependencies

## Phase 2: Transfer to Airgapped Environment

Copy the following to the airgapped machine:

1. The entire project source code (`afwi-multi-agent-generative-engine/`)
2. The `offline_packages/` directory with all downloaded artifacts

## Phase 3: Build and Deployment (Airgapped Environment)

Execute these steps on the airgapped machine:

1. Navigate to the project directory:
   ```bash
   cd /path/to/afwi-multi-agent-generative-engine
   ```

2. Run the offline build script:
   ```bash
   .\Run-MAGE-Offline.ps1
   ```

   This script will:
   - Load Docker images
   - Unpack frontend node modules
   - Modify Dockerfiles to use offline dependencies
   - Build and start the services

## Troubleshooting

### Common Issues

1. **Missing Wheels**: If a build fails with "No matching distribution found":
   - Ensure you have all required wheels in `offline_packages/backend_wheels/`
   - Check for specific version requirements in service requirements.txt files

2. **Incorrect Wheel Platform**: If you get runtime errors like `ImportError: ... no matching architecture`:
   - Ensure wheels were downloaded for the correct target architecture

3. **Missing System Dependencies**: If you see errors about missing shared libraries (`.so` files):
   - Check the custom base image configuration

4. **Base Image Not Found**: If `docker build` fails with "manifest not found":
   - Verify the required base image `.tar` was loaded correctly

### Restoring Original Setup

To restore the original setup after using offline mode:
1. For each backend service, replace the modified Dockerfile with the backup:
   ```bash
   foreach ($service in Get-ChildItem -Path "backend" -Directory) {
       $dockerfileBackupPath = Join-Path -Path $service.FullName -ChildPath "Dockerfile.original"
       $dockerfilePath = Join-Path -Path $service.FullName -ChildPath "Dockerfile"
       if (Test-Path $dockerfileBackupPath) {
           Copy-Item -Path $dockerfileBackupPath -Destination $dockerfilePath -Force
       }
   }
   ```

2. For the frontend, restore the original Dockerfile:
   ```bash
   if (Test-Path frontend/Dockerfile.original) {
       Copy-Item -Path frontend/Dockerfile.original -Destination frontend/Dockerfile -Force
   }
   ```

## Additional Information

- The offline build uses Method A from the plan, which involves pre-building system dependencies into custom base images.
- All Python dependencies are installed from local wheels using `pip install --no-index --find-links`.
- The frontend uses pre-built node_modules to avoid npm package downloads.
- Hugging Face libraries are configured to run in offline mode using environment variables.

For more details, refer to the original plan document: `OFFLINE_BUILD_PLAN.md` 