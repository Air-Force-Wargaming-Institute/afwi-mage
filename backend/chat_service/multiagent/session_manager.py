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
        logger.info("[SESSION_INIT] Initializing sessions cache")
        with self._cache_lock:
            if self._sessions_cache is None:
                self._sessions_cache = self._load_existing_sessions()
        logger.info("[SESSION_INIT] Cache initialized")

    def _load_existing_sessions(self):
        """Load all existing sessions with proper locking"""
        try:
            logger.info("[SESSION_LOAD] Starting to load sessions")
            
            with self._file_lock:
                logger.info("[SESSION_LOAD] Acquired file lock")
                
                if self.sessions_file.exists():
                    logger.info(f"[SESSION_LOAD] Reading from {self.sessions_file}")
                    with open(self.sessions_file, 'r', encoding='utf-8') as f:
                        logger.info("[SESSION_LOAD] File opened, acquiring portalocker lock")
                        try:
                            portalocker.lock(f, portalocker.LOCK_EX | portalocker.LOCK_NB)
                            logger.info("[SESSION_LOAD] Reading JSON data")
                            sessions_list = json.load(f)
                            logger.info(f"[SESSION_LOAD] Loaded {len(sessions_list)} sessions")
                        except portalocker.LockException as e:
                            logger.error(f"[SESSION_LOAD] Could not acquire file lock: {str(e)}")
                            return {}
                        finally:
                            portalocker.unlock(f)
                            logger.info("[SESSION_LOAD] Released portalocker lock")
                        
                        # Convert list to dictionary indexed by session_id
                        sessions_dict = {session['session_id']: session for session in sessions_list}
                        logger.info("[SESSION_LOAD] Converted to dictionary format")
                        return sessions_dict
                
                logger.info("[SESSION_LOAD] Sessions file doesn't exist, returning empty dict")
                return {}
                
        except Exception as e:
            logger.error(f"[SESSION_LOAD] Error loading sessions: {str(e)}")
            logger.exception("[SESSION_LOAD] Full traceback:")
            return {}

    def _save_all_sessions(self, sessions_dict: Dict) -> bool:
        """Save all sessions to file"""
        try:
            logger.info("[SESSION_SAVE] Starting to save sessions")
            with self._file_lock:
                with open(self.sessions_file, 'w', encoding='utf-8') as f:
                    try:
                        portalocker.lock(f, portalocker.LOCK_EX | portalocker.LOCK_NB)
                        sessions_list = list(sessions_dict.values())
                        json.dump(sessions_list, f, indent=2, default=str)
                        logger.info(f"[SESSION_SAVE] Saved {len(sessions_list)} sessions")
                        return True
                    except portalocker.LockException as e:
                        logger.error(f"[SESSION_SAVE] Could not acquire file lock: {str(e)}")
                        return False
                    finally:
                        portalocker.unlock(f)
                        logger.info("[SESSION_SAVE] Released portalocker lock")
                        
        except Exception as e:
            logger.error(f"[SESSION_SAVE] Error saving sessions: {str(e)}")
            logger.exception("[SESSION_SAVE] Full traceback:")
            return False

    def create_session(self, team_id: str, session_id: str = None, session_name: str = None) -> str:
        """Create a new chat session"""
        try:
            logger.info("[SESSION_CREATE] Creating new session")
            session_id = session_id or str(uuid.uuid4())
            current_time = datetime.now(timezone.utc).isoformat()
            
            new_session = {
                "session_id": session_id,
                "team_id": team_id,
                "session_name": session_name or f"Session {session_id[:8]}",  # Default name if none provided
                "created_at": current_time,
                "updated_at": current_time,
                "conversation_history": []
            }
            
            with self._cache_lock:
                if self._sessions_cache is None:
                    self._initialize_cache()
                self._sessions_cache[session_id] = new_session
                self._save_all_sessions(self._sessions_cache)
                
            logger.info(f"[SESSION_CREATE] Created session: {session_id} with name: {new_session['session_name']}")
            return session_id
            
        except Exception as e:
            logger.error(f"[SESSION_CREATE] Error creating session: {str(e)}")
            logger.exception("[SESSION_CREATE] Full traceback:")
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
            logger.info(f"[SESSION_GET] Getting session for ID: {session_id}")
            with self._cache_lock:
                # Use cached data instead of reloading
                if self._sessions_cache is None:
                    self._initialize_cache()
                    
                session = self._sessions_cache.get(session_id)
                logger.info(f"[SESSION_GET] Session found: {bool(session)}")
                return session
                
        except Exception as e:
            logger.error(f"[SESSION_GET] Error getting session: {str(e)}")
            logger.exception("[SESSION_GET] Full traceback:")
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
            logger.info(f"[SESSION_DELETE] Attempting to delete session: {session_id}")
            with self._cache_lock:
                # Reload to ensure we have latest data
                self._sessions_cache = self._load_existing_sessions()
                
                if session_id in self._sessions_cache:
                    logger.info(f"[SESSION_DELETE] Found session {session_id}, deleting")
                    del self._sessions_cache[session_id]
                    success = self._save_all_sessions(self._sessions_cache)
                    logger.info(f"[SESSION_DELETE] Session deleted, save result: {success}")
                    return success
                    
                logger.warning(f"[SESSION_DELETE] Session {session_id} not found")
                return False
                
        except Exception as e:
            logger.error(f"[SESSION_DELETE] Error deleting session {session_id}: {str(e)}")
            logger.exception("[SESSION_DELETE] Full traceback:")
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