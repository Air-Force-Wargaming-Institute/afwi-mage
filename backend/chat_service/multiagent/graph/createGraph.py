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
    router_get_Moderator_Guidance,
    router_collaboration_requested,
    router_expert_report
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
    
    workflow.add_node("expert_subgraph_entry", expert_subgraph_entry)
    workflow.add_conditional_edges("get_Moderator_Guidance", router_expert_subgraphs, ["expert_subgraph_entry"])
    workflow.add_node("collab_subgraph_entry", collab_subgraph_entry)
    workflow.add_conditional_edges("expert_subgraph_entry", router_collaboration_requested, ["collab_subgraph_entry"])
    workflow.add_node("expert_subgraph_report", expert_subgraph_report)
    workflow.add_conditional_edges("expert_subgraph_report", router_expert_report, ["expert_subgraph_report"])
    workflow.add_edge("expert_subgraph_report", "synthesis")
    workflow.add_node("synthesis", synthesis_agent)
    workflow.add_edge("synthesis", END)

    return workflow.compile()