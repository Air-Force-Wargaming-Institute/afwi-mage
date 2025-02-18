from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
import logging
from pathlib import Path
import os
from concurrent.futures import ThreadPoolExecutor
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
import asyncio
import shutil
from config_ import load_config
from multiagent.processQuestion import process_question
from typing import List, Optional
from multiagent.session_manager import SessionManager
from utils.llm_manager import LLMManager
from multiagent.support_models.team_class import Team
from multiagent.support_models.agent_class import Agent

config = load_config()

# Ensure log directory exists
log_dir = Path(config['LOG_PATH'])
log_dir.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    filename=log_dir / 'chat_service.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    message: str
    team_id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    plan: Optional[str] = None

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Increase the number of workers based on your server capacity
executor = ThreadPoolExecutor(max_workers=20)

# Create a semaphore to limit concurrent API calls if needed
MAX_CONCURRENT_REQUESTS = 10
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

@app.post("/chat/init")
async def init_chat(request_data: ChatMessage):
    try:
        logger.info(f"Received init chat request: {request_data}")
        llm = LLMManager().get_llm()
        
        class relevancy_check(BaseModel):
            """
            Structured output for the relevancy check of the user's message.
            relevant: Boolean value indicating if the message is relevant to the team's expertise
            reason: Explanation for why the message is relevant or not
            """
            relevant: bool  # Boolean true/false value indicating if the message is relevant to the team's expertise
            reason: str     # Explanation for why the message is relevant or not

        teams = Team.load_teams()
        team = teams.get(request_data.team_id)
        if not team:
            raise ValueError(f"Team {request_data.team_id} not found")
        
        agent_names = []
        agent_instructions = {}
    
        for agent_id, agent in team.agents.items():
            agent_names.append(agent.name)
            agent_instructions[agent.name] = agent.instructions
    
        agents_with_instructions = "\n".join(
            f"- {agent}: {agent_instructions[agent]}" 
            for agent in agent_names
        )

        relevance_template = config["HIGH_LEVEL_PROMPT"] + """Given this team of experts and their domain, determine if the message is relevant to the team. If it is, return a boolean value of true and an extremely brief explanation of why it is relevant. If it is not, return a boolean value of false and a more detailed explanation of why it is not relevant. Here are some examples of irrelevant messages: "Hello!", "What is the meaning of life?", "My name is John.", "What day is it?", "Test", "What is the weather in Tokyo?", "Guess my favorite color." Here is the team of experts and their domain: {agents_with_instructions} Here is the message: {message}"""

        prompt = PromptTemplate(
            input_variables=["current_datetime", "agents_with_instructions", "message"],
            template=relevance_template
        )
        prompt = prompt.format(
            current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            agents_with_instructions=agents_with_instructions,
            message=request_data.message
        )
        response = llm.with_structured_output(relevancy_check).invoke([HumanMessage(content=prompt)])

        if response.relevant:   
            return {"message": "Chat initialized successfully", "continue": True}
        else:
            return {"message": "Chat not initialized because the message is not relevant to the team's expertise" + response.reason, "continue": False}
    except Exception as e:
        logger.error(f"Error initializing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat/refine")
