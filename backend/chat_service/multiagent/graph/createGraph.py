import functools

from multiagent.agents import *
from config import load_config
from multiagent.graphState import GraphState
from multiagent.graph.routers import router_expert_input_still_needed, router_check_requester, router_dynamic_librarian, router_check_collaborator, router_expert_reflected, router_dynamic_expert, router_dynamic_collab

from langgraph.graph import StateGraph, END
from langchain_core.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from langchain_openai import ChatOpenAI

def create_graph() -> StateGraph:
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

    experts = ["prc_government", "prc_military", "prc_economic", "regional_dynamics", "global_influence", "domestic_stability", "technology_innovation"]

    streaming_llm = ChatOpenAI(temperature=TEMPERATURE, base_url=BASE_URL, api_key=API_KEY, max_tokens=MAX_TOKENS, streaming=True, callbacks=callbacks, model=LOCAL_LLM)

    non_streaming_llm = ChatOpenAI(temperature=TEMPERATURE, base_url=BASE_URL, api_key=API_KEY, max_tokens=MAX_TOKENS, model=LOCAL_LLM)

    # Nodes are the logical steps in the program. Each node represents an agent that performs a small step in answering the user's question.
    # The use of functools.partial allows us to pass the LLM to the agent so that the agent can stream its output.
    # We don't stream the librarian because half of what it does (retrieving documents) cannot be streamed.
    workflow.add_node("conversation_history_manager", functools.partial(conversation_history_manager, llm=non_streaming_llm))
    workflow.add_node("user_proxy_moderator", functools.partial(user_proxy_moderator, llm=streaming_llm))
    workflow.add_node("librarian", functools.partial(librarian_agent, llm=non_streaming_llm))
    workflow.add_node("prc_government", functools.partial(prc_government_expert, llm=streaming_llm))
    workflow.add_node("prc_military", functools.partial(prc_military_expert, llm=streaming_llm))
    workflow.add_node("prc_economic", functools.partial(prc_economic_expert, llm=streaming_llm))
    workflow.add_node("regional_dynamics", functools.partial(regional_dynamics_expert, llm=streaming_llm))
    workflow.add_node("global_influence", functools.partial(global_influence_expert, llm=streaming_llm))
    workflow.add_node("technology_innovation", functools.partial(technology_innovation_expert, llm=streaming_llm))
    workflow.add_node("domestic_stability", functools.partial(domestic_stability_expert, llm=streaming_llm))
    workflow.add_node("synthesis", functools.partial(synthesis_agent, llm=streaming_llm))

    workflow.add_node("prc_government_requester", prc_government_requester)
    workflow.add_node("prc_military_requester", prc_military_requester)
    workflow.add_node("prc_economic_requester", prc_economic_requester)
    workflow.add_node("regional_dynamics_requester", regional_dynamics_requester)
    workflow.add_node("global_influence_requester", global_influence_requester)
    workflow.add_node("technology_innovation_requester", technology_innovation_requester)
    workflow.add_node("domestic_stability_requester", domestic_stability_requester)

    workflow.add_node("prc_government_collaborator", functools.partial(prc_government_collaborator, llm=streaming_llm))
    workflow.add_node("prc_military_collaborator", functools.partial(prc_military_collaborator, llm=streaming_llm))
    workflow.add_node("prc_economic_collaborator", functools.partial(prc_economic_collaborator, llm=streaming_llm))
    workflow.add_node("regional_dynamics_collaborator", functools.partial(regional_dynamics_collaborator, llm=streaming_llm))
    workflow.add_node("global_influence_collaborator", functools.partial(global_influence_collaborator, llm=streaming_llm))
    workflow.add_node("technology_innovation_collaborator", functools.partial(technology_innovation_collaborator, llm=streaming_llm))
    workflow.add_node("domestic_stability_collaborator", functools.partial(domestic_stability_collaborator, llm=streaming_llm))

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
                                   {"prc_government": "prc_government_requester",
                                    "prc_military": "prc_military_requester",
                                    "prc_economic": "prc_economic_requester",
                                    "regional_dynamics": "regional_dynamics_requester",
                                    "global_influence": "global_influence_requester",
                                    "domestic_stability": "domestic_stability_requester",
                                    "technology_innovation": "technology_innovation_requester",
                                    "synthesis": "synthesis"
                                    })

    # Regular edges are paths the program will ALWAYS take. You should not have multiple regular edges coming out of a node,
    # nor should you have a regular edge and a conditional edge coming out of a node.
    for e in experts:
        workflow.add_edge(e+"_requester", "librarian")
        #workflow.add_edge(e, "user_proxy_moderator")
        workflow.add_conditional_edges(e, router_dynamic_expert,
                                       {"prc_government_requester": "prc_government_requester",
                                        "prc_military_requester": "prc_military_requester",
                                        "prc_economic_requester": "prc_economic_requester",
                                        "regional_dynamics_requester": "regional_dynamics_requester",
                                        "global_influence_requester": "global_influence_requester",
                                        "domestic_stability_requester": "domestic_stability_requester",
                                        "technology_innovation_requester": "technology_innovation_requester",
                                        "prc_government_collaborator": "prc_government_collaborator",
                                        "prc_military_collaborator": "prc_military_collaborator",
                                        "prc_economic_collaborator": "prc_economic_collaborator",
                                        "regional_dynamics_collaborator": "regional_dynamics_collaborator",
                                        "global_influence_collaborator": "global_influence_collaborator",
                                        "technology_innovation_collaborator": "technology_innovation_collaborator",
                                        "domestic_stability_collaborator": "domestic_stability_collaborator",
                                        "user_proxy_moderator": "user_proxy_moderator"
                                        })
        workflow.add_conditional_edges(e+"_collaborator", router_expert_reflected,
                                       {"prc_government_requester": "prc_government_requester",
                                        "prc_military_requester": "prc_military_requester",
                                        "prc_economic_requester": "prc_economic_requester",
                                        "regional_dynamics_requester": "regional_dynamics_requester",
                                        "global_influence_requester": "global_influence_requester",
                                        "domestic_stability_requester": "domestic_stability_requester",
                                        "technology_innovation_requester": "technology_innovation_requester",
                                        "user_proxy_moderator": "user_proxy_moderator",
                                        })

    # Edges out of the librarian change based on the value of shared_state.COLLAB_LOOP using router_dynamic_routing
    # If COLLAB_LOOP is True, the edges point to the collaborator nodes.
    # If COLLAB_LOOP is False, the edges point to the original expert nodes.
    workflow.add_conditional_edges("librarian", router_dynamic_librarian,
                                   {"prc_government": "prc_government",
                                    "prc_military": "prc_military",
                                    "prc_economic": "prc_economic",
                                    "regional_dynamics": "regional_dynamics",
                                    "global_influence": "global_influence",
                                    "domestic_stability": "domestic_stability",
                                    "technology_innovation": "technology_innovation",
                                    "prc_government_collaborator": "prc_government_collaborator",
                                    "prc_military_collaborator": "prc_military_collaborator",
                                    "prc_economic_collaborator": "prc_economic_collaborator",
                                    "regional_dynamics_collaborator": "regional_dynamics_collaborator",
                                    "global_influence_collaborator": "global_influence_collaborator",
                                    "technology_innovation_collaborator": "technology_innovation_collaborator",
                                    "domestic_stability_collaborator": "domestic_stability_collaborator",
                                   })

    # Once the program reaches the "synthesis" agent, always flow to the end of the program
    workflow.add_edge("synthesis", END)

    return workflow.compile()