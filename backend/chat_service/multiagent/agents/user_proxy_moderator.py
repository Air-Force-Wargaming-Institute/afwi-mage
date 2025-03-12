from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState, ModGuidanceState
from utils.llm_manager import LLMManager
from utils.conversation_manager import ConversationManager
from langchain_core.messages import AIMessage
from typing import Set
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager
import logging
import uuid

logger = logging.getLogger(__name__)

def get_Moderator_Guidance(state: ModGuidanceState):
    
    print(create_banner(f"{state['expert']} get_Moderator_Guidance"))

    prompt_data = SystemPromptManager().get_prompt("moderator_guidance")
    llm = LLMManager().get_llm(prompt_data.get("llm"))
    prompt = SystemPromptManager().get_prompt_template("moderator_guidance")

    # Create chain
    chain = prompt | llm | StrOutputParser()
    
    # Get guidance from LLM
    guidance = chain.invoke({"question": state['question'],
                           "expert": state['expert'],
                          })
    
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
                session_id=session_id,
                expert=state['expert']
            )
            logger.info(f"Created new conversation {conversation_id} for session {session_id}")
        
        # Add a system node for the moderator
        node_id = conversation_manager.add_system_node_sync(
            conversation_id=conversation_id,
            name="Moderator",
            role="guidance_provider"
        )
        
        # Add the interaction
        prompt_text = f"Generate guidance for {state['expert']} on question: {state['question']}"
        conversation_manager.add_interaction_sync(
            conversation_id=conversation_id,
            node_id=node_id,
            prompt=prompt_text,
            response=guidance,
            prompt_name="moderator_guidance",
            model=prompt_data.get("llm")
        )
        logger.info(f"Recorded moderator guidance for expert {state['expert']} in conversation {conversation_id}")
    except Exception as e:
        # Log the error but don't fail the function
        logger.error(f"Error recording conversation: {e}", exc_info=True)
    
    return {'expert_moderator_guidance': {state['expert']: guidance}}