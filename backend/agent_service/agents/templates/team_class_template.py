from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict

from agent_class_template import Agent

class Team(BaseModel):
    name: str
    description: str
    agents: Dict[str, Agent]
    color: str
    created_at: datetime = Field(datetime.now(datetime.UTC))
    last_modified: datetime = Field(datetime.now(datetime.UTC))

    @model_validator(mode='before')
    def update_last_modified(cls, values):
        """Update last_modified timestamp whenever any field is changed"""
        values['last_modified'] = datetime.now(datetime.UTC)
        return values
