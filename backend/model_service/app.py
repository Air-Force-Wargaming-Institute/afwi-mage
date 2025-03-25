from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import logging
from pathlib import Path
import os
import yaml
import httpx
import json
from typing import List, Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
def load_config():
    """Load configuration from config.yaml file"""
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return yaml.safe_load(f)
    else:
        logger.warning(f"Config file not found at {config_path}. Using default config.")
        return {
            "PORT": 8008,
            "LOG_PATH": "/app/data/logs",
            "MODEL_CACHE_PATH": "/app/data/models",
        }

config = load_config()

# Ensure log directory exists
log_dir = Path(config.get('LOG_PATH', '/app/data/logs'))
log_dir.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="Multi Agent Generative Engine: Model Service",
    description="API for serving and managing AI models",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request and response models
class ChatRequest(BaseModel):
    """Model for chat requests"""
    message: str = Field(..., description="The user's message/question")
    model: Optional[str] = Field(None, description="Model to use for generation")
    max_tokens: Optional[int] = Field(None, description="Maximum number of tokens to generate")
    temperature: Optional[float] = Field(None, description="Temperature for generation")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt")

class ChatResponse(BaseModel):
    """Model for chat responses"""
    response: str = Field(..., description="Generated response")
    model: str = Field(..., description="Model used for generation")
    timestamp: str = Field(..., description="Timestamp of the response")

# Helper function to call the vLLM API
async def call_llm_api(message: str, model: str = None, max_tokens: int = None, 
                      temperature: float = None, system_prompt: str = None) -> str:
    """Call the vLLM OpenAI-compatible API to generate a response"""
    # Default to localhost if not specified
    vllm_url = os.environ.get("VLLM_API_URL", config.get("VLLM_API_URL", "http://localhost:8007/v1"))
    if not vllm_url:
        raise HTTPException(status_code=500, detail="VLLM API URL not configured")
    
    # Extract base URL for health check (remove /v1 or /v1/completions if present)
    base_url = vllm_url.split('/v1')[0]
    health_url = f"{base_url}/health"
    
    logger.info(f"Checking vLLM health at: {health_url}")
    
    # Perform health check
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            health_response = await client.get(health_url)
            if health_response.status_code != 200:
                logger.error(f"vLLM health check failed: {health_response.status_code}")
                raise HTTPException(
                    status_code=503, 
                    detail=f"vLLM service is not healthy: {health_response.status_code}"
                )
            else:
                logger.info(f"vLLM health check successful: {health_response.text}")
    except httpx.RequestError as e:
        logger.error(f"vLLM health check error: {str(e)}")
        # Try an alternative health check using the models endpoint
        try:
            alt_health_url = f"{vllm_url}/models"
            logger.info(f"Trying alternative health check at: {alt_health_url}")
            async with httpx.AsyncClient(timeout=10) as client:
                alt_health_response = await client.get(alt_health_url)
                if alt_health_response.status_code != 200:
                    logger.error(f"Alternative vLLM health check failed: {alt_health_response.status_code}")
                    raise HTTPException(
                        status_code=503, 
                        detail=f"vLLM service is not healthy. Error: {str(e)}"
                    )
                logger.info(f"Alternative vLLM health check successful")
        except httpx.RequestError as alt_e:
            logger.error(f"All vLLM health checks failed")
            raise HTTPException(
                status_code=503, 
                detail=f"Cannot connect to vLLM service. Error: {str(e)}"
            )
    
    # Use default values from config if parameters not provided
    model = model or config.get("DEFAULT_MODEL")
    max_tokens = max_tokens or config.get("MAX_TOKENS", 1024)
    
    # Ensure max_tokens is reasonable
    if max_tokens < 100:
        logger.warning(f"max_tokens value ({max_tokens}) is too small, setting to 500")
        max_tokens = 500
    elif max_tokens > 32768:  # Increased maximum to 32K tokens
        logger.warning(f"max_tokens value ({max_tokens}) exceeds limit, capping at 32768")
        max_tokens = 32768
        
    temperature = temperature or config.get("DEFAULT_TEMPERATURE", 0.7)
    
    # Set a longer timeout for longer responses - more aggressive scaling
    timeout = config.get("TIMEOUT", 300)  # Default 5 minutes
    if max_tokens > 1000:
        # Scale timeout dynamically based on token count
        # For extremely long responses (e.g., 16K tokens), this gives ~10 minute timeout
        timeout = max(timeout, max_tokens // 3)
    
    logger.info(f"Using parameters: model={model}, max_tokens={max_tokens}, temperature={temperature}, timeout={timeout}")
    
    try:
        logger.info(f"Calling vLLM API at {vllm_url} with model: {model}")
        
        # Try completions endpoint first (simpler, more likely to work)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Call LLM endpoints with memory management for large responses
                logger.info(f"Sending request to {vllm_url}/completions")
                prompt = message
                if system_prompt:
                    prompt = f"{system_prompt}\n\n{message}"
                
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "stop": ["<|im_end|>", "</s>", "\n\n###"],
                    "best_of": 1,
                    "stream": False,
                }
                
                # Log request details for debugging extremely large responses
                logger.info(f"Request payload: {json.dumps({k: v for k, v in payload.items() if k != 'prompt'})}")
                logger.info(f"Prompt length: {len(prompt)} characters")
                
                response = await client.post(
                    f"{vllm_url}/completions",
                    json=payload,
                    timeout=timeout
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    logger.info(f"Successfully received response from completions endpoint, length: {len(response_data['choices'][0]['text'])}")
                    # Aggressively strip all leading/trailing whitespace
                    text_response = response_data["choices"][0]["text"]
                    if text_response and text_response[0].isspace():
                        logger.warning(f"Response contained leading whitespace, stripping it: '{text_response[:10]}...'")
                    return text_response.strip()
                else:
                    logger.warning(f"Completions endpoint failed with status {response.status_code}, trying chat endpoint")
        except Exception as compl_err:
            logger.warning(f"Error with completions endpoint, trying chat endpoint: {str(compl_err)}")
            
        # Fall back to chat completions endpoint
        # Prepare messages for the chat API
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": message})
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Process chat response with chunked reading for extremely large responses
            chat_url = f"{vllm_url}/chat/completions"
            
            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stop": ["<|im_end|>", "</s>", "\n\n###"],
                "stream": False,
            }
            
            # Log request details for debugging extremely large responses
            logger.info(f"Request payload: {json.dumps({k: v for k, v in payload.items() if k != 'messages'})}")
            logger.info(f"Message count: {len(messages)}")
            total_input_length = sum(len(m.get('content', '')) for m in messages)
            logger.info(f"Total input length: {total_input_length} characters")
            
            response = await client.post(
                chat_url,
                json=payload,
                timeout=timeout
            )
            
            if response.status_code != 200:
                logger.error(f"vLLM API error: {response.status_code}, {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"LLM API error: {response.text}"
                )
            
            response_data = response.json()
            result = response_data["choices"][0]["message"]["content"]
            logger.info(f"Successfully received response from chat endpoint, length: {len(result)}")
            
            # Check for and log any whitespace issues
            if result and result[0].isspace():
                logger.warning(f"Chat response contained leading whitespace, stripping it: '{result[:10]}...'")
            
            return result.strip()
            
    except httpx.RequestError as e:
        logger.error(f"Error calling vLLM API: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Error communicating with LLM API: {str(e)}")

# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Basic chat endpoint that processes a user message and returns a response"""
    start_time = datetime.now()
    try:
        # Truncate message for logging if very long
        msg_preview = request.message[:100] + "..." if len(request.message) > 100 else request.message
        logger.info(f"Received chat request: {msg_preview}")
        logger.info(f"Request parameters: model={request.model}, max_tokens={request.max_tokens}, temperature={request.temperature}")
        
        # Log system prompt length if provided
        if request.system_prompt:
            sys_prompt_len = len(request.system_prompt)
            logger.info(f"System prompt provided (length: {sys_prompt_len} chars)")
        
        # Call the LLM API to generate a response
        logger.info("Calling LLM API...")
        response_text = await call_llm_api(
            message=request.message,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system_prompt=request.system_prompt
        )
        
        # Create and return the response
        end_time = datetime.now()
        elapsed = (end_time - start_time).total_seconds()
        response_length = len(response_text)
        word_count = len(response_text.split())
        estimated_tokens = int(word_count * 1.3)  # Rough estimate
        
        logger.info(f"Generated response in {elapsed:.2f} seconds")
        logger.info(f"Response length: {response_length} chars, ~{estimated_tokens} tokens")
        logger.info(f"Generation speed: ~{estimated_tokens/elapsed:.1f} tokens/sec")
        
        response = ChatResponse(
            response=response_text,
            model=request.model or config.get("DEFAULT_MODEL"),
            timestamp=end_time.isoformat()
        )
        
        return response
        
    except HTTPException as http_err:
        # Just re-raise HTTP exceptions
        logger.error(f"HTTP error in chat endpoint: {str(http_err)}")
        raise
    except Exception as e:
        elapsed = (datetime.now() - start_time).total_seconds()
        logger.error(f"Error in chat endpoint after {elapsed:.2f} seconds: {str(e)}")
        logger.exception("Full exception details:")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Check if the service is healthy"""
    return {
        "status": "healthy",
        "service": "model_service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Root endpoint with service info
@app.get("/")
async def root():
    """Service information"""
    return {
        "service": "Multi Agent Generative Engine: Model Service",
        "description": "API for serving and managing AI models",
        "documentation": "/docs",
        "health": "/health"
    }

# Run the app if executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app", 
        host="0.0.0.0", 
        port=int(config.get('PORT', 8008)),
        reload=True
    ) 