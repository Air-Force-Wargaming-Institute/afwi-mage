from pathlib import Path
import json
import logging
from typing import Dict, Optional, List, Any, Union
from threading import RLock
from concurrent.futures import ThreadPoolExecutor
import asyncio
import os

from .conversation_tracking import ConversationTree
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ConversationManager:
    _instance = None
    _lock = RLock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ConversationManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self._initialized = True
        self._file_lock = RLock()
        self._conversations: Dict[str, ConversationTree] = {}
        self._executor = ThreadPoolExecutor(max_workers=4)
        
        self.conversation_path = Path('/app/data/conversation_logs')
        try:
            self.conversation_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Initialized conversation manager at {self.conversation_path}")
            logger.info(f"Directory exists: {self.conversation_path.exists()}")
            logger.info(f"Directory is writable: {os.access(str(self.conversation_path), os.W_OK)}")
        except Exception as e:
            logger.error(f"Error creating conversation directory: {e}", exc_info=True)
            raise

    def __del__(self):
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=False)

    # Public API
    async def create_conversation(self, question: str, session_id: str, **metadata) -> str:
        """Create a new conversation and save it"""
        logger.info(f"Creating new conversation with session_id: {session_id}")
        try:
            conversation = ConversationTree(
                question=question,
                session_id=session_id,
                metadata=metadata
            )
            logger.info(f"Created conversation with ID: {conversation.id}")
            self._conversations[conversation.id] = conversation
            
            save_result = await self._save_conversation_async(conversation.id)
            logger.info(f"Save result for conversation {conversation.id}: {save_result}")
            
            return conversation.id
        except Exception as e:
            logger.error(f"Error creating conversation: {e}", exc_info=True)
            raise

    async def add_expert(self, conversation_id: str, name: str, **metadata) -> str:
        """Add an expert and save the conversation"""
        node_id = self._add_node(conversation_id, 'expert', name, None, metadata)
        await self._save_conversation_async(conversation_id)
        return node_id

    async def add_system_node(self, conversation_id: str, name: str, **metadata) -> str:
        """Add a system node and save the conversation"""
        node_id = self._add_node(conversation_id, 'system', name, None, metadata)
        await self._save_conversation_async(conversation_id)
        return node_id

    async def add_collaborator(self, conversation_id: str, name: str, parent_id: str, **metadata) -> str:
        """Add a collaborator and save the conversation"""
        node_id = self._add_node(conversation_id, 'collaborator', name, parent_id, metadata)
        await self._save_conversation_async(conversation_id)
        return node_id

    async def add_interaction(self, conversation_id: str, node_id: str, prompt: str, response: str, **metadata) -> str:
        """Add an interaction and save the conversation"""
        conversation = self._get_conversation(conversation_id)
        interaction_id = conversation.add_interaction(node_id, prompt, response, **metadata)
        await self._save_conversation_async(conversation_id)
        return interaction_id

    def get_frontend_tree(self, conversation_id: str) -> Optional[Dict]:
        """Get conversation tree for frontend display"""
        conversation = self._get_conversation(conversation_id)
        return conversation.to_frontend_tree() if conversation else None

    async def load_conversation_async(self, conversation_id: str) -> Optional[ConversationTree]:
        """Load a conversation from disk"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self._load_conversation, conversation_id)

    async def list_conversations_async(self) -> List[Dict[str, Any]]:
        """List all conversations"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self._list_conversations)

    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation from disk and memory"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self._delete_conversation, conversation_id)

    async def set_final_analysis(self, conversation_id: str, node_id: str, analysis: str):
        """Set final analysis for a node and save"""
        conversation = self._get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
        conversation.set_final_analysis(node_id, analysis)
        await self._save_conversation_async(conversation_id)

    async def set_synthesized_report(self, conversation_id: str, report: str):
        """Set synthesized report and save"""
        conversation = self._get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
        conversation.synthesized_report = report
        await self._save_conversation_async(conversation_id)

    async def get_latest_conversation_id(self, session_id: str) -> Optional[str]:
        """Get the most recent conversation ID for a given session"""
        conversations = await self.list_conversations_async()
        session_conversations = [
            conv for conv in conversations 
            if conv["session_id"] == session_id
        ]
        
        if not session_conversations:
            return None
            
        # Return ID of most recent conversation based on timestamp
        return max(session_conversations, key=lambda x: x["timestamp"])["id"]

    async def list_conversations(self) -> List[Dict[str, Any]]:
        """List all conversations with basic metadata"""
        conversations = []
        for file in self.conversation_path.glob("conversation_*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Fix nested metadata structure
                    if "metadata" in data and "metadata" in data["metadata"]:
                        data["metadata"] = data["metadata"]["metadata"]
                    
                    for node in data["nodes"].values():
                        if "metadata" in node and "metadata" in node["metadata"]:
                            node["metadata"] = node["metadata"]["metadata"]
                        for interaction in node.get("interactions", []):
                            if "metadata" in interaction and "metadata" in interaction["metadata"]:
                                interaction["metadata"] = interaction["metadata"]["metadata"]
                    
                    conversations.append({
                        "id": data["id"],
                        "session_id": data.get("session_id", ""),
                        "timestamp": data["timestamp"],
                        "question": data["question"],
                        "nodes": data["nodes"],
                        "metadata": data["metadata"]
                    })
            except Exception as e:
                logger.error(f"Error reading conversation file {file}: {e}")
        
        return sorted(conversations, key=lambda x: x["timestamp"], reverse=True)

    async def get_conversation(self, conversation_id: str) -> Optional[ConversationTree]:
        """Get a specific conversation by ID"""
        if conversation_id in self._conversations:
            return self._conversations[conversation_id]
            
        try:
            filepath = self.conversation_path / f"conversation_{conversation_id}.json"
            if filepath.exists():
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    conversation = ConversationTree(**data)
                    self._conversations[conversation_id] = conversation
                    return conversation
        except Exception as e:
            logger.error(f"Error loading conversation {conversation_id}: {e}")
        return None

    async def get_conversations_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a specific session"""
        conversations = []
        for file in self.conversation_path.glob("conversation_*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get("session_id") == session_id:
                        conversations.append({
                            "id": data["id"],
                            "timestamp": data["timestamp"],
                            "question": data["question"],
                            "nodes": data["nodes"],
                            "metadata": data["metadata"]
                        })
            except Exception as e:
                logger.error(f"Error reading conversation file {file}: {e}")
        
        return sorted(conversations, key=lambda x: x["timestamp"], reverse=True)

    # Private methods
    async def _save_conversation_async(self, conversation_id: str) -> bool:
        """Internal method to save conversation asynchronously"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self._save_conversation, conversation_id)

    def _get_conversation(self, conversation_id: str) -> Optional[ConversationTree]:
        """Get conversation from memory or load from disk"""
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            conversation = self._load_conversation(conversation_id)
            if conversation:
                self._conversations[conversation_id] = conversation
        return conversation

    def _add_node(self, conversation_id: str, role: str, name: str, parent_id: Optional[str], metadata: dict) -> str:
        """Internal method to add any type of node"""
        conversation = self._get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        if role == 'expert':
            return conversation.add_expert(name, **metadata)
        elif role == 'system':
            return conversation.add_system_node(name, **metadata)
        elif role == 'collaborator':
            return conversation.add_collaborator(name, parent_id, **metadata)
        raise ValueError(f"Unknown role: {role}")

    def _save_conversation(self, conversation_id: str) -> bool:
        """Internal method to save conversation to disk"""
        conversation = self._get_conversation(conversation_id)
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            raise ValueError(f"Conversation {conversation_id} not found")

        with self._file_lock:
            try:
                filepath = self.conversation_path / f"conversation_{conversation.id}.json"
                temp_file = filepath.with_suffix('.tmp')
                
                with open(temp_file, 'w', encoding='utf-8') as f:
                    json.dump(conversation.to_storage_dict(), f, indent=4, ensure_ascii=False)
                
                temp_file.replace(filepath)
                return True
            except Exception as e:
                logger.error(f"Error saving conversation: {e}", exc_info=True)
                return False

    def _load_conversation(self, conversation_id: str) -> Optional[ConversationTree]:
        """Internal method to load conversation from disk"""
        with self._file_lock:
            try:
                filepath = self.conversation_path / f"conversation_{conversation_id}.json"
                if not filepath.exists():
                    return None
                    
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return ConversationTree(**data)
            except Exception as e:
                logger.error(f"Error loading conversation: {e}")
                return None

    def _list_conversations(self) -> List[Dict[str, Any]]:
        """Internal method to list all conversations"""
        conversations = []
        for file in self.conversation_path.glob("conversation_*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    conversations.append({
                        "id": data["id"],
                        "session_id": data["session_id"],
                        "timestamp": data["timestamp"],
                        "question": data["question"],
                        "expert_count": len([n for n in data["nodes"].values() if n["role"] == "expert"]),
                        "metadata": data["metadata"]
                    })
            except Exception as e:
                logger.error(f"Error reading conversation file {file}: {e}")
                
        return sorted(conversations, key=lambda x: x["timestamp"], reverse=True)

    def _delete_conversation(self, conversation_id: str) -> bool:
        with self._file_lock:
            try:
                filepath = self.conversation_path / f"conversation_{conversation_id}.json"
                if filepath.exists():
                    filepath.unlink()
                if conversation_id in self._conversations:
                    del self._conversations[conversation_id]
                return True
            except Exception as e:
                logger.error(f"Error deleting conversation: {e}")
                return False

    def _validate_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Validate metadata structure"""
        if not isinstance(metadata, dict):
            raise ValueError("Metadata must be a dictionary")
        return metadata

    def create_conversation_sync(self, question: str, session_id: str, **metadata) -> str:
        """Synchronous version of create_conversation"""
        try:
            conversation = ConversationTree(
                question=question,
                session_id=session_id,
                metadata=metadata
            )
            self._conversations[conversation.id] = conversation
            self._save_conversation(conversation.id)
            return conversation.id
        except Exception as e:
            logger.error(f"Error creating conversation: {e}", exc_info=True)
            raise

    def add_system_node_sync(self, conversation_id: str, name: str, **metadata) -> str:
        """Synchronous version of add_system_node"""
        node_id = self._add_node(conversation_id, 'system', name, None, metadata)
        self._save_conversation(conversation_id)
        return node_id

    def add_interaction_sync(self, conversation_id: str, node_id: str, prompt: str, 
                            response: Union[str, BaseModel], **metadata) -> str:
        """Synchronous version of add_interaction"""
        conversation = self._get_conversation(conversation_id)
        
        # Handle response based on type
        if isinstance(response, BaseModel):
            try:
                response_data = response.to_dict()
                response_text = getattr(response, 'reason', str(response))
                if "metadata" not in metadata:
                    metadata["metadata"] = {}
                metadata["metadata"]["response_type"] = response_data["type"]
                metadata["metadata"]["response_data"] = response_data
            except AttributeError:
                # Fallback if to_dict() is not available
                response_text = str(response)
                if hasattr(response, 'reason'):
                    response_text = response.reason
        else:
            response_text = str(response)
        
        # Add prompt_name from metadata if provided
        if metadata.get("prompt_name"):
            if "metadata" not in metadata:
                metadata["metadata"] = {}
            metadata["metadata"]["prompt_name"] = metadata.pop("prompt_name")
        
        # Add model info if provided
        if metadata.get("model"):
            if "metadata" not in metadata:
                metadata["metadata"] = {}
            metadata["metadata"]["model"] = metadata.pop("model")
        
        interaction_id = conversation.add_interaction(
            node_id, 
            prompt, 
            response_text, 
            **metadata
        )
        self._save_conversation(conversation_id)
        return interaction_id