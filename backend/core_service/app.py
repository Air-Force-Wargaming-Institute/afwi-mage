from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import os
from pathlib import Path
import asyncio
import httpx
import redis.asyncio as redis
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from typing import List

import config # Assuming config.py is in the same directory or accessible

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MAGE Core Service",
    description="Core service for MAGE document management",
    version="1.0.0"
)

# Define health check endpoints first to ensure they're not overridden
@app.get("/api/core/health")
async def health_check():
    """Health check endpoint for the API gateway."""
    return {"status": "healthy"}

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Redis pool
redis_pool = None

# Global HTTP client
http_client = None

# Global Scheduler
scheduler = None

async def discover_models():
    if not redis_pool:
        logger.error("Redis pool not initialized. Cannot discover models.")
        return

    if not http_client:
        logger.error("HTTP client not initialized. Cannot discover models.")
        return

    redis_conn = redis.Redis(connection_pool=redis_pool)
    chat_models = set()
    embedding_models = set()

    # --- Discover vLLM Models (Check Task) ---
    if config.VLLM_INSTANCES:
        for base_url, task in config.VLLM_INSTANCES:
            try:
                url = f"{base_url}/models"
                response = await http_client.get(url, timeout=10.0)
                response.raise_for_status() # Raise exception for non-2xx status
                data = response.json()
                # vLLM /v1/models returns {"object": "list", "data": [{"id": "model_name", ...}]}
                vllm_model_ids = {model.get('id') for model in data.get('data', []) if model.get('id')}

                # Assign models based on the task specified in config
                if task == 'embedding':
                    embedding_models.update(vllm_model_ids)
                    logger.info(f"Discovered vLLM embedding models from {base_url}: {vllm_model_ids}")
                elif task == 'generate' or task == 'completion': # Treat generate/completion as chat
                    chat_models.update(vllm_model_ids)
                    logger.info(f"Discovered vLLM chat models from {base_url}: {vllm_model_ids}")
                else:
                    logger.warning(f"Unknown task '{task}' specified for VLLM instance {base_url}. Models not assigned.")

            except httpx.RequestError as e:
                logger.error(f"Error connecting to VLLM service at {base_url} (task: {task}): {e}")
            except httpx.HTTPStatusError as e:
                logger.error(f"Error fetching models from VLLM ({base_url}, task: {task}, status: {e.response.status_code}): {e.response.text}")
            except Exception as e:
                logger.error(f"Error parsing VLLM models from {base_url} (task: {task}): {e}")

    # --- Discover Ollama Models (Check Capabilities) ---
    if config.OLLAMA_BASE_URLS:
        for base_url in config.OLLAMA_BASE_URLS:
            ollama_model_names = set()
            # Step 1: Get all model names from /api/tags
            try:
                tags_url = f"{base_url}/api/tags"
                response = await http_client.get(tags_url, timeout=10.0)
                response.raise_for_status()
                tags_data = response.json()
                ollama_model_names = {model.get('name') for model in tags_data.get('models', []) if model.get('name')}
                logger.info(f"Found {len(ollama_model_names)} potential models from Ollama at {base_url}")
            except httpx.RequestError as e:
                logger.error(f"Error connecting to Ollama service at {base_url}/api/tags: {e}")
                continue # Skip this Ollama instance if tags endpoint fails
            except httpx.HTTPStatusError as e:
                logger.error(f"Error fetching tags from Ollama ({base_url}, {e.response.status_code}): {e.response.text}")
                continue # Skip this Ollama instance
            except Exception as e:
                logger.error(f"Error parsing Ollama tags from {base_url}: {e}")
                continue # Skip this Ollama instance

            # Step 2: Get capabilities for each model using /api/show
            show_url = f"{base_url}/api/show"
            for model_name in ollama_model_names:
                try:
                    payload = {"model": model_name}
                    response = await http_client.post(show_url, json=payload, timeout=15.0) # Increased timeout slightly
                    response.raise_for_status()
                    show_data = response.json()
                    capabilities = show_data.get('capabilities', [])
                    is_embedding = 'embedding' in capabilities
                    is_completion = 'completion' in capabilities

                    if is_embedding:
                        embedding_models.add(model_name)
                        logger.debug(f"Ollama model '{model_name}' identified as embedding.")
                    # Add to chat models if completion capable OR if capabilities list is missing/empty (default)
                    if is_completion or not capabilities:
                        chat_models.add(model_name)
                        logger.debug(f"Ollama model '{model_name}' identified as chat/completion.")
                    elif not is_embedding:
                        # Neither embedding nor completion explicitly listed, but capabilities exist
                        logger.warning(f"Ollama model '{model_name}' from {base_url} has capabilities {capabilities} but not 'embedding' or 'completion'. Defaulting to chat.")
                        chat_models.add(model_name)

                except httpx.RequestError as e:
                    logger.error(f"Error connecting to Ollama {show_url} for model '{model_name}': {e}")
                    # Decide if we should still add the model name to a default list (e.g., chat) if show fails
                    chat_models.add(model_name) # Defaulting to chat on error
                    logger.warning(f"Could not get capabilities for Ollama model '{model_name}', defaulting to chat.")
                except httpx.HTTPStatusError as e:
                    logger.error(f"Error fetching info from Ollama {show_url} for model '{model_name}' ({e.response.status_code}): {e.response.text}")
                    chat_models.add(model_name) # Defaulting to chat on error
                    logger.warning(f"Could not get capabilities for Ollama model '{model_name}', defaulting to chat.")
                except Exception as e:
                    logger.error(f"Error parsing Ollama show response for model '{model_name}': {e}")
                    chat_models.add(model_name) # Defaulting to chat on error
                    logger.warning(f"Could not get capabilities for Ollama model '{model_name}', defaulting to chat.")

    # --- Update Redis ---
    try:
        async with redis_conn.pipeline(transaction=True) as pipe:
            # Clear existing keys and add new models
            await pipe.delete(config.REDIS_CHAT_MODELS_KEY)
            await pipe.delete(config.REDIS_EMBEDDING_MODELS_KEY)
            if chat_models:
                await pipe.sadd(config.REDIS_CHAT_MODELS_KEY, *chat_models)
            if embedding_models:
                await pipe.sadd(config.REDIS_EMBEDDING_MODELS_KEY, *embedding_models)
            await pipe.execute()
        logger.info(f"Updated Redis: {len(chat_models)} chat models, {len(embedding_models)} embedding models discovered.")
    except Exception as e:
        logger.error(f"Error updating Redis with discovered models: {e}")
    finally:
        await redis_conn.close() # Close the single connection

