from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from uuid import UUID, uuid4

class Agent(BaseModel):
    name: str
    unique_id: UUID = Field(default_factory=uuid4, frozen=True)
    description: str
    instructions: str
    llm_model: str
    color: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(datetime.UTC))
    vectorstores: List[str]
    last_modified: datetime = Field(default_factory=lambda: datetime.now(datetime.UTC))
    
    @model_validator(mode='before')
    def update_last_modified(cls, values):
        """Update last_modified timestamp whenever any field is changed"""
        values['last_modified'] = datetime.now(datetime.UTC)
        return values

    @classmethod
    def create(cls, 
               name: str,
               description: str,
               instructions: str,
               llm_model: str,
               color: str,
               vectorstores: Optional[List[str]] = None) -> 'Agent':
        """
        Create a new Agent instance with the given parameters.
        
        Args:
            name: Name of the agent
            description: Description of the agent's purpose
            instructions: System prompt/instructions for the agent
            llm_model: The LLM model to use
            color: Display color for the agent
            vectorstores: List of vectorstore names the agent has access to
        
        Returns:
            A new Agent instance
        """
        return cls(
            name=name,
            description=description,
            instructions=instructions,
            llm_model=llm_model,
            color=color,
            vectorstores=vectorstores or [],
            created_at=datetime.now(datetime.UTC),
            last_modified=datetime.now(datetime.UTC)
        )
