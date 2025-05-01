# AFWI MAGE Base Image

This directory contains the base image definition for the AFWI Multi-Agent Generative Engine services.

## Base Image Details

- Based on Python 3.12-slim
- Includes system dependencies for all MAGE services:
  - LibreOffice for document processing
  - Tesseract OCR for text extraction
  - PostgreSQL client tools
  - Build tools and other utilities
- Does NOT include Python package installations (pip dependencies)
- Creates common directory structure for all services

## Building the Base Image

To build the base image, run:

```bash
# Make the build script executable
chmod +x build.sh

# Run the build script
./build.sh
```

This will create a Docker image named `afwi-mage-base:3.12-slim` that can be used as a base for all other service images.

## Using the Base Image

In your service Dockerfile, reference this base image:

```dockerfile
FROM afwi-mage-base:3.12-slim

# Add service-specific dependencies and code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Add your service code
COPY . /app/service/
``` 