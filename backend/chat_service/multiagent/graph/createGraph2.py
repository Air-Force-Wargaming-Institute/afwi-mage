from typing import Dict
from multiagent.agents import *
from config import load_config
from multiagent.graphState import GraphState
from multiagent.graph.routers import (
    router_dynamic_librarian, 
    router_expert_reflected, 
    router_dynamic_expert, 
    router_dynamic_collab,
    router_expert_subgraphs,
    router_get_Moderator_Guidance
)
from langgraph.graph import StateGraph, END
from typing import Dict, TypedDict

class GraphState(TypedDict):
    keys: Dict[str, any]
class ExpertState(TypedDict):
    keys: Dict[str, any]

def create_graph() -> StateGraph:
    """
    Creates the agent graph for the multi-agent system.
    Defines the process for streaming agent output instead of waiting for the entire output to be generated.
    """
    workflow = StateGraph(GraphState)

    # Define list of experts
    experts = [
        "prc_government", 
        "prc_military", 
        "prc_economic", 
        "regional_dynamics", 
        "global_influence", 
        "technology_innovation", 
        "domestic_stability"
    ]

    # Add base nodes
    workflow.add_node("conversation_history_manager", conversation_history_manager)
    workflow.add_node("identify_experts", identify_experts)
    workflow.add_edge("conversation_history_manager", "identify_experts")
    workflow.add_node("get_Moderator_Guidance", get_Moderator_Guidance)
    workflow.add_conditional_edges("identify_experts",router_get_Moderator_Guidance, ["get_Moderator_Guidance"])
    
    for expert in experts:
        workflow.add_node(expert, globals()[f"{expert}_expert"])
        workflow.add_node(f"{expert}_requester", globals()[f"{expert}_requester"])
        workflow.add_node(f"{expert}_collaborator", globals()[f"{expert}_collaborator"])
    
    
    requester_routes = {expert: f"{expert}_requester" for expert in experts}
    workflow.add_conditional_edges("get_Moderator_Guidance", router_expert_subgraphs, requester_routes)
    
    workflow.add_node("synthesis", synthesis_agent)

    # Add expert nodes


    # Set entry and exit points
    workflow.set_entry_point("conversation_history_manager")
    workflow.set_finish_point("synthesis")

    # Add initial flow
    workflow.add_edge("conversation_history_manager", "user_proxy_moderator")
    workflow.add_edge("user_proxy_moderator", )

    workflow.add_edge("synthesis", END)

    # Add dynamic routing from user proxy to requesters
    requester_routes = {expert: f"{expert}_requester" for expert in experts}
    requester_routes["synthesis"] = "synthesis"
    workflow.add_conditional_edges(
        "user_proxy_moderator", 
        router_dynamic_collab, 
        requester_routes
    )

    # Add expert routing paths
    for expert in experts:
        # Connect requester to librarian
        workflow.add_edge(f"{expert}_requester", "librarian")

        # Add dynamic expert routing
        expert_routes = {
            f"{e}_requester": f"{e}_requester" for e in experts
        }
        expert_routes.update({
            f"{e}_collaborator": f"{e}_collaborator" for e in experts
        })
        expert_routes["user_proxy_moderator"] = "user_proxy_moderator"
        workflow.add_conditional_edges(expert, router_dynamic_expert, expert_routes)

        # Add collaborator routing
        collab_routes = {
            f"{e}_requester": f"{e}_requester" for e in experts
        }
        collab_routes["user_proxy_moderator"] = "user_proxy_moderator"
        workflow.add_conditional_edges(
            f"{expert}_collaborator", 
            router_expert_reflected, 
            collab_routes
        )

    # Add librarian routing
    librarian_routes = {expert: expert for expert in experts}
    librarian_routes.update({
        f"{expert}_collaborator": f"{expert}_collaborator" for expert in experts
    })
    workflow.add_conditional_edges("librarian", router_dynamic_librarian, librarian_routes)

    return workflow.compile()