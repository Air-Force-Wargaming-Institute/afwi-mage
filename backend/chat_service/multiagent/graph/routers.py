from multiagent.graphState import GraphState, ModGuidanceState, ExpertState, CollabState
from langgraph.types import Send
from multiagent.agents.helpers import create_banner


def router_expert_subgraphs(state: ExpertState):
    print(create_banner("router_expert_subgraphs"))
    selected_experts = state['selected_experts']
    return [Send("expert_subgraph_entry", {**state, "expert": s}) for s in selected_experts]

def router_get_Moderator_Guidance(state: ModGuidanceState):
    print(create_banner("router_get_Moderator_Guidance"))
    selected_experts = state['selected_experts']
    return [Send("get_Moderator_Guidance", {**state, "expert": s}) for s in selected_experts]

def router_collaboration_requested(state: CollabState):
    print(create_banner("router_collaboration_requested"))
    return [Send("collab_subgraph_entry", {**state, "expert": e, "collaborator": collab}) for e in state['selected_experts'] for collab in state['expert_collaborators_list'][e]]

def router_expert_report(state: GraphState):
    print(create_banner("router_expert_report"))
    return [Send("expert_subgraph_report", {**state, "expert": e}) for e in state['selected_experts']]
