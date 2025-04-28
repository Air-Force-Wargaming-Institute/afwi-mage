from fastapi import APIRouter, Depends, HTTPException
import logging

# Use absolute imports from service root
from models import PromptPayload, GeneratedAgentInstructions, User
from auth import get_current_user
from llm import generate_agent_instructions_from_llm

router = APIRouter()
logger = logging.getLogger(__name__)

# Define the endpoint path relative to how the router will be included in app.py
# If app.py includes this router without a prefix, the full path must be here.
ENDPOINT_PATH = "/api/agent/generate_agent_instructions_from_prompt"

@router.post(ENDPOINT_PATH, 
             response_model=GeneratedAgentInstructions,
             tags=["Agent Generation"], # Tag for Swagger UI
             summary="Generate Agent Instructions from Prompt",
             description="Receives a user prompt, generates agent instructions using an LLM, and returns the structured details. Requires authentication.")
async def generate_agent_instructions_from_prompt(
    payload: PromptPayload,
    current_user: User = Depends(get_current_user) # Apply authentication dependency
):
    logger.info(f"Received generation request from user: {current_user.username} for path {ENDPOINT_PATH}")
    
    try:
        generated_details = await generate_agent_instructions_from_llm(payload.prompt)
        logger.info(f"Successfully generated instructions for user {current_user.username}")
        return generated_details
    except HTTPException as e:
        # Re-raise known HTTPExceptions (from auth, llm)
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during agent instructions generation for user {current_user.username}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred during agent instructions generation.")

# Add other generation-related endpoints here if needed 