## License

This software is distributed under **Government Purpose Rights** as defined in DFARS 252.227-7014.

Use, modification, and redistribution are authorized for official U.S. Government purposes only. Any use outside of these bounds requires written permission from the Air Force Wargaming Institute.

For questions regarding licensing or distribution, please contact:

**LeMay Center, Air University**  
Maxwell Air Force Base, Alabama

# AFWI Multi-Agent Generative Engine

## Prerequisites

1. **Docker Desktop**
   - Windows/Mac: Download and install from [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - After installation:
     - Start Docker Desktop
     - Wait for the whale icon to stop animating (Docker is ready)

2. **Node.js**
   - Download and install from [Node.js website](https://nodejs.org/)
   - Recommended version: 18.x LTS

## Quick Start Guide

### 1. Clone the Repository
```bash
git clone <repository-url>
cd afwi-multi-agent-generative-engine
```

### 2. Start Docker Desktop
- Make sure Docker Desktop is running before proceeding
- Look for the whale icon in your system tray
- Wait until it stops animating

### 3. Build the source container image

- If it's the first time running the app, you need to install the backend dependencies from the root directory with:
```bash
docker build -t mage-base:latest -f Dockerfile.base .
```
- Alternatvely, use the build script provided:
```bash
.\build-base-image.sh
```

### 4. Start the Backend
```bash
# Windows users: Use Git Bash or WSL terminal
cd backend

# Copy environment file
cp auth_service/.env.example auth_service/.env

docker compose build   # Note: First build will take longer due to NLTK data download (about 3.5GB)

# Start all services
docker compose up # Add the -d flag at the end to run in detached mode and hide the logs
```

### 5. Start the Frontend
```bash
# Open a new terminal window
cd frontend
npm install
npm start
```

### 6. Access the Application
- The application will automatically open in your default browser
- If it doesn't, visit: http://localhost:3000

### 7. Default AdminLog In
- Username: `admin`
- Password: `12345`

## Important Build Notes

### First Time Setup
When building the application for the first time:
1. The extraction service will download all NLTK data (approximately 3.5GB)
2. This is a one-time process per development environment
3. Subsequent builds will be much faster as the data is cached in a Docker volume
4. No manual NLTK setup is required - everything is handled automatically

## Troubleshooting Guide

### Docker Issues
1. **Docker not running**
   - Check if Docker Desktop is running
   - Look for the whale icon in system tray
   - Restart Docker Desktop if needed

2. **Port conflicts**
   ```bash
   # Stop any running containers
   docker compose down
   # Then try starting again
   docker compose up -d
   ```

3. **Container startup failures**
   ```bash
   # View container logs
   docker compose logs
   # Or for a specific service
   docker compose logs auth
   ```

4. **Extraction Service Issues**
   - If you encounter NLTK-related errors:
     ```bash
     # Rebuild the extraction service
     docker compose build extraction
     # Check extraction service logs
     docker compose logs extraction
     ```
   - The NLTK data is stored in a Docker volume, so it persists between container restarts
   - If needed, you can recreate the NLTK data volume:
     ```bash
     docker compose down
     docker volume rm afwi-multi-agent-generative-engine_nltk_data_volume
     docker compose up -d
     ```

### Database Issues
1. **Database not initializing**
   - Check database logs:
     ```bash
     docker compose logs db
     ```
   - Ensure PostgreSQL container is healthy:
     ```bash
     docker compose ps
     ```

### Authentication Issues
1. **Can't log in**
   - Verify the auth service is running:
     ```bash
     docker compose ps auth
     ```
   - Check auth service logs:
     ```bash
     docker compose logs auth
     ```
   - Ensure you're using correct credentials:
     - Username: `admin`
     - Password: `12345`

2. **401 Unauthorized errors**
   - Clear browser cache and cookies
   - Try logging out and back in
   - Check if the auth service is running

## Development Notes

### Environment Setup
- Each service has its own `.env.example` file
- Copy these to `.env` before starting:
  ```bash
  cp auth_service/.env.example auth_service/.env
  ```

### Default Credentials
- Admin username: `admin`
- Admin password: `12345`
- **Important**: Change these in production!

### Architecture
- Frontend: React application (port 3000)
- Backend Services:
  - Auth Service: User authentication (port 8010)
  - Database: PostgreSQL (port 5432)
  - Extraction Service: Document processing with NLTK (port 8002)

### Security Notes
1. **Change in Production**:
   - Admin credentials
   - JWT secret key
   - Database passwords
   - CORS settings

2. **Environment Variables**:
   - Never commit `.env` files
   - Use `.env.example` as templates
   - Keep sensitive data out of version control

## Stopping the Application

1. **Stop the Frontend**
   - Press `Ctrl+C` in the frontend terminal

2. **Stop the Backend**
   ```bash
   cd backend
   docker compose down
   ```

## Additional Resources
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs)
- [React Documentation](https://reactjs.org/)
- [NLTK Documentation](https://www.nltk.org/)

# AFWI Multi-Agent Generative Engine - Airgapped Deployment

This document describes how to prepare and deploy the AFWI MAGE backend services in an airgapped (offline) environment.

## Prerequisites

### On the Preparation Machine (Internet-Connected):

*   PowerShell (for running the preparation script).
*   Docker Desktop (or Docker Engine) installed and running.
*   Git (to clone this repository).
*   The source code of this repository.

### On the Airgapped Machine (Offline):

*   Docker Engine installed and running.
*   If deploying on Windows: PowerShell.
*   If deploying on Linux: Bash (and standard utilities like `unzip`).

## Step 1: Prepare the Airgap Deployment Package (Online Environment)

This step bundles all necessary backend service code, Python dependencies (wheels), base Docker images, and deployment scripts into a single package.

1.  **Open PowerShell** in the root directory of this repository.
2.  **Run the preparation script:**
    ```powershell
    .\prepare_airgap_package.ps1
    ```
    *   You can specify an output directory using the `-OutputDirectory` parameter. By default, it creates a folder named `AirgapDeploymentPackage` in the current directory.
    *   Example: `.\prepare_airgap_package.ps1 -OutputDirectory .\MyAirgapFiles`
3.  **Locate the package:** Once the script completes, you will find a directory (e.g., `AirgapDeploymentPackage` or your custom name). This directory contains everything needed for the airgapped deployment.
    The structure of this package will be similar to:
    ```
    AirgapDeploymentPackage/
    ├── backend_services/     # Zipped Python wheels and code for each service
    ├── backend_support/      # docker-compose.yml, DB init scripts etc.
    ├── docker_images/        # Saved base Docker images as .tar files
    ├── deployment_scripts/   # airgapped_deploy.ps1 & airgapped_deploy.sh
    ├── frontend_app/         # Placeholder for frontend application (if configured)
    └── README_AirgapPackage.txt # README specific to the package contents
    ```

## Step 2: Transfer the Package to the Airgapped Machine

1.  Copy the entire output directory (e.g., `AirgapDeploymentPackage`) from the preparation machine to the airgapped machine using a USB drive, secure network transfer, or other suitable method.

## Step 3: Deploy Services on the Airgapped Machine

Once the package is on the airgapped machine:

1.  **Navigate to the `deployment_scripts` folder** within the transferred package:
    ```bash
    # On Linux (example)
    cd /path/to/your/AirgapDeploymentPackage/deployment_scripts
    
    # On Windows (example, in PowerShell)
    cd C:\path\to\your\AirgapDeploymentPackage\deployment_scripts
    ```

2.  **Make the deployment script executable (Linux only):**
    ```bash
    chmod +x airgapped_deploy.sh
    ```

3.  **Run the appropriate deployment script:**

    *   **For Windows (using PowerShell):**
        ```powershell
        .\airgapped_deploy.ps1
        ```
    *   **For Linux (using Bash):**
        ```bash
        ./airgapped_deploy.sh
        ```

4.  **Follow the script prompts:**
    *   The script will first attempt to load all base Docker images found in the `../docker_images` directory.
    *   It will then list available backend services.
    *   You can choose to deploy a specific service, all services, or list services only.
        *   To deploy a specific service by name: `.\airgapped_deploy.ps1 -ServiceName auth_service` or `./airgapped_deploy.sh -s auth_service`
        *   To deploy all services: `.\airgapped_deploy.ps1 -DeployAllServices` or `./airgapped_deploy.sh -a`
        *   To only list services: `.\airgapped_deploy.ps1 -ListServicesOnly` or `./airgapped_deploy.sh -l`
    *   For each selected service, the script will:
        1.  Extract the service's zip package.
        2.  Build the service-specific Docker image using the local Dockerfile and the pre-loaded base images/wheels.
        3.  Provide an example `docker run` command. You will need to consult the service's specific documentation (if available) or standard practices for required ports, volumes, and environment variables.

## Important Notes

*   **Docker Must Be Running:** Ensure Docker is running on the airgapped machine before executing the deployment scripts.
*   **Service Configuration:** The deployment scripts build the Docker images. Running and configuring the services (e.g., setting environment variables, mapping ports, mounting volumes) is typically done via `docker run` commands or `docker-compose` (if you adapt the `docker-compose.yml` in `backend_support` for airgapped use). The scripts provide a *sample* `docker run` command; actual parameters will vary.
*   **`README_AirgapPackage.txt`:** Inside the transferred package, there is a `README_AirgapPackage.txt` file which provides a brief overview of the package contents. This root-level `README.md` you are reading now focuses on the end-to-end process.
*   **Frontend:** This guide primarily focuses on backend services. Frontend deployment is handled separately and the `prepare_airgap_package.ps1` script currently includes placeholder steps for it.

This README provides a general guide. Refer to individual service documentation and the `Airgap-Plan.md` and `Airgap-TODO.md` files in the `Plans/` directory for more detailed design and ongoing tasks related to airgapped deployment.