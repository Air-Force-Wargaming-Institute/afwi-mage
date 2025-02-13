from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Optional
from uuid import UUID, uuid4

from .agent_class_template import Agent

class Team(BaseModel):
    name: str
    unique_id: UUID = Field(default_factory=uuid4, alias='unique_id')
    description: str
    agents: List[str]
    color: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_modified: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode='before')
    def update_last_modified(cls, values):
        """Update last_modified timestamp whenever any field is changed"""
        values['last_modified'] = datetime.now(timezone.utc)
        return values

    @classmethod
    def create(cls,
               name: str,
               description: str,
               color: str,
               agents: Optional[Dict[str, Agent]] = None) -> 'Team':
        """
        Create a new Team instance with the given parameters.
        
        Args:
            name: Name of the team
            description: Description of the team's purpose
            color: Display color for the team
            agents: Optional dictionary of agents to add to the team
        
        Returns:
            A new Team instance
        """
        return cls(
            name=name,
            description=description,
            color=color,
            agents=agents or {},
            created_at=datetime.now(timezone.utc),
            last_modified=datetime.now(timezone.utc)
        )
    
