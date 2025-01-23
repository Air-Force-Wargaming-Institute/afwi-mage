import functools

from multiagent.agents import *
from config import load_config
from multiagent.graphState import GraphState
from multiagent.graph.routers import router_expert_input_still_needed, router_check_requester, router_dynamic_librarian, router_check_collaborator, router_expert_reflected, router_dynamic_expert, router_dynamic_collab

from langgraph.graph import StateGraph, END
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI

# Add these lines near the top of the file, after the existing imports
TEAM_NAME = "{{TEAM_NAME}}"
TEAM_FILE_NAME = "{{TEAM_FILE_NAME}}"
TEAM_DESCRIPTION = """{{TEAM_DESCRIPTION}}"""
TEAM_COLOR = "{{TEAM_COLOR}}"
CREATED_AT = "{{CREATED_AT}}"
MODIFIED_AT = "{{MODIFIED_AT}}"
TEAM_INSTRUCTIONS = """{{TEAM_INSTRUCTIONS}}""" # Do we actually need team instructions? Where would they be used?
MEMORY_TYPE = "{{MEMORY_TYPE}}"
MEMORY_KWARGS = {{MEMORY_KWARGS}}
AGENT_ZERO = "{{AGENT_ZERO}}"       #default is null_0
AGENT_ONE = "{{AGENT_ONE}}"         #default is null_1
AGENT_TWO = "{{AGENT_TWO}}"         #default is null_2
AGENT_THREE = "{{AGENT_THREE}}"     #default is null_3
AGENT_FOUR = "{{AGENT_FOUR}}"       #default is null_4
AGENT_FIVE = "{{AGENT_FIVE}}"       #default is null_5
AGENT_SIX = "{{AGENT_SIX}}"         #default is null_6
AGENT_SEVEN = "{{AGENT_SEVEN}}"     #default is null_7
AGENT_FILE_NAMES = [{{AGENT_FILE_NAMES}}]

