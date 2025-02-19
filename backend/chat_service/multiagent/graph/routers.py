from multiagent.graphState import GraphState, ModGuidanceState, ExpertState, CollabState
from langgraph.types import Send
from multiagent.agents.helpers import create_banner


def router_expert_subgraphs(state: ExpertState):
    print(create_banner("router_expert_subgraphs"))
    selected_experts = state['selected_experts']
    return [] if not selected_experts else [Send("expert_subgraph_entry", {**state, "expert": s}) for s in selected_experts]

def router_get_Moderator_Guidance(state: ModGuidanceState):
    print(create_banner("router_get_Moderator_Guidance"))
    selected_experts = state['selected_experts']
    return [] if not selected_experts else [Send("get_Moderator_Guidance", {**state, "expert": s}) for s in selected_experts]

def router_collaboration_requested(state: CollabState):
    print(create_banner("router_collaboration_requested"))
    selected_experts = state['selected_experts']
    if not selected_experts:
        return []
    
    collaborations = []
    for expert in selected_experts:
        collaborators = state['expert_collaborators_list'].get(expert, [])
        collaborations.extend([Send("collab_subgraph_entry", {**state, "expert": expert, "collaborator": collab}) 
                             for collab in collaborators])
    return collaborations

def router_expert_report(state: GraphState):
    print(create_banner("router_expert_report"))
    selected_experts = state['selected_experts']
    return [] if not selected_experts else [Send("expert_subgraph_report", {**state, "expert": e}) for e in selected_experts]
