from config import load_config

#from docx import Document as DocxDocument

from typing import List

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from utils.shared_state import shared_state

from multiagent.graphState import GraphState

import ast

def identify_experts(state: GraphState) -> GraphState:
    """
    This function identifies the experts that are most relevant to the user's question.
    It uses the LLM to determine the experts that are most relevant to the user's question.
    """
    config = load_config()
    TEMPERATURE = config['TEMPERATURE']
    BASE_URL = config['BASE_URL']
    API_KEY = config['API_KEY']
    MAX_TOKENS = config['MAX_TOKENS']
    LOCAL_LLM = config['LOCAL_LLM']

    state_dict = state["keys"]
    user_question = state_dict["question"]
    expert_nodes = ["prc_government", "prc_military", "prc_economic", "regional_dynamics", "global_influence", "domestic_stability", "technology_innovation"]
    expert_descriptions = ["Expert on the structure, decision-making processes, and key figures within the PRC government.",
                        "Expert on the capabilities, doctrine, and strategic objectives of the People's Liberation Army (PLA).",
                        "Expert on the PRC's economic policies, trade relationships, and industrial strategies.",
                        "Expert on the PRC's relationships with neighboring countries and regional powers.",
                        "Expert on the PRC's efforts to expand its global influence.",
                        "Expert on the PRC's recent advancements in key technologies.",
                        "Expert on internal social, demographic, and political factors in the PRC."
    ]

    llm = ChatOpenAI(temperature=TEMPERATURE, base_url=BASE_URL, api_key=API_KEY, max_tokens=MAX_TOKENS, model=LOCAL_LLM)

    prompt_template = PromptTemplate(
        input_variables=["question", "experts"],
        template="""
        Given the following question: {question}

        And the following list of available experts and their area of expertise:
        {experts_with_descriptions}

        Please identify which expert or experts would be most relevant to answer this question. Only select experts from the available list. 
        If the question has nothing to do with any of the expert agents available, simply do not return a list of strings.
        Consider the specific knowledge areas of each expert and how they might contribute to answering the question. If the user requests all the experts, be sure to return a list of all the experts.
        Return your answer as a Python list of strings, containing only the names of the relevant experts.
        For example: ["prc_economic", "global_influence", "domestic_stability"]
        Do not provide any further information and do not provide rational for your decision. Only return a Python list of strings.
        """
    )

    # Build the prompt, with the format of a bulleted list (eg. - prc_government: Expert on the structure, decision-making processes...).
    prompt = prompt_template.format(
        question=user_question,
        experts_with_descriptions = "\n".join(f"- {expert}: {description}" for expert, description in zip(expert_nodes, expert_descriptions))
    )

    response = llm.invoke([HumanMessage(content=prompt)])

    # Ensure that the LLM returned a valid python list.
    # If not, we will return a list of all experts to be safe.
    try:
        #experts_list = eval(response.content)
        experts_list = ast.literal_eval(response.content)
        if not isinstance(experts_list, list) or not all(isinstance(expert, str) for expert in experts_list):
            raise ValueError("Invalid response format")
    except:
        # If the LLM doesn't cooperate, return a list of all experts to be safe
        #logging.info("\t***INFO: LLM provided improper response, falling back to all experts.***")
        experts_list = expert_nodes

    # We don't want the LLM to have made up experts, so validate the list.
    validated_experts = [expert for expert in experts_list if expert in expert_nodes]
    print("\tINFO: In identify_experts\n\tSelected Experts:\n\t"+str(validated_experts))
    #logging.info("\tINFO: In identify_experts\n\tSelected Experts:\n\t"+str(validated_experts))
    
    shared_state.EXPERT_LIST_GENERATED = True

    return {"keys": {**state_dict, "selected_experts": validated_experts}}

def update_expert_input(state: GraphState, expert_node= str):
    """
    This function is used by experts to update the graph state to reflect that they have provided input.
    """
    state_dict = state["keys"]
    experts_with_input = set(state_dict.get("experts_with_input", set()))
    experts_with_input.add(expert_node)

    return {"keys": {**state_dict, "experts_with_input": experts_with_input}}


# def write_to_docx(whoami: str, analysis: str):
#     """
#     This function is used to write the analysis to a Word document.
#     """
#     config = load_config()
#     OUTPUT_DIR = config['OUTPUT_DIR']
#     ITERATION = config['ITERATION']

#     doc = DocxDocument()
#     doc.add_heading(whoami.upper()+" Expert Analysis")
#     doc.add_paragraph(analysis)
#     doc.save(OUTPUT_DIR+"/"+str(ITERATION)+"_"+whoami+"_analysis.docx")

def determine_collaboration(reflection: str, analysis: str, expert_agents: str):
    '''
    This function is used to determine if collaboration is needed and which expert to collaborate with. Arguments are:
    reflection: The reflection on the report as a string
    analysis: The analysis of the report as a string
    expert_agents: The list of expert agents as a string (do some sort of `"".join(expert_agents)` to get it in the correct format)
    '''
    config = load_config()
    TEMPERATURE = config['TEMPERATURE']
    BASE_URL = config['BASE_URL']
    API_KEY = config['API_KEY']
    MAX_TOKENS = config['MAX_TOKENS']
    LOCAL_LLM = config['LOCAL_LLM']
    EXPERT_LIST = config['EXPERT_AGENTS']

    llm = ChatOpenAI(temperature=TEMPERATURE, base_url=BASE_URL, api_key=API_KEY, max_tokens=MAX_TOKENS, model=LOCAL_LLM)
    collab_template = PromptTemplate(
            input_variables=["reflection", "analysis", "expert_agents"],
            template="Given a report and a reflection on that report, please identify some number of experts from the following list that could best help improve the report: {expert_agents}. Return the name of the expert(s) as a Python list (e.g. [prc_government, prc_economic]). If no expert is needed or none of the experts seem applicable, return an empty Python list and nothing else. Do not provide any further information.\n\nReport: {analysis}\n\nReflection: {reflection}\n\nExpert:"
    )

    prompt = collab_template.format(
        reflection = reflection,
        analysis = analysis,
        expert_agents = expert_agents
    )

    response = llm.invoke([HumanMessage(content=prompt)])

    print("\t\t*/*/*/*/*/*/*/*/*/"+response.content+"\*\*\*\*\*\*\*\*\*\*\*")

    # if response.content not in EXPERT_LIST:
    #     collaborator = "None"
    # else:
    #     collaborator = response.content
    collaborators = response.content
    collaborators = collaborators.strip("[\"\']")
    collaborators_list = collaborators.split(", ")
    print("\t\t*/*/*/*/*/*/*/*/*/"+response.content+"\*\*\*\*\*\*\*\*\*\*\*")
    return collaborators_list