from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from multiagent.graphState import GraphState, ModGuidanceState
from utils.llm_manager import LLMManager
from langchain_core.messages import AIMessage
from typing import Set
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager
import logging

logger = logging.getLogger(__name__)

def get_Moderator_Guidance(state: ModGuidanceState):
    
    print(create_banner(f"{state['expert']} get_Moderator_Guidance"))

    prompt_data = SystemPromptManager().get_prompt("moderator_guidance")
    llm = LLMManager().get_llm(prompt_data.get("llm"))
    prompt = SystemPromptManager().get_prompt_template("moderator_guidance")

    chain = prompt | llm | StrOutputParser()
    guidance = chain.invoke({"question": state['question'],
                           "expert": state['expert'],
                          })
    
    return {'expert_moderator_guidance': {state['expert']: guidance}}