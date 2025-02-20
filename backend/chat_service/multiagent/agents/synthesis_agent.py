from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json
import os
from datetime import datetime
import logging

from multiagent.graphState import GraphState
from utils.llm_manager import LLMManager
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager

logger = logging.getLogger(__name__)

def synthesis_agent(state: GraphState) -> GraphState:
    print(create_banner("SYNTHESIS AGENT"))
    """
    The Synthesis Agent
    Consolidates insights from all other agents into a comprehensive report.
    """
    logger.info("Starting synthesis agent")
    
    # Get the prompt template
    prompt = SystemPromptManager().get_prompt_template("synthesis_agent_prompt")
    if not prompt:
        logger.error("Failed to get synthesis agent prompt template")
        return {"response": "Error: Could not load synthesis agent prompt"}
        
    logger.info(f"Got prompt template: {prompt}")
    
    # Get the LLM
    llm = LLMManager().get_llm(SystemPromptManager().get_prompt("synthesis_agent_prompt")["llm"])
    if not llm:
        logger.error("Failed to get LLM for synthesis agent")
        return {"response": "Error: Could not load language model"}
        
    try:
        question = state['question']

        # Define expert name mappings
        analyses = {
            expert: state['expert_final_analysis'].get(expert, "")
            for expert in state['expert_list']
        }

        # Safely handle empty analyses
        if not analyses:
            analyses_text = "No expert analyses available."
        else:
            analyses_text = "\n\n".join([f"{key} Analysis:\n{value}" for key, value in analyses.items() if value])

        # Create and run the chain
        chain = prompt | llm | StrOutputParser()
        response = chain.invoke({
            "question": question,
            "analyses": analyses_text
        })
        
        #TODO: create the conversation history completely instead of throughout the agents
        # Create a conversation log directory if it doesn't exist
        log_dir = "conversation_logs"
        os.makedirs(log_dir, exist_ok=True)
        
        # Create a timestamp for the filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(log_dir, f"conversation_{timestamp}.json")
        
        # Create the conversation data structure
        conversation_data = {
            "timestamp": timestamp,
            "iteration": state['iteration'],
            "question": question,
            "analyses": analyses_text,
            "synthesized_report": response,
            "full_conversation": state['conversation_history']
        }
        
        # Write to JSON file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(conversation_data, f, indent=4, ensure_ascii=False)
        
        return {**state, 'synthesized_report': response}
        
    except Exception as e:
        logger.error(f"Error in synthesis chain: {e}")
        logger.exception("Full traceback:")
        return {"response": f"Error in synthesis: {str(e)}"}
