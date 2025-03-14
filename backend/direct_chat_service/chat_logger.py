from pathlib import Path
import json
import asyncio
import aiofiles
from typing import Dict, Any, Optional
from fastapi import HTTPException

class ChatLogger:
    def __init__(self, base_path: Path):
        """Initialize the ChatLogger with a base path for storing logs.
        
        Args:
            base_path (Path): Base directory for storing chat logs
        """
        self.base_path = base_path
        self.lock = asyncio.Lock()
    
    async def ensure_log_directory(self, user_id: str, session_id: str) -> Path:
        """Ensure the log directory exists for the given user and session.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
            
        Returns:
            Path: Path to the log directory
        """
        log_dir = self.base_path / user_id / session_id
        log_dir.mkdir(parents=True, exist_ok=True)
        return log_dir
    
    async def log_message(self, user_id: str, session_id: str, message_data: Dict[str, Any]):
        """Log a chat message to the session's history file.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
            message_data (Dict[str, Any]): Message data to log
        """
        try:
            log_path = await self.ensure_log_directory(user_id, session_id) / "ChatHistory.jsonl"
            
            # Ensure message_data has required fields
            if not all(key in message_data for key in ['message_id', 'timestamp', 'sender', 'content']):
                raise ValueError("Message data missing required fields")
            
            async with self.lock:
                async with aiofiles.open(log_path, mode='a') as f:
                    await f.write(json.dumps(message_data) + '\n')
                    await f.flush()  # Ensure the data is written to disk
                    
        except Exception as e:
            print(f"Error logging message: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to log message: {str(e)}")
    
    async def load_history(self, user_id: str, session_id: str, limit: Optional[int] = None) -> list:
        """Load chat history for a given session.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
            limit (Optional[int]): Maximum number of messages to load (None for all)
            
        Returns:
            list: List of message dictionaries
        """
        try:
            log_path = self.base_path / user_id / session_id / "ChatHistory.jsonl"
            if not log_path.exists():
                return []
            
            messages = []
            async with aiofiles.open(log_path, mode='r') as f:
                async for line in f:
                    if line.strip():  # Skip empty lines
                        try:
                            message = json.loads(line)
                            messages.append(message)
                            if limit and len(messages) >= limit:
                                break
                        except json.JSONDecodeError:
                            print(f"Warning: Skipping invalid JSON line in {log_path}")
                            continue
            
            return messages
            
        except Exception as e:
            print(f"Error loading history: {str(e)}")
            return []
    
    async def validate_message_format(self, message_data: Dict[str, Any]) -> bool:
        """Validate the format of a message before logging.
        
        Args:
            message_data (Dict[str, Any]): Message data to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        required_fields = {'message_id', 'timestamp', 'sender', 'content'}
        return all(field in message_data for field in required_fields) 