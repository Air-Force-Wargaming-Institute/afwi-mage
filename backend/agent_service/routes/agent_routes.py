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
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[^\w\s.,!?()\-\'"\\]', '', v)
        if len(v) < 3 or len(v) > 50:
            raise ValueError('Name must be between 3 and 50 characters')
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[^\w\s.,!?()\-\'"\\]', '', v)
        if len(v) < 10 or len(v) > 140:
            raise ValueError('Description must be between 10 and 140 characters')
        return v

    @field_validator('agent_instructions')
    @classmethod
    def validate_instructions(cls, v: str) -> str:
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[^\w\s.,!?()\-\'"\\]', '', v)
        if len(v) < 10:
            raise ValueError('Instructions must be at least 10 characters')
        return v

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
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[^\w\s.,!?()\-\'"\\]', '', v)
        if len(v) < 3 or len(v) > 50:
            raise ValueError('Name must be between 3 and 50 characters')
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[^\w\s.,!?()\-\'"\\]', '', v)
        if len(v) < 10 or len(v) > 140:
            raise ValueError('Description must be between 10 and 140 characters')
        return v

    @field_validator('team_instructions')
    @classmethod
    def validate_instructions(cls, v: str) -> str:
        v = re.sub(r'<[^>]*>', '', v)
        v = re.sub(r'[^\w\s.,!?()\-\'"\\]', '', v)
        if len(v) < 10:
            raise ValueError('Instructions must be at least 10 characters')
        return v

def format_agent_name(name):
    return re.sub(r'[\s\-]+', '_', name)

def format_team_name(name):
    return re.sub(r'[\s\-]+', '_', name)

# Update the error handling to use logging
logger = logging.getLogger(__name__)

