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


def router_expert_reflected(state: GraphState):
    """
    This function checks if the last expert has provided their reflection.
    If they have, we go back to the moderator, who decides where to route next.
    If they have not, we go back into the expert node to get them to reflect.
    """
    state_dict = state["keys"]
    last_actor = state_dict["last_actor"]
    reflected = state_dict.get(last_actor+"_reflected", False)

    if reflected:
        return "user_proxy_moderator"
    else:
        return last_actor+"_requester"
    
def router_collaboration_requested(state: GraphState):
    """
    This function is used to determine if the last expert has requested collaboration.
    If they have, we go into the last expert node so they can rewrite their report with the 
    reflection and collaboration input.
    """
    state_dict = state["keys"]
    collaborator = state_dict["collaborator"]
    return collaborator+"_requester"

def router_collaboration_continue(state: GraphState):
    """
    This function is used to determine if the last expert has requested collaboration.
    If they have, we go into the last expert node so they can rewrite their report with the 
    reflection and collaboration input.
    """
    state_dict = state["keys"]
    collaborator = state_dict["collaborator"]
    return collaborator

def router_dynamic_librarian(state: GraphState):
    '''
    This function allows routing to change during run time by changing which routing function
    is utilized based on the collaboration state.

    It will either go into router_check_collaborator or router_check_requester.\n
    -ROUTER_CHECK_COLLABORATOR:
        This function is used for dynamic routing if the last expert has requested collaboration.
        If they have, we go into the last expert node so they can rewrite their report with the 
        reflection and collaboration input.
    -ROUTER_CHECK_REQUESTER:
        This function is used by the librarian to determine which expert needs the documents that were retrieved.
    '''
    # If true, go into collaborator's requester
    if shared_state.COLLAB_LOOP:
        return router_check_collaborator(state)
    else:
        return router_check_requester(state)
    
def router_dynamic_expert(state: GraphState):
    '''
    This function allows routing to change during run time by changing which routing function
    is utilized based on the collaboration state.

    It will either go into router_collaboration_requested or router_expert_reflected.\n
    -ROUTER_COLLABORATION_REQUESTED:
        This function is used to determine if the last expert has requested collaboration.
        If they have, we go into the last expert node so they can rewrite their report with the 
        reflection and collaboration input.
    -ROUTER_EXPERT_REFLECTED:
        This function is used to check if the last expert has provided their reflection.
        If they have, we go back to the moderator, who decides where to route next.
        If they have not, we go back into the expert node to get them to reflect.
    '''
    # If true, go into collaborator's requester
    if shared_state.COLLAB_LOOP:
        return router_collaboration_requested(state)
    else:
        return router_expert_reflected(state)
    
def router_dynamic_collab(state: GraphState):
    """
    This function allows routing to change during the run time by changing which routing function
    is utilized based on if there are still experts waiting to collaborate.

    It will either go into router_expert_input_still_needed if collaboration is done, or router_collaboration_requested.\n
    -ROUTER_EXPERT_INPUT_STILL_NEEDED:
        This function is used to determine if there are any experts that still need to provide input.
        If there are, it returns the next expert that needs to provide input.
        If there are no experts that need to provide input, we are ready for "synthesis".
    -ROUTER_COLLABORATION_REQUESTED:
        This function is used to determine if the last expert has requested collaboration.
        If they have, we go into the last expert node so they can rewrite their report with the 
        reflection and collaboration input.
    """
    if shared_state.MORE_COLLAB:
        return router_collaboration_continue(state)
    else:
        return router_expert_input_still_needed(state)
