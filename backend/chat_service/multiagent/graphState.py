import operator
from typing import Dict, TypedDict, Annotated, Set
from langchain_core.messages import BaseMessage, AnyMessage
from langgraph.graph.message import add_messages

class GraphState(TypedDict):
    question: str
    conversation_history: str
    iteration: int
    expert_list: list[str]
    expert_descriptions: list[str]
    selected_experts: list[str]
    expert_moderator_guidance: Annotated[Dict[str, str], operator.__ior__]
    expert_analysis: Annotated[Dict[str, str], operator.__ior__]
    expert_reflection: Annotated[Dict[str, str], operator.__ior__]
    expert_collab_areas: Annotated[Dict[str, list[str]], operator.__ior__]
    expert_collaborators_list: Annotated[Dict[str, list[str]], operator.__ior__]
    expert_collaborator_analysis: Annotated[list[Dict[str, str]], operator.add]
    expert_final_analysis: Annotated[Dict[str, str], operator.__ior__]
    synthesized_report: str

class ExpertState(TypedDict):
    question: str
    selected_experts: list[str]
    expert_moderator_guidance: Annotated[Dict[str, str], operator.__ior__]
    expert_analysis: Annotated[Dict[str, str], operator.__ior__]
    expert_reflection: Annotated[Dict[str, str], operator.__ior__]      
    expert_collab_areas: Annotated[Dict[str, list[str]], operator.__ior__]
    expert_collaborators_list: Annotated[Dict[str, list[str]], operator.__ior__]
    expert_collaborator_analysis: Annotated[list[Dict[str, str]], operator.add]
    expert_final_analysis: Annotated[Dict[str, str], operator.__ior__]

class ModGuidanceState(TypedDict):
    question: str
    selected_experts: list[str]
    expert_moderator_guidance: Annotated[Dict[str, str], operator.__ior__]

class CollabState(TypedDict):
    question: str
    selected_experts: list[str]
    expert_collaborators_list: Annotated[Dict[str, list[str]], operator.__ior__]
    expert_analysis: Annotated[Dict[str, str], operator.__ior__]
    expert_collab_areas: Annotated[Dict[str, list[str]], operator.__ior__]
    expert_collaborator_analysis: Annotated[list[Dict[str, str]], operator.add]