@router.post("/create_agent/")
async def create_agent(agent_data: AgentCreate):
    try:

        # Format the agent name for file naming
        formatted_name = format_agent_name(agent_data.name)
        
        # Load the agent template
        with open(TEMPLATES_PATH / "agent_template.py", "r") as f:
            template = f.read()
        
        description = agent_data.description.replace('\r\n', '\n').replace('\r', '\n')
        instructions = agent_data.agent_instructions.replace('\r\n', '\n').replace('\r', '\n')
         # Create the escaped strings
        description = description.replace('\n', '\\n')
        instructions = instructions.replace('\n', '\\n')

        # Replace placeholders in the template
        agent_code = template.replace("{{AGENT_NAME}}", agent_data.name)
        agent_code = agent_code.replace("{{AGENT_FILE_NAME}}", formatted_name)
        agent_code = agent_code.replace("""{{AGENT_DESCRIPTION}}""", description)
        agent_code = agent_code.replace("""{{AGENT_INSTRUCTIONS}}""", instructions)
        agent_code = agent_code.replace("{{LLM_MODEL}}", agent_data.llm_model)
        agent_code = agent_code.replace("{{MEMORY_TYPE}}", agent_data.memory_type)
        agent_code = agent_code.replace("{{MEMORY_KWARGS}}", json.dumps(agent_data.memory_kwargs))
        agent_code = agent_code.replace("{{COLOR}}", agent_data.color)
        
        # Add creation and modification dates
        current_time = datetime.now().isoformat()
        agent_code = agent_code.replace("{{CREATED_AT}}", current_time)
        agent_code = agent_code.replace("{{MODIFIED_AT}}", current_time)
        
        # Save the new agent file using the formatted name
        with open(f"{INDIVIDUAL_AGENTS_PATH}/{formatted_name}_expert.py", "w") as f:
            f.write(agent_code)

        # After creating the agent file, copy it over to the shared directory
        local_agent_file_path = INDIVIDUAL_AGENTS_PATH / f"{formatted_name}_expert.py"
        shared_agent_file_path = SHARED_AGENTS_PATH / f"{formatted_name}_expert.py"
        os.makedirs(os.path.dirname(shared_agent_file_path), exist_ok=True)
        shutil.copyfile(local_agent_file_path, shared_agent_file_path)
        
        return {"message": f"Agent {agent_data.name} created successfully", "file_name": formatted_name}
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.post("/create_team/")
async def create_team(team_data: TeamCreate):
    try:
        # Format the team name for file naming
        formatted_name = format_team_name(team_data.name)

        # Create the shared team directory and copy over the necessary structure
        team_shared_path = SHARED_TEAMS_PATH / formatted_name # eg. app/shared/TEAMS/{team_file_name}
        team_shared_path.mkdir(parents=True, exist_ok=True)
        if SHARED_STRUCTURE_PATH.exists():
            shutil.copytree(SHARED_STRUCTURE_PATH, team_shared_path, dirs_exist_ok=True)
        
        # If users only submit one agent, use the direct-team_template.py template, otherwise we have a multi-agent team
        if len(team_data.agents) == 1:
            solo_agent = True
            with open(TEMPLATES_PATH / "direct-team_template.py", "r") as f:
                template = f.read()
        else:# Load the team template
            solo_agent = False
            with open(TEMPLATES_PATH / "team_template.py", "r") as f:
                template = f.read()

        # Create a list of 8 agents, filling empty slots with "null_X"
        agents = [agent.replace('_expert', '') for agent in team_data.agents[:8]]  # Take the first 8 agents and remove _expert suffix
        while len(agents) < 8:
            agents.append(f"null_{len(agents)}")

        # For each agent, get the instructions and append them to the agent_file_instructions list
        # while we are at it, for each agent file also copy it from AGENTS into TEAMS/{team_name}/multiagent/agent_experts
        agent_instructions_list = []
        for agent in team_data.agents:
            agent_name = agent.replace('_expert', '')
            agent_file_path = INDIVIDUAL_AGENTS_PATH / f"{agent_name}_expert.py"
            shutil.copyfile(agent_file_path, SHARED_TEAMS_PATH / formatted_name / "multiagent" / "agent_experts" / f"{agent_name}_expert.py")
            try:
                with open(agent_file_path, 'r') as f:
                    content = f.read()
                    # Use regex to extract AGENT_INSTRUCTIONS
                    instructions_pattern = r'AGENT_INSTRUCTIONS\s*=\s*"""((?:[^\\]|\\.)*?)"""'
                    if match := re.search(instructions_pattern, content, re.DOTALL):
                        # Properly escape for YAML
                        instructions = (match.group(1)
                            .replace('"', '\\"')     # Escape double quotes
                            .replace('\n', '\\n')    # Escape newlines
                            .replace("'", "\\'"))    # Escape single quotes
                        agent_instructions_list.append(f'"{instructions}"')
                    else:
                        logger.warning(f"Could not find AGENT_INSTRUCTIONS in {agent_file_path}")
                        agent_instructions_list.append('""')
            except Exception as e:
                logger.error(f"Error reading agent file {agent_file_path}: {str(e)}")
                agent_instructions_list.append('""')
        
        # Replace placeholders in the template
        team_code = template.replace("{{TEAM_NAME}}", team_data.name)
        team_code = team_code.replace("{{TEAM_FILE_NAME}}", formatted_name)
        team_code = team_code.replace("{{TEAM_DESCRIPTION}}", team_data.description)
        team_code = team_code.replace("{{TEAM_COLOR}}", team_data.color)
        team_code = team_code.replace("{{TEAM_INSTRUCTIONS}}", team_data.team_instructions)
        team_code = team_code.replace("{{MEMORY_TYPE}}", team_data.memory_type)
        team_code = team_code.replace("{{MEMORY_KWARGS}}", json.dumps(team_data.memory_kwargs))
        team_code = team_code.replace("{{AGENT_ZERO}}", agents[0])
        team_code = team_code.replace("{{AGENT_ONE}}", agents[1])
        team_code = team_code.replace("{{AGENT_TWO}}", agents[2])
        team_code = team_code.replace("{{AGENT_THREE}}", agents[3])
        team_code = team_code.replace("{{AGENT_FOUR}}", agents[4])
        team_code = team_code.replace("{{AGENT_FIVE}}", agents[5])
        team_code = team_code.replace("{{AGENT_SIX}}", agents[6])
        team_code = team_code.replace("{{AGENT_SEVEN}}", agents[7])
        agent_file_names = ", ".join([f"'{format_agent_name(agent.replace('_expert', ''))}'" for agent in team_data.agents])
        agent_file_instructions = ", ".join([instr for instr in agent_instructions_list])
        team_code = team_code.replace("{{AGENT_FILE_NAMES}}", agent_file_names)
        team_code = team_code.replace("{{AGENT_FILE_INSTRUCTIONS}}", agent_file_instructions)
        team_code = team_code.replace("{{SOLO_AGENT}}", str(solo_agent))
        #team_code = team_code.replace("{{AGENT_FILE_NAMES}}", ", ".join([f"'{format_agent_name(agent.replace('_expert', ''))}'" for agent in team_data.agents]))

        # Add creation and modification dates
        current_time = datetime.now().isoformat()
        team_code = team_code.replace("{{CREATED_AT}}", current_time)
        team_code = team_code.replace("{{MODIFIED_AT}}", current_time)
        
        # Save the new team file
        team_file_path = f"{TEAMS_PATH}/{formatted_name}.py"
        with open(team_file_path, "w") as f:
            f.write(team_code)

        # After creating the team file, copy it over to the shared directory
        local_team_file_path = TEAMS_PATH / f"{formatted_name}.py"
        shared_team_file_path = team_shared_path / "multiagent" / "team" / f"{formatted_name}.py"
        shutil.copyfile(local_team_file_path, shared_team_file_path)

        # Do a find-replace for the team_config.yaml file in the shared directory
        config_path = team_shared_path / "team_config.yaml"
        with open(config_path, "r") as f:
            config = f.read()
        replaced_config = config.replace("{{AGENT_FILE_NAMES}}", agent_file_names)
        replaced_config = replaced_config.replace("{{TEAM_NAME}}", team_data.name)
        replaced_config = replaced_config.replace("{{SOLO_AGENT}}", str(solo_agent))
        replaced_config = replaced_config.replace("{{AGENT_FILE_INSTRUCTIONS}}", agent_file_instructions)
        with open(config_path, "w") as f:
            f.write(replaced_config)

        # Update processQuestion.py
        process_question_path = team_shared_path / "multiagent" / "processQuestion.py"
        with open(process_question_path, "r") as f:
            process_question = f.read()
        replaced_process = process_question.replace("{{TEAM_FILE_NAME}}", formatted_name)
        with open(process_question_path, "w") as f:
            f.write(replaced_process)
        
        return {"message": f"Team {team_data.name} created successfully", "file_name": formatted_name}
    except Exception as e:
        logger.error(f"Error creating team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating team: {str(e)}")

