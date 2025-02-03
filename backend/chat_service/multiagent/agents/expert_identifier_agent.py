from pydantic import BaseModel
from config import load_config
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from utils.shared_state import shared_state
from multiagent.graphState import GraphState
from multiagent.llm_manager import LLMManager
from multiagent.agents.helpers import create_banner
import ast

class ExpertList(BaseModel):
    experts:list[str]

def identify_experts(state: GraphState):
    print(create_banner("identify_experts"))
    """
    This function identifies the experts that are most relevant to the user's question.
    It uses the LLM to determine the experts that are most relevant to the user's question.
    """
    config = load_config()
    EXPERT_LIST = config['EXPERT_AGENTS']
    llm = LLMManager().llm
    user_question = state['question']
    expert_descriptions = [
        "Expert on the structure, decision-making processes, and key figures within the PRC government.",
        "Expert on the capabilities, doctrine, and strategic objectives of the People's Liberation Army (PLA).",
        "Expert on the PRC's economic policies, trade relationships, and industrial strategies.",
        "Expert on the PRC's relationships with neighboring countries and regional powers.",
        "Expert on the PRC's efforts to expand its global influence.",
        "Expert on internal social, demographic, and political factors in the PRC.",
        "Expert on the PRC's recent advancements in key technologies."
    ]
    
    prompt_template = PromptTemplate(
        input_variables=["question", "experts_with_descriptions"],
        template="""
        Given the following question: {question}

        And the following list of available experts and their area of expertise:
        {experts_with_descriptions}

        Please identify which expert or experts would be most relevant to answer this question. Only select experts from the available list. 
        If the question has nothing to do with any of the expert agents available, simply do not return a list of strings.
        Consider the specific knowledge areas of each expert and how they might contribute to answering the question. If the user requests all the experts, be sure to return a list of all the experts.
        """
    )

    experts_with_descriptions = "\n".join(f"- {expert}: {description}" for expert, description in zip(EXPERT_LIST, expert_descriptions))
    print("\tINFO: In identify_experts\n\tAvailable Experts:\n\t"+experts_with_descriptions)

    prompt = prompt_template.format(
        question=user_question,
        experts_with_descriptions=experts_with_descriptions
    )

    response = llm.with_structured_output(ExpertList).invoke([HumanMessage(content=prompt)])
    
    if response is None:
        print("\t***INFO: LLM provided improper response, falling back to all experts.***")
        experts_list = EXPERT_LIST
    else:
        experts_list = response.experts
    
    # We don't want the LLM to have made up experts, so validate the list.
    validated_experts = [expert for expert in experts_list if expert in EXPERT_LIST]
    print("\tINFO: In identify_experts\n\tSelected Experts:\n\t"+str(validated_experts))
    
    shared_state.EXPERT_LIST_GENERATED = True

    return {**state, "selected_experts": validated_experts} 