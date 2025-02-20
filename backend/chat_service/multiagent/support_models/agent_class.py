from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict
from uuid import UUID, uuid4
import json
from pathlib import Path
from config_ import load_config 
import logging

logger = logging.getLogger(__name__)

class Agent(BaseModel):
    name: str
    unique_id: UUID = Field(default_factory=uuid4)
    description: str
    instructions: str
    llm_model: str
    color: str
    created_at: datetime
    vectorstores: List[str]
    last_modified: datetime

    @classmethod
    def load_agents(cls) -> Dict[str, 'Agent']:
        """
        Load all agents from the configured JSON file.
        
        Returns:
            Dict[str, Agent]: Dictionary mapping agent UUIDs to Agent instances
        
        Raises:
            FileNotFoundError: If the agents file doesn't exist
            json.JSONDecodeError: If the file contains invalid JSON
        """
        """
        try:
            agents = Agent.load_agents()
            expert1 = agents.get("Expert1")
            if expert1:
                print(f"Loaded agent: {expert1.name}")
        except Exception as e:
            print(f"Error loading agents: {str(e)}")
        """
        config = load_config()
        agents_file = Path(config.get('AGENTS_FILE_PATH', 'data/agents.json'))
        
        try:
            if not agents_file.exists():
                logger.warning(f"Agents file not found at {agents_file}")
                return {}
                
            with open(agents_file, 'r') as f:
                agents_data = json.load(f)
            
            agents = {}
            for agent_data in agents_data:
                try:
                    # Convert string timestamps to datetime objects
                    for field in ['created_at', 'last_modified']:
                        if field in agent_data:
                            agent_data[field] = datetime.fromisoformat(agent_data[field].replace('Z', '+00:00'))
                    
                    # Convert string UUID to UUID object
                    if 'unique_id' in agent_data:
                        agent_data['unique_id'] = UUID(agent_data['unique_id'])
                    else:
                        agent_data['unique_id'] = uuid4()
                    
                    agent = cls(**agent_data)
                    agents[str(agent.unique_id)] = agent
                except Exception as e:
                    logger.error(f"Error loading agent {agent_data.get('name', 'unknown')}: {str(e)}")
                    continue
                    
            logger.info(f"Loaded {len(agents)} agents from {agents_file}")
            return agents
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in agents file {agents_file}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error loading agents from {agents_file}: {str(e)}")
            raise
