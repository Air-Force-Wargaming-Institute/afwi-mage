import logging

from pydantic import BaseModel
from multiagent.graphState import GraphState
from multiagent.graph.createGraph import create_graph
from multiagent.session_manager import SessionManager
from multiagent.support_models.team_class import Team
import time
from typing import Dict, Any, List
from multiagent.support_models.chat import Chat
from threading import Lock
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID
from multiagent.support_models.agent_class import Agent
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from utils.llm_manager import LLMManager
from datetime import datetime
from config_ import load_config

logger = logging.getLogger(__name__)

# Create a thread-safe graph cache with a maximum size
MAX_CACHED_GRAPHS = 20
graph_cache = {}
graph_cache_lock = Lock()

# Create a thread pool for graph processing
graph_executor = ThreadPoolExecutor(max_workers=MAX_CACHED_GRAPHS)

def get_or_create_graph():
    """Thread-safe graph creation/retrieval with cache size limit"""
    thread_id = str(threading.get_ident())
    with graph_cache_lock:
        # Clean up old graphs if cache is too large
        if len(graph_cache) >= MAX_CACHED_GRAPHS:
            # Remove oldest graph (first item in dict)
            oldest_thread = next(iter(graph_cache))
            del graph_cache[oldest_thread]
            
        if thread_id not in graph_cache:
            graph_cache[thread_id] = create_graph()
        return graph_cache[thread_id]

async def process_graph_stream(graph, inputs):
    """Process graph stream in a separate thread"""
    loop = asyncio.get_running_loop()
    final_output = None
    
    def run_stream():
        nonlocal final_output
        try:
            for output in graph.stream(inputs, {"recursion_limit": 200}):
                final_output = output
            return final_output
        except Exception as e:
            logger.error(f"Error in graph stream: {str(e)}")
            raise

    return await loop.run_in_executor(graph_executor, run_stream)

async def process_question(
    question: str, 
    session_id: str = None, 
    team_id: str = None, 
    plan: str = None, 
    selected_agents: List[str] = None, 
    is_plan_accepted: bool = True,
    plan_notes: str = "",
    original_message: str = None,
    modified_message: str = None
):
    """Process a question through the multiagent system, maintaining session state"""
    if not team_id:
        raise ValueError("team_id is required")
        
    iteration = 0
    session_manager = SessionManager()
    
    # Set default values for optional parameters
    original_message = original_message or question
    modified_message = modified_message or question
    
    try:
        start_time = time.time()
        
        # Session handling
        if session_id:
            session = session_manager.get_session(session_id)
            if not session:
                # Create new session with provided ID
                session_manager.create_session(team_id, session_id=session_id)
                conversation_history = []
                logger.info(f"Created new session with provided ID: {session_id}")
            else:
                # Verify session belongs to correct team
                if session['team_id'] != team_id:
                    raise ValueError(f"Session {session_id} belongs to different team")
                
                # Load conversation history for this specific session only
                conversation_history = session_manager.get_session_history(session_id)
                logger.info(f"Loaded {len(conversation_history)} messages for session: {session_id}")
                logger.info(f"Conversation history: {conversation_history}")
        else:
            session_id = session_manager.create_session(team_id)
            conversation_history = []
            logger.info(f"Created new session with generated ID: {session_id}")

        # Load required team
        try:
            # First load all available agents
            available_agents = Agent.load_agents()
            logger.info(f"Loaded {len(available_agents)} available agents")
            
            # Then load teams (which will use the loaded agents)
            teams = Team.load_teams()
            team_uuid = UUID(team_id)
            team = next((t for t in teams.values() if t.unique_id == team_uuid), None)
            if not team:
                raise Exception(f"Team with UUID {team_id} not found")
            logger.info(f"Loaded team: {team.name}")
            
            # Extract agent names and instructions from the team's agents
            agent_names = []
            agent_instructions = {}
            agent_descriptions = {}
            agent_models = {}
            for agent_uuid in team.agents:
                agent = available_agents.get(agent_uuid)
                if agent:
                    agent_names.append(agent.name)
                    agent_instructions[agent.name] = agent.instructions
                    agent_descriptions[agent.name] = agent.description
                    agent_models[agent.name] = agent.llm_model
                else:
                    logger.warning(f"Agent {agent_uuid} not found in available agents")
            
            if not agent_names:
                raise Exception(f"No valid agents found for team {team.name}")
                
            logger.info(f"Loaded agents: {', '.join(agent_names)}")
            logger.info(f"Team vectorstore: {team.vectorstore[0]}")
            # Add to inputs for graph processing
            inputs = {
                "question": question,
                "conversation_history": conversation_history,
                "iteration": iteration,
                "expert_list": agent_names,
                "expert_descriptions": agent_descriptions,
                "expert_instructions": agent_instructions,
                "expert_models": agent_models,
                "plan": plan,
                "vectorstore": team.vectorstore[0],
                "selected_experts": selected_agents,
                "session_id": session_id,
                "plan_notes": plan_notes,
                "original_message": original_message,
                "modified_message": modified_message
            }
            
        except ValueError:
            raise ValueError(f"Invalid UUID format for team_id: {team_id}")
        except Exception as e:
            raise Exception(f"Error loading team: {str(e)}")

        # Process the question
        logger.info(f"Processing question: {question}")
        graph = get_or_create_graph()
        
        # Process graph stream asynchronously
        final_output = await process_graph_stream(graph, inputs)
        
        if not final_output or 'synthesis' not in final_output:
            raise Exception("No output generated from graph processing")
            

        # Generate expert HTML from the GraphState
        expert_html = "\n\n<details><summary>Expert Analyses</summary>\n"
        if 'expert_final_analysis' in final_output['synthesis']:
            for expert_name, expert_output in final_output['synthesis']['expert_final_analysis'].items():
                expert_html += f"""<details><summary>{expert_name}</summary>{expert_output}</details>"""
        expert_html += "</details>"

        # Combine synthesized report with expert HTML
        full_response = final_output['synthesis']['synthesized_report'] + expert_html
        logger.info(f"Full response: {full_response}")
        
        # Create session history entry
        session_entry = {
            "question": question,
            "response": full_response,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add plan if provided with more comprehensive data
        if plan:
            session_entry["plan"] = {
                "content": plan,
                "accepted": is_plan_accepted,
                "notes": plan_notes,
                "selected_agents": selected_agents,
                "original_message": original_message,
                "modified_message": modified_message
            }
            
        # Update session with new interaction
        session_manager.add_to_session_history(
            session_id,
            session_entry
        )
        
        # Get updated session data
        updated_session = session_manager.get_session(session_id)

        # Return response with updated session info
        return {
            'response': full_response,
            'session_id': session_id,
            'created_at': updated_session['created_at'],
            'updated_at': updated_session['updated_at'],
            'conversation_history': updated_session['conversation_history'],
            'processing_time': time.time() - start_time,
            'expert_final_analysis': final_output['synthesis'].get('expert_final_analysis', {}),
            'synthesized_report': final_output['synthesis'].get('synthesized_report', '')
        }

    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        logger.exception("Full traceback:")
        return {
            'response': f"Error processing question: {str(e)}",
            'session_id': session_id,
            'error': str(e)
        }

    finally:
        # Clean up thread-specific resources if needed
        thread_id = str(threading.get_ident())
        with graph_cache_lock:
            if thread_id in graph_cache:
                del graph_cache[thread_id]