from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
import os
import json
from datetime import datetime
import logging
import re
import shutil
from pathlib import Path
from typing import List, Dict, Optional
from agents.templates.agent_class_template import Agent
from agents.templates.team_class_template import Team
from config import INDIVIDUAL_AGENTS_PATH, TEAMS_PATH, TEMPLATES_PATH, BUILDER_DIR

SHARED_TEAMS_PATH = BUILDER_DIR / "TEAMS"
SHARED_STRUCTURE_PATH = SHARED_TEAMS_PATH / "TEAM-TEMPLATE"
SHARED_AGENTS_PATH = BUILDER_DIR / "AGENTS"

router = APIRouter()

class AgentCreate(BaseModel):
    name: str
    description: str
    llm_model: str
    agent_instructions: str
    memory_type: str = "ConversationBufferMemory"
    memory_kwargs: Dict[str, int] = Field(default_factory=lambda: {"max_token_limit": 2000})
    color: str = "#4fc3f7"

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v:
            raise ValueError('Name cannot be empty')
        # Remove HTML tags and control characters
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', v)
        if len(v) < 3 or len(v) > 50:
            raise ValueError('Name must be between 3 and 50 characters')
        return v.strip()

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        if not v:
            raise ValueError('Description cannot be empty')
        # Remove HTML tags and control characters
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', v)
        if len(v) < 10 or len(v) > 140:
            raise ValueError('Description must be between 10 and 140 characters')
        return v.strip()

    @field_validator('agent_instructions')
    @classmethod
    def validate_instructions(cls, v: str) -> str:
        if not v:
            raise ValueError('Instructions cannot be empty')
        # Remove HTML tags and control characters
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', v)
        if len(v) < 10:
            raise ValueError('Instructions must be at least 10 characters')
        return v.strip()

class TeamCreate(BaseModel):
    name: str
    description: str
    color: str
    agents: List[str]
    team_instructions: str = ""
    memory_type: str = "ConversationBufferMemory"
    memory_kwargs: Dict[str, int] = Field(default_factory=lambda: {"max_token_limit": 2000})

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v:
            raise ValueError('Name cannot be empty')
        # Remove HTML tags and control characters
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', v)
        if len(v) < 3 or len(v) > 50:
            raise ValueError('Name must be between 3 and 50 characters')
        return v.strip()

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        if not v:
            raise ValueError('Description cannot be empty')
        # Remove HTML tags and control characters
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', v)
        if len(v) < 10 or len(v) > 140:
            raise ValueError('Description must be between 10 and 140 characters')
        return v.strip()

def format_agent_name(name):
    return re.sub(r'[\s\-]+', '_', name)

def format_team_name(name):
    return re.sub(r'[\s\-]+', '_', name)

# Update the error handling to use logging
logger = logging.getLogger(__name__)

def sync_json_file(source_path: Path, dest_path: Path):
    """Helper function to sync JSON files between directories"""
    try:
        # Create destination directory if it doesn't exist
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy the file
        shutil.copy2(source_path, dest_path)
        logger.info(f"Successfully synced {source_path} to {dest_path}")
    except Exception as e:
        logger.error(f"Error syncing file {source_path} to {dest_path}: {str(e)}")
        raise

@router.post("/create_agent/")
async def create_agent(agent_data: AgentCreate):
    try:
        agents_file = INDIVIDUAL_AGENTS_PATH / "agents.json"
        shared_agents_file = SHARED_AGENTS_PATH / "agents.json"
        
        try:
            with open(agents_file, "r") as f:
                agents = json.load(f)
        except FileNotFoundError:
            agents = []

        # Create agent and save to primary location
        agent = Agent.create(
            name=agent_data.name,
            description=agent_data.description,
            instructions=agent_data.agent_instructions,
            llm_model=agent_data.llm_model,
            color=agent_data.color,
            vectorstores=[] # TODO: Add vectorstore selection in frontend and pass it to the backend
        )
        agent_json = agent.model_dump_json()
        agents.append(json.loads(agent_json))

        # Save to primary location
        with open(agents_file, "w") as f:
            json.dump(agents, f, indent=4)
            
        # Sync to shared location
        sync_json_file(agents_file, shared_agents_file)
        
        return {"message": f"Agent {agent_data.name} created successfully", "file_name": str(agent.unique_id)}
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.post("/create_team/")
async def create_team(team_data: TeamCreate):
    try:
        teams_file = TEAMS_PATH / "teams.json"
        shared_teams_file = SHARED_TEAMS_PATH / "teams.json"
        
        try:
            with open(teams_file, "r") as f:
                teams = json.load(f)
        except FileNotFoundError:
            teams = []

        team = Team.create(
            name=team_data.name,
            description=team_data.description,
            color=team_data.color,
            agents=team_data.agents
        )
        teams.append(json.loads(team.model_dump_json()))
        
        # Save to primary location
        with open(teams_file, "w") as f:
            json.dump(teams, f, indent=4)
            
        # Sync to shared location
        sync_json_file(teams_file, shared_teams_file)
        
        return {"message": f"Team {team_data.name} created successfully", "file_name": str(team.unique_id)}
    except Exception as e:
        logger.error(f"Error creating team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating team: {str(e)}")

