from multiagent.graphState import GraphState, ModGuidanceState, ExpertState, CollabState
from utils.shared_state import shared_state
from langgraph.types import Send

def router_expert_subgraphs(state: ExpertState):
    print("\nrouter_expert_subgraphs\n")
    selected_experts = state['selected_experts']
    return [Send("expert_subgraph_entry", {**state, "expert": s}) for s in selected_experts]

def router_get_Moderator_Guidance(state: ModGuidanceState):
    print("\nrouter_get_Moderator_Guidance\n")
    selected_experts = state['selected_experts']
    return [Send("get_Moderator_Guidance", {**state, "expert": s}) for s in selected_experts]

def router_collaboration_requested(state: CollabState):
    print("router_collaboration_requested")
    return [Send("collab_subgraph_entry", {**state, "expert": e, "collaborator": collab}) for e in state['selected_experts'] for collab in state['expert_collaborators_list'][e]]

def router_expert_report(state: GraphState):
    print("\nrouter_expert_report\n")
    print(state['expert_collaborator_analysis'])
    return [Send("expert_subgraph_report", {**state, "expert": e}) for e in state['selected_experts']]
