from pydantic import BaseModel
from config_ import load_config
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from multiagent.graphState import GraphState
from utils.llm_manager import LLMManager
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
    expert_list = state['expert_list']
    expert_instructions = state['expert_instructions']
    llm = LLMManager().get_llm(model="hermes3:8b")
    user_question = state['question']
    
    prompt_template = PromptTemplate(
        input_variables=["question", "experts_with_instructions"],
        template="""
        Given the following question: {question}

        And the following list of available experts and their area of expertise:
        {experts_with_instructions}

        Please identify which expert or experts would be most relevant to answer this question. Only select experts from the available list. The number of experts you select should be between 1 and 8. Prefer to select more experts than fewer.
        If the question has nothing to do with any of the expert agents available, simply do not return a list of strings.
        Consider the specific knowledge areas of each expert and how they might contribute to answering the question. If the user requests a specific expert be sure to include that expert in the list. If the user requests all the experts or says something like "all the experts", or "all the agents", be sure to return a list of all the experts.
        Return your answer as a Python list of strings, containing only the names of the relevant experts.
        For example: ["item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "item_7", "item_8"]
        Do not provide any further information and do not provide rational or commentary for your decision. Only return a Python list of strings.
        """

    )

    experts_with_instructions = "\n".join(
        f"- {expert}: {expert_instructions[expert]}" 
        for expert in expert_list
    )
    print("\tINFO: In identify_experts\n\tAvailable Experts:\n\t"+ experts_with_instructions)

    prompt = prompt_template.format(
        question=user_question,
        experts_with_instructions=experts_with_instructions
    )

    response = llm.with_structured_output(ExpertList).invoke([HumanMessage(content=prompt)])
    
    if response is None:
        print("\t***INFO: LLM provided improper response, falling back to all experts.***")
        selected_experts = expert_list
    else:
        selected_experts = response.experts
        print("\tINFO: In identify_experts\n\tSelected Experts:\n\t"+str(selected_experts))
    
    # We don't want the LLM to have made up experts, so validate the list.
    validated_experts = [expert for expert in selected_experts if expert in expert_list]
    print("\tINFO: In identify_experts\n\tValidated Experts:\n\t"+str(validated_experts))

    return {**state, "selected_experts": validated_experts} 