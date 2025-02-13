from pydantic import BaseModel
from config_ import load_config
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from multiagent.llm_manager import LLMManager


class CollabList(BaseModel):
    collaborators:list[str]

def determine_collaboration(reflection: str, analysis: str, expert_agents_withoutme: list[str]):
    print(create_banner("determine_collaboration"))
    '''
    This function is used to determine if collaboration is needed and which expert to collaborate with. Arguments are:
    reflection: The reflection on the report as a string
    analysis: The analysis of the report as a string
    expert_agents: The list of expert agents as a string (do some sort of `"".join(expert_agents)` to get it in the correct format)
    '''
    expert_agents_str = "\n".join(f"- {expert}" for expert in expert_agents_withoutme)

    llm = LLMManager().llm
    collab_template = PromptTemplate(
            input_variables=["reflection", "analysis", "expert_agents"],
            template="Given a report and a reflection on that report, please identify some number of experts from the following list that could best help improve the report: {expert_agents}.\n\nReport: {analysis}\n\nReflection: {reflection}\n\n"
    )

    prompt = collab_template.format(
        reflection=reflection,
        analysis=analysis,
        expert_agents=expert_agents_str
    )

    response = llm.with_structured_output(CollabList).invoke([HumanMessage(content=prompt)])

    if response is None:
        print("\t***INFO: LLM provided improper response, falling back to all experts.***")
        collaborators = []
    else:
        collaborators = response.collaborators

        # We don't want the LLM to have made up experts, so validate the list.
    collaborators_list = [expert for expert in collaborators if expert in expert_agents_withoutme]


    print("\tINFO: In determine_collaboration\n\tSelected Collaborators:\n\t"+str(collaborators_list))
    return collaborators_list

def create_banner(text: str) -> str:
    """Create a formatted banner for console output."""
    return f"\n\n\t---------------------------\n\n\t---{text}---\n\n\t---------------------------\n\n\t"