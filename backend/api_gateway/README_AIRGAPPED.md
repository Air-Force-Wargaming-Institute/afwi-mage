# API Gateway - Fully Airgapped Deployment Guide

This guide provides instructions for deploying the API Gateway (Traefik) in a completely airgapped environment without any internet access.

## Overview

The API Gateway is based on Traefik and serves as the single entry point for all backend services in the AFWI Multi-Agent Generative Engine. This guide explains how to prepare and deploy it in environments with no internet connectivity.

## Prerequisites

- Docker installed on both the preparation machine (with internet access) and the target airgapped machine
- For preparation: Windows, macOS, or Linux with Docker installed
- For deployment: Either Windows or Linux with Docker installed

## Preparation (On Machine with Internet Access)

### Linux/macOS

1. Clone or copy the repository to your machine with internet access
2. Navigate to the api_gateway directory:
   ```
   cd backend/api_gateway
   ```
3. Make the Docker image preparation script executable:
   ```
   chmod +x docker-save-image.sh
   ```
4. Run the script to download the Traefik image and prepare the archive:
   ```
   ./docker-save-image.sh
   ```
   
   This script will:
   - Pull the Traefik Docker image
   - Save it to a .tar file
   - Create an archive (api_gateway_airgapped.tar.gz) containing:
     - The Docker image
     - Configuration files
     - Deployment scripts
     
5. Transfer the created archive (api_gateway_airgapped.tar.gz) to the airgapped machine using approved methods (e.g., USB drive)

### Windows

1. Clone or copy the repository to your machine with internet access
2. Navigate to the api_gateway directory in PowerShell:
   ```
   cd backend\api_gateway
   ```
3. Run the PowerShell script to download the Traefik image and prepare the archive:
   ```
   powershell -ExecutionPolicy Bypass -File .\docker-save-image.ps1
   ```
   
   This script will:
   - Pull the Traefik Docker image
   - Save it to a .tar file
   - Create a ZIP archive (api_gateway_airgapped.zip) containing:
     - The Docker image
     - Configuration files
     - Deployment scripts
     
4. Transfer the created archive (api_gateway_airgapped.zip) to the airgapped machine using approved methods (e.g., USB drive)

## Deployment (On Airgapped Linux Machine)

### Linux

1. Create a directory for the service:
   ```
   mkdir -p api_gateway
   ```
2. Extract the transferred archive:
   ```
   tar -xzvf api_gateway_airgapped.tar.gz -C api_gateway
   cd api_gateway
   ```
   
3. Load the Docker image:
   ```
   docker load < traefik-v2.10.tar
   ```
   
4. Make the deployment script executable:
   ```
   chmod +x airgapped_deploy.sh
   ```
   
5. Run the deployment script:
   ```
   ./airgapped_deploy.sh
   ```
   
   This script will:
   - Create necessary directories
   - Create the Docker network if it doesn't exist
   - Build the Docker image using the loaded Traefik image
   - Provide instructions for running the container

6. Start the service:
   ```
   docker run -d --name api_gateway -p 80:80 -p 8080:8080 -p 8082:8082 -p 8083:8083 --network app-network api_gateway
   ```

7. Verify the service is running:
   ```
   curl http://localhost:8080/api/overview
   ```

### Windows

1. Create a directory for the service:
   ```
   mkdir api_gateway
   ```
2. Extract the transferred ZIP archive to the api_gateway directory
   
3. Load the Docker image:
   ```
   docker load -i traefik-v2.10.tar
   ```
   
4. Run the deployment script:
   ```
   powershell -ExecutionPolicy Bypass -File .\airgapped_deploy.ps1
   ```
   
   This script will:
   - Create necessary directories
   - Create the Docker network if it doesn't exist
   - Build the Docker image using the loaded Traefik image
   - Provide instructions for running the container

5. Start the service:
   ```
   docker run -d --name api_gateway -p 80:80 -p 8080:8080 -p 8082:8082 -p 8083:8083 --network app-network api_gateway
   ```

6. Verify the service is running by opening http://localhost:8080/dashboard/ in a browser

## Configuration

The API Gateway uses two main configuration files:

1. **traefik.yaml**: Contains the static configuration for Traefik, including:
   - API and dashboard settings
   - Entry points (ports)
   - Provider configurations
   - Logging settings

2. **dynamic_conf.yaml**: Contains the dynamic configuration, including:
   - Middleware definitions
   - Router rules
   - Service definitions
   - Health check configurations

## Complete Airgapped Operation

The Dockerfile and setup have been specifically designed to operate completely offline:

1. No internet access required during build or operation
2. The base Traefik image is pre-downloaded and transferred to the airgapped environment
3. All configuration files are included in the deployment package

## Data Persistence

To persist configuration changes between container restarts, mount the configuration files:

```
docker run -d --name api_gateway -p 80:80 -p 8080:8080 -p 8082:8082 -p 8083:8083 \
  --network app-network \
  -v /path/to/traefik.yaml:/etc/traefik/traefik.yaml \
  -v /path/to/dynamic_conf.yaml:/etc/traefik/dynamic/dynamic_conf.yaml \
  -v /path/to/logs:/var/log/traefik \
  api_gateway
```

## Troubleshooting

### Image Loading Issues

If you encounter issues loading the Docker image:

1. Verify the Docker image file exists:
   ```
   ls -la traefik-v2.10.tar
   ```

2. Try loading with verbose output:
   ```
   docker load -v < traefik-v2.10.tar
   ```

### Container Startup Issues

If the container fails to start:

1. Check the Docker logs:
   ```
   docker logs api_gateway
   ```

2. Ensure all required ports are available:
   ```
   netstat -tuln | grep -E '80|8080|8082|8083'
   ```

### Network Issues

If services can't communicate through the API Gateway:

1. Verify the Docker network:
   ```
   docker network inspect app-network
   ```

2. Ensure services are connected to the same network:
   ```
   docker inspect --format='{{.NetworkSettings.Networks}}' api_gateway
   ```

## Security Notes

- The Traefik dashboard is enabled and accessible on port 8080 - secure this in production environments
- Consider using environment variables for sensitive configuration
- Apply proper access controls to all exposed ports
- In production, consider enabling TLS for secure communication 