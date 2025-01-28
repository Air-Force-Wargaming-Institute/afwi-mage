import operator
from typing import Dict, TypedDict, Annotated

class collaboratorstate(TypedDict):
    analysis: str
    moderator_guidance: str

class expertstate(TypedDict):
    moderator_guidance: str
    analysis: str
    reflection: str
    collab_areas: str
    collaborators_list: list[str]
    collaborator_data: Annotated[Dict[str, any], operator.add]

class GraphState(TypedDict):
    question: str
    selected_experts: list[str]
    expert_data: Annotated[Dict[str, expertstate], operator.add]


