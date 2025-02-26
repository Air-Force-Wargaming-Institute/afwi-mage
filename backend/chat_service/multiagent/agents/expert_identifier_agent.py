from pydantic import BaseModel, Field, field_validator
from langchain_core.messages import SystemMessage
from multiagent.graphState import GraphState
from utils.llm_manager import LLMManager
from multiagent.agents.helpers import create_banner
from utils.prompt_manager import SystemPromptManager

class ExpertList(BaseModel):
    _expert_list: list[str] = []

    experts: list[str] = Field(
        description="List of experts selected to analyze the question. "
                   "Must only include experts from the available expert list."
    )

    @field_validator('experts')
    @classmethod
    def validate_experts(cls, experts: list[str]) -> list[str]:
        if not cls._expert_list:
            raise ValueError("Expert list not set. Call ExpertList.set_expert_list() first.")
        
        invalid_experts = [exp for exp in experts if exp not in cls._expert_list]
        if invalid_experts:
            raise ValueError(f"Invalid experts selected: {invalid_experts}. "
                           f"Must be from available experts: {cls._expert_list}")
        return experts

    @classmethod
    def set_expert_list(cls, expert_list: list[str]):
        """Set the available expert list for validation"""
        cls._expert_list = expert_list

def identify_experts(state: GraphState):
    print(create_banner("identify_experts"))
    """
    This function identifies the experts that are most relevant to the user's question.
    It uses the LLM to determine the experts that are most relevant to the user's question.
    """
    expert_list = state['expert_list']
    expert_instructions = state['expert_instructions']
    
    # Set the available expert list for validation
    ExpertList.set_expert_list(expert_list)
    
    prompt = SystemPromptManager().get_prompt_template("librarian_summary_prompt")
    prompt_data = SystemPromptManager().get_prompt("librarian_summary_prompt")
    llm = LLMManager().get_llm(prompt_data.get("llm"))

    experts_with_instructions = "\n".join(
        f"- {expert}: {expert_instructions[expert]}" 
        for expert in expert_list
    )
    print("\tINFO: In identify_experts\n\tAvailable Experts:\n\t"+ experts_with_instructions)

    prompt = prompt.format(
        question=state['question'],
        experts_with_instructions=experts_with_instructions
    )

    response = llm.with_structured_output(ExpertList).invoke([SystemMessage(content=prompt)])
    
    if response is None:
        print("\t***INFO: LLM provided improper response, falling back to all experts.***")
        selected_experts = expert_list
    else:
        selected_experts = response.experts
        print("\tINFO: In identify_experts\n\tSelected Experts:\n\t"+str(selected_experts))
    
    return {**state, "selected_experts": selected_experts} 