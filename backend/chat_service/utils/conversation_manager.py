import json
import os
from datetime import datetime
from typing import Dict, Optional

class ConversationManager:
    def __init__(self, logs_dir: str):
        self.logs_dir = logs_dir
        self.current_conversation_id: Optional[str] = None
        self.current_conversation: Dict = {}
        
    def start_new_conversation(self) -> str:
        """Start a new conversation and return its ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.current_conversation_id = timestamp
        self.current_conversation = {
            "conversation_id": timestamp,
            "start_time": timestamp,
            "messages": [],
            "metadata": {}
        }
        return timestamp
        
    def add_message(self, role: str, content: str, metadata: Dict = None):
        """Add a message to the current conversation"""
        if not self.current_conversation_id:
            self.start_new_conversation()
            
        message = {
            "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "role": role,
            "content": content,
            "metadata": metadata or {}
        }
        self.current_conversation["messages"].append(message)
        self._save_current_conversation()
        
    def _save_current_conversation(self):
        """Save the current conversation to disk"""
        if not self.current_conversation_id:
            return
            
        os.makedirs(self.logs_dir, exist_ok=True)
        filepath = os.path.join(self.logs_dir, f"conversation_{self.current_conversation_id}.json")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.current_conversation, f, indent=4, ensure_ascii=False)
            
    def load_conversation(self, conversation_id: str) -> Optional[Dict]:
        """Load a conversation by its ID"""
        filepath = os.path.join(self.logs_dir, f"conversation_{conversation_id}.json")
        if not os.path.exists(filepath):
            return None
            
        with open(filepath, 'r', encoding='utf-8') as f:
            conversation = json.load(f)
            self.current_conversation = conversation
            self.current_conversation_id = conversation_id
            return conversation
            
    def get_conversation_history(self) -> str:
        """Get the conversation history in a format suitable for the model"""
        if not self.current_conversation.get("messages"):
            return ""
            
        history = []
        for msg in self.current_conversation["messages"]:
            if msg["role"] == "user":
                history.append(f"User: {msg['content']}")
            elif msg["role"] == "assistant":
                history.append(f"Assistant: {msg['content']}")
                
        return "\n\n".join(history) 