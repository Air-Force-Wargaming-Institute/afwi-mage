from fastapi import APIRouter, HTTPException, Depends, Request
import httpx
import logging
from config import UPLOAD_SERVICE_URL, EXTRACTION_SERVICE_URL, GENERATION_SERVICE_URL, AGENT_SERVICE_URL, REVIEW_SERVICE_URL, EMBEDDING_SERVICE_URL, AUTH_SERVICE_URL, WORKBENCH_SERVICE_URL, DIRECT_CHAT_SERVICE_URL

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint for the API gateway."""
    return {"status": "healthy"}

@router.get("/service-status")
async def service_status():
    """Check status of all microservices."""
    services = {
        "upload": UPLOAD_SERVICE_URL,
        "extraction": EXTRACTION_SERVICE_URL,
        "generation": GENERATION_SERVICE_URL,
        "agent": AGENT_SERVICE_URL,
        "review": REVIEW_SERVICE_URL,
        "embedding": EMBEDDING_SERVICE_URL,
        "auth": AUTH_SERVICE_URL,
        "workbench": WORKBENCH_SERVICE_URL,
        "direct_chat": DIRECT_CHAT_SERVICE_URL
    }
    
    results = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for service_name, url in services.items():
            if not url:
                results[service_name] = {"status": "unconfigured"}
                continue
                
            try:
                health_url = f"{url}/health"
                response = await client.get(health_url)
                if response.status_code == 200:
                    results[service_name] = {"status": "healthy"}
                else:
                    results[service_name] = {"status": "unhealthy", "code": response.status_code}
            except Exception as e:
                results[service_name] = {"status": "unavailable", "error": str(e)}
    
    return {"services": results}

@router.get("/info")
async def get_info():
    """Get information about the core service."""
    return {
        "name": "MAGE Core Service",
        "version": "1.0.0",
        "components": [
            "Document Library",
            "Model Registry",
            "Service Discovery"
        ]
    }

# Add more routes for the core service as needed
