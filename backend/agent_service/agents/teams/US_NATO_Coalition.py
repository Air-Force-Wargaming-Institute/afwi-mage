# Add these lines near the top of the file, after the existing imports
TEAM_NAME = "US-NATO Coalition"
TEAM_FILE_NAME = "US_NATO_Coalition"
TEAM_DESCRIPTION = """Coalition of US and NATO Experts"""
TEAM_COLOR = "#800080"
CREATED_AT = "2025-02-07T19:58:03.933735"
MODIFIED_AT = "2025-02-07T20:21:41.095378"
TEAM_INSTRUCTIONS = """""" # Do we actually need team instructions? Where would they be used?
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
AGENT_ZERO = "NATO_Military"       #default is null_0
AGENT_ONE = "NATO_Regional_Dynamics"         #default is null_1
AGENT_TWO = "US_Military"         #default is null_2
AGENT_THREE = "US_Global_Influence"     #default is null_3
AGENT_FOUR = "null_4"       #default is null_4
AGENT_FIVE = "null_5"       #default is null_5
AGENT_SIX = "null_6"         #default is null_6
AGENT_SEVEN = "null_7"     #default is null_7
AGENT_FILE_NAMES = ['NATO_Military', 'NATO_Regional_Dynamics', 'US_Military', 'US_Global_Influence']
AGENT_FILE_INSTRUCTIONS = ["You are the NATO Military Expert in a multi-agent system. Concentrate on the capabilities, doctrine, and strategic objectives of NATO armed\n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess potential military actions or responses related to the query. \n2. Provide details on relevant military capabilities, technologies, or strategies. \n3. Explain how military considerations influence NATO\\'s approach to the issue at hand. \n4. Discuss any recent military developments or exercises relevant to the query. Provide concrete examples and data from the documents to support your analysis.", "You are the Regional Dynamics Expert in a multi-agent system. Examine NATO\\'s relationships with neighboring countries, regional powers, and member-nation relationships. \n\nYour task is to use the moderator guidance and provided documents to answer the question.\n\nYour analysis should\n1. Explain how regional dynamics affect NATO\\'s approach to the issue in the query.\n2. Discuss relevant historical context, territorial disputes, or shifting alliances. \n3. Analyze the positions and potential reactions of key regional players. \n4. Identify any recent regional developments or agreements that impact the issue. Provide specific examples of regional interactions from the documents and their implications.", "You are the US Military Expert in a multi-agent system. Concentrate on the capabilities, doctrine, and strategic objectives of the United States Armed Forces .\n\nYour task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess potential military actions or responses related to the query. \n2. Provide details on relevant military capabilities, technologies, or strategies. \n3. Explain how military considerations influence the US\\'s approach to the issue at hand. \n4. Discuss any recent military developments or exercises relevant to the query. Provide concrete examples and data from the documents to support your analysis.", "You are the Global Influence Expert in a multi-agent system. Track the United States\\' efforts to expand its global influence. Your task is to use the moderator guidance and provided documents to answer the question. \n\nYour analysis should \n1. Assess the impact of the US\\'s global initiatives on the issue in the query. \n2. Discuss relevant diplomatic efforts, investments, or soft power initiatives. \n3. Analyze how the US\\'s actions affect international institutions and norms. \n4. Identify any global trends or reactions that influence the US\\'s approach. Use concrete examples from the documents of US\\'s global activities and their outcomes."]

import functools
from multiagent.system_agents.conversation_history_manager import conversation_history_manager
from multiagent.system_agents.user_proxy_moderator import user_proxy_moderator
from multiagent.system_agents.librarian_agent import librarian_agent
from multiagent.system_agents.synthesis_agent import synthesis_agent
if AGENT_ZERO != "null_0":
    from multiagent.agent_experts.NATO_Military_expert import NATO_Military_expert, NATO_Military_requester, NATO_Military_collaborator
if AGENT_ONE != "null_1":
    from multiagent.agent_experts.NATO_Regional_Dynamics_expert import NATO_Regional_Dynamics_expert, NATO_Regional_Dynamics_requester, NATO_Regional_Dynamics_collaborator
if AGENT_TWO != "null_2":
    from multiagent.agent_experts.US_Military_expert import US_Military_expert, US_Military_requester, US_Military_collaborator
