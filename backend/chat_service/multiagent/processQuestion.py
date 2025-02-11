import logging
from multiagent.graphState import GraphState
from multiagent.graph.createGraph import create_graph
from multiagent.session_manager import SessionManager
import time
from typing import Dict, Any
from multiagent.chat import Chat
from threading import Lock
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor

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

def format_conversation_entry(question: str, state: GraphState) -> str:
    """Format a conversation entry with question, expert analyses, and final report"""
    conversation_entry = f"\nUser Question: {question}\n\n"
    
    # Add expert final analyses if they exist
    if state.get('expert_final_analysis'):
        conversation_entry += "Expert Analyses:\n"
        for expert, analysis in state['expert_final_analysis'].items():
            conversation_entry += f"\n{expert}:\n{analysis}\n"
    
    # Add synthesized report if it exists
    if state.get('synthesized_report'):
        conversation_entry += f"\nFinal Synthesized Report:\n{state['synthesized_report']}\n"
    
    conversation_entry += "\n" + "-"*80 + "\n"  # Add separator between conversations
    return conversation_entry

async def process_question(question: str, user_id: str = None, session_id: str = None):
    """
    Process a question through the multiagent system, maintaining session state
    Thread-safe and async-ready version
    """
    conversation_history = []
    iteration = 0
    
    try:
        start_time = time.time()
        session_manager = SessionManager()
        
        # Session management with thread-safe locks
        if session_id:
            session_data = session_manager.get_session(session_id)
            if session_data:
                conversation_history = [Chat.from_dict(chat_dict) for chat_dict in session_data["conversation_history"]]
                iteration = session_data["iteration"]
                logger.info(f"Loaded existing session {session_id}")
            else:
                logger.warning(f"Session {session_id} not found, creating new session")
                session_id = session_manager.create_session(user_id) if user_id else None
        elif user_id:
            session_id = session_manager.create_session(user_id)
            logger.info(f"Created new session {session_id}")
        
        # Process the question
        logger.info(f"Processing question: {question}")
        graph = get_or_create_graph()
        iteration += 1
        
        inputs = {
            "question": question,
            "conversation_history": conversation_history,
            "iteration": iteration
        }

        # Process graph stream asynchronously
        final_output = await process_graph_stream(graph, inputs)
        
        if not final_output:
            raise Exception("No output generated from graph processing")

        # Create and append new Chat object
        if 'synthesis' in final_output:
            new_chat = Chat(
                question=question,
                expert_analyses=final_output['synthesis'].get('expert_final_analysis', {}),
                synthesized_report=final_output['synthesis'].get('synthesized_report', '')
            )
            conversation_history.append(new_chat)

        # Thread-safe session update
        if session_id:
            chat_dicts = [chat.to_dict() for chat in conversation_history]
            session_manager.update_session(
                session_id,
                chat_dicts,
                iteration
            )
            logger.info(f"Updated session {session_id}")

        end_time = time.time()
        processing_time = end_time - start_time
        logger.info(f"Processing completed in {processing_time} seconds")

        if 'synthesis' in final_output and 'synthesized_report' in final_output['synthesis']:
            expert_html = "\n\n<details><summary>Expert Analyses</summary>\n"
            for expert, analysis in final_output['synthesis'].get('expert_final_analysis', {}).items():
                expert_html += f"<details><summary>{expert}</summary>\n{analysis}\n</details>\n"
            expert_html += "</details>"

            return {
                'response': final_output['synthesis']['synthesized_report'] + expert_html,
                'session_id': session_id,
                'conversation_history': [chat.to_dict() for chat in conversation_history],
                'iteration': iteration,
                'expert_outputs': final_output.get('expert_outputs', {}),
                'processing_time': processing_time
            }
        else:
            logger.error("No synthesized report generated")
            return {
                'response': "Error: No synthesized report generated.",
                'session_id': session_id,
                'conversation_history': [chat.to_dict() for chat in conversation_history],
                'iteration': iteration,
                'processing_time': processing_time
            }

    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        logger.exception("Full traceback:")
        return {
            'response': f"Error processing question: {str(e)}",
            'session_id': session_id,
            'conversation_history': [chat.to_dict() for chat in conversation_history],
            'iteration': iteration
        }

    finally:
        # Clean up thread-specific resources if needed
        thread_id = str(threading.get_ident())
        with graph_cache_lock:
            if thread_id in graph_cache:
                del graph_cache[thread_id]