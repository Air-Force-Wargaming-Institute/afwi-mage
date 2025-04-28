import httpx
import json
import logging

from fastapi import HTTPException

# Use absolute imports
from config import settings
from models import GeneratedAgentDetails

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_MODEL = "phi3:mini" # Using the lightweight model

async def generate_agent_details_from_llm(user_prompt: str) -> GeneratedAgentDetails:
    """Interacts with Ollama to generate agent details from a user prompt."""

    system_prompt = (
        "You are an AI assistant specialized in creating configurations for other AI agents. "
        "Based on the user's description, generate a suitable name, a concise description (max 140 characters), "
        "and detailed system instructions for the new agent. "
        "Output ONLY a valid JSON object with the following keys: 'name', 'description', 'agent_instructions'. "
        "Example Input: 'I need an agent that can summarize scientific papers.' "
        "Example Output: {\"name\": \"Paper Summarizer\", \"description\": \"Summarizes scientific articles and provides key takeaways.\", \"agent_instructions\": \"Analyze the provided scientific paper text. Identify the main topic, methodology, key findings, and conclusion. Provide a concise summary (2-3 paragraphs) covering these aspects.\"}"
    )

    ollama_endpoint = f"{settings.ollama_base_url}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "format": "json", # Request JSON output format
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"Sending request to Ollama: {ollama_endpoint} with model {OLLAMA_MODEL}")
            response = await client.post(ollama_endpoint, json=payload)
            response.raise_for_status()
            
            ollama_response = response.json()
            logger.info(f"Received response from Ollama.")

            if not ollama_response.get("message") or not ollama_response["message"].get("content"):
                 logger.error(f"Ollama response missing message content: {ollama_response}")
                 raise HTTPException(status_code=500, detail="Ollama response missing message content.")

            json_content_str = ollama_response["message"]["content"]
            
            try:
                generated_data = json.loads(str(json_content_str))
                validated_details = GeneratedAgentDetails(**generated_data)
                logger.info("Successfully parsed and validated LLM response.")
                return validated_details
            except (json.JSONDecodeError, ValueError, TypeError, ValidationError) as json_error: # Added Pydantic validation error
                 logger.error(f"Failed to parse/validate JSON from Ollama response: {json_error}. Raw Content: {json_content_str!r}")
                 detail_msg = f"Could not parse/validate valid JSON from LLM response. Error: {json_error}. Raw response part: {str(json_content_str)[:200]}..."
                 raise HTTPException(status_code=500, detail=detail_msg)

    except httpx.RequestError as exc:
        logger.error(f"Error requesting Ollama: {exc}")
        raise HTTPException(status_code=503, detail=f"Could not connect to Ollama service at {settings.ollama_base_url}: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error(f"Ollama request failed: {exc.response.status_code} - {exc.response.text}")
        raise HTTPException(status_code=exc.response.status_code, detail=f"Ollama service returned error: {exc.response.text}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during LLM interaction: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error during AI generation: {type(e).__name__}") 