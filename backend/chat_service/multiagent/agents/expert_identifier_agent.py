from pydantic import BaseModel
from config_ import load_config
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
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
    expert_list = state['expert_list']
    expert_instructions = state['expert_instructions']
    llm = LLMManager().llm
    user_question = state['question']
    
    prompt_template = PromptTemplate(
        input_variables=["question", "experts_with_instructions"],
        template="""
        Given the following question: {question}

        And the following list of available experts followed by their area of expertise:
        {experts_with_instructions}

        Please identify which expert or experts would be most relevant to answer this question. Only select experts from the available list. 
        If the question has nothing to do with any of the expert agents available, simply do not return a list of strings.
        Consider the specific knowledge areas of each expert and how they might contribute to answering the question. If the user requests all the experts, be sure to return a list of all the experts.
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