def {{TEAM_FILE_NAME}}_graph() -> StateGraph:
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

    experts = config['EXPERT_AGENTS']

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
    try:
        if AGENT_ZERO != "null_0":
            workflow.add_node("{{AGENT_ZERO}}", functools.partial({{AGENT_ZERO}}_expert, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_ONE != "null_1":
            workflow.add_node("{{AGENT_ONE}}", functools.partial({{AGENT_ONE}}_expert, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_TWO != "null_2":
            workflow.add_node("{{AGENT_TWO}}", functools.partial({{AGENT_TWO}}_expert, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_THREE != "null_3":
            workflow.add_node("{{AGENT_THREE}}", functools.partial({{AGENT_THREE}}_expert, llm=streaming_llm))
    except:
        pass
    try:    
        if AGENT_FOUR != "null_4":
            workflow.add_node("{{AGENT_FOUR}}", functools.partial({{AGENT_FOUR}}_expert, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_FIVE != "null_5":
            workflow.add_node("{{AGENT_FIVE}}", functools.partial({{AGENT_FIVE}}_expert, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_SIX != "null_6":  
            workflow.add_node("{{AGENT_SIX}}", functools.partial({{AGENT_SIX}}_expert, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_SEVEN != "null_7":
            workflow.add_node("{{AGENT_SEVEN}}", functools.partial({{AGENT_SEVEN}}_expert, llm=streaming_llm))
    except:
        pass

    #--------------------Requesters--------------------
    try:
        if AGENT_ZERO != "null_0":
            workflow.add_node("{{AGENT_ZERO}}", functools.partial({{AGENT_ZERO}}}_requester, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_ONE != "null_1":
            workflow.add_node("{{AGENT_ONE}}", functools.partial({{AGENT_ONE}}_requester, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_TWO != "null_2":
            workflow.add_node("{{AGENT_TWO}}", functools.partial({{AGENT_TWO}}_requester, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_THREE != "null_3":
            workflow.add_node("{{AGENT_THREE}}", functools.partial({{AGENT_THREE}}_requester, llm=streaming_llm))
    except:
        pass
    try:    
        if AGENT_FOUR != "null_4":
            workflow.add_node("{{AGENT_FOUR}}", functools.partial({{AGENT_FOUR}}_requester, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_FIVE != "null_5"   :
            workflow.add_node("{{AGENT_FIVE}}", functools.partial({{AGENT_FIVE}}_requester, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_SIX != "null_6":  
            workflow.add_node("{{AGENT_SIX}}", functools.partial({{AGENT_SIX}}_requester, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_SEVEN != "null_7":
            workflow.add_node("{{AGENT_SEVEN}}", functools.partial({{AGENT_SEVEN}}_requester, llm=streaming_llm))
    except:
        pass

    #--------------------Collaborators--------------------
    try:
        if AGENT_ZERO != "null_0":
            workflow.add_node("{{AGENT_ZERO}}", functools.partial({{AGENT_ZERO}}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_ONE != "null_1":
            workflow.add_node("{{AGENT_ONE}}", functools.partial({{AGENT_ONE}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_TWO != "null_2":
            workflow.add_node("{{AGENT_TWO}}", functools.partial({{AGENT_TWO}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_THREE != "null_3":
            workflow.add_node("{{AGENT_THREE}}", functools.partial({{AGENT_THREE}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:    
        if AGENT_FOUR != "null_4":
            workflow.add_node("{{AGENT_FOUR}}", functools.partial({{AGENT_FOUR}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:
        if AGENT_FIVE != "null_5":
            workflow.add_node("{{AGENT_FIVE}}", functools.partial({{AGENT_FIVE}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:
        if experts[6] != "null_6":  
            workflow.add_node("{{AGENT_SIX}}", functools.partial({{AGENT_SIX}}_collaborator, llm=streaming_llm))
    except:
        pass
    try:
        if experts[7] != "null_7":
            workflow.add_node("{{AGENT_SEVEN}}", functools.partial({{AGENT_SEVEN}}_collaborator, llm=streaming_llm))
    except:
        pass

    # Start at user proxy
    workflow.set_entry_point("conversation_history_manager")
    workflow.set_finish_point("synthesis")

    workflow.add_edge("conversation_history_manager", "user_proxy_moderator")

    # Conditional edges represent potential paths the program can take.
    # It cannot be determined what the expert will be needed until the user submits a question, thus routing functions are 
    # used to determine the next step during runtime.
    # Routing functions return some value that is definded mapping dictionary.
    # The key is the value that the routing function returns, and the value is the node that the program should flow to.
    workflow.add_conditional_edges("user_proxy_moderator", router_dynamic_collab, 
                                   {"{{AGENT_ZERO}}": "{{AGENT_ZERO}}_requester",
                                    "{{AGENT_ONE}}": "{{AGENT_ONE}}_requester",
                                    "{{AGENT_TWO}}": "{{AGENT_TWO}}_requester",
                                    "{{AGENT_THREE}}": "{{AGENT_THREE}}_requester",
                                    "{{AGENT_FOUR}}": "{{AGENT_FOUR}}_requester",
                                    "{{AGENT_FIVE}}": "{{AGENT_FIVE}}_requester",
                                    "{{AGENT_SIX}}": "{{AGENT_SIX}}_requester",
                                    "{{AGENT_SEVEN}}": "{{AGENT_SEVEN}}_requester",
                                    "synthesis": "synthesis"
                                    })

    # Regular edges are paths the program will ALWAYS take. You should not have multiple regular edges coming out of a node,
    # nor should you have a regular edge and a conditional edge coming out of a node.
    for e in experts:
        workflow.add_edge(e+"_requester", "librarian")
        #workflow.add_edge(e, "user_proxy_moderator")
        workflow.add_conditional_edges(e, router_dynamic_expert,
                                       {"{{AGENT_ZERO}}_requester": "{{AGENT_ZERO}}_requester",
                                        "{{AGENT_ONE}}_requester": "{{AGENT_ONE}}_requester",
                                        "{{AGENT_TWO}}_requester": "{{AGENT_TWO}}_requester",
                                        "{{AGENT_THREE}}_requester": "{{AGENT_THREE}}_requester",
                                        "{{AGENT_FOUR}}_requester": "{{AGENT_FOUR}}_requester",
                                        "{{AGENT_FIVE}}_requester": "{{AGENT_FIVE}}_requester",
                                        "{{AGENT_SIX}}_requester": "{{AGENT_SIX}}_requester",
                                        "{{AGENT_SEVEN}}_requester": "{{AGENT_SEVEN}}_requester",
                                        "{{AGENT_ZERO}}_collaborator": "{{AGENT_ZERO}}_collaborator",
                                        "{{AGENT_ONE}}_collaborator": "{{AGENT_ONE}}_collaborator",
                                        "{{AGENT_TWO}}_collaborator": "{{AGENT_TWO}}_collaborator",
                                        "{{AGENT_THREE}}_collaborator": "{{AGENT_THREE}}_collaborator",
                                        "{{AGENT_FOUR}}_collaborator": "{{AGENT_FOUR}}_collaborator",
                                        "{{AGENT_FIVE}}_collaborator": "{{AGENT_FIVE}}_collaborator",
                                        "{{AGENT_SIX}}_collaborator": "{{AGENT_SIX}}_collaborator",
                                        "{{AGENT_SEVEN}}_collaborator": "{{AGENT_SEVEN}}_collaborator",
                                        "user_proxy_moderator": "user_proxy_moderator"
                                        })
        workflow.add_conditional_edges(e+"_collaborator", router_expert_reflected,
                                       {"{{AGENT_ZERO}}_requester": "{{AGENT_ZERO}}_requester",
                                        "{{AGENT_ONE}}_requester": "{{AGENT_ONE}}_requester",
                                        "{{AGENT_TWO}}_requester": "{{AGENT_TWO}}_requester",
                                        "{{AGENT_THREE}}_requester": "{{AGENT_THREE}}_requester",
                                        "{{AGENT_FOUR}}_requester": "{{AGENT_FOUR}}_requester",
                                        "{{AGENT_FIVE}}_requester": "{{AGENT_FIVE}}_requester",
                                        "{{AGENT_SIX}}_requester": "{{AGENT_SIX}}_requester",
                                        "{{AGENT_SEVEN}}_requester": "{{AGENT_SEVEN}}_requester",
                                        "user_proxy_moderator": "user_proxy_moderator",
                                        })

    # Edges out of the librarian change based on the value of shared_state.COLLAB_LOOP using router_dynamic_routing
    # If COLLAB_LOOP is True, the edges point to the collaborator nodes.
    # If COLLAB_LOOP is False, the edges point to the original expert nodes.
    workflow.add_conditional_edges("librarian", router_dynamic_librarian,
                                   {"{{AGENT_ZERO}}": "{{AGENT_ZERO}}",
                                    "{{AGENT_ONE}}": "{{AGENT_ONE}}",
                                    "{{AGENT_TWO}}": "{{AGENT_TWO}}",
                                    "{{AGENT_THREE}}": "{{AGENT_THREE}}",
                                    "{{AGENT_FOUR}}": "{{AGENT_FOUR}}",
                                    "{{AGENT_FIVE}}": "{{AGENT_FIVE}}",
                                    "{{AGENT_SIX}}": "{{AGENT_SIX}}",
                                    "{{AGENT_SEVEN}}": "{{AGENT_SEVEN}}",
                                    "{{AGENT_ZERO}}_collaborator": "{{AGENT_ZERO}}_collaborator",
                                    "{{AGENT_ONE}}_collaborator": "{{AGENT_ONE}}_collaborator",
                                    "{{AGENT_TWO}}_collaborator": "{{AGENT_TWO}}_collaborator",
                                    "{{AGENT_THREE}}_collaborator": "{{AGENT_THREE}}_collaborator",
                                    "{{AGENT_FOUR}}_collaborator": "{{AGENT_FOUR}}_collaborator",
                                    "{{AGENT_FIVE}}_collaborator": "{{AGENT_FIVE}}_collaborator",
                                    "{{AGENT_SIX}}_collaborator": "{{AGENT_SIX}}_collaborator",
                                    "{{AGENT_SEVEN}}_collaborator": "{{AGENT_SEVEN}}_collaborator",
                                   })

    # Once the program reaches the "synthesis" agent, always flow to the end of the program
    workflow.add_edge("synthesis", END)

    return workflow.compile()