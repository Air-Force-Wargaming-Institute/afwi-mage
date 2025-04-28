from pydantic import BaseModel, Field

class PromptPayload(BaseModel):
    prompt: str = Field(..., description="The user's natural language description of the desired agent.")

class GeneratedAgentInstructions(BaseModel):
    agent_instructions: str = Field(..., description="Generated system instructions for the agent.")

class User(BaseModel):
    # Basic user model needed for authentication dependency
    username: str

# Add any other models needed by agent_service below 