@router.get("/list_agents/")
async def list_agents():
    agents = []
    logger = logging.getLogger(__name__)
    logger.info(f"Listing agents from directory: {INDIVIDUAL_AGENTS_PATH}")
    try:
        agents_file = INDIVIDUAL_AGENTS_PATH / "agents.json"
        if not agents_file.exists():
            logger.info("No agents.json file found; no agents exist")
            return {"agents": []}
        try:
            with open(agents_file, "r") as f:
                agents_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding agents.json: {str(e)}")
            return {"agents": []}

        for agent in agents_data:
            agent_details = {
                "name": agent["name"],
                "unique_id": agent["unique_id"],
                "description": agent["description"],
                "llm_model": agent["llm_model"],
                "agent_instructions": agent["instructions"],
                "color": agent["color"],
                "createdAt": agent["created_at"],
                "modifiedAt": agent["last_modified"]
            }
            agents.append(agent_details)
        logger.info(f"Total agents found: {len(agents)}")
        return {"agents": agents}
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing agents: {str(e)}")

@router.get("/list_teams/")
async def list_teams():
    teams = []
    logger = logging.getLogger(__name__)
    logger.info(f"Listing teams from directory: {TEAMS_PATH}")
    try:
        # Load agents into a dictionary with unique_id as key
        agents_file = INDIVIDUAL_AGENTS_PATH / "agents.json"
        agents_dict = {}
        if agents_file.exists():
            try:
                with open(agents_file, "r") as f:
                    agents_data = json.load(f)
                    agents_dict = {
                        agent["unique_id"]: {
                            k: v for k, v in agent.items() 
                            if k != "unique_id"
                        }
                        for agent in agents_data
                    }
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding agents.json: {str(e)}")

        teams_file = TEAMS_PATH / "teams.json"
        if not teams_file.exists():
            logger.info("No teams.json file found; no teams exist")
            return {"teams": []}
        try:
            with open(teams_file, "r") as f:
                teams_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding teams.json: {str(e)}")
            return {"teams": []}
        
        for team in teams_data:
            # Get full agent details using the dictionary
            agent_details = [
                agents_dict.get(agent_id, {"name": agent_id})
                for agent_id in team["agents"]
            ]
            # Extract just the names for the response
            agent_names = [agent["name"] for agent in agent_details]
            
            team_details = {
                "name": team["name"],
                "unique_id": team["unique_id"],
                "description": team["description"],
                "color": team["color"],
                "agents": agent_names,
                "createdAt": team["created_at"],
                "modifiedAt": team["last_modified"]
            }
            teams.append(team_details)
        logger.info(f"Total teams found: {len(teams)}")
        return {"teams": teams}
    except Exception as e:
        logger.error(f"Error listing teams: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing teams: {str(e)}")

@router.put("/update_agent/{unique_id}")
async def update_agent(unique_id: str, agent_data: AgentCreate):
    try:
        agents_file = INDIVIDUAL_AGENTS_PATH / "agents.json"
        shared_agents_file = SHARED_AGENTS_PATH / "agents.json"
        
        if not agents_file.exists():
            raise HTTPException(status_code=404, detail=f"Agents file not found")

        # Load existing agents
        with open(agents_file, "r") as f:
            agents = json.load(f)

        # Find the agent to update; 
        agent_index = None
        for i, agent in enumerate(agents):
            if str(agent["unique_id"]) == unique_id:
                agent_index = i
                break
        if agent_index is None:
            raise HTTPException(status_code=404, detail=f"Agent with ID {unique_id} not found")
    
        # Find the agent being modified and fit it back into an agent class
        selected_agent = Agent(**agents[agent_index])
        selected_agent.name = agent_data.name
        selected_agent.description = agent_data.description
        selected_agent.instructions = agent_data.agent_instructions
        selected_agent.llm_model = agent_data.llm_model
        selected_agent.color = agent_data.color
        selected_agent.vectorstores = [] # TODO: Add vectorstore selection in frontend and pass it to the backend

        agents[agent_index] = json.loads(selected_agent.model_dump_json())
        
        # Save to primary location
        with open(agents_file, "w") as f:
            json.dump(agents, f, indent=4)
            
        # Sync to shared location
        sync_json_file(agents_file, shared_agents_file)

        return {"message": f"Agent {unique_id} updated successfully", "file_name": agent_data.name}
    except Exception as e:
        logger.error(f"Error updating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")

