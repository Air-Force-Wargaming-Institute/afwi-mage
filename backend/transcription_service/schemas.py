from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# --- Request Models ---

class ParticipantSchema(BaseModel):
    id: str
    name: str
    role: Optional[str] = None
    rank: Optional[str] = None
    organization: Optional[str] = None
    # profile_image: Optional[str] = None # Assuming not needed for start

class OutputFormatPreferencesSchema(BaseModel):
    audio_format: str = Field(default="mp3", pattern="^(mp3|wav|m4a)$")
    transcription_format: str = Field(default="pdf", pattern="^(pdf|txt|docx)$")

class EventMetadataSchema(BaseModel):
    wargame_name: Optional[str] = None
    scenario: Optional[str] = None
    phase: Optional[str] = None
    classification: Optional[str] = None # Will be set server-side based on recording?
    location: Optional[str] = None
    organization: Optional[str] = None
    datetime: Optional[datetime] = None # Set server-side on start
    # caveat_type: Optional[str] = None # Handled separately?
    # custom_caveat: Optional[str] = None

class StartSessionRequest(BaseModel):
    session_name: str
    output_format_preferences: Optional[OutputFormatPreferencesSchema] = None
    event_metadata: Optional[EventMetadataSchema] = None
    participants: List[ParticipantSchema] = Field(default_factory=list)

class StopSessionRequest(BaseModel):
    audio_filename: Optional[str] = None
    transcription_filename: Optional[str] = None
    include_timestamps: Optional[bool] = True
    include_speakers: Optional[bool] = True
    classification: Optional[str] = None
    output_formats: Optional[List[str]] = Field(default_factory=lambda: ["pdf", "docx", "txt"])
    # additional_processing: Optional[dict] = None # Add later if needed

# --- Marker Schemas ---

class AddMarkerRequest(BaseModel):
    marker_type: str # e.g., "decision", "insight", "custom_label"
    timestamp: float # Recording time in seconds
    description: Optional[str] = None # Optional description
    classification: Optional[str] = None # Classification of the marker itself

class AddMarkerResponse(BaseModel):
    marker_id: str
    status: str = "added"
    timestamp: datetime # Time the marker was added to the DB

# --- Response Models ---

class StartSessionResponse(BaseModel):
    session_id: str
    status: str = "initialized"
    start_timestamp: datetime
    streaming_url: str # WebSocket URL - derived, not stored directly
    # collaboration_url: Optional[str] = None # Add later if needed

class StopSessionResponse(BaseModel):
    session_id: str
    status: str = "completed"
    completion_timestamp: datetime
    # audio_file: Optional[dict] = None # Add details later
    # output_files: Optional[List[dict]] = None 

# --- New Response Model for Transcription Retrieval --- 

class TranscriptionSegmentSchema(BaseModel):
    speaker: Optional[str] = None
    text: Optional[str] = None
    start: Optional[float] = None
    end: Optional[float] = None
    confidence: Optional[float] = None

class GetTranscriptionResponse(BaseModel):
    session_id: UUID
    full_transcript_text: Optional[str] = None
    transcription_segments: Optional[List[TranscriptionSegmentSchema]] = None
    last_update: datetime # Timestamp of when the session was last updated (e.g., completion) 

# Define request body model for updating session details
class UpdateSessionRequest(BaseModel):
     session_name: Optional[str] = None
     event_metadata: Optional[EventMetadataSchema] = None
     participants: Optional[List[ParticipantSchema]] = None
     full_transcript_text: Optional[str] = None
     markers: Optional[List[Dict[str, Any]]] = None # Allow updating markers
     # Add other editable fields if needed

class UpdateSessionResponse(BaseModel):
     session_id: UUID # Changed from str to UUID to match other responses
     status: str = "updated"
     updated_at: datetime # Changed from completion_timestamp to updated_at for clarity 

# --- Upload Audio Feature ---
class UploadAudioResponse(BaseModel):
    session_id: UUID
    session_name: str
    status: str # e.g., "processing", "completed", "error"
    message: str
    details_url: Optional[str] = None 