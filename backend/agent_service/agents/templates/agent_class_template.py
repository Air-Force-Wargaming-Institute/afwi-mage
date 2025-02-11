from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from uuid import UUID, uuid4

class Agent(BaseModel):
    name: str
    _unique_id: UUID = Field(default_factory=uuid4, alias='unique_id')
    description: str
    instructions: str
    llm_model: str
    color: str
    created_at: datetime = Field(datetime.now(datetime.UTC))
    vectorstores: List[str]
    last_modified: datetime = Field(datetime.now(datetime.UTC))

    @property
    def unique_id(self) -> UUID:
        return self._unique_id

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
