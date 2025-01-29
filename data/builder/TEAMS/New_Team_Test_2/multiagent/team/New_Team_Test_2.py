# Add these lines near the top of the file, after the existing imports
TEAM_NAME = "New Team Test 2"
TEAM_FILE_NAME = "New_Team_Test_2"
TEAM_DESCRIPTION = """New Team Test 2"""
TEAM_COLOR = "#FF0000"
CREATED_AT = "2025-01-29T22:43:23.698889"
MODIFIED_AT = "2025-01-29T23:12:42.430864"
TEAM_INSTRUCTIONS = """""" # Do we actually need team instructions? Where would they be used?
MEMORY_TYPE = "ConversationBufferMemory"
MEMORY_KWARGS = {"max_token_limit": 2000}
AGENT_ZERO = "Agent_Test"       #default is null_0
AGENT_ONE = "new_agent_2"         #default is null_1
AGENT_TWO = "null_2"         #default is null_2
AGENT_THREE = "null_3"     #default is null_3
AGENT_FOUR = "null_4"       #default is null_4
AGENT_FIVE = "null_5"       #default is null_5
AGENT_SIX = "null_6"         #default is null_6
AGENT_SEVEN = "null_7"     #default is null_7
AGENT_FILE_NAMES = ['Agent_Test', 'new_agent_2']
AGENT_FILE_INSTRUCTIONS = ["Do what the user wants", "asdfasdfa asdfasdfasdf"]

import functools
from multiagent.system_agents.conversation_history_manager import conversation_history_manager
from multiagent.system_agents.user_proxy_moderator import user_proxy_moderator
from multiagent.system_agents.librarian_agent import librarian_agent
from multiagent.system_agents.synthesis_agent import synthesis_agent
if AGENT_ZERO != "null_0":
    from multiagent.agent_experts.Agent_Test_expert import Agent_Test_expert, Agent_Test_requester, Agent_Test_collaborator
if AGENT_ONE != "null_1":
    from multiagent.agent_experts.new_agent_2_expert import new_agent_2_expert, new_agent_2_requester, new_agent_2_collaborator
if AGENT_TWO != "null_2":
    from multiagent.agent_experts.null_2_expert import null_2_expert, null_2_requester, null_2_collaborator
if AGENT_THREE != "null_3":
    from multiagent.agent_experts.null_3_expert import null_3_expert, null_3_requester, null_3_collaborator
if AGENT_FOUR != "null_4":
    from multiagent.agent_experts.null_4_expert import null_4_expert, null_4_requester, null_4_collaborator
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

def New_Team_Test_2_graph() -> StateGraph:
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
        workflow.add_node("Agent_Test", functools.partial(Agent_Test_expert, llm=streaming_llm))
    if AGENT_ONE != "null_1":
        workflow.add_node("new_agent_2", functools.partial(new_agent_2_expert, llm=streaming_llm))
    if AGENT_TWO != "null_2":
        workflow.add_node("null_2", functools.partial(null_2_expert, llm=streaming_llm))
    if AGENT_THREE != "null_3":
        workflow.add_node("null_3", functools.partial(null_3_expert, llm=streaming_llm))
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
        workflow.add_node("Agent_Test_requester", Agent_Test_requester)
    if AGENT_ONE != "null_1":
        workflow.add_node("new_agent_2_requester", new_agent_2_requester)
    if AGENT_TWO != "null_2":
        workflow.add_node("null_2_requester", null_2_requester)
    if AGENT_THREE != "null_3":
        workflow.add_node("null_3_requester", null_3_requester)
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
        workflow.add_node("Agent_Test_collaborator", functools.partial(Agent_Test_collaborator, llm=streaming_llm))
    if AGENT_ONE != "null_1":
        workflow.add_node("new_agent_2_collaborator", functools.partial(new_agent_2_collaborator, llm=streaming_llm))
    if AGENT_TWO != "null_2":
        workflow.add_node("null_2_collaborator", functools.partial(null_2_collaborator, llm=streaming_llm))
    if AGENT_THREE != "null_3":
        workflow.add_node("null_3_collaborator", functools.partial(null_3_collaborator, llm=streaming_llm))
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