if AGENT_THREE != "null_3":
    from multiagent.agent_experts.US_Global_Influence_expert import US_Global_Influence_expert, US_Global_Influence_requester, US_Global_Influence_collaborator
if AGENT_FOUR != "null_4":
    from multiagent.agent_experts.null_4_expert import null_4_expert, null_4_requester, null_4_collaborator
if AGENT_FIVE != "null_5":
    from multiagent.agent_experts.null_5_expert import null_5_expert, null_5_requester, null_5_collaborator
if AGENT_SIX != "null_6":
    from multiagent.agent_experts.null_6_expert import null_6_expert, null_6_requester, null_6_collaborator
if AGENT_SEVEN != "null_7":
    from multiagent.agent_experts.null_7_expert import null_7_expert, null_7_requester, null_7_collaborator

from team_config import load_config
from multiagent.graphState import GraphState
from multiagent.team.routers import router_expert_input_still_needed, router_check_requester, router_dynamic_librarian, router_check_collaborator, router_expert_reflected, router_dynamic_expert, router_dynamic_collab

from langgraph.graph import StateGraph, END
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI

def US_NATO_Coalition_graph() -> StateGraph:
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
        workflow.add_node("NATO_Military", functools.partial(NATO_Military_expert, llm=streaming_llm))
    if AGENT_ONE != "null_1":
        workflow.add_node("NATO_Regional_Dynamics", functools.partial(NATO_Regional_Dynamics_expert, llm=streaming_llm))
    if AGENT_TWO != "null_2":
        workflow.add_node("US_Military", functools.partial(US_Military_expert, llm=streaming_llm))
    if AGENT_THREE != "null_3":
        workflow.add_node("US_Global_Influence", functools.partial(US_Global_Influence_expert, llm=streaming_llm))
    if AGENT_FOUR != "null_4":
        workflow.add_node("null_4", functools.partial(null_4_expert, llm=streaming_llm))
    if AGENT_FIVE != "null_5":
        workflow.add_node("null_5", functools.partial(null_5_expert, llm=streaming_llm))
    if AGENT_SIX != "null_6":
        workflow.add_node("null_6", functools.partial(null_6_expert, llm=streaming_llm))
    if AGENT_SEVEN != "null_7":
        workflow.add_node("null_7", functools.partial(null_7_expert, llm=streaming_llm))

    #--------------------Requesters--------------------
    if AGENT_ZERO != "null_0":
        workflow.add_node("NATO_Military_requester", NATO_Military_requester)
    if AGENT_ONE != "null_1":
        workflow.add_node("NATO_Regional_Dynamics_requester", NATO_Regional_Dynamics_requester)
    if AGENT_TWO != "null_2":
        workflow.add_node("US_Military_requester", US_Military_requester)
    if AGENT_THREE != "null_3":
        workflow.add_node("US_Global_Influence_requester", US_Global_Influence_requester)
    if AGENT_FOUR != "null_4":
        workflow.add_node("null_4_requester", null_4_requester)
    if AGENT_FIVE != "null_5":
        workflow.add_node("null_5_requester", null_5_requester)
    if AGENT_SIX != "null_6":
        workflow.add_node("null_6_requester", null_6_requester)
    if AGENT_SEVEN != "null_7":
        workflow.add_node("null_7_requester", null_7_requester)

    #--------------------Collaborators--------------------
    if AGENT_ZERO != "null_0":
        workflow.add_node("NATO_Military_collaborator", functools.partial(NATO_Military_collaborator, llm=streaming_llm))
    if AGENT_ONE != "null_1":
        workflow.add_node("NATO_Regional_Dynamics_collaborator", functools.partial(NATO_Regional_Dynamics_collaborator, llm=streaming_llm))
    if AGENT_TWO != "null_2":
        workflow.add_node("US_Military_collaborator", functools.partial(US_Military_collaborator, llm=streaming_llm))
    if AGENT_THREE != "null_3":
        workflow.add_node("US_Global_Influence_collaborator", functools.partial(US_Global_Influence_collaborator, llm=streaming_llm))
    if AGENT_FOUR != "null_4":
        workflow.add_node("null_4_collaborator", functools.partial(null_4_collaborator, llm=streaming_llm))
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