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
cd AFWI-MAGE-FineTune
```

### 2. Start Docker Desktop
- Make sure Docker Desktop is running before proceeding
- Look for the whale icon in your system tray
- Wait until it stops animating

### 3. Start the Backend
```bash
# Windows users: Use Git Bash or WSL terminal
cd backend

# Copy environment file
cp auth_service/.env.example auth_service/.env

# If it's the first time running the app, you need to install the backend dependencies
docker compose build

# Start all services
docker compose up # Add the -d flag at the end to run in detached mode and hide the logs
```

### 4. Start the Frontend
```bash
# Open a new terminal window
cd frontend
npm install
npm start
```

### 5. Access the Application
- The application will automatically open in your default browser
- If it doesn't, visit: http://localhost:3000

### 6. Default AdminLog In
- Username: `admin`
- Password: `12345`

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