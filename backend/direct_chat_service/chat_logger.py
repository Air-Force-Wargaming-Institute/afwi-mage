from pathlib import Path
import json
import asyncio
import aiofiles
from typing import Dict, Any, Optional, List
from fastapi import HTTPException
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ChatLogger:
    """Logger for chat messages using JSONL format with async support."""
    
    def __init__(self, base_dir: Path):
        """Initialize the chat logger.
        
        Args:
            base_dir (Path): Base directory for storing chat logs
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        # Using a lock for file operations to prevent potential race conditions,
        # although aiofiles might handle some concurrency.
        self._file_lock = asyncio.Lock()
    
    def _get_log_path(self, user_id: str, session_id: str) -> Path:
        """Get the path to the log file for a session.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
            
        Returns:
            Path: Path to the log file
        """
        user_dir = self.base_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True) # Ensure user dir exists
        session_dir = user_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True) # Ensure session dir exists
        return session_dir / "chat.jsonl"
    
    async def log_message(self, user_id: str, session_id: str, message_data: Dict[str, Any]) -> None:
        """Log a message to the session's log file asynchronously and safely.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
            message_data (dict): Message data to log
        """
        log_path = self._get_log_path(user_id, session_id)
        try:
            # Ensure message has a timestamp
            if "timestamp" not in message_data:
                message_data["timestamp"] = datetime.now().isoformat()
            
            json_line = json.dumps(message_data) + "\n"
            
            # Use a lock to ensure atomic append operation
            async with self._file_lock:
                async with aiofiles.open(log_path, mode='a', encoding='utf-8') as f:
                    await f.write(json_line)
            logger.debug(f"Successfully logged message to {log_path}")
                
        except Exception as e:
            logger.error(f"Error logging message to {log_path}: {str(e)}", exc_info=True)
            raise # Re-raise to allow caller to handle
    
    async def load_history(self, user_id: str, session_id: str) -> List[Dict[str, Any]]:
        """Load chat history from the session's log file asynchronously.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
            
        Returns:
            list: List of message dictionaries
        """
        log_path = self._get_log_path(user_id, session_id)
        messages = []
        # Check if file exists synchronously (fast operation)
        if not log_path.exists():
            logger.info(f"Chat history file not found, returning empty list: {log_path}")
            return messages
            
        try:
            # Lock not strictly needed for reading, but can prevent reads during writes if desired
            # async with self._file_lock: 
            async with aiofiles.open(log_path, mode='r', encoding='utf-8') as f:
                async for line in f:
                    stripped_line = line.strip()
                    if not stripped_line:
                        continue # Skip empty lines
                    try:
                        message = json.loads(stripped_line)
                        messages.append(message)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Error parsing message in {log_path}: {str(e)}. Skipping line: {stripped_line}")
                        continue
            
            logger.info(f"Successfully loaded {len(messages)} messages from {log_path}")
            return messages
            
        except Exception as e:
            logger.error(f"Error loading chat history from {log_path}: {str(e)}", exc_info=True)
            return []  # Return empty list on error
    
    async def clear_history(self, user_id: str, session_id: str) -> None:
        """Clear the chat history for a session asynchronously.
        
        Args:
            user_id (str): User identifier
            session_id (str): Session identifier
        """
        log_path = self._get_log_path(user_id, session_id)
        try:
            async with self._file_lock: # Lock to prevent conflicts with logging
                if log_path.exists():
                    logger.info(f"Clearing chat history file: {log_path}")
                    # Open in write mode to truncate the file
                    async with aiofiles.open(log_path, mode='w', encoding='utf-8') as f:
                        await f.write("")
                else:
                    logger.info(f"Chat history file not found, nothing to clear: {log_path}")
        except Exception as e:
            logger.error(f"Error clearing chat history for {log_path}: {str(e)}", exc_info=True)
            raise
    
    async def validate_message_format(self, message_data: Dict[str, Any]) -> bool:
        """Validate the format of a message before logging.
        
        Args:
            message_data (Dict[str, Any]): Message data to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        required_fields = {'message_id', 'timestamp', 'sender', 'content'}
        return all(field in message_data for field in required_fields) 