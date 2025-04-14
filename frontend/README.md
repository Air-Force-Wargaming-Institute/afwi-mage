# AFWI MAGE Frontend

This directory contains the React-based frontend for the Air Force Wargaming Institute Multi-Agent Generative Engine (AFWI MAGE) system. The frontend provides user interfaces for agent management, document handling, training dataset creation, chat interactions, and system administration.

## Directory Structure

```
frontend/
├── public/                # Static assets and HTML template
├── src/                   # Source code
│   ├── assets/            # Images, icons, and other static assets
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React context providers
│   ├── services/          # API service connectors
│   ├── styles/            # CSS and styling files
│   ├── App.js             # Main application component
│   ├── App.css            # Application styles
│   ├── config.js          # Configuration and environment variables
│   ├── index.js           # Application entry point
│   └── index.css          # Global styles
├── Dockerfile             # Container configuration
├── package.json           # NPM dependencies and scripts
├── .env.development       # Development environment variables
├── .env.production        # Production environment variables
└── start_dev.sh           # Development startup script
```

## Prerequisites

- Node.js (v18.x recommended)
- npm or yarn
- Docker (for containerized deployment)

## Development Setup

### Standard Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   # Or use the convenience script:
   ./start_dev.sh
   ```

3. Access the application at `http://localhost:3000`

## Building for Production

```bash
# Build the application
npm run build

# The build output will be in the build/ directory
```

## Docker Deployment

### Standard Deployment

Build and run the Docker container:

```bash
# Build the image
docker build -t afwi-mage-frontend .

# Run the container
docker run -p 80:80 afwi-mage-frontend
```

## Airgapped Deployment

This section provides instructions for deploying the frontend in an environment without internet access.

### Prerequisites for Airgapped Deployment

- Docker installed on both connected and airgapped systems
- Node.js and npm installed if pre-building outside container

### Step 1: Prepare Base Image (On Internet-Connected System)

```bash
# Pull the base Node.js image
docker pull node:18.20.8-slim

# Save the image to a file
docker save node:18.20.8-slim > node-base.tar
```

### Step 2: Prepare Node Modules (On Internet-Connected System)

This step downloads all required npm packages:

```bash
# Clone the repository if you haven't already
git clone <repository-url>
cd afwi-multi-agent-generative-engine/frontend

# Install dependencies
npm install

# Optional: Create a tarball of node_modules
tar -czf node_modules.tar.gz node_modules
```

### Step 3: Transfer Files to Airgapped Environment

Transfer the following files to the airgapped system:
1. `node-base.tar` - Docker base image
2. The entire `frontend` directory (or specifically):
   - `src/` directory
   - `public/` directory
   - `package.json` and `package-lock.json`
   - `Dockerfile`
   - `.env.production` (configured for airgapped environment)
   - `node_modules.tar.gz` (if created in Step 2)

### Step 4: Install in Airgapped Environment

```bash
# Load the base image
docker load < node-base.tar

# If you transferred node_modules separately:
tar -xzf node_modules.tar.gz

# Build the frontend container
docker build -t afwi-mage-frontend .

# Run the container
docker run -p 80:80 -d --name afwi-frontend afwi-mage-frontend
```

### Step 5: Configure Environment for Backend Services

Edit the `.env.production` file to point to the correct backend service locations in your airgapped environment:

```
REACT_APP_API_BASE_URL=http://localhost
REACT_APP_CORE_SERVICE_PORT=8000
REACT_APP_CHAT_SERVICE_PORT=8009
# ... additional service configurations
```

## Environment Configuration

The application uses environment variables for configuration:

### Development (.env.development)
- `REACT_APP_API_BASE_URL`: Base URL for API services
- `REACT_APP_*_SERVICE_PORT`: Ports for various microservices
- Other configuration variables for development environment

### Production (.env.production)
- Production-specific configurations
- Should be adjusted for the target deployment environment

## Troubleshooting

### Common Issues

1. **Backend Connection Errors**
   - Verify backend services are running
   - Check network connectivity between frontend and backend services
   - Confirm environment variables are correctly set

2. **Container Build Failures**
   - Ensure all necessary files are present
   - Check Docker logs: `docker logs afwi-frontend`

3. **Blank or Partially Loaded UI**
   - Check browser console for JavaScript errors
   - Verify all frontend assets were correctly built and included

### Health Checks

```bash
# Check if container is running
docker ps | grep afwi-frontend

# Check container logs
docker logs afwi-frontend

# Test the web server
curl http://localhost:80
```

## Security Notes

- The frontend is configured to access backend services only
- No direct database access
- Authentication is handled through the Auth Service
- All API requests require valid authentication tokens

## Maintenance

### Updates
In an airgapped environment, updates require:
1. Building an updated container on an internet-connected machine
2. Transferring the new container image to the airgapped environment
3. Deploying the updated container 