@app.get("/api/core/models/chat", response_model=List[str])
async def get_chat_models():
    """Returns a list of currently available chat models discovered from vLLM/Ollama."""
    if not redis_pool:
        raise HTTPException(status_code=503, detail="Redis connection not available")

    redis_conn = redis.Redis(connection_pool=redis_pool)
    try:
        models = await redis_conn.smembers(config.REDIS_CHAT_MODELS_KEY)
        await redis_conn.close()
        return sorted(list(models)) # Return sorted list for consistent order
    except Exception as e:
        logger.error(f"Error fetching chat models from Redis: {e}")
        # Ensure connection is closed even if smembers fails
        try:
            await redis_conn.close()
        except Exception:
            pass # Ignore errors during close after another error
        raise HTTPException(status_code=500, detail="Failed to retrieve chat models from Redis")

@app.get("/api/core/models/embedding", response_model=List[str])
async def get_embedding_models():
    """Returns a list of currently available embedding models discovered (primarily from Ollama)."""
    if not redis_pool:
        raise HTTPException(status_code=503, detail="Redis connection not available")

    redis_conn = redis.Redis(connection_pool=redis_pool)
    try:
        models = await redis_conn.smembers(config.REDIS_EMBEDDING_MODELS_KEY)
        await redis_conn.close()
        return sorted(list(models)) # Return sorted list for consistent order
    except Exception as e:
        logger.error(f"Error fetching embedding models from Redis: {e}")
        # Ensure connection is closed even if smembers fails
        try:
            await redis_conn.close()
        except Exception:
            pass # Ignore errors during close after another error
        raise HTTPException(status_code=500, detail="Failed to retrieve embedding models from Redis")

@app.on_event("startup")
async def startup_event():
    global redis_pool, http_client, scheduler
    logger.info("Core service starting up...")
    # Initialize Redis pool
    try:
        redis_pool = redis.ConnectionPool.from_url(
            f"redis://{config.REDIS_HOST}:{config.REDIS_PORT}",
            decode_responses=True # Decode responses to strings
        )
        # Test connection
        conn = redis.Redis(connection_pool=redis_pool)
        await conn.ping()
        await conn.close()
        logger.info(f"Successfully connected to Redis at {config.REDIS_HOST}:{config.REDIS_PORT}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        redis_pool = None # Ensure pool is None if connection failed

    # Initialize HTTP client
    http_client = httpx.AsyncClient()
    logger.info("Initialized HTTP client.")

    # Initialize and start scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(discover_models, 'interval', minutes=1, id='discover_models_job', name='Periodic Model Discovery')
    # Run once immediately on startup as well
    scheduler.add_job(discover_models, id='initial_discover_models', name='Initial Model Discovery')
    scheduler.start()
    logger.info("Started model discovery scheduler (runs every 1 minute).")

@app.on_event("shutdown")
async def shutdown_event():
    global redis_pool, http_client, scheduler
    logger.info("Core service shutting down...")
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Shut down scheduler.")
    if http_client:
        await http_client.aclose()
        logger.info("Closed HTTP client.")
    if redis_pool:
        await redis_pool.disconnect()
        logger.info("Disconnected Redis pool.")

# Ensure data directories exist
BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = BASE_DIR / 'data' / 'uploads'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
logger.info(f"Ensuring upload directory exists: {UPLOAD_DIR}")

# # Import core routes
# try:
#     from core_routes import router as core_router
#     app.include_router(core_router, prefix="/api/core", tags=["core"])
#     logger.info("Successfully mounted core routes at /api/core")
# except Exception as e:
#     logger.error(f"Error loading core_routes router: {str(e)}")
#     logger.warning("Core routes not available - this may be expected if they're not used")

# Import document routes
try:
    from routes.document_library import router as document_router
    app.include_router(document_router, tags=["documents"])
    logger.info("Successfully mounted document routes")
except Exception as e:
    logger.error(f"Error loading document_library router: {str(e)}")
    raise

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler"""
    logger.error(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
