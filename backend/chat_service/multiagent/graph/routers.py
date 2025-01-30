from multiagent.graphState import GraphState
from utils.shared_state import shared_state
from langgraph.types import Send

def router_expert_subgraphs(state: GraphState):
    print("\nrouter_expert_subgraphs\n")
    print(state)
    return [Send("expert_subgraph_entry", {**state, "expert": key}) for key in state['expert_moderator_guidance'][0].keys()]

def router_get_Moderator_Guidance(state: GraphState):
    print("\nrouter_get_Moderator_Guidance\n")
    print(state)
    return [Send("get_Moderator_Guidance", {**state, "expert": s}) for s in state['selected_experts']]

def router_collaboration_requested(state: GraphState):
    print("router_collaboration_requested")
    print(state)

    for key in state['expert_analysis'][0].keys():
        whoami = key
    ex_collab_list = next(
            collab_list[whoami] 
            for collab_list in state['expert_collaborators_list'] 
            if whoami in collab_list
        )

    return [Send("collab_subgraph_entry", {**state, "expert": key, "collaborator": collab}) for key in state['expert_analysis'][0].keys() for collab in ex_collab_list]

def router_expert_report(state: GraphState):
    print("\nrouter_expert_report\n")
    print(state)
    return [Send("expert_subgraph_entry", {**state, "expert": key}) for key in state['expert_analysis'][0].keys()]
