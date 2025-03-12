from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel, Field
from typing import Dict, Optional
import json
import os
from datetime import datetime
import logging
import uuid

from multiagent.graphState import GraphState
from utils.llm_manager import LLMManager
from utils.conversation_manager import ConversationManager
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager

logger = logging.getLogger(__name__)

# Define ExpertAnalyses class with proper string representation
class ExpertAnalyses:
    def __init__(self, question: str, analyses: dict):
        self.question = question
        self.analyses = analyses
    
    def __str__(self):
        # Format the analyses for better logging
        analyses_str = "\n".join([f"{expert}: {analysis[:100]}..." for expert, analysis in self.analyses.items()])
        return f"ExpertAnalyses(question=\"{self.question}\", analyses={{{analyses_str}}})"
    
    def __repr__(self):
        return self.__str__()

def synthesis_agent(state: GraphState) -> GraphState:
    print(create_banner("SYNTHESIS AGENT"))
    logger.info("Starting synthesis agent")

    prompt = SystemPromptManager().get_prompt_template("synthesis_agent_prompt")
    prompt_data = SystemPromptManager().get_prompt("synthesis_agent_prompt")
    llm = LLMManager().get_llm(prompt_data.get("llm"))

    try:
        # Create analyses object
        analyses = ExpertAnalyses(
            question=state['question'],
            analyses={
                expert: state['expert_final_analysis'].get(expert, "")
                for expert in state['expert_list']
                if state['expert_final_analysis'].get(expert)  # Only include non-empty analyses
            }
        )
        
        # Prepare the input for the prompt
        prompt_input = {
            "question": analyses.question,
            "analyses": analyses.analyses
        }
        
        # Get the formatted prompt text by formatting the template with our input
        # This ensures we capture exactly what's sent to the LLM
        actual_prompt_text = prompt.format(**prompt_input)
        
        # Create and run the chain
        chain = prompt | llm | StrOutputParser()
        response = chain.invoke(prompt_input)
        
        # Track the conversation using ConversationManager
        conversation_manager = ConversationManager()
        
        # Get session_id from state or generate a fallback if not present
        session_id = state.get('session_id', str(uuid.uuid4()))
        
        try:
            # Get all conversations for this session
            conversations = conversation_manager._list_conversations()
            session_conversations = [
                conv for conv in conversations 
                if conv.get("session_id") == session_id
            ]
            
            # If we have existing conversations, use the most recent one
            if session_conversations:
                # Sort by timestamp (descending) and get the most recent conversation ID
                most_recent = max(session_conversations, key=lambda x: x["timestamp"])
                conversation_id = most_recent["id"]
                logger.info(f"Using existing conversation {conversation_id} for session {session_id}")
            else:
                # Create a new conversation if none exists
                conversation_id = conversation_manager.create_conversation_sync(
                    question=state['question'],
                    session_id=session_id
                )
                logger.info(f"Created new conversation {conversation_id} for session {session_id}")
            
            # Add a system node for the synthesizer
            node_id = conversation_manager.add_system_node_sync(
                conversation_id=conversation_id,
                name="Synthesizer",
                role="synthesis"
            )
            
            # Add the interaction with the actual prompt text used
            conversation_manager.add_interaction_sync(
                conversation_id=conversation_id,
                node_id=node_id,
                prompt=actual_prompt_text,
                response=response,
                prompt_name="synthesis_agent_prompt",
                model=prompt_data.get("llm")
            )
            
            # Save the synthesized report to the conversation
            conversation_manager._save_conversation(conversation_id)
            logger.info(f"Recorded synthesis in conversation {conversation_id}")
            
        except Exception as e:
            # Log the error but don't fail the function
            logger.error(f"Error recording conversation: {e}", exc_info=True)
        
        return {**state, 'synthesized_report': response}
        
    except Exception as e:
        logger.error(f"Error in synthesis chain: {e}")
        logger.exception("Full traceback:")
        return {"response": f"Error in synthesis: {str(e)}"}