@router.get("/list_agents/")
async def list_agents():
    agents = []
    logger = logging.getLogger(__name__)
    logger.info(f"Listing agents from directory: {INDIVIDUAL_AGENTS_PATH}")
    try:
        for filename in os.listdir(INDIVIDUAL_AGENTS_PATH):
            if filename.endswith('.py'):
                agent_file_name = filename[:-3]  # Remove .py extension
                agent_path = os.path.join(INDIVIDUAL_AGENTS_PATH, filename)
                logger.info(f"Processing agent file: {agent_path}")
                with open(agent_path, 'r') as f:
                    content = f.read()
                    try:
                        # Use regex patterns that handle multi-line strings and escaped characters
                        name_pattern = r'AGENT_NAME\s*=\s*"((?:[^"\\]|\\.)*)"'
                        desc_pattern = r'AGENT_DESCRIPTION\s*=\s*"""((?:[^\\]|\\.)*?)"""'
                        instr_pattern = r'AGENT_INSTRUCTIONS\s*=\s*"""((?:[^\\]|\\.)*?)"""'
                        model_pattern = r'LLM_MODEL\s*=\s*"([^"]*)"'
                        memory_pattern = r'MEMORY_TYPE\s*=\s*"([^"]*)"'
                        memory_kwargs_pattern = r'MEMORY_KWARGS\s*=\s*(\{[^}]*\})'
                        color_pattern = r'COLOR\s*=\s*"([^"]*)"'
                        created_pattern = r'CREATED_AT\s*=\s*"([^"]*)"'
                        modified_pattern = r'MODIFIED_AT\s*=\s*"([^"]*)"'

                        agent_details = {
                            "name": re.search(name_pattern, content, re.DOTALL).group(1),
                            "file_name": agent_file_name,
                            "description": re.search(desc_pattern, content, re.DOTALL).group(1),
                            "llm_model": re.search(model_pattern, content, re.DOTALL).group(1),
                            "agent_instructions": re.search(instr_pattern, content, re.DOTALL).group(1),
                            "memory_type": re.search(memory_pattern, content, re.DOTALL).group(1),
                            "memory_kwargs": json.loads(re.search(memory_kwargs_pattern, content, re.DOTALL).group(1)),
                            "color": re.search(color_pattern, content, re.DOTALL).group(1),
                            "createdAt": re.search(created_pattern, content, re.DOTALL).group(1),
                            "modifiedAt": re.search(modified_pattern, content, re.DOTALL).group(1)
                        }
                        agents.append(agent_details)
                        logger.info(f"Successfully processed agent: {agent_details['name']}")
                    except Exception as e:
                        logger.error(f"Error processing agent {agent_file_name}: {str(e)}")
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
        for filename in os.listdir(TEAMS_PATH):
            if filename.endswith('.py'):
                team_path = os.path.join(TEAMS_PATH, filename)
                logger.info(f"Processing team file: {team_path}")
                with open(team_path, 'r') as f:
                    content = f.read()
                    try:
                        team_details = {
                            "name": content.split('TEAM_NAME = "')[1].split('"')[0],
                            "file_name": filename[:-3],  # Remove .py extension
                            "description": content.split('TEAM_DESCRIPTION = """')[1].split('"""')[0],
                            "color": content.split('TEAM_COLOR = "')[1].split('"')[0],
                            "agents": eval(content.split('AGENT_FILE_NAMES = [')[1].split(']')[0]),
                            "createdAt": content.split('CREATED_AT = "')[1].split('"')[0],
                            "modifiedAt": content.split('MODIFIED_AT = "')[1].split('"')[0]
                        }
                        teams.append(team_details)
                        logger.info(f"Successfully processed team: {team_details['name']}")
                    except Exception as e:
                        logger.error(f"Error processing team {filename}: {str(e)}")
        logger.info(f"Total teams found: {len(teams)}")
        return {"teams": teams}
    except Exception as e:
        logger.error(f"Error listing teams: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing teams: {str(e)}")

