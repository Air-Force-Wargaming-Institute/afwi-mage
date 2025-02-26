from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel, Field
from typing import Dict, Optional
import json
import os
from datetime import datetime
import logging

from multiagent.graphState import GraphState
from utils.llm_manager import LLMManager
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager
from config_ import load_config

logger = logging.getLogger(__name__)

class ExpertAnalyses(BaseModel):
    """Structure containing expert analyses for synthesis
    
    This model represents a collection of expert analyses on a given question,
    where each expert provides their specialized perspective based on their domain expertise.
    The synthesis should consider how different expert viewpoints complement or contrast with each other.
    """
    question: str = Field(
        description="The original question or topic that was analyzed by the experts. "
                   "This question serves as the central focus for all expert analyses."
    )
    analyses: Dict[str, str] = Field(
        description="A mapping of expert names to their detailed analyses. "
                   "Each expert provides their unique perspective based on their specialized domain knowledge. "
                   "The key is the expert's identifier/name, and the value is their comprehensive analysis. "
                   "Empty or null analyses have been filtered out."
    )

def synthesis_agent(state: GraphState) -> GraphState:
    # config = load_config()
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

        # Create and run the chain
        chain = prompt | llm | StrOutputParser()
        response = chain.invoke({
            "question": analyses.question,
            "analyses": analyses.analyses
        })

        # Use configured path for conversation logs
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # filename = os.path.join(config['CONVERSATION_PATH'], f"conversation_{timestamp}.json")
        
        # # Create the conversation data structure
        # conversation_data = {
        #     "timestamp": timestamp,
        #     "iteration": state['iteration'],
        #     "question": analyses.question,
        #     "analyses": analyses.analyses,
        #     "synthesized_report": response,
        #     "full_conversation": state['conversation_history']
        # }
        
        # Write to JSON file
        # with open(filename, 'w', encoding='utf-8') as f:
        #     json.dump(conversation_data, f, indent=4, ensure_ascii=False)
        
        return {**state, 'synthesized_report': response}
        
    except Exception as e:
        logger.error(f"Error in synthesis chain: {e}")
        logger.exception("Full traceback:")
        return {"response": f"Error in synthesis: {str(e)}"}
