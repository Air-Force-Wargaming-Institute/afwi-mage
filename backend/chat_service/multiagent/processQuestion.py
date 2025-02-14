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

def restructure_and_human_validation(question: str, chat_history: List[Dict[str, Any]], team_id: str):
    """
    This function is used to restructure and/or rewrite the user's question, potentially using the conversation history, and then having the user validate the new question.
    """
    class UserPlan(BaseModel):
        """
        Structured output for the planning phase of multi-agent interactions.
        selected_agents: a list of agent names that will be tasked with answering the question
        plan: reasoning for selecting particular agents, and the approach they will take to answering the question
        modified_question: the new question that the user has approved
        """
        selected_agents: List[str] # a list of agent names that will be tasked with answering the question
        plan: str # reasoning for selecting particular agents, and the approach they will take to answering the question
        modified_question: str # the new question that the user has approved

    
    config = load_config()
    high_level_prompt = config["HIGH_LEVEL_PROMPT"]
    agents = Agent.load_agents()
    teams = Team.load_teams()
    team = teams.get(team_id)
    if not team:
        raise ValueError(f"Team {team_id} not found")
    
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

    # Format chat history
    formatted_history = []
    for chat in chat_history:
        chat_entry = f"Question: {chat.get('question', '')}\nResponse: {chat.get('response', '')}\n{'-'*40}"
        formatted_history.append(chat_entry)
    conversation_history = "\n\n".join(formatted_history)

    plan_template = high_level_prompt + """
You are a planning coordinator for a multi-agent AI team. Your job is to: 1. Analyze the user's question 2. Review the available AI agents and their instructions 3. Create a clear plan for how these agents will work together to answer the question 4. Present this plan to the user for approval
    User's Question: {question}
    
    Available Agents: {agents_with_instructions}

    Previous Conversation Context: {conversation_history}

    Please create a plan that: 1. Explains which agents will be involved and why 2. Outlines how their expertise and instructions will be applied 3. Asks the user if this approach meets their needs
    Your response should be clear and user-friendly, avoiding technical jargon where possible.
    """
    prompt = PromptTemplate(
        input_variables=["current_datetime", "question", "agents_with_instructions", "conversation_history"],
        template=plan_template
    )
    llm = LLMManager().get_llm()

    logger.info(f"Before creating prompt and entering HIL")
    while True:
        prompt = prompt.format(
            current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            question=question,
            agents_with_instructions=agents_with_instructions,
            conversation_history=conversation_history
        )
        response = llm.with_structured_output(UserPlan).invoke([HumanMessage(content=prompt)])

        logger.info(f"After creating prompt and entering HIL")
        # Format the plan for user review
        plan_display = f"""
Proposed Plan:
-------------
Selected Agents:
{', '.join(response.selected_agents)}

Reasoning:
{response.plan}

Modified Question:
{response.modified_question}
        """
        print(plan_display)
        
        user_response = input("\n\nDo you approve of this plan?\n(Type 'approve' or 'reject'\nTyping anything else will be considered a reject. You will be able to provide feedback and plan again if you reject.)")

        if user_response and user_response.lower().strip() == "approve":
            # User approved the plan, return the structured response
            return {
                "new_question": response.modified_question,
                "plan": response.plan,
                "team_agents": response.selected_agents
            }
        else:
            feedback = input("Please provide feedback on what you'd like to change: ")
            question = high_level_prompt + f"""Original Question: {question}
                            User Feedback: {feedback}
                            Please revise the approach based on this feedback."""
            user_response = None  # Reset for next iteration
            continue

async def process_question(question: str, user_id: str = None, session_id: str = None, team_id: str = None):
    """Process a question through the multiagent system, maintaining session state"""
    if not team_id:
        raise ValueError("team_id is required")
        
    iteration = 0
    
    try:
        start_time = time.time()
        session_manager = SessionManager()
        
        # Modified session handling logic with explicit session history loading
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

        # Begin Human in the Loop validation to create a plan
        plan = restructure_and_human_validation(question, conversation_history, team_id)

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
            
            # Add to inputs for graph processing
            inputs = {
                "question": question,
                "conversation_history": conversation_history,
                "iteration": iteration,
                "expert_list": agent_names,
                "expert_descriptions": agent_descriptions,
                "expert_instructions": agent_instructions,
                "expert_models": agent_models
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
        # Update session with new interaction
        session_manager.add_interaction(
            session_id,
            question=question,
            response=full_response
        )

        # Return response with updated session info
        return {
            'response': full_response,
            'session_id': session_id,
            'created_at': session_manager.get_session(session_id)['created_at'],
            'updated_at': session_manager.get_session(session_id)['updated_at'],
            'conversation_history': session_manager.get_session(session_id)['conversation_history'],
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