@router.put("/update_agent/{agent_name}")
async def update_agent(agent_name: str, agent_data: AgentCreate):
    try:
        # Format the new agent name for file naming
        new_formatted_name = format_agent_name(agent_data.name)
        old_formatted_name = format_agent_name(agent_name)
        
        # Remove _expert suffix if it exists in the old name before adding it again
        old_formatted_name = old_formatted_name.replace('_expert', '')
        new_formatted_name = new_formatted_name.replace('_expert', '')
        
        old_agent_path = f"{INDIVIDUAL_AGENTS_PATH}/{old_formatted_name}_expert.py"
        print("OLD AGENT PATH: ", old_agent_path)
        new_agent_path = f"{INDIVIDUAL_AGENTS_PATH}/{new_formatted_name}_expert.py"
        print("NEW AGENT PATH: ", new_agent_path)

        # Add paths for shared directory
        old_shared_agent_path = SHARED_AGENTS_PATH / f"{old_formatted_name}_expert.py"
        new_shared_agent_path = SHARED_AGENTS_PATH / f"{new_formatted_name}_expert.py"

        if not os.path.exists(old_agent_path):
            raise HTTPException(status_code=404, detail=f"Agent {agent_name} not found")

        # Open the old agent file and grab the created date
        with open(old_agent_path, 'r') as f:
            content = f.read()
            created_pattern = r'CREATED_AT\s*=\s*"([^"]*)"'
            created_date = re.search(created_pattern, content, re.DOTALL).group(1)
    
        # Load the agent template
        with open(TEMPLATES_PATH / "agent_template.py", "r") as f:
            template = f.read()
        
        description = agent_data.description.replace('\r\n', '\n').replace('\r', '\n')
        instructions = agent_data.agent_instructions.replace('\r\n', '\n').replace('\r', '\n')
         # Create the escaped strings
        description = description.replace('\n', '\\n')
        instructions = instructions.replace('\n', '\\n')

        # Replace placeholders in the template
        agent_code = template.replace("{{AGENT_NAME}}", agent_data.name)
        agent_code = agent_code.replace("{{AGENT_FILE_NAME}}", new_formatted_name)
        agent_code = agent_code.replace("{{AGENT_DESCRIPTION}}", description)
        agent_code = agent_code.replace("{{AGENT_INSTRUCTIONS}}", instructions)
        agent_code = agent_code.replace("{{LLM_MODEL}}", agent_data.llm_model)
        agent_code = agent_code.replace("{{MEMORY_TYPE}}", agent_data.memory_type)
        agent_code = agent_code.replace("{{MEMORY_KWARGS}}", json.dumps(agent_data.memory_kwargs))
        agent_code = agent_code.replace("{{COLOR}}", agent_data.color)
        
        # Set the created date
        agent_code = agent_code.replace("{{CREATED_AT}}", created_date)

        # Update modification date
        current_time = datetime.now().isoformat()
        agent_code = agent_code.replace("{{MODIFIED_AT}}", current_time)
        
        # Save the updated agent file
        with open(new_agent_path, "w") as f:
            f.write(agent_code)

        # Copy the updated file to the shared directory
        os.makedirs(os.path.dirname(new_shared_agent_path), exist_ok=True)
        shutil.copyfile(new_agent_path, new_shared_agent_path)
        
        # If the name has changed, remove old files from both locations
        if old_formatted_name != new_formatted_name:
            os.remove(old_agent_path)
            if old_shared_agent_path.exists():
                old_shared_agent_path.unlink()
        
        return {"message": f"Agent {agent_data.name} updated successfully", "file_name": new_formatted_name}
    except Exception as e:
        logger.error(f"Error updating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")

