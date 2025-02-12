import logging
from typing import Dict
from multiagent.agents import *
from config_ import load_config
import sys
from multiagent.graph.routers import (
    router_expert_subgraphs,
    router_get_Moderator_Guidance,
    router_collaboration_requested,
    router_expert_report
)
from langgraph.graph import StateGraph, END
from multiagent.graphState import GraphState, ExpertState, ModGuidanceState, CollabState

logger = logging.getLogger(__name__)

def collab_subgraph_start(state: CollabState):
    return

def expert_subgraph_start(state: ExpertState):
    return

def modguidance_subgraph_entry(state: ModGuidanceState):
    return

def expert_subgraph_report_start(state: GraphState):
    return

def create_graph() -> StateGraph:
    """
    Creates the agent graph for the multi-agent system.
    Defines the process for streaming agent output instead of waiting for the entire output to be generated.
    """
    logger.info("Creating new agent graph")
    
    subworkflow = StateGraph(ExpertState)
    logger.debug("Adding expert subgraph nodes")
    subworkflow.add_node("expert_subgraph_entry", expert_subgraph_entry)
    subworkflow.add_node("expert_subgraph_start", expert_subgraph_start)

    subworkflow.set_entry_point("expert_subgraph_start")
    subworkflow.add_conditional_edges("expert_subgraph_start", router_expert_subgraphs,["expert_subgraph_entry"])
    subworkflow.add_edge("expert_subgraph_entry", END)
    
    subworkflow4 = StateGraph(GraphState)
    subworkflow4.add_node("expert_subgraph_report", expert_subgraph_report)
    subworkflow4.add_node("expert_subgraph_report_start", expert_subgraph_report_start)

    subworkflow4.set_entry_point("expert_subgraph_report_start")
    subworkflow4.add_conditional_edges("expert_subgraph_report_start", router_expert_report,["expert_subgraph_report"])
    subworkflow4.add_edge("expert_subgraph_report", END)

    subworkflow2 = StateGraph(ModGuidanceState)
    subworkflow2.add_node("modguidance_subgraph_entry", modguidance_subgraph_entry)
    subworkflow2.add_node("get_Moderator_Guidance", get_Moderator_Guidance)

    subworkflow2.set_entry_point("modguidance_subgraph_entry")
    subworkflow2.add_conditional_edges("modguidance_subgraph_entry", router_get_Moderator_Guidance, ["get_Moderator_Guidance"])
    subworkflow2.add_edge("get_Moderator_Guidance", END)
    
    subworkflow3 = StateGraph(CollabState)
    subworkflow3.add_node("collab_subgraph_entry", collab_subgraph_entry)
    subworkflow3.add_node("collab_subgraph_start", collab_subgraph_start)

    subworkflow3.set_entry_point("collab_subgraph_start")
    subworkflow3.add_conditional_edges("collab_subgraph_start", router_collaboration_requested,["collab_subgraph_entry"])
    subworkflow3.add_edge("collab_subgraph_entry", END)
    
    
    workflow = StateGraph(GraphState)
    # Add base nodes
    workflow.add_node("conversation_history_manager", conversation_history_manager)
    workflow.add_node("identify_experts", identify_experts)
    workflow.add_node("get_Moderator_Guidance", get_Moderator_Guidance)
    workflow.add_node("modguidance_subgraph", subworkflow2.compile())
    workflow.add_node("expert_subgraph", subworkflow.compile())
    workflow.add_node("expert_subgraph_entry", expert_subgraph_entry)
    workflow.add_node("collab_subgraph", subworkflow3.compile())
    workflow.add_node("expert_subgraph_report", subworkflow4.compile())
    workflow.add_node("synthesis", synthesis_agent)
    
    workflow.set_entry_point("conversation_history_manager")
    workflow.add_edge("conversation_history_manager", "identify_experts")
    workflow.add_edge("identify_experts", "modguidance_subgraph")
    workflow.add_edge("modguidance_subgraph","expert_subgraph")

    workflow.add_edge("expert_subgraph", "collab_subgraph")
    workflow.add_edge("collab_subgraph", "expert_subgraph_report")
    workflow.add_edge("expert_subgraph_report", "synthesis")
    workflow.add_edge("synthesis", END)
    
    logger.info("Agent graph creation complete")
    return workflow.compile()