async def refine_chat(request_data: ChatMessage):
    try:
        logger.info(f"Received refine chat request: {request_data}")
        llm = LLMManager().get_llm()

        class UserPlan(BaseModel):
            """
            Structured output for the planning phase of multi-agent interactions.
            selected_agents: a list of agent names that will be tasked with answering the message
            plan: reasoning for selecting particular agents, and the approach they will take to answering the message
            modified_message: the new message that the user has approved
            """
            selected_agents: List[str]  # a list of agent names that will be tasked with answering the message
            plan: str                   # reasoning for selecting particular agents, and the approach they will take to answering the message
            modified_message: str      # the new message that the user has approved

        teams = Team.load_teams()
        team = teams.get(request_data.team_id)
        if not team:
            raise ValueError(f"Team {request_data.team_id} not found")
    
        # Get agent details directly from team.agents dictionary
        agent_names = []
        agent_instructions = {}
    
        logger.info(f"Before creating agent instructions: Team agents: {team.agents}")
        for agent_id, agent in team.agents.items():
            agent_names.append(agent.name)
            agent_instructions[agent.name] = agent.instructions
    
        agents_with_instructions = "\n".join(
            f"- {agent}: {agent_instructions[agent]}" 
            for agent in agent_names
        )

        # Grab conversation history from session
        session_manager = SessionManager()
        if request_data.session_id:
            session = session_manager.get_session(request_data.session_id)
            if not session:
                # Create new session with provided ID
                session_manager.create_session(request_data.team_id, session_id=request_data.session_id)
                conversation_history = []
                logger.info(f"Created new session with provided ID: {request_data.session_id}")
            else:
                # Verify session belongs to correct team
                if session['team_id'] != request_data.team_id:
                    raise ValueError(f"Session {request_data.session_id} belongs to different team")
                    
                # Load conversation history for this specific session only
                conversation_history = session_manager.get_session_history(request_data.session_id)
                logger.info(f"Loaded {len(conversation_history)} messages for session: {request_data.session_id}")
                logger.info(f"Conversation history: {conversation_history}")
        else:
            request_data.session_id = session_manager.create_session(request_data.team_id)
            conversation_history = []
            logger.info(f"Created new session with generated ID: {request_data.session_id}")

        formatted_history = []
        for chat in conversation_history:
            chat_entry = f"Message: {chat.get('question', '')}\nResponse: {chat.get('response', '')}\n{'-'*40}"
            formatted_history.append(chat_entry)
        conversation_history = "\n\n".join(formatted_history)

        if request_data.plan:
            # Subsequent refinement
            # Build template for llm and ask it create the plan
            plan_template = config["HIGH_LEVEL_PROMPT"] + """You are a planning coordinator for a multi-agent AI team. Given the following team of experts and their domain, the previous attempt at a plan, and the message the user has sent you explaining what they would like to change in the plan, you will do the following: 
            1. Use the previous plan as the foundation for your new plan
            2. Review the user's message to modify the plan in the ways they request. Be sure not to lose sight of the user's original intent, however. Do not use general language such as "the query topic", "the query", "the topic at hand", etc.
            3. Determine which agents are qualified and necessary to work in the new plan. Always include the subject of the plan in the details for each selected agent.
            4. Explain clearly and in detail what and how each agent will contribute to the response
            5. Format this plan in a way that is easy to understand for the user
        
            Message: {message}
            Previous Plan: {previous_plan}
            Team of Experts: {agents_with_instructions}

            While writing your plan, make sure you explain why you are choosing each agent and how they will contribute to the response, ensuring that facets of the plan are contained in each agent's details. Your response should be clear and user-friendly, avoiding technical jargon where possible.
            """
            prompt = PromptTemplate(
                input_variables=["current_datetime", "message", "previous_plan", "agents_with_instructions"],
                template=plan_template
            )
            prompt = prompt.format(
                current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                message=request_data.message,
                previous_plan=request_data.plan,
                agents_with_instructions=agents_with_instructions
            )
        else:
            # Initial refinement
            # Build template for llm and ask it create the plan
            plan_template = config["HIGH_LEVEL_PROMPT"] + """You are a planning coordinator for a multi-agent AI team. Given the following team of experts and their domain, the previous messages in the conversation (if any), and the message the user has sent you, you will do the following: 
            1. Review the previous conversation to incorporate any relevant information regarding the user's message
            2. If necessary, attempt to determine the user's intent and modify their message to better align with the team's expertise or to increase the specificity of the message topic. Be sure not to lose sight of the user's original intent, however. Do not use general language such as "the query topic", "the query", "the topic at hand", etc.
            3. Determine which agents are qualified and necessary to respond to the new message you created
            4. Create a clear and detailed plan for how each agent will contribute to the response. Always include the subject of the message in the details for each selected agent.
            5. Format this plan in a way that is easy to understand for the user
        
            Message: {message}
            Previous Conversation: {conversation_history}
            Team of Experts: {agents_with_instructions}

            While writing your plan, make sure you explain why you are choosing each agent and how they will contribute to the response, ensuring that facets of the user's message and/or your modified message are included in the details for each selected agent. If you chose to modify the user's message, make sure to explain why you made the changes you did and how they will help get a better response from the team. Your response should be clear and user-friendly, avoiding technical jargon where possible.
            """
            prompt = PromptTemplate(
                input_variables=["current_datetime", "message", "conversation_history", "agents_with_instructions"],
                template=plan_template
            )
            prompt = prompt.format(
                current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                message=request_data.message,
                conversation_history=conversation_history,
                agents_with_instructions=agents_with_instructions
            )

        response = llm.with_structured_output(UserPlan).invoke([HumanMessage(content=prompt)])
        
        # Send the plan to the user for approval
        return {
            "message": response.plan,
            "modified_message": response.modified_message,
            "selected_agents": response.selected_agents,
        }
        
    except Exception as e:
        logger.error(f"Error initializing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/process")
async def chat_endpoint(request_data: ChatMessage):
    try:
        # Use Pydantic model for request validation
        logger.info(f"Received chat message: {request_data.message}")
        
        logger.info(f"session_id: {request_data.session_id}")
        async with semaphore:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                executor,
                lambda: asyncio.run(process_question(
                    question=request_data.message,
                    user_id=request_data.user_id,
                    session_id=request_data.session_id,
                    team_id=request_data.team_id
                ))
            )
            logger.info(f"Response: {response}")
            return response
            
    except ValidationError as e:
        logger.error(f"Invalid request data: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete_team/{team_name}")
async def delete_team(team_name: str):
    try:
        # Get path to team directory in chat_teams
        chat_teams_dir = Path(__file__).parent / "chat_teams"
        team_dir = chat_teams_dir / team_name

        # Remove team directory if it exists
        if team_dir.exists():
            shutil.rmtree(team_dir)
            return {"message": f"Team {team_name} deleted successfully from chat service"}
        else:
            return {"message": f"Team {team_name} not found in chat service"}

    except Exception as e:
        print(f"Error deleting team: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    try:
        session_manager = SessionManager()
        session = session_manager.get_session(session_id)
        if session:
            return session
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error retrieving session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions():
    try:
        session_manager = SessionManager()
        return session_manager.list_sessions()
    except Exception as e:
        logger.error(f"Error listing sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        session_manager = SessionManager()
        if session_manager.delete_session(session_id):
            return {"message": f"Session {session_id} deleted successfully"}
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)