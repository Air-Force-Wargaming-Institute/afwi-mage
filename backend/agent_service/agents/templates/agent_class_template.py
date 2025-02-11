from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import List

class Agent(BaseModel):
    name: str
    description: str
    instructions: str
    llm_model: str
    color: str
    created_at: datetime = Field(datetime.now(datetime.UTC))
    vectorstores: List[str]
    last_modified: datetime = Field(datetime.now(datetime.UTC))

    @model_validator(mode='before')
    def update_last_modified(cls, values):
        """Update last_modified timestamp whenever any field is changed"""
        values['last_modified'] = datetime.now(datetime.UTC)
        return values
