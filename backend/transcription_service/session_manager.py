import logging
import uuid
from datetime import datetime
from typing import Dict, Optional, List
# Remove io if no longer needed centrally
# import io 

# Use SQLAlchemy for DB operations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert as pg_insert # For upsert if needed

from .schemas import StartSessionRequest, ParticipantSchema, EventMetadataSchema, OutputFormatPreferencesSchema
# Import the DB model and session getter
from .database import TranscriptionSession, get_db_session 

logger = logging.getLogger(__name__)

# Remove in-memory store
# active_sessions: Dict[str, dict] = {}

class SessionManager:
    """Manages transcription sessions in the database."""

    def __init__(self):
        # No longer needs the in-memory dict
        # self.sessions: Dict[str, dict] = active_sessions
        pass # Initialization logic can go here if needed

    async def create_session(self, db: AsyncSession, request: StartSessionRequest) -> Optional[str]:
        """Creates a new session in the database and returns its ID."""
        session_id = uuid.uuid4()
        now = datetime.utcnow() # Use UTC for database consistency

        participants_data = [p.dict() for p in request.participants] if request.participants else []
        event_metadata_data = request.event_metadata.dict() if request.event_metadata else {}
        output_preferences_data = request.output_format_preferences.dict() if request.output_format_preferences else {}

        new_session = TranscriptionSession(
            session_id=session_id,
            user_id=request.user_id,
            session_name=request.session_name,
            status="initialized",
            start_time=now,
            last_update=now,
            participants=participants_data,
            event_metadata=event_metadata_data,
            output_preferences=output_preferences_data,
            # Initialize other fields as needed
            transcription_segments=[],
            markers=[],
            detected_language="en"
        )

        try:
            db.add(new_session)
            await db.commit()
            await db.refresh(new_session) # Refresh to get DB defaults if any
            logger.info(f"Created new session in DB: {session_id} for user {request.user_id}")
            return str(session_id) # Return as string
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create session {session_id} in DB: {e}", exc_info=True)
            return None

    async def get_session(self, db: AsyncSession, session_id: str) -> Optional[TranscriptionSession]:
        """Retrieves a TranscriptionSession ORM object by ID."""
        try:
            stmt = select(TranscriptionSession).where(TranscriptionSession.session_id == uuid.UUID(session_id))
            result = await db.execute(stmt)
            session = result.scalars().first()
            if session:
                logger.debug(f"Retrieved session {session_id} from DB")
                return session
            else:
                logger.warning(f"Session not found in DB: {session_id}")
                return None
        except Exception as e:
             logger.error(f"Error retrieving session {session_id} from DB: {e}", exc_info=True)
             return None
             
    async def get_session_dict(self, db: AsyncSession, session_id: str) -> Optional[dict]:
         """Retrieves session data as a dictionary by ID."""
         session = await self.get_session(db, session_id)
         if session:
             # Convert ORM object to dict - Adjust fields as needed for API responses
             return {
                 "session_id": str(session.session_id),
                 "user_id": session.user_id,
                 "session_name": session.session_name,
                 "status": session.status,
                 "start_time": session.start_time,
                 "last_update": session.last_update,
                 "completion_time": session.completion_time,
                 "participants": session.participants,
                 "event_metadata": session.event_metadata,
                 "output_preferences": session.output_preferences,
                 "detected_language": session.detected_language,
                 "transcription_segments": session.transcription_segments,
                 "markers": session.markers,
                 "audio_storage_path": session.audio_storage_path,
                 "transcript_storage_path": session.transcript_storage_path,
                 "full_transcript_text": session.full_transcript_text,
             }
         return None

    async def update_session_status(self, db: AsyncSession, session_id: str, status: str) -> bool:
        """Updates the status and last_update time of a session in the database."""
        session = await self.get_session(db, session_id)
        if session:
            try:
                old_status = session.status
                session.status = status
                session.last_update = datetime.utcnow()
                await db.commit()
                logger.info(f"Updated session {session_id} status in DB from '{old_status}' to '{status}'")
                return True
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to update status for session {session_id} in DB: {e}", exc_info=True)
                return False
        logger.warning(f"Attempted to update status for non-existent session: {session_id}")
        return False

    # Add other methods like add_transcription_segment, set_detected_language etc.
    # These will now take `db: AsyncSession` as the first argument
    # and perform database updates instead of modifying the in-memory dict.
    
    async def set_detected_language(self, db: AsyncSession, session_id: str, language_code: str):
         """Sets the detected language for the session in the database."""
         session = await self.get_session(db, session_id)
         if session and language_code:
             if session.detected_language != language_code:
                 try:
                     session.detected_language = language_code
                     session.last_update = datetime.utcnow()
                     await db.commit()
                     logger.info(f"Set detected language for session {session_id} to '{language_code}' in DB")
                 except Exception as e:
                     await db.rollback()
                     logger.error(f"Failed to set language for session {session_id} in DB: {e}", exc_info=True)
         elif not session:
              logger.warning(f"Attempted to set language for non-existent session: {session_id}")
              
    async def add_marker_to_session(self, db: AsyncSession, session_id: str, marker_data: dict) -> Optional[str]:
        """Adds a marker to the session's markers list in the database."""
        session = await self.get_session(db, session_id)
        if session:
            try:
                marker_id = str(uuid.uuid4()) # Generate unique ID for the marker
                marker_data["marker_id"] = marker_id
                marker_data["added_at"] = datetime.utcnow() # Record when added

                # Ensure markers field is initialized as a list
                if session.markers is None:
                    session.markers = []
                
                # SQLAlchemy detects changes to mutable JSON lists/dicts
                session.markers.append(marker_data)
                
                session.last_update = datetime.utcnow()
                await db.commit()
                logger.info(f"Added marker {marker_id} to session {session_id} in DB.")
                return marker_id
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to add marker to session {session_id} in DB: {e}", exc_info=True)
                return None
        else:
            logger.warning(f"Attempted to add marker to non-existent session: {session_id}")
            return None

    async def add_speaker_tag_event(self, db: AsyncSession, session_id: str, speaker_id: str, timestamp: float) -> bool:
        """Adds a speaker tag event to the session's markers list."""
        session = await self.get_session(db, session_id)
        if session:
            try:
                event_data = {
                    "marker_id": str(uuid.uuid4()),
                    "marker_type": "speaker_tag_event", # Specific type
                    "speaker_id": speaker_id,
                    "timestamp": timestamp,
                    "added_at": datetime.utcnow()
                }
                
                if session.markers is None:
                    session.markers = []
                
                session.markers.append(event_data)
                session.last_update = datetime.utcnow()
                await db.commit()
                logger.info(f"Added speaker tag event for speaker {speaker_id} at {timestamp}s to session {session_id} in DB.")
                return True
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to add speaker tag event to session {session_id} in DB: {e}", exc_info=True)
                return False
        else:
            logger.warning(f"Attempted to add speaker tag event to non-existent session: {session_id}")
            return False

    async def update_session_completion(self, db: AsyncSession, session_id: str, audio_path: str = None, transcript_path: str = None, transcript_text: str = None, final_segments: list = None):
         """Updates session on completion with final artifacts and status."""
         session = await self.get_session(db, session_id)
         if session:
             try:
                 session.status = "completed"
                 session.completion_time = datetime.utcnow()
                 session.last_update = session.completion_time
                 if audio_path: session.audio_storage_path = audio_path
                 if transcript_path: session.transcript_storage_path = transcript_path
                 if transcript_text: session.full_transcript_text = transcript_text
                 if final_segments: session.transcription_segments = final_segments
                 
                 await db.commit()
                 logger.info(f"Session {session_id} marked as completed in DB with artifact paths.")
                 return True
             except Exception as e:
                 await db.rollback()
                 logger.error(f"Failed to mark session {session_id} as completed in DB: {e}", exc_info=True)
                 return False
         return False

    # Removed remove_session - maybe keep sessions for history? Or add soft delete?
    # async def remove_session(self, db: AsyncSession, session_id: str):
    #     ...

    async def is_session_active(self, db: AsyncSession, session_id: str) -> bool:
        """Checks if a session exists in DB and is in a state allowing WebSocket connection."""
        session = await self.get_session(db, session_id)
        return session is not None and session.status in ["initialized", "recording", "paused"]

    async def list_sessions(self, db: AsyncSession, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict]:
         """Lists sessions for a given user, ordered by start time descending."""
         try:
             stmt = select(TranscriptionSession.session_id, 
                           TranscriptionSession.session_name, 
                           TranscriptionSession.start_time, 
                           TranscriptionSession.status, 
                           TranscriptionSession.event_metadata # Include metadata for display
                           )\
                    .where(TranscriptionSession.user_id == user_id)\
                    .order_by(TranscriptionSession.start_time.desc())\
                    .limit(limit)\
                    .offset(offset)
             result = await db.execute(stmt)
             sessions = result.mappings().all() # Returns list of dict-like RowMappings
             # Convert to simple list of dicts for easier JSON serialization
             return [dict(s) for s in sessions]
         except Exception as e:
             logger.error(f"Error listing sessions for user {user_id} from DB: {e}", exc_info=True)
             return []
             
    async def update_session_details(self, db: AsyncSession, session_id: str, update_data: dict) -> bool:
         """Updates editable fields of a session (e.g., name, metadata, participants, transcript text)."""
         session = await self.get_session(db, session_id)
         if not session:
             logger.warning(f"Attempted to update details for non-existent session: {session_id}")
             return False
         
         # Only allow updates if session is completed?
         # if session.status != "completed":
         #     logger.warning(f"Attempted to update details for non-completed session: {session_id}")
         #     return False
             
         try:
             updated = False
             allowed_fields = ["session_name", "event_metadata", "participants", "full_transcript_text"]
             for field, value in update_data.items():
                 if field in allowed_fields and value is not None:
                     setattr(session, field, value)
                     updated = True
                     
             if updated:
                 session.last_update = datetime.utcnow()
                 await db.commit()
                 await db.refresh(session)
                 logger.info(f"Updated details for session {session_id} in DB.")
                 return True
             else:
                 logger.info(f"No valid fields provided to update for session {session_id}." )
                 return False # Or True if no update needed?
                 
         except Exception as e:
             await db.rollback()
             logger.error(f"Failed to update details for session {session_id} in DB: {e}", exc_info=True)
             return False

# Instantiate the manager - Singleton pattern might be better, but this works for now.
session_manager = SessionManager()
