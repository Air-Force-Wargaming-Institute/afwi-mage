from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError, Field
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
import asyncio
from config_ import load_config
from multiagent.processQuestion import process_question
from typing import List, Optional
from multiagent.session_manager import SessionManager
from utils.llm_manager import LLMManager
from multiagent.support_models.team_class import Team
from utils.model_list import OllamaModelManager
from utils.prompt_manager import SystemPromptManager
import os
from utils.conversation_manager import ConversationManager

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
    team_name: Optional[str] = None
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    plan: Optional[str] = None
    comments: Optional[str] = None
    selected_agents: Optional[List[str]] = None
    original_message: Optional[str] = None

class SessionCreate(BaseModel):
    """
    Model for session creation requests
    """
    team_id: str
    session_name: str

class SessionUpdate(BaseModel):
    """
    Model for session update requests
    """
    team_id: str
    team_name: Optional[str] = None
    session_name: Optional[str] = None

class PromptData(BaseModel):
    """Model for prompt data"""
    name: str = Field(..., description="Name of the prompt")
    description: str = Field(..., description="Description of the prompt")
    content: str = Field(..., description="Content of the prompt")
    template_type: str = Field(..., description="Type of the template")
    variables: List[str] = Field(default_factory=list, description="List of variables")
    llm: Optional[str] = Field(default="", description="Selected LLM for this prompt")

class PromptUpdate(PromptData):
    """Model for prompt updates"""
    pass


def init_directories():
    """Initialize required directories for the application"""
    try:
        os.makedirs(config['CONVERSATION_PATH'], exist_ok=True)
        logger.info(f"Ensured conversation logs directory exists at: {config['CONVERSATION_PATH']}")
        
        # Ensure vectorstore directory exists
        vectorstore_dir = Path('/app/data/vectorstores')
        vectorstore_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Ensured vectorstore directory exists at: {vectorstore_dir}")
        
        logger.info(f"Directory exists: {config['CONVERSATION_PATH']} - {Path(config['CONVERSATION_PATH']).exists()}")
        logger.info(f"Directory is writable: {os.access(str(config['CONVERSATION_PATH']), os.W_OK)}")
    except Exception as e:
        logger.error(f"Failed to create required directories: {e}")
        raise

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize required directories
init_directories()

# Increase the number of workers based on your server capacity
executor = ThreadPoolExecutor(max_workers=20)

# Create a semaphore to limit concurrent API calls if needed
MAX_CONCURRENT_REQUESTS = 10
semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

