import json
import os
from datetime import datetime
import logging
from pathlib import Path
from typing import Dict, Optional, Any
from config_ import load_config
from threading import Lock

logger = logging.getLogger(__name__)

class SessionManager:
    """
    Manages chat sessions for the multiagent system
    """
    _instance = None
    _initialized = False
    _sessions_cache = {}  # In-memory cache of loaded sessions
    
    def __new__(cls):
        if cls._instance is None:
            logger.info("Creating new SessionManager instance")
            cls._instance = super(SessionManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self._lock = Lock()
        if not self._initialized:
            logger.info("Initializing SessionManager")
            self._initialize()
            self._initialized = True

    def _initialize(self):
        """Initialize the session manager with base directory and load existing sessions"""
        try:
            config = load_config()
            self.base_dir = Path(config['SESSION_PATH'])
            self.base_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Initialized session manager with base directory: {self.base_dir}")
            
            # Load all existing sessions into cache
            self._load_existing_sessions()
        except Exception as e:
            logger.error(f"Error initializing session manager: {str(e)}")
            logger.exception("Full traceback:")
            raise

    def _load_existing_sessions(self):
        """Load all existing session files into memory cache"""
        try:
            for user_dir in self.base_dir.iterdir():
                if user_dir.is_dir():
                    for session_file in user_dir.glob("*.json"):
                        with open(session_file, 'r', encoding='utf-8') as f:
                            session_data = json.load(f)
                            self._sessions_cache[session_data['session_id']] = session_data
            logger.info(f"Loaded {len(self._sessions_cache)} existing sessions")
        except Exception as e:
            logger.error(f"Error loading existing sessions: {str(e)}")
            logger.exception("Full traceback:")

    def _save_session_to_file(self, session_data: Dict[str, Any]) -> bool:
        """Save session data to file"""
        try:
            user_id = session_data['user_id']
            session_id = session_data['session_id']
            
            user_dir = self.base_dir / user_id
            user_dir.mkdir(exist_ok=True)
            
            session_file = user_dir / f"{session_id}.json"
            
            # Ensure atomic write by using a temporary file
            temp_file = session_file.with_suffix('.tmp')
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=4)
            
            # Rename temporary file to final filename (atomic operation)
            temp_file.replace(session_file)
            
            logger.info(f"Saved session {session_id} to file")
            return True
        except Exception as e:
            logger.error(f"Error saving session to file: {str(e)}")
            logger.exception("Full traceback:")
            return False

    def create_session(self, user_id: str) -> str:
        """Create a new chat session for a user"""
        with self._lock:
            try:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                session_id = f"{user_id}_{timestamp}"
                
                session_data = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "created_at": timestamp,
                    "last_updated": timestamp,
                    "conversation_history": [],  # Store chats here, remove redundant "chats" field
                    "iteration": 0
                }

                logger.info(f"Creating new session for user {user_id}")
                
                # Save to cache and file
                self._sessions_cache[session_id] = session_data
                if self._save_session_to_file(session_data):
                    logger.info(f"Created new session {session_id} for user {user_id}")
                    return session_id
                else:
                    raise Exception("Failed to save session to file")

            except Exception as e:
                logger.error(f"Error creating session for user {user_id}: {str(e)}")
                logger.exception("Full traceback:")
                raise

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific chat session"""
        with self._lock:
            try:
                # First try to get from cache
                if session_id in self._sessions_cache:
                    logger.info(f"Retrieved session {session_id} from cache")
                    return self._sessions_cache[session_id]
                
                # If not in cache, try to load from file
                user_id = session_id.split('_')[0]
                session_file = self.base_dir / user_id / f"{session_id}.json"
                
                if not session_file.exists():
                    logger.warning(f"Session {session_id} not found")
                    return None
                    
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                    self._sessions_cache[session_id] = session_data
                    
                logger.info(f"Retrieved session {session_id} from file")
                return session_data

            except Exception as e:
                logger.error(f"Error retrieving session {session_id}: {str(e)}")
                logger.exception("Full traceback:")
                return None

    def update_session(self, session_id: str, conversation_history: list, iteration: int) -> bool:
        """Update an existing chat session"""
        with self._lock:
            try:
                session_data = self.get_session(session_id)
                if not session_data:
                    logger.warning(f"Session {session_id} not found for update")
                    return False
                
                session_data.update({
                    "last_updated": datetime.now().strftime("%Y%m%d_%H%M%S"),
                    "conversation_history": conversation_history,
                    "iteration": iteration
                })
                
                # Update cache and file
                self._sessions_cache[session_id] = session_data
                if self._save_session_to_file(session_data):
                    logger.info(f"Updated session {session_id}")
                    return True
                else:
                    raise Exception("Failed to save updated session to file")

            except Exception as e:
                logger.error(f"Error updating session {session_id}: {str(e)}")
                logger.exception("Full traceback:")
                return False

    def list_user_sessions(self, user_id: str) -> list[str]:
        """List all sessions for a specific user"""
        try:
            user_dir = self.base_dir / user_id
            if not user_dir.exists():
                logger.info(f"No sessions found for user {user_id}")
                return []
                
            sessions = [f.stem for f in user_dir.glob("*.json")]
            logger.info(f"Found {len(sessions)} sessions for user {user_id}")
            return sessions

        except Exception as e:
            logger.error(f"Error listing sessions for user {user_id}: {str(e)}")
            logger.exception("Full traceback:")
            return [] 