@router.delete("/delete_agent/{agent_name}")
async def delete_agent(agent_name: str):
    try:
        # Format agent name and construct paths
        formatted_name = format_agent_name(agent_name)
        agent_path = f"{INDIVIDUAL_AGENTS_PATH}/{formatted_name}.py"
        shared_agent_path = SHARED_AGENTS_PATH / f"{formatted_name}.py"

        # Check if agent exists
        if not os.path.exists(agent_path):
            raise HTTPException(status_code=404, detail=f"Agent {agent_name} not found")
        
        # Remove from individual agents directory
        os.remove(agent_path)

        # Remove from shared directory if exists
        if shared_agent_path.exists():
            shared_agent_path.unlink()
        
        return {"message": f"Agent {agent_name} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

@router.put("/update_team/{team_name}")
async def update_team(team_name: str, team_data: TeamCreate):
    try:
        old_formatted_name = format_team_name(team_name)
        new_formatted_name = format_team_name(team_data.name)
        
        old_team_path = f"{TEAMS_PATH}/{old_formatted_name}.py"
        new_team_path = f"{TEAMS_PATH}/{new_formatted_name}.py"

        # Update shared directory if name changed
        old_shared_path = SHARED_TEAMS_PATH / old_formatted_name
        new_shared_path = SHARED_TEAMS_PATH / new_formatted_name
        if old_formatted_name != new_formatted_name and old_shared_path.exists():
            shutil.move(str(old_shared_path), str(new_shared_path))

        if not os.path.exists(old_team_path):
            raise HTTPException(status_code=404, detail=f"Team {team_name} not found")

        # Get the original created date
        with open(old_team_path, 'r') as f:
            content = f.read()
            created_pattern = r'CREATED_AT\s*=\s*"([^"]*)"'
            created_date = re.search(created_pattern, content, re.DOTALL).group(1)

        # Load the team template
        # If users only submit one agent, use the direct-team_template.py template, otherwise we have a multi-agent team
        if len(team_data.agents) == 1:
            solo_agent = True
            with open(TEMPLATES_PATH / "direct-team_template.py", "r") as f:
                template = f.read()
        else:# Load the team template
            solo_agent = False
            with open(TEMPLATES_PATH / "team_template.py", "r") as f:
                template = f.read()
        
        # Create a list of 8 agents, filling empty slots with "null_X"
        agents = [agent.replace('_expert', '') for agent in team_data.agents[:8]]  # Remove _expert suffix
        while len(agents) < 8:
            agents.append(f"null_{len(agents)}")

        agent_instructions_list = []
        for agent in team_data.agents:
            agent_name = agent.replace('_expert', '')
            agent_file_path = INDIVIDUAL_AGENTS_PATH / f"{agent_name}_expert.py"
            #shared_agent_file_path = SHARED_TEAMS_PATH / "multiagent" / "agent_experts" / f"{new_formatted_name}_expert.py"
            shutil.copyfile(agent_file_path, SHARED_TEAMS_PATH / new_formatted_name / "multiagent" / "agent_experts" / f"{agent_name}_expert.py")
            try:
                with open(agent_file_path, 'r') as f:
                    content = f.read()
                    # Use regex to extract AGENT_INSTRUCTIONS
                    instructions_pattern = r'AGENT_INSTRUCTIONS\s*=\s*"""((?:[^\\]|\\.)*?)"""'
                    if match := re.search(instructions_pattern, content, re.DOTALL):
                        instructions = (match.group(1)
                            .replace('"', '\\"')     # Escape double quotes
                            .replace('\n', '\\n')    # Escape newlines
                            .replace("'", "\\'"))    # Escape single quotes
                        agent_instructions_list.append(f'"{instructions}"')
                    else:
                        logger.warning(f"Could not find AGENT_INSTRUCTIONS in {agent_file_path}")
                        agent_instructions_list.append('""')
            except Exception as e:
                logger.error(f"Error reading agent file {agent_file_path}: {str(e)}")
                agent_instructions_list.append('""')
        
        # Replace placeholders in the template
        team_code = template.replace("{{TEAM_NAME}}", team_data.name)
        team_code = team_code.replace("{{TEAM_FILE_NAME}}", new_formatted_name)
        team_code = team_code.replace("{{TEAM_DESCRIPTION}}", team_data.description)
        team_code = team_code.replace("{{TEAM_COLOR}}", team_data.color)
        team_code = team_code.replace("{{TEAM_INSTRUCTIONS}}", team_data.team_instructions)
        team_code = team_code.replace("{{MEMORY_TYPE}}", team_data.memory_type)
        team_code = team_code.replace("{{MEMORY_KWARGS}}", json.dumps(team_data.memory_kwargs))
        team_code = team_code.replace("{{AGENT_ZERO}}", agents[0])
        team_code = team_code.replace("{{AGENT_ONE}}", agents[1])
        team_code = team_code.replace("{{AGENT_TWO}}", agents[2])
        team_code = team_code.replace("{{AGENT_THREE}}", agents[3])
        team_code = team_code.replace("{{AGENT_FOUR}}", agents[4])
        team_code = team_code.replace("{{AGENT_FIVE}}", agents[5])
        team_code = team_code.replace("{{AGENT_SIX}}", agents[6])
        team_code = team_code.replace("{{AGENT_SEVEN}}", agents[7])
        agent_file_names = ", ".join([f"'{format_agent_name(agent.replace('_expert', ''))}'" for agent in team_data.agents])
        agent_file_instructions = ", ".join([instr for instr in agent_instructions_list])
        team_code = team_code.replace("{{AGENT_FILE_NAMES}}", agent_file_names)
        team_code = team_code.replace("{{AGENT_FILE_INSTRUCTIONS}}", agent_file_instructions)
        team_code = team_code.replace("{{SOLO_AGENT}}", str(solo_agent))

        # Set the created date and update modification date
        team_code = team_code.replace("{{CREATED_AT}}", created_date)
        current_time = datetime.now().isoformat()
        team_code = team_code.replace("{{MODIFIED_AT}}", current_time)
        
        # Save the updated team file
        with open(new_team_path, "w") as f:
            f.write(team_code)
        
        # If the name has changed, remove the old file
        if old_formatted_name != new_formatted_name:
            os.remove(old_team_path)

        # Update shared directory if name changed
        old_shared_path = SHARED_TEAMS_PATH / old_formatted_name
        new_shared_path = SHARED_TEAMS_PATH / new_formatted_name
        if old_formatted_name != new_formatted_name and old_shared_path.exists():
            shutil.move(str(old_shared_path), str(new_shared_path))

        # Update the team file in shared directory
        shared_team_file_path = new_shared_path / "multiagent" / "team" / f"{new_formatted_name}.py"
        shutil.copyfile(new_team_path, shared_team_file_path)

        # Replace the team_config.py with the template copy
        team_shared_path = SHARED_TEAMS_PATH / new_formatted_name
        team_config_path = team_shared_path / "team_config.yaml"
        config_template_path = SHARED_STRUCTURE_PATH / "team_config.yaml"
        with open(config_template_path, "r") as f:
            config = f.read()
        replaced_config = config.replace("{{AGENT_FILE_NAMES}}", agent_file_names)
        replaced_config = replaced_config.replace("{{TEAM_NAME}}", team_data.name)
        replaced_config = replaced_config.replace("{{SOLO_AGENT}}", str(solo_agent))
        replaced_config = replaced_config.replace("{{AGENT_FILE_INSTRUCTIONS}}", agent_file_instructions)
        with open(team_config_path, "w") as f:
            f.write(replaced_config)

        # Update processQuestion.py
        process_question_path = new_shared_path / "multiagent" / "processQuestion.py"
        with open(process_question_path, "r") as f:
            process_question = f.read()
        replaced_process = process_question.replace("{{TEAM_FILE_NAME}}", new_formatted_name)
        with open(process_question_path, "w") as f:
            f.write(replaced_process)
        
        # If name changed, remove old team file from shared directory
        if old_formatted_name != new_formatted_name:
            old_shared_team_file = old_shared_path / "teams" / f"{old_formatted_name}.py"
            if old_shared_team_file.exists():
                old_shared_team_file.unlink()
        
        return {"message": f"Team {team_data.name} updated successfully", "file_name": new_formatted_name}
    except Exception as e:
        logger.error(f"Error updating team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating team: {str(e)}")

@router.delete("/delete_team/{team_name}")
async def delete_team(team_name: str):
    try:
        # Format team name and construct paths
        formatted_name = format_team_name(team_name)
        team_path = f"{TEAMS_PATH}/{formatted_name}.py"
        shared_team_path = SHARED_TEAMS_PATH / formatted_name

        # Check if team exists
        if not os.path.exists(team_path):
            raise HTTPException(status_code=404, detail=f"Team {team_name} not found")
        
        # Remove team file from teams directory
        os.remove(team_path)

        # Remove entire team directory from shared directory if exists
        if shared_team_path.exists():
            shutil.rmtree(shared_team_path)
        
        return {"message": f"Team {team_name} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting team: {str(e)}")

@router.post("/duplicate_team/{team_name}")
async def duplicate_team(team_name: str):
    try:
        original_team_path = f"{TEAMS_PATH}/{team_name}.py"
        if not os.path.exists(original_team_path):
            raise HTTPException(status_code=404, detail=f"Team {team_name} not found")
        
        with open(original_team_path, 'r') as f:
            content = f.read()
        
        # Update team name
        original_team_name = content.split('TEAM_NAME = "')[1].split('"')[0]
        new_team_name = f"Copy of {original_team_name}"
        content = content.replace(f'TEAM_NAME = "{original_team_name}"', f'TEAM_NAME = "{new_team_name}"')
        
        # Update file name
        new_file_name = format_team_name(new_team_name)
        content = content.replace(f'TEAM_FILE_NAME = "{team_name}"', f'TEAM_FILE_NAME = "{new_file_name}"')
        
        # Update creation and modification dates
        current_time = datetime.now().isoformat()
        content = content.replace('CREATED_AT = "', f'CREATED_AT = "{current_time}')
        content = content.replace('MODIFIED_AT = "', f'MODIFIED_AT = "{current_time}')
        
        # Save the new team file
        new_team_path = f"{TEAMS_PATH}/{new_file_name}.py"
        with open(new_team_path, "w") as f:
            f.write(content)
        
        return {"message": f"Team {new_team_name} created successfully", "file_name": new_file_name}
    except Exception as e:
        logger.error(f"Error duplicating team: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error duplicating team: {str(e)}")

@router.get("/available_teams/")
async def get_available_teams():
    teams = []
    logger = logging.getLogger(__name__)
    # Fix the path to point directly to the teams directory
    teams_dir = Path(__file__).parent.parent / "agents" / "teams"
    logger.info(f"Listing teams from directory: {teams_dir}")
    
    try:
        if not os.path.exists(teams_dir):
            logger.error(f"Teams directory not found: {teams_dir}")
            return {"teams": []}
            
        for filename in os.listdir(teams_dir):
            if filename.endswith('.py'):
                team_name = filename[:-3]  # Remove .py extension
                # Skip if it starts with _ or .
                if team_name.startswith('_') or team_name.startswith('.'):
                    continue
                    
                teams.append({
                    "id": team_name,
                    "name": team_name.replace('_', ' '),
                    "file_name": team_name
                })
                
        logger.info(f"Total teams found: {len(teams)}")
        return {"teams": teams}
    except Exception as e:
        logger.error(f"Error listing teams: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing teams: {str(e)}")