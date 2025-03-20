import json
import uuid
from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Dict, Optional, Any, List
from threading import Lock
from filelock import FileLock
import fcntl
import portalocker
import os
import threading
from config_ import load_config

logger = logging.getLogger(__name__)
config = load_config()

class SessionManager:
    """Manages chat sessions for the multiagent system"""
    _instance = None
    _initialized = False
    _sessions_cache = None  # Initialize as None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self._file_lock = threading.Lock()
        self._cache_lock = threading.Lock()
        self._sessions_cache = None  # Initialize as None
        self.sessions_file = Path(config['SESSION_PATH']) / 'sessions.json'
        self.sessions_file.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized SessionManager with file: {self.sessions_file}")
        # Initial load of sessions
        self._initialize_cache()

    def _initialize_cache(self):
        """Initialize the sessions cache"""
        logger.debug("Initializing sessions cache")
        with self._cache_lock:
            if self._sessions_cache is None:
                self._sessions_cache = self._load_existing_sessions()
        logger.debug("Cache initialized")

    def _load_existing_sessions(self):
        """Load all existing sessions with proper locking"""
        try:
            logger.debug("Loading sessions from file")
            
            with self._file_lock:
                if self.sessions_file.exists():
                    with open(self.sessions_file, 'r', encoding='utf-8') as f:
                        try:
                            portalocker.lock(f, portalocker.LOCK_EX | portalocker.LOCK_NB)
                            sessions_list = json.load(f)
                            logger.info(f"Loaded {len(sessions_list)} sessions")
                        except portalocker.LockException as e:
                            logger.error(f"Failed to acquire file lock: {e}")
                            return {}
                        finally:
                            portalocker.unlock(f)
                        
                        sessions_dict = {session['session_id']: session for session in sessions_list}
                        return sessions_dict
                
                logger.debug("Sessions file doesn't exist, returning empty dict")
                return {}
                
        except Exception as e:
            logger.error(f"Failed to load sessions: {e}")
            logger.exception("Full traceback:")
            return {}

    def _save_all_sessions(self, sessions_dict: Dict) -> bool:
        """Save all sessions to file"""
        try:
            logger.debug("Saving sessions to file")
            with self._file_lock:
                with open(self.sessions_file, 'w', encoding='utf-8') as f:
                    try:
                        portalocker.lock(f, portalocker.LOCK_EX | portalocker.LOCK_NB)
                        sessions_list = list(sessions_dict.values())
                        json.dump(sessions_list, f, indent=2, default=str)
                        logger.info(f"Saved {len(sessions_list)} sessions")
                        return True
                    except portalocker.LockException as e:
                        logger.error(f"Failed to acquire file lock for saving: {e}")
                        return False
                    finally:
                        portalocker.unlock(f)
                        
        except Exception as e:
            logger.error(f"Failed to save sessions: {e}")
            logger.exception("Full traceback:")
            return False

    def create_session(self, team_id: str, session_id: str = None, session_name: str = None) -> str:
        """Create a new chat session"""
        try:
            logger.debug("Creating new session")
            session_id = session_id or str(uuid.uuid4())
            current_time = datetime.now(timezone.utc).isoformat()
            
            new_session = {
                "session_id": session_id,
                "team_id": team_id,
                "session_name": session_name or f"Session {session_id[:8]}",
                "created_at": current_time,
                "updated_at": current_time,
                "conversation_history": []
            }
            
            with self._cache_lock:
                if self._sessions_cache is None:
                    self._initialize_cache()
                self._sessions_cache[session_id] = new_session
                self._save_all_sessions(self._sessions_cache)
                
            logger.info(f"Created session {session_id}: {new_session['session_name']}")
            return session_id
            
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            logger.exception("Full traceback:")
            raise

    def add_to_session_history(self, session_id: str, message: Dict) -> bool:
        """Add message to session history with proper locking"""
        with self._cache_lock:
            try:
                # Reload to ensure we have latest data
                self._sessions_cache = self._load_existing_sessions()
                
                session = self._sessions_cache.get(session_id)
                if not session:
                    logger.warning(f"Session {session_id} not found")
                    return False
                
                # Validate message structure
                if not isinstance(message, dict):
                    logger.error("Message must be a dictionary")
                    return False
                
                # Determine message type and validate accordingly
                if 'plan' in message:
                    # This is a plan message or combined message
                    plan = message['plan']
                    if not isinstance(plan, dict):
                        logger.error("Plan must be a dictionary")
                        return False
                    
                    # Required fields for plan
                    if 'content' not in plan:
                        logger.error("Plan must contain 'content' field")
                        return False
                    if 'accepted' not in plan:
                        logger.error("Plan must contain 'accepted' field")
                        return False
                    
                    # Optional fields - add with defaults if missing
                    if 'notes' not in plan:
                        plan['notes'] = ""
                    if 'selected_agents' not in plan:
                        plan['selected_agents'] = []
                    if 'original_message' not in plan:
                        plan['original_message'] = message.get('question', '')
                    if 'modified_message' not in plan:
                        plan['modified_message'] = message.get('question', '')
                
                # For normal Q&A messages, ensure required fields are present
                if 'plan' not in message and ('question' not in message or 'response' not in message):
                    logger.error("Regular messages must contain 'question' and 'response' fields")
                    return False
                
                # Update the session
                session['conversation_history'].append(message)
                session['updated_at'] = datetime.now(timezone.utc).isoformat()
                
                # Save all sessions
                return self._save_all_sessions(self._sessions_cache)
            except Exception as e:
                logger.error(f"Error adding to session history: {str(e)}")
                return False

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        try:
            logger.debug(f"Getting session: {session_id}")
            with self._cache_lock:
                if self._sessions_cache is None:
                    self._initialize_cache()
                    
                session = self._sessions_cache.get(session_id)
                if not session:
                    logger.debug(f"Session {session_id} not found")
                return session
                
        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            logger.exception("Full traceback:")
            return None

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all sessions"""
        return list(self._sessions_cache.values())

    def get_team_sessions(self, team_id: str) -> List[Dict[str, Any]]:
        """List all sessions for a specific team"""
        return [
            session for session in self._sessions_cache.values()
            if session['team_id'] == team_id
        ]

    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        try:
            logger.debug(f"Deleting session: {session_id}")
            with self._cache_lock:
                self._sessions_cache = self._load_existing_sessions()
                
                if session_id in self._sessions_cache:
                    del self._sessions_cache[session_id]
                    success = self._save_all_sessions(self._sessions_cache)
                    logger.info(f"Deleted session {session_id}")
                    return success
                    
                logger.warning(f"Session {session_id} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            logger.exception("Full traceback:")
            return False

    def get_session_history(self, session_id: str) -> List[Dict]:
        """Get conversation history for a session with proper locking"""
        with self._cache_lock:
            try:
                # Reload to ensure we have latest data
                self._sessions_cache = self._load_existing_sessions()
                
                session = self._sessions_cache.get(session_id)
                if not session:
                    logger.warning(f"Session {session_id} not found")
                    return []
                    
                return session.get('conversation_history', [])
                
            except Exception as e:
                logger.error(f"Error getting session history: {str(e)}")
                return []

    def get_formatted_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get formatted conversation history for a specific session"""
        history = self.get_session_history(session_id)
        
        formatted_history = []
        for interaction in history:
            formatted_history.append({
                'role': 'user',
                'content': interaction['question']
            })
            
            # Add plan as system message if it exists and is accepted
            if 'plan' in interaction and interaction['plan'].get('accepted', False):
                formatted_history.append({
                    'role': 'system',
                    'content': interaction['plan']['content']
                })
                
            formatted_history.append({
                'role': 'assistant',
                'content': interaction['response']
            })
        return formatted_history

    def update_session(self, session_id: str, updated_session: Dict) -> bool:
        """Update a session with new data"""
        try:
            logger.info(f"[SESSION_UPDATE] Attempting to update session: {session_id}")
            with self._cache_lock:
                # Reload to ensure we have latest data
                self._sessions_cache = self._load_existing_sessions()
                
                if session_id not in self._sessions_cache:
                    logger.warning(f"[SESSION_UPDATE] Session {session_id} not found")
                    return False
                
                # Update the session with new data while preserving other fields
                self._sessions_cache[session_id].update({
                    **updated_session,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                })
                
                success = self._save_all_sessions(self._sessions_cache)
                logger.info(f"[SESSION_UPDATE] Session updated, save result: {success}")
                return success
                
        except Exception as e:
            logger.error(f"[SESSION_UPDATE] Error updating session {session_id}: {str(e)}")
            logger.exception("[SESSION_UPDATE] Full traceback:")
            return False 