import json
import uuid
from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Dict, Optional, Any, List
from threading import Lock

logger = logging.getLogger(__name__)

class SessionManager:
    """Manages chat sessions for the multiagent system"""
    _instance = None
    _initialized = False
    _sessions_cache = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        self._lock = Lock()
        if not self._initialized:
            self._initialize()
            self._initialized = True

    def _initialize(self):
        """Initialize the session manager and load existing sessions"""
        try:
            self.sessions_dir = Path("/app/data/multiagent_sessions")
            self.sessions_dir.mkdir(parents=True, exist_ok=True)
            self.sessions_file = self.sessions_dir / "sessions.json"
            self._load_existing_sessions()
            logger.info(f"Initialized SessionManager with file: {self.sessions_file}")
        except Exception as e:
            logger.error(f"Error initializing SessionManager: {str(e)}")
            raise

    def _load_existing_sessions(self):
        """Load all existing sessions into memory cache"""
        try:
            if self.sessions_file.exists():
                with open(self.sessions_file, 'r', encoding='utf-8') as f:
                    sessions = json.load(f)
                    self._sessions_cache = {
                        session['session_id']: session for session in sessions
                    }
            else:
                # Create empty sessions file if it doesn't exist
                self._save_all_sessions()
            logger.info(f"Loaded {len(self._sessions_cache)} existing sessions")
        except Exception as e:
            logger.error(f"Error loading existing sessions: {str(e)}")
            raise

    def _save_all_sessions(self) -> bool:
        """Save all sessions to the sessions.json file"""
        try:
            # Convert sessions dict to list for storage
            sessions_list = list(self._sessions_cache.values())
            
            # Atomic write using temporary file
            temp_file = self.sessions_file.with_suffix('.tmp')
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(sessions_list, f, indent=2)
            temp_file.replace(self.sessions_file)
            return True
        except Exception as e:
            logger.error(f"Error saving sessions: {str(e)}")
            return False

    def create_session(self, team_id: str, session_id: str = None) -> str:
        """Create a new chat session"""
        with self._lock:
            try:
                # Use provided session_id or generate new one
                session_id = session_id or str(uuid.uuid4())
                current_time = datetime.now(timezone.utc).isoformat()
                
                session_data = {
                    "session_id": session_id,
                    "team_id": team_id,
                    "created_at": current_time,
                    "updated_at": current_time,
                    "conversation_history": []
                }
                
                self._sessions_cache[session_id] = session_data
                if self._save_all_sessions():
                    logger.info(f"Created new session: {session_id} for team: {team_id}")
                    return session_id
                raise Exception("Failed to save new session")
            except Exception as e:
                logger.error(f"Error creating session: {str(e)}")
                raise

    def add_interaction(self, session_id: str, question: str, response: str) -> bool:
        """Add a new interaction to the session's conversation history"""
        with self._lock:
            try:
                session_data = self._sessions_cache.get(session_id)
                if not session_data:
                    logger.error(f"Session {session_id} not found")
                    return False

                session_data['conversation_history'].append({
                    "question": question,
                    "response": response,
                    "timestamp": datetime.utcnow().isoformat()
                })
                session_data['updated_at'] = datetime.utcnow().isoformat()

                return self._save_all_sessions()
            except Exception as e:
                logger.error(f"Error adding interaction to session {session_id}: {str(e)}")
                return False

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific chat session"""
        return self._sessions_cache.get(session_id)

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
        with self._lock:
            try:
                if session_id in self._sessions_cache:
                    del self._sessions_cache[session_id]
                    return self._save_all_sessions()
                return False
            except Exception as e:
                logger.error(f"Error deleting session {session_id}: {str(e)}")
                return False 