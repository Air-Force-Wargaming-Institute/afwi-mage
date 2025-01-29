# Add these lines near the top of the file, after the existing imports
TEAM_NAME = "PRC Team"
TEAM_FILE_NAME = "PRC_Team"
TEAM_DESCRIPTION = """PRC Team for Testing"""
TEAM_COLOR = "#FF0000"
CREATED_AT = "2025-01-29T23:13:20.301926"
MODIFIED_AT = "2025-01-29T23:13:20.301926"
TEAM_INSTRUCTIONS = """""" # Do we actually need team instructions? Where would they be used?
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
AGENT_ZERO = "domestic_stability"       #default is null_0
AGENT_ONE = "global_influence"         #default is null_1
AGENT_TWO = "prc_economic"         #default is null_2
AGENT_THREE = "regional_dynamics"     #default is null_3
AGENT_FOUR = "technology_innovation"       #default is null_4
AGENT_FIVE = "null_5"       #default is null_5
AGENT_SIX = "null_6"         #default is null_6
AGENT_SEVEN = "null_7"     #default is null_7
AGENT_FILE_NAMES = ['domestic_stability', 'global_influence', 'prc_economic', 'regional_dynamics', 'technology_innovation']
AGENT_FILE_INSTRUCTIONS = ["You are the Domestic Stability expert in a multi-agent system.\n\nEvaluate internal social, demographic, and political factors in the PRC. \n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Explain how domestic issues influence PRC\\'s approach to the query topic. \n2. Discuss relevant public opinion trends, ethnic tensions, or domestic challenges.\n3. Analyze how internal stability concerns affect PRC\\'s decision-making. \n4. Identify any recent domestic developments that impact the issue. Provide specific examples from the documents of domestic factors and their effects.", "You are the Global Influence Expert in a multi-agent system. Track the PRC\\'s efforts to expand its global influence. Your task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess the impact of PRC\\'s global initiatives on the issue in the query. \n2. Discuss relevant diplomatic efforts, investments, or soft power initiatives. \n3. Analyze how PRC\\'s actions affect international institutions and norms. \n4. Identify any global trends or reactions that influence PRC\\'s approach. Use concrete examples from the documents of PRC\\'s global activities and their outcomes.", "You are the PRC Economic Expert in a multi-agent system. Focus on the PRC\\'s economic policies, trade relationships, and industrial strategies. \n\nYour analysis should \n1. Predict economic actions and their geopolitical implications relevant to the query. \n2. Explain how economic factors influence PRC\\'s approach to the issue at hand.\n3. Provide data on relevant economic indicators, trade patterns, or industrial policies.\n4. Discuss any recent economic initiatives or shifts that relate to the user\\'s question. Use specific economic data and examples from the documents to support your points. Your task is to use the moderator guidance and provided documents to answer the question.", "You are the Regional Dynamics Expert in a multi-agent system. Examine the PRC\\'s relationships with neighboring countries and regional powers.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how regional dynamics affect PRC\\'s approach to the issue in the query.\n2. Discuss relevant historical context, territorial disputes, or shifting alliances. \n3. Analyze the positions and potential reactions of key regional players. \n4. Identify any recent regional developments or agreements that impact the issue. Provide specific examples of regional interactions from the documents and their implications.", "You are the Technology and Innovation Expert in a multi-agent system. Monitor the PRC\\'s advancements in key technologies.\n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how technological factors relate to the issue in the query.\n2. Provide details on relevant advancements in AI, quantum computing, biotechnology, etc.\n3. Assess potential military and economic applications of these technologies.\n4. Discuss any recent technological breakthroughs or initiatives that impact the issue. Use specific examples from the documents of China\\'s technological developments and their implications."]

import functools
from multiagent.system_agents.conversation_history_manager import conversation_history_manager
from multiagent.system_agents.user_proxy_moderator import user_proxy_moderator
from multiagent.system_agents.librarian_agent import librarian_agent
from multiagent.system_agents.synthesis_agent import synthesis_agent
if AGENT_ZERO != "null_0":
    from multiagent.agent_experts.domestic_stability_expert import domestic_stability_expert, domestic_stability_requester, domestic_stability_collaborator
if AGENT_ONE != "null_1":
    from multiagent.agent_experts.global_influence_expert import global_influence_expert, global_influence_requester, global_influence_collaborator
if AGENT_TWO != "null_2":
    from multiagent.agent_experts.prc_economic_expert import prc_economic_expert, prc_economic_requester, prc_economic_collaborator
