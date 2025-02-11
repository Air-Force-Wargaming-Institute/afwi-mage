<<<<<<< HEAD:data/builder/TEAMS/PRC_Expert_Panel/multiagent/team/routers.py
from multiagent.graphState import GraphState
from utils.shared_state import shared_state

def router_expert_input_still_needed(state: GraphState):
    """
    This function checks if there are any experts that still need to provide input.
    If there are, it returns the next expert that needs to provide input.
    If there are no experts that need to provide input, we are ready for "synthesis".
    """
    state_dict = state["keys"]
    selected_experts = state_dict["selected_experts"]
    if len(selected_experts) > 0:
        return selected_experts[0]
    else:
        return "synthesis"
    
def router_check_requester(state: GraphState):
    """
    This function is used by the librarian to determine which expert needs the documents that were retrieved.
    """
    state_dict = state["keys"]
    last_actor = state_dict["last_actor"]
    return last_actor

def router_check_collaborator(state: GraphState):
    """
    This function is used for dynamic routing if the last expert has requested collaboration.
    If they have, we go into the last expert node so they can rewrite their report with the 
    reflection and collaboration input.
    """
    state_dict = state["keys"]
    collaborator = state_dict["collaborator"]
    return collaborator+"_collaborator"
=======
from multiagent.graphState import GraphState, ModGuidanceState, ExpertState, CollabState
from langgraph.types import Send
from multiagent.agents.helpers import create_banner
>>>>>>> origin/Agent-Parallelization:backend/chat_service/multiagent/graph/routers.py


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
