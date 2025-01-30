import operator
from typing import Dict, TypedDict, Annotated, Set
from langchain_core.messages import BaseMessage, AnyMessage
from langgraph.graph.message import add_messages

class GraphState(TypedDict):
    question: str
    conversation_history: str
    selected_experts: list[str]
    expert_moderator_guidance: Annotated[list[Dict[str, str]], operator.add]
    expert_analysis: Annotated[list[Dict[str, str]], operator.add]
    expert_reflection: Annotated[list[Dict[str, str]], operator.add]
    expert_collab_areas: Annotated[list[Dict[str, list[str]]], operator.add]
    expert_collaborators_list: Annotated[list[Dict[str, list[str]]], operator.add]
    expert_collaborator_analysis: Annotated[list[Dict[str, Dict[str, str]]], operator.add]
    expert_final_analysis: Annotated[list[Dict[str, str]], operator.add]
    synthesized_report: str

class ExpertState(TypedDict):
    question: str
    selected_experts: list[str]
    expert_moderator_guidance: list[Dict[str, str]]
    expert_analysis: Dict[str, str]
    expert_reflection: Dict[str, str]
    expert_collab_areas: Dict[str, list[str]]
    expert_collaborators_list: Dict[str, list[str]]

class ModGuidanceState(TypedDict):
    question: str
    selected_experts: list[str]
    expert_moderator_guidance: Dict[str, str]

