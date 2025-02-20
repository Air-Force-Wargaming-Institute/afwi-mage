from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Optional
from uuid import UUID, uuid4
import json
from pathlib import Path
from config_ import load_config
import logging

from .agent_class import Agent

logger = logging.getLogger(__name__)

class Team(BaseModel):
    name: str
    unique_id: UUID = Field(default_factory=uuid4)
    description: str
    agents: Dict[str, Agent]
    color: str
    created_at: datetime
    last_modified: datetime

    class Config:
        underscore_attrs_are_private = False

    @classmethod
    def load_teams(cls) -> Dict[str, 'Team']:
        """
        Load all teams from the configured JSON file.
        
        Returns:
            Dict[str, Team]: Dictionary mapping team UUIDs to Team instances
        
        Raises:
            FileNotFoundError: If the teams file doesn't exist
            json.JSONDecodeError: If the file contains invalid JSON
        """
        config = load_config()
        teams_file = Path(config.get('TEAMS_FILE_PATH', 'data/teams.json'))
        
        try:
            if not teams_file.exists():
                logger.warning(f"Teams file not found at {teams_file}")
                return {}
                
            with open(teams_file, 'r') as f:
                teams_data = json.load(f)
            
            # Load all available agents
            available_agents = Agent.load_agents()
            
            teams = {}
            for team_data in teams_data:
                try:
                    # Convert string timestamps to datetime objects
                    for field in ['created_at', 'last_modified']:
                        if field in team_data:
                            team_data[field] = datetime.fromisoformat(team_data[field].replace('Z', '+00:00'))
                    
                    # Convert string UUID to UUID object
                    if 'unique_id' in team_data:
                        team_data['unique_id'] = UUID(team_data['unique_id'])
                    else:
                        team_data['unique_id'] = uuid4()
                    
                    # Convert agent UUIDs to actual Agent instances
                    if 'agents' in team_data:
                        agent_dict = {}
                        for agent_uuid in team_data['agents']:
                            if agent_uuid in available_agents:
                                agent_dict[agent_uuid] = available_agents[agent_uuid]
                            else:
                                logger.warning(f"Agent with UUID {agent_uuid} not found for team {team_data.get('name', 'unknown')}")
                        team_data['agents'] = agent_dict
                    
                    team = cls(**team_data)
                    teams[str(team.unique_id)] = team
                except Exception as e:
                    logger.error(f"Error loading team {team_data.get('name', 'unknown')}: {str(e)}")
                    continue
                    
            logger.info(f"Loaded {len(teams)} teams from {teams_file}")
            return teams
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in teams file {teams_file}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error loading teams from {teams_file}: {str(e)}")
            raise
    