@app.post("/chat/refine")
async def refine_chat(request_data: ChatMessage):
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(
                executor,
                lambda: _process_refine_chat(request_data)
            )
    except Exception as e:
        logger.error(f"[REFINE_ERROR] Error in refine_chat: {str(e)}")
        logger.exception("[REFINE_ERROR] Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

def _process_refine_chat(request_data: ChatMessage):
    # Initialize LLM
    llm = LLMManager().get_llm()
    class UserPlan(BaseModel):
        """
        Structured output for the planning phase of multi-agent interactions.
        selected_agents: a list of agent names that will be tasked with answering the message
        plan: The approach each agent will take to answering the message, and what they will contribute to the response
        plan_notes: notes about the plan created for the user
        modified_message: the new message that the user may approve
        """
        selected_agents: List[str]  # a list of agent names that will be tasked with answering the message
        plan: str                   # The approach each agent will take to answering the message, and what they will contribute to the response
        plan_notes: str             # notes about the plan created for the user
        modified_message: str      # the new message that the user has approved
    # Initialize SessionManager
    session_manager = SessionManager()

    # Load teams
    teams = Team.load_teams()
    team = teams.get(request_data.team_id)
    if not team:
        logger.error(f"[REFINE_TEAM] Team {request_data.team_id} not found")
        raise ValueError(f"Team {request_data.team_id} not found")

    # Get agent details
    agent_names = []
    agent_instructions = {}

    for agent_id, agent in team.agents.items():
        agent_names.append(agent.name)
        agent_instructions[agent.name] = agent.instructions

    agents_with_instructions = "\n".join(
        f"- {agent}: {agent_instructions[agent]}" 
        for agent in sorted(agent_names)
    )

    # Session handling
    if request_data.session_id:
        logger.info(f"[REFINE_SESSION] Attempting to get session: {request_data.session_id}")
        try:
            session = session_manager.get_session(request_data.session_id)
            logger.info(f"[REFINE_SESSION] Session retrieved: {bool(session)}")
            
            if not session:
                session_manager.create_session(request_data.team_id, session_id=request_data.session_id)
                conversation_history = []
                logger.info(f"[REFINE_SESSION] Created new session with provided ID: {request_data.session_id}")
            else:
                # Verify session belongs to correct team
                if session['team_id'] != request_data.team_id:
                    logger.error(f"[REFINE_SESSION] Session {request_data.session_id} belongs to team {session['team_id']}, not {request_data.team_id}")
                    raise ValueError(f"Session {request_data.session_id} belongs to different team")
                
                conversation_history = session_manager.get_session_history(request_data.session_id)
                logger.info(f"[REFINE_SESSION] Loaded {len(conversation_history)} messages")
        except Exception as e:
            logger.error(f"[REFINE_SESSION] Error handling existing session: {str(e)}")
            raise
    else:
        logger.info("[REFINE_SESSION] No session ID provided, creating new session")
        request_data.session_id = session_manager.create_session(request_data.team_id)
        conversation_history = []
        logger.info(f"[REFINE_SESSION] Created new session with generated ID: {request_data.session_id}")

    # Format conversation history
    formatted_history = []
    for chat in conversation_history:
        chat_entry = f"Message: {chat.get('question', '')}\nResponse: {chat.get('response', '')}\n{'-'*40}"
        formatted_history.append(chat_entry)
    conversation_history = "\n\n".join(formatted_history)

    # Initialize conversation manager
    conversation_manager = ConversationManager()
    
    # Create a new conversation or get existing one if this is a refinement of an existing plan
    conversation_id = conversation_manager.create_conversation_sync(
        question=request_data.message,
        session_id=request_data.session_id,
        metadata={"team_id": request_data.team_id}
    )
    
    # Add planning node to track the planning phase
    planning_node_id = conversation_manager.add_system_node_sync(
        conversation_id=conversation_id,
        name="Planning Coordinator",
        metadata={"type": "planning", "team_id": request_data.team_id}
    )

    # Handle plan creation
    if request_data.plan:
        logger.info("[REFINE_PLAN] Using subsequent refinement template")
        prompt = SystemPromptManager().get_prompt_template("plan_prompt_with_previous_plan")
        prompt_text = prompt.format(
            current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            message=request_data.message,
            original_message=request_data.original_message,
            comments=request_data.comments,
            previous_plan=request_data.plan,
            agents_with_instructions=agents_with_instructions
        )
    else:
        prompt = SystemPromptManager().get_prompt_template("plan_prompt_with_conversation_history")
        prompt_text = prompt.format(
            current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            message=request_data.message,
            conversation_history=conversation_history,
            agents_with_instructions=agents_with_instructions
        )

    # Get both raw and structured response using include_raw=True
    response = llm.with_structured_output(UserPlan, include_raw=True).invoke([HumanMessage(content=prompt_text)])
    # Record the raw response in the conversation manager
    conversation_manager.add_interaction_sync(
        conversation_id=conversation_id,
        node_id=planning_node_id,
        prompt=prompt_text,
        response=response['raw'],
        metadata={
            "prompt_name": "plan_prompt_with_previous_plan" if request_data.plan else "plan_prompt_with_conversation_history",
            "model": llm.model_name
        }
    )
    
    # Send the plan to the user for approval
    return {
        "plan": response['parsed'].plan,
        "modified_message": response['parsed'].modified_message,
        "plan_notes": response['parsed'].plan_notes,
        "selected_agents": response['parsed'].selected_agents,
        "conversation_id": conversation_id
    }

@app.post("/chat/process")
async def chat_endpoint(request_data: ChatMessage):
    try:
        logger.info(f"Received chat message: {request_data.message}")
        
        # Verify session exists and belongs to correct team before processing
        session_manager = SessionManager()
        if request_data.session_id:
            session = session_manager.get_session(request_data.session_id)
            if not session:
                raise HTTPException(
                    status_code=404, 
                    detail="Session not found"
                )
            if session['team_id'] != request_data.team_id:
                raise HTTPException(
                    status_code=403, 
                    detail="Session belongs to different team"
                )
        
        async with semaphore:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                executor,
                lambda: asyncio.run(process_question(
                    question=request_data.message,
                    session_id=request_data.session_id,
                    team_id=request_data.team_id,
                    plan=request_data.plan,
                    selected_agents=request_data.selected_agents
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
    
@app.post("/chat/generate_session_id/")
async def generate_session_id(request_data: SessionCreate):
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            session_id = await loop.run_in_executor(
                executor,
                lambda: SessionManager().create_session(
                    team_id=request_data.team_id,
                    session_name=request_data.session_name
                )
            )
            return {"session_id": session_id}
    except Exception as e:
        logger.error(f"Error generating session ID: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Chat Service API"}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            session = await loop.run_in_executor(
                executor,
                lambda: SessionManager().get_session(session_id)
            )
            if session:
                return session
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error retrieving session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions():
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(
                executor,
                lambda: SessionManager().list_sessions()
            )
    except Exception as e:
        logger.error(f"Error listing sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                executor,
                lambda: SessionManager().delete_session(session_id)
            )
            if success:
                return {"message": f"Session {session_id} deleted successfully"}
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/sessions/{session_id}")
async def update_session(session_id: str, update_data: SessionUpdate):
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                executor,
                lambda: _process_update_session(session_id, update_data)
            )
            if result:
                return {
                    "message": f"Session {session_id} updated successfully",
                    "session": result
                }
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error updating session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def _process_update_session(session_id: str, update_data: SessionUpdate):
    """Process session update request"""
    session_manager = SessionManager()
    session = session_manager.get_session(session_id)
    
    if not session:
        return False
    
    # Create update dictionary with mandatory team_id and optional fields
    update_dict = {
        'team_id': update_data.team_id  # Always included since it's mandatory
    }
    
    # Add optional fields if provided
    if update_data.team_name is not None:
        update_dict['team_name'] = update_data.team_name
    if update_data.session_name is not None:
        update_dict['session_name'] = update_data.session_name
    
    # Update session
    success = session_manager.update_session(session_id, update_dict)
    if success:
        return session_manager.get_session(session_id)
    return False

@app.get("/models/ollama")
async def list_ollama_models():
    """
    Get a list of available Ollama models
    """
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            models = await loop.run_in_executor(
                executor,
                lambda: OllamaModelManager().list_models()
            )
            return {
                "models": models
            }
    except Exception as e:
        logger.error(f"Error listing Ollama models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prompts/list")
async def list_prompts():
    """Get all system prompts"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            prompts = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().load_prompts()
            )
            return prompts
    except Exception as e:
        logger.error(f"Error listing prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prompts/{prompt_id}")
async def get_prompt(prompt_id: str):
    """Get a specific prompt by ID"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            prompt = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().get_prompt(prompt_id)
            )
            if prompt:
                return prompt
            raise HTTPException(status_code=404, detail="Prompt not found")
    except Exception as e:
        logger.error(f"Error getting prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/prompts")
async def create_prompt(prompt_data: PromptData):
    """Create a new system prompt"""
    try:
        logger.info(f"Received create prompt request with data: {prompt_data.dict()}")
        async with semaphore:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().add_prompt(None, prompt_data.dict())
            )
            logger.info(f"Add prompt result: {success}")
            
            if success:
                # The ID will be the sanitized name
                prompt_id = prompt_data.name.lower().replace(" ", "_")
                response_data = {"id": prompt_id, **prompt_data.dict()}
                logger.info(f"Returning successful response: {response_data}")
                return response_data
                
            logger.error("Failed to create prompt")
            raise HTTPException(status_code=400, detail="Failed to create prompt")
            
    except Exception as e:
        logger.error(f"Error creating prompt: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, prompt_data: PromptUpdate):
    """Update an existing system prompt"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().update_prompt(prompt_id, prompt_data.dict())
            )
            if success:
                return {"id": prompt_id, **prompt_data.dict()}
            raise HTTPException(status_code=404, detail="Prompt not found")
    except Exception as e:
        logger.error(f"Error updating prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    """Delete a system prompt"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().delete_prompt(prompt_id)
            )
            if success:
                return {"message": f"Prompt {prompt_id} deleted successfully"}
            raise HTTPException(status_code=404, detail="Prompt not found")
    except Exception as e:
        logger.error(f"Error deleting prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prompts/{prompt_id}/variables")