@router.delete("/delete_agent/{unique_id}")
async def delete_agent(unique_id: str):
    try:
        agents_file = INDIVIDUAL_AGENTS_PATH / "agents.json"
        shared_agents_file = SHARED_AGENTS_PATH / "agents.json"
        
        if not agents_file.exists():
            raise HTTPException(status_code=404, detail=f"Agents file not found")

        # Load existing agents
        with open(agents_file, "r") as f:
            agents = json.load(f)

        # Find the agent to delete
        agent_index = None
        for i, agent in enumerate(agents):
            if str(agent["unique_id"]) == unique_id:
                agent_index = i
                break
        if agent_index is None:
            raise HTTPException(status_code=404, detail=f"Agent with ID {unique_id} not found")

        # Remove the agent from the list
        agents.pop(agent_index)

        # After identifying which agent we are about to delete, remove that agent from all teams before writing the changes
        teams_file = TEAMS_PATH / "teams.json"
        if not teams_file.exists():
            logger.info("No teams.json file found; no teams exist")
            with open(agents_file, "w") as f:
                json.dump(agents, f, indent=4)
            return {"message": f"Agent {unique_id} deleted successfully;\n error modifying teams - manually verify teams"}
        try:
            with open(teams_file, "r") as f:
                teams = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding teams.json: {str(e)}")
            with open(agents_file, "w") as f:
                json.dump(agents, f, indent=4)
            return {"message": f"Agent {unique_id} deleted successfully;\n error modifying teams - manually verify teams"}

        teams_to_modify = []
        for i, team in enumerate(teams):
            if unique_id in team["agents"]:
                teams[i]["agents"].remove(unique_id)
                teams_to_modify.append(team["name"])

        # Save to primary location
        with open(agents_file, "w") as f:
            json.dump(agents, f, indent=4)
            
        # Sync to shared location
        sync_json_file(agents_file, shared_agents_file)

        message = ", ".join(teams_to_modify)
        try:
            with open(teams_file, "w") as f:
                json.dump(teams, f, indent=4)
            logger.info(f"Teams modified: {message}")
            print(f"Teams modified: {message}")
        except Exception as e:
            logger.error(f"Error updating teams: {str(e)}")
            return {"message": f"Agent {unique_id} deleted successfully;\n error modifying teams - manually verify teams"}

        return {"message": f"Agent {unique_id} deleted successfully; teams modified: {message}"}
    except Exception as e:
        logger.error(f"Error deleting agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

@router.put("/update_team/{unique_id}")
async def update_team(unique_id: str, team_data: TeamCreate):
    try:
        teams_file = TEAMS_PATH / "teams.json"
        shared_teams_file = SHARED_TEAMS_PATH / "teams.json"
        
        # Load agents into a dictionary with unique_id as key
        agents_file = INDIVIDUAL_AGENTS_PATH / "agents.json"
        agents_dict = {}
        if agents_file.exists():
            try:
                with open(agents_file, "r") as f:
                    agents_data = json.load(f)
                    agents_dict = {
                        agent["unique_id"]: {
                            k: v for k, v in agent.items() 
                            if k != "unique_id"
                        }
                        for agent in agents_data
                    }
            except json.JSONDecodeError as e:
                logger.error(f"Error decoding agents.json: {str(e)}")

        teams_file = TEAMS_PATH / "teams.json"
        if not teams_file.exists():
            logger.info("No teams.json file found; no teams exist")
            return {"message": f"Team {team_data.name} failed to update", "file_name": unique_id}
        try:
            with open(teams_file, "r") as f:
                teams = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding teams.json: {str(e)}")
            return {"message": f"Team {team_data.name} failed to update", "file_name": unique_id}
        
        # Find the team to update
        team_index = None
        for i, team in enumerate(teams):
            if str(team["unique_id"]) == unique_id:
                team_index = i
                break
        if team_index is None:
            raise HTTPException(status_code=404, detail=f"Team with ID {unique_id} not found")
        selected_team = Team(**teams[team_index])
        selected_team.name = team_data.name
        selected_team.description = team_data.description
        selected_team.color = team_data.color
        selected_team.agents = team_data.agents

        teams[team_index] = json.loads(selected_team.model_dump_json())

        # Save to primary location
        with open(teams_file, "w") as f:
            json.dump(teams, f, indent=4)
            
        # Sync to shared location
        sync_json_file(teams_file, shared_teams_file)
        
        return {"message": f"Team {team_data.name} updated successfully", "file_name": unique_id}
    except Exception as e:
        logger.error(f"Error updating team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating team: {str(e)}")

@router.delete("/delete_team/{unique_id}")
async def delete_team(unique_id: str):
    try:
        teams_file = TEAMS_PATH / "teams.json"
        shared_teams_file = SHARED_TEAMS_PATH / "teams.json"
        
        if not teams_file.exists():
            logger.info("No teams.json file found; no teams exist")
            return {"message": f"Team {unique_id} not found"}
        
        try:
            with open(teams_file, "r") as f:
                teams = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding teams.json: {str(e)}")
            return {"message": f"Error decoding teams.json; Team {unique_id} not deleted"}
        
        team_index = None
        for i, team in enumerate(teams):
            if str(team["unique_id"]) == unique_id:
                team_index = i
                break
        if team_index is None:
            return {"message": f"Team {unique_id} not found"}
        
        teams.pop(team_index)
        try:
            with open(teams_file, "w") as f:
                json.dump(teams, f, indent=4)
        except Exception as e:
            logger.error(f"Error updating teams.json: {str(e)}")
            return {"message": f"Error updating teams.json; Team {unique_id} not deleted"}
            
        # Sync to shared location
        sync_json_file(teams_file, shared_teams_file)
        
        return {"message": f"Team {unique_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting team: {str(e)}")

# @router.post("/duplicate_team/{team_name}")
# async def duplicate_team(team_name: str):
#     try:
#         original_team_path = f"{TEAMS_PATH}/{team_name}.py"
#         if not os.path.exists(original_team_path):
#             raise HTTPException(status_code=404, detail=f"Team {team_name} not found")
        
#         with open(original_team_path, 'r') as f:
#             content = f.read()
        
#         # Update team name
#         original_team_name = content.split('TEAM_NAME = "')[1].split('"')[0]
#         new_team_name = f"Copy of {original_team_name}"
#         content = content.replace(f'TEAM_NAME = "{original_team_name}"', f'TEAM_NAME = "{new_team_name}"')
        
#         # Update file name
#         new_file_name = format_team_name(new_team_name)
#         content = content.replace(f'TEAM_FILE_NAME = "{team_name}"', f'TEAM_FILE_NAME = "{new_file_name}"')
        
#         # Update creation and modification dates
#         current_time = datetime.now().isoformat()
#         content = content.replace('CREATED_AT = "', f'CREATED_AT = "{current_time}')
#         content = content.replace('MODIFIED_AT = "', f'MODIFIED_AT = "{current_time}')
        
#         # Save the new team file
#         new_team_path = f"{TEAMS_PATH}/{new_file_name}.py"
#         with open(new_team_path, "w") as f:
#             f.write(content)
        
#         return {"message": f"Team {new_team_name} created successfully", "file_name": new_file_name}
#     except Exception as e:
#         logger.error(f"Error duplicating team: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Error duplicating team: {str(e)}")

@router.get("/available_teams/")
async def get_available_teams():
    teams = []
    logger = logging.getLogger(__name__)
    # Fix the path to point directly to the teams directory
    teams_dir = Path(__file__).parent.parent / "agents" / "teams"
    logger.info(f"Listing teams from directory: {teams_dir}")
    
    try:
        teams_file = TEAMS_PATH / "teams.json"
        if not teams_file.exists():
            logger.info("No teams.json file found; no teams exist")
            return {"teams": []}
            
        try:
            with open(teams_file, "r") as f:
                teams_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding teams.json: {str(e)}")
            return {"teams": []}
                
        for team in teams_data:
            teams.append({
                "id": team["unique_id"],
                "name": team["name"]
            })
                
        logger.info(f"Total teams found: {len(teams)}")
        return {"teams": teams}
    except Exception as e:
        logger.error(f"Error listing teams: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing teams: {str(e)}")