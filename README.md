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

- If it's the first time running the app, you need to install the backend dependencies with:
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