# Extraction Service - Airgapped Deployment Guide

This document provides instructions for deploying the Extraction Service in an airgapped environment (no internet access).

## Overview

The Extraction Service provides text and metadata extraction capabilities from various document formats including PDF, DOCX, and other file types. It uses NLTK for natural language processing and requires access to NLTK data.

## Prerequisites

- Docker installed on both the preparation and deployment environments
- Python 3.9+ on the preparation environment (for downloading dependencies)
- Physical media or secure network transfer capability to move files between environments

## Preparation (Internet-connected Environment)

1. Clone or download the repository
2. Navigate to the extraction_service directory:
   ```
   cd backend/extraction_service
   ```
3. Download dependency packages using one of the provided scripts:

   **Linux/macOS:**
   ```
   python download_wheels.py
   ```

   **Windows (PowerShell):**
   ```
   .\download_wheels.ps1
   ```
   or
   ```
   python download_wheels_windows.py
   ```

4. The script will:
   - Create a `wheels` directory (if it doesn't exist)
   - Use Docker to download all required Python packages and dependencies
   - Download NLTK data for text processing (punkt and averaged_perceptron_tagger)
   - Store the packages and NLTK data in the `wheels` directory

5. Create a transfer package:

   **Linux/macOS:**
   ```
   tar -czvf extraction_service_airgapped.tar.gz ./*
   ```

   **Windows (PowerShell):**
   ```
   Compress-Archive -Path ./* -DestinationPath ./extraction_service_airgapped.zip
   ```

6. Transfer the package to the airgapped environment using approved methods (physical media, secure network transfer)

## Deployment (Airgapped Environment)

1. Extract the package in the airgapped environment:

   **Linux/macOS:**
   ```
   tar -xzvf extraction_service_airgapped.tar.gz -C ./extraction_service
   cd extraction_service
   ```

   **Windows (PowerShell):**
   ```
   Expand-Archive -Path extraction_service_airgapped.zip -DestinationPath ./extraction_service
   cd extraction_service
   ```

2. Run the deployment script:

   **Linux/macOS:**
   ```
   bash airgapped_deploy.sh
   ```

   **Windows (PowerShell):**
   ```
   .\airgapped_deploy.ps1
   ```

3. The script will:
   - Verify Docker is installed
   - Check that wheel files are available
   - Build the Docker image for the extraction service
   - Provide commands for running the service

4. Start the service with the command provided by the script:
   ```
   docker run -d --name extraction-service -p 8002:8002 extraction-service:airgapped
   ```

5. For data persistence, mount a volume:
   ```
   docker run -d --name extraction-service -p 8002:8002 -v /path/to/data:/app/data extraction-service:airgapped
   ```

## Verification

Once the service is running, verify it's operational by:

1. Checking container logs:
   ```
   docker logs extraction-service
   ```

2. Testing the health check endpoint (using curl within the airgapped environment):
   ```
   curl http://localhost:8002/api/extraction/health
   ```
   Expected response: `{"status":"healthy"}`

## NLTK Data Considerations

The Extraction Service uses NLTK for text processing. The Docker image includes necessary NLTK data that is:

1. Downloaded during the preparation phase by the download scripts
2. Stored in the wheels/nltk_data directory
3. Automatically included in the Docker image during build

The download scripts include the following NLTK packages:
- punkt (for tokenization)
- averaged_perceptron_tagger (for part-of-speech tagging)

If additional NLTK packages are needed, you'll need to modify the download scripts to include them.

## Troubleshooting

1. **Container fails to start**:
   - Check logs: `docker logs extraction-service`
   - Verify all wheel files were transferred correctly
   - Ensure Docker has enough resources allocated

2. **Missing dependencies**:
   - If the build fails due to missing wheels, re-run the download script in the connected environment
   - Make sure to transfer ALL files, including the wheels directory and NLTK data

3. **Permission issues**:
   - Ensure proper permissions on mounted data volumes
   - Run Docker with appropriate privileges

4. **NLTK data issues**:
   - If text processing fails, check that NLTK data was properly downloaded and included
   - Verify that the wheels/nltk_data directory contains punkt and averaged_perceptron_tagger directories

## Additional Resources

For more information about the extraction service API and capabilities, see the main service documentation. 