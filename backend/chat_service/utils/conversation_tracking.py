from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import uuid

class LLMInteraction(BaseModel):
    """Single interaction with an LLM (prompt + response pair)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    prompt: str = Field(..., description="Message sent to LLM")
    response: str = Field(..., description="Response received from LLM")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata like temperature, model, etc")

class ConversationNode(BaseModel):
    """Node in the conversation tree (expert, system, or collaborator)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Name/identifier of the expert/collaborator")
    role: str = Field(..., description="Role (expert, system, or collaborator)")
    parent_id: Optional[str] = Field(None, description="ID of parent expert (for collaborators)")
    interactions: List[LLMInteraction] = Field(default_factory=list)
    final_analysis: Optional[str] = Field(None, description="Final analysis/conclusion")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator('name', 'role')
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Validate that string fields are not empty"""
        if not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate that the role is one of: expert, system, or collaborator"""
        if v not in ['expert', 'system', 'collaborator']:
            raise ValueError('Role must be expert, system, or collaborator')
        return v

class ConversationTree(BaseModel):
    """Complete conversation tree structure"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(..., description="Associated session ID")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    question: str = Field(..., description="Original question")
    nodes: Dict[str, ConversationNode] = Field(default_factory=dict)
    synthesized_report: Optional[str] = Field(None)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def add_system_node(self, name: str, **metadata) -> str:
        """Add a system node to the conversation"""
        node = ConversationNode(
            name=name,
            role="system",
            metadata=metadata
        )
        self.nodes[node.id] = node
        return node.id

    def add_expert(self, name: str, **metadata) -> str:
        """Add an expert node to the conversation"""
        node = ConversationNode(
            name=name,
            role="expert",
            metadata=metadata
        )
        self.nodes[node.id] = node
        return node.id

    def add_collaborator(self, name: str, parent_id: str, **metadata) -> str:
        """Add a collaborator node under an expert"""
        # Validates parent exists and raises ValueError if not
        self._get_node(parent_id)
            
        node = ConversationNode(
            name=name,
            role="collaborator",
            parent_id=parent_id,
            metadata=metadata
        )
        self.nodes[node.id] = node
        return node.id

    def add_interaction(self, node_id: str, prompt: str, response: str, **metadata) -> str:
        """Add an LLM interaction to a node"""
        node = self._get_node(node_id)
        interaction = LLMInteraction(
            prompt=prompt,
            response=response,
            metadata=metadata
        )
        node.interactions.append(interaction)
        return interaction.id

    def set_final_analysis(self, node_id: str, analysis: str) -> None:
        """Set the final analysis for a node"""
        node = self._get_node(node_id)
        node.final_analysis = analysis

    def get_expert_collaborators(self, expert_id: str) -> List[ConversationNode]:
        """Get all collaborators for an expert"""
        self._get_node(expert_id)  # Validates expert exists
        return [
            node for node in self.nodes.values()
            if node.parent_id == expert_id
        ]

    def to_frontend_tree(self) -> Dict:
        """Convert the conversation tree to a frontend-friendly format"""
        def node_to_dict(node: ConversationNode) -> Dict:
            return {
                "id": node.id,
                "name": node.name,
                "role": node.role,
                "interactions": [
                    {
                        "id": i.id,
                        "timestamp": i.timestamp,
                        "prompt": i.prompt,
                        "response": i.response,
                        "metadata": i.metadata
                    } for i in node.interactions
                ],
                "finalAnalysis": node.final_analysis,
                "metadata": node.metadata,
                "children": [
                    node_to_dict(self.nodes[n.id])
                    for n in self.get_expert_collaborators(node.id)
                ] if node.role == "expert" else []
            }

        # Get root level nodes (experts and system nodes)
        root_nodes = [
            node for node in self.nodes.values()
            if node.role in ["expert", "system"]
        ]

        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "question": self.question,
            "nodes": [node_to_dict(node) for node in root_nodes],
            "synthesizedReport": self.synthesized_report,
            "metadata": self.metadata
        }

    def to_storage_dict(self) -> Dict:
        """Convert the conversation tree to a storage format"""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "question": self.question,
            "nodes": {
                node_id: {
                    "name": node.name,
                    "role": node.role,
                    "parent_id": node.parent_id,
                    "interactions": [
                        interaction.dict() for interaction in node.interactions
                    ],
                    "final_analysis": node.final_analysis,
                    "metadata": node.metadata
                } for node_id, node in self.nodes.items()
            },
            "synthesized_report": self.synthesized_report,
            "metadata": self.metadata
        }

    def _get_node(self, node_id: str) -> ConversationNode:
        """Get a node by ID or raise ValueError"""
        if node_id not in self.nodes:
            raise ValueError(f"Node {node_id} not found")
        return self.nodes[node_id]

"""
This module provides data structures for tracking multi-agent conversations.

Usage Example:
-------------
# Create a new conversation tree
tree = ConversationTree(question="What are NATO's political goals?")

# Add a system node (e.g., moderator, preprocessor)
system_id = tree.add_system_node(
    name="Content Moderator",
    metadata={"type": "moderation", "filters": ["sensitive_content"]}
)

# Add an expert
expert_id = tree.add_expert(
    name="NATO Expert",
    metadata={"expertise": "NATO Politics"}
)

# Add a collaborator under the expert
collab_id = tree.add_collaborator(
    name="Regional Specialist",
    parent_id=expert_id,
    metadata={"region": "Eastern Europe"}
)

# Record interactions
tree.add_interaction(
    node_id=system_id,
    prompt="Check content for sensitive information",
    response="Content cleared for discussion",
    metadata={"model": "gpt-4"}
)

tree.add_interaction(
    node_id=expert_id,
    prompt="Analyze NATO's objectives",
    response="NATO's primary goals include...",
    metadata={"model": "gpt-4"}
)

# Set final analyses
tree.set_final_analysis(expert_id, "Expert's final conclusion...")

# Get tree structure for frontend
frontend_data = tree.to_frontend_tree()

# Get data for storage
storage_data = tree.to_storage_dict()
""" 