if AGENT_THREE != "null_3":
    from multiagent.agent_experts.regional_dynamics_expert import regional_dynamics_expert, regional_dynamics_requester, regional_dynamics_collaborator
if AGENT_FOUR != "null_4":
    from multiagent.agent_experts.technology_innovation_expert import technology_innovation_expert, technology_innovation_requester, technology_innovation_collaborator
if AGENT_FIVE != "null_5":
    from multiagent.agent_experts.null_5_expert import null_5_expert, null_5_requester, null_5_collaborator
if AGENT_SIX != "null_6":
    from multiagent.agent_experts.null_6_expert import null_6_expert, null_6_requester, null_6_collaborator
if AGENT_SEVEN != "null_7":
    from multiagent.agent_experts.null_7_expert import null_7_expert, null_7_requester, null_7_collaborator

from config import load_config
from multiagent.graphState import GraphState
from multiagent.team.routers import router_expert_input_still_needed, router_check_requester, router_dynamic_librarian, router_check_collaborator, router_expert_reflected, router_dynamic_expert, router_dynamic_collab

from langgraph.graph import StateGraph, END
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI

def PRC_Team_graph() -> StateGraph:
    """
    Creates the agent graph for the multi-agent system.
    Defines the process for streaming agent output instead of waiting for the entire output to be generated.
    """

    config = load_config()
    TEMPERATURE = config['TEMPERATURE']
    BASE_URL = config['BASE_URL']
    API_KEY = config['API_KEY']
    MAX_TOKENS = config['MAX_TOKENS']
    LOCAL_LLM = config['LOCAL_LLM']

    workflow = StateGraph(GraphState)

    callbacks = CallbackManager([StreamingStdOutCallbackHandler()])

    experts = AGENT_FILE_NAMES

    streaming_llm = ChatOpenAI(temperature=TEMPERATURE, base_url=BASE_URL, api_key=API_KEY, max_tokens=MAX_TOKENS, streaming=True, callbacks=callbacks, model=LOCAL_LLM)

    non_streaming_llm = ChatOpenAI(temperature=TEMPERATURE, base_url=BASE_URL, api_key=API_KEY, max_tokens=MAX_TOKENS, model=LOCAL_LLM)

    # Nodes are the logical steps in the program. Each node represents an agent that performs a small step in answering the user's question.
    # The use of functools.partial allows us to pass the LLM to the agent so that the agent can stream its output.
    # We don't stream the librarian because half of what it does (retrieving documents) cannot be streamed.

    #--------------------System Agents--------------------
    workflow.add_node("conversation_history_manager", functools.partial(conversation_history_manager, llm=non_streaming_llm))
    workflow.add_node("user_proxy_moderator", functools.partial(user_proxy_moderator, llm=streaming_llm))
    workflow.add_node("librarian", functools.partial(librarian_agent, llm=non_streaming_llm))
    workflow.add_node("synthesis", functools.partial(synthesis_agent, llm=streaming_llm))

    #--------------------Expert Agents--------------------
    if AGENT_ZERO != "null_0":
        workflow.add_node("domestic_stability", functools.partial(domestic_stability_expert, llm=streaming_llm))
    if AGENT_ONE != "null_1":
        workflow.add_node("global_influence", functools.partial(global_influence_expert, llm=streaming_llm))
    if AGENT_TWO != "null_2":
        workflow.add_node("prc_economic", functools.partial(prc_economic_expert, llm=streaming_llm))
    if AGENT_THREE != "null_3":
        workflow.add_node("regional_dynamics", functools.partial(regional_dynamics_expert, llm=streaming_llm))
    if AGENT_FOUR != "null_4":
        workflow.add_node("technology_innovation", functools.partial(technology_innovation_expert, llm=streaming_llm))
    if AGENT_FIVE != "null_5":
        workflow.add_node("null_5", functools.partial(null_5_expert, llm=streaming_llm))
    if AGENT_SIX != "null_6":
        workflow.add_node("null_6", functools.partial(null_6_expert, llm=streaming_llm))
    if AGENT_SEVEN != "null_7":
        workflow.add_node("null_7", functools.partial(null_7_expert, llm=streaming_llm))

    #--------------------Requesters--------------------
    if AGENT_ZERO != "null_0":
        workflow.add_node("domestic_stability_requester", domestic_stability_requester)
    if AGENT_ONE != "null_1":
        workflow.add_node("global_influence_requester", global_influence_requester)
    if AGENT_TWO != "null_2":
        workflow.add_node("prc_economic_requester", prc_economic_requester)
    if AGENT_THREE != "null_3":
        workflow.add_node("regional_dynamics_requester", regional_dynamics_requester)
    if AGENT_FOUR != "null_4":
        workflow.add_node("technology_innovation_requester", technology_innovation_requester)
    if AGENT_FIVE != "null_5":
        workflow.add_node("null_5_requester", null_5_requester)
    if AGENT_SIX != "null_6":
        workflow.add_node("null_6_requester", null_6_requester)
    if AGENT_SEVEN != "null_7":
        workflow.add_node("null_7_requester", null_7_requester)

    #--------------------Collaborators--------------------
    if AGENT_ZERO != "null_0":
        workflow.add_node("domestic_stability_collaborator", functools.partial(domestic_stability_collaborator, llm=streaming_llm))
    if AGENT_ONE != "null_1":
        workflow.add_node("global_influence_collaborator", functools.partial(global_influence_collaborator, llm=streaming_llm))
    if AGENT_TWO != "null_2":
        workflow.add_node("prc_economic_collaborator", functools.partial(prc_economic_collaborator, llm=streaming_llm))
    if AGENT_THREE != "null_3":
        workflow.add_node("regional_dynamics_collaborator", functools.partial(regional_dynamics_collaborator, llm=streaming_llm))
    if AGENT_FOUR != "null_4":
        workflow.add_node("technology_innovation_collaborator", functools.partial(technology_innovation_collaborator, llm=streaming_llm))
    if AGENT_FIVE != "null_5":
        workflow.add_node("null_5_collaborator", functools.partial(null_5_collaborator, llm=streaming_llm))
    if AGENT_SIX != "null_6":
        workflow.add_node("null_6_collaborator", functools.partial(null_6_collaborator, llm=streaming_llm))
    if AGENT_SEVEN != "null_7":
        workflow.add_node("null_7_collaborator", functools.partial(null_7_collaborator, llm=streaming_llm))

    # Start at user proxy
    workflow.set_entry_point("conversation_history_manager")
    workflow.set_finish_point("synthesis")

    workflow.add_edge("conversation_history_manager", "user_proxy_moderator")

    # Conditional edges represent potential paths the program can take.
    # It cannot be determined what the expert will be needed until the user submits a question, thus routing functions are 
    # used to determine the next step during runtime.
    # Routing functions return some value that is definded mapping dictionary.
    # The key is the value that the routing function returns, and the value is the node that the program should flow to.
    dynamic_collab_edge_dict = {}
    for e in experts:
        dynamic_collab_edge_dict[e] = e+"_requester"
    dynamic_collab_edge_dict["synthesis"] = "synthesis"
    workflow.add_conditional_edges("user_proxy_moderator", router_dynamic_collab, dynamic_collab_edge_dict)

    # Regular edges are paths the program will ALWAYS take. You should not have multiple regular edges coming out of a node,
    # nor should you have a regular edge and a conditional edge coming out of a node.

    dynamic_expert_edge_dict = {}
    dynamic_expert_reflected_edge_dict = {}
    for e in experts:
        dynamic_expert_edge_dict[e+"_requester"] = e+"_requester"
        dynamic_expert_reflected_edge_dict[e+"_requester"] = e+"_requester"
        dynamic_expert_edge_dict[e+"_collaborator"] = e+"_collaborator"
    dynamic_expert_edge_dict["user_proxy_moderator"] = "user_proxy_moderator"
    dynamic_expert_reflected_edge_dict["user_proxy_moderator"] = "user_proxy_moderator"

    for e in experts:
        workflow.add_edge(e+"_requester", "librarian")
        #workflow.add_edge(e, "user_proxy_moderator")
        workflow.add_conditional_edges(e, router_dynamic_expert, dynamic_expert_edge_dict)
        workflow.add_conditional_edges(e+"_collaborator", router_expert_reflected, dynamic_expert_reflected_edge_dict)

    # Edges out of the librarian change based on the value of shared_state.COLLAB_LOOP using router_dynamic_routing
    # If COLLAB_LOOP is True, the edges point to the collaborator nodes.
    # If COLLAB_LOOP is False, the edges point to the original expert nodes.

    dynamic_librarian_edge_dict = {}
    for e in experts:
        dynamic_librarian_edge_dict[e] = e
        dynamic_librarian_edge_dict[e+"_collaborator"] = e+"_collaborator"

    workflow.add_conditional_edges("librarian", router_dynamic_librarian, dynamic_librarian_edge_dict)

    # Once the program reaches the "synthesis" agent, always flow to the end of the program
    workflow.add_edge("synthesis", END)

    return workflow.compile()