async def get_prompt_variables(prompt_id: str):
    """Get variables for a specific prompt"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            variables = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().get_prompt_variables(prompt_id)
            )
            return variables
    except Exception as e:
        logger.error(f"Error getting prompt variables: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/prompts/{prompt_id}/variables")
async def add_prompt_variable(
    prompt_id: str,
    variable_name: str = Query(..., description="Name of the variable to add")
):
    """Add a new variable to a prompt"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().add_variable(prompt_id, variable_name)
            )
            if success:
                return {"message": f"Variable {variable_name} added successfully"}
            raise HTTPException(status_code=400, detail="Failed to add variable")
    except Exception as e:
        logger.error(f"Error adding prompt variable: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/prompts/{prompt_id}/variables/{variable_name}")
async def remove_prompt_variable(prompt_id: str, variable_name: str):
    """Remove a variable from a prompt"""
    try:
        async with semaphore:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                executor,
                lambda: SystemPromptManager().remove_variable(prompt_id, variable_name)
            )
            if success:
                return {"message": f"Variable {variable_name} removed successfully"}
            raise HTTPException(status_code=404, detail="Variable not found")
    except Exception as e:
        logger.error(f"Error removing prompt variable: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/list")
async def list_conversations():
    """Get a list of all conversations"""
    try:
        conversation_manager = ConversationManager()
        conversations = await conversation_manager.list_conversations()
        return conversations
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get details of a specific conversation"""
    try:
        conversation_manager = ConversationManager()
        conversation = await conversation_manager.get_conversation(conversation_id)
        if conversation:
            return conversation.to_frontend_tree()
        raise HTTPException(status_code=404, detail="Conversation not found")
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/by-session/{session_id}")
async def get_conversations_by_session(session_id: str):
    """Get all conversations for a specific session"""
    try:
        conversation_manager = ConversationManager()
        conversations = await conversation_manager.get_conversations_by_session(session_id)
        return conversations
    except Exception as e:
        logger.error(f"Error getting conversations by session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)