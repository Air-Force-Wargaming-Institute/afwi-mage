# MAGE Service Health Check Implementation Guide

## Standardized Health Check Endpoints

All services in the MAGE platform must implement a health check endpoint at:

```
/api/{service-name}/health
```

For example:
- Auth Service: `/api/auth/health`
- Core Service: `/api/core/health`
- Chat Service: `/api/chat/health`

## Health Check Response Format

Health check endpoints should return:

- **HTTP Status Code**: 200 OK when healthy
- **Response Body**: A JSON object with at least the following fields:

```json
{
  "status": "healthy",
  "version": "1.0.0", 
  "service": "service-name",
  "timestamp": "2025-03-27T19:01:03Z"
}
```

Add additional fields as needed to indicate more details about service health.

## Implementation Example

### FastAPI Implementation

```python
from fastapi import FastAPI, status
from datetime import datetime
import pytz

app = FastAPI()

@app.get("/api/{service_name}/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",  # Replace with actual version from your service
        "service": "service-name",  # Replace with your service name
        "timestamp": datetime.now(pytz.UTC).isoformat()
    }
```

### Custom Health Checks

If your service needs to verify dependencies (database, external APIs, etc.) before reporting as healthy:

```python
@app.get("/api/{service_name}/health")
async def health_check():
    # Check database connection
    db_healthy = await check_database_connection()
    
    # Check other dependencies
    cache_healthy = await check_cache_connection()
    
    # Overall health status
    is_healthy = db_healthy and cache_healthy
    
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "version": "1.0.0",
        "service": "service-name",
        "timestamp": datetime.now(pytz.UTC).isoformat(),
        "details": {
            "database": "connected" if db_healthy else "disconnected",
            "cache": "connected" if cache_healthy else "disconnected"
        }
    }, status_code
```

## Implementation Timeline

All services must implement the standardized health check endpoint by [DATE].

## Testing Your Health Check

After implementing your health check, verify it works by:

1. Starting your service
2. Making a GET request to your health endpoint
3. Verifying Traefik can reach your health endpoint through the API gateway 