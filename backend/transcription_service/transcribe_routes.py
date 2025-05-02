from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request, Body, Depends, Query
from fastapi.responses import FileResponse # Import FileResponse
import whisperx
import os
import tempfile
import logging
import time
from datetime import datetime
from typing import List, Optional # Add List, Optional
from uuid import UUID # Import UUID for path parameter validation
from pydantic import BaseModel # Add BaseModel import
import traceback # For detailed error logging
import pathlib # For path manipulation
import subprocess # For running ffmpeg
import shutil # For cleaning up chunk directory

# Import config constants directly using relative path
from config import DEVICE, BATCH_SIZE, ARTIFACT_STORAGE_BASE_PATH # Import new config
# Import session management and schemas using relative paths
from session_manager import session_manager # Use the refactored session manager instance
from schemas import (
     StartSessionRequest, StartSessionResponse, 
     StopSessionRequest, StopSessionResponse, 
     ParticipantSchema, EventMetadataSchema, # Import needed schemas for responses/updates
     AddMarkerRequest, AddMarkerResponse, # Import marker schemas
     GetTranscriptionResponse # Import new response model
)
# Import the centralized model loader and getter using relative path
from model_loader import get_models, are_models_loaded
# Import DB session dependency and model using relative path
from database import get_db_session, TranscriptionSession 
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)

# --- START EDIT ---
# Dependency to get authenticated user ID from header
async def get_current_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        # This should technically not happen if auth-middleware is effective
        logger.error("X-User-ID header missing from authenticated request!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Could not validate credentials (User ID missing)"
        )
    logger.debug(f"Authenticated User ID: {user_id}")
    return user_id
# --- END EDIT ---

# --- Remove Model Loading Logic --- 
# # NOTE: Models are loaded lazily by whisperx on first use or explicitly.
# # We load them here at startup for faster initial requests, but this increases startup time.
# # For air-gapped, models MUST be pre-downloaded into the mapped cache volumes.

# whisper_model = None
# diarize_model = None

# # Global flag to track model loading status
# models_loaded = False

# def load_models():
#     # ... removed ...

# # Load models on startup (can be commented out for lazy loading)
# load_models() # Removed - Handled by lifespan manager in app.py

# --- Session Management Endpoints ---

@router.post("/start-session", 
            response_model=StartSessionResponse, 
            summary="Start a new recording session")
async def start_session(
    request: Request, 
    session_data: StartSessionRequest = Body(...),
    db: AsyncSession = Depends(get_db_session), # Inject DB session
    current_user_id: str = Depends(get_current_user_id) # Inject user ID
):
    """
    Initializes a new recording session in the database.
    Generates a unique session ID and stores initial metadata.
    """
    # Use the injected user ID
    # TODO: Get user_id from auth middleware instead of request body
    # user_id = session_data.user_id # Assuming from body for now
    # if not user_id:
    #      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User ID not provided.")
         
    # session_data.user_id = user_id 
    # We need to pass the user ID to the session manager
    # Create a dict from the Pydantic model and add the user_id
    # session_data_dict = session_data.dict()
    # session_data_dict['user_id'] = current_user_id

    # Pass db session and augmented data to session_manager method
    session_id = await session_manager.create_session(db, session_data, current_user_id)
    if not session_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session.")

    # Retrieve session info *after* creation might not be needed here
    # session_info = await session_manager.get_session_dict(db, session_id)
    # if not session_info: # Should not happen if creation succeeded
    #     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve session after creation.")
    
    ws_scheme = "ws" if request.url.scheme == "http" else "wss"
    ws_url = f"{ws_scheme}://{request.url.netloc}/api/transcription/stream/{session_id}"

    return StartSessionResponse(
        session_id=session_id,
        start_timestamp=datetime.utcnow(), # Use current time, DB might have default
        streaming_url=ws_url
    )

@router.post("/sessions/{session_id}/stop",
            response_model=StopSessionResponse,
            summary="Stop and finalize a recording session")
async def stop_session(
    session_id: UUID, # Use UUID for path validation
    stop_request: StopSessionRequest = Body(...),
    db: AsyncSession = Depends(get_db_session) # Inject DB session
):
    """
    Stops the recording session, applies speaker tags, generates final transcript,
    saves artifacts (placeholder), and updates status in DB.
    """
    logger.info(f"Received stop request for session: {session_id}")
    session = await session_manager.get_session(db, str(session_id))
    if not session:
        logger.error(f"Stop request failed: Session {session_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.status == "stopped" or session.status == "cancelled":
        logger.warning(f"Attempted to stop an already stopped/cancelled session: {session_id}")
        return StopSessionResponse(
             session_id=str(session_id),
             status=session.status,
             completion_timestamp=session.completion_time or session.last_update
        )

    # --- Final Processing --- 
    logger.info(f"Starting final processing for session {session_id}...")
    refined_segments = []
    full_transcript_text = ""
    session_storage_path = pathlib.Path(ARTIFACT_STORAGE_BASE_PATH) / str(session_id)
    chunk_dir_path = session_storage_path / "_chunks"
    audio_path = None # Final audio path
    transcript_path = None # Final transcript path
    
    try:
        # 0. Ensure Session Directory Exists (moved earlier in case chunks need reading)
        try:
             session_storage_path.mkdir(parents=True, exist_ok=True)
             logger.info(f"Ensured session directory exists: {session_storage_path}")
        except OSError as e:
             logger.error(f"Failed to create session directory {session_storage_path}: {e}")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create storage directory.")

        # 1. Retrieve stored segments, markers, and chunk paths
        segments = session.transcription_segments or []
        markers = session.markers or []
        audio_chunk_paths = session.audio_chunk_paths or [] # Get chunk paths
        logger.info(f"Retrieved {len(segments)} segments, {len(markers)} markers, and {len(audio_chunk_paths)} audio chunk paths for session {session_id}.")

        # 2. Concatenate Audio Chunks using ffmpeg
        if audio_chunk_paths:
             # Define final audio path
             audio_filename = f"{stop_request.audio_filename or session_id}.webm"
             final_audio_path = session_storage_path / audio_filename
             
             # Create temporary list file for ffmpeg concat demuxer
             list_file_path = chunk_dir_path / "concat_list.txt"
             try:
                 # Ensure chunk dir exists just in case
                 chunk_dir_path.mkdir(exist_ok=True) 
                 with open(list_file_path, 'w') as f:
                     for chunk_path in audio_chunk_paths:
                         # Need to escape special characters if any? Use absolute paths. Ensure format is correct.
                         f.write(f"file '{chunk_path}'\n") 
                 logger.info(f"Created ffmpeg concat list file: {list_file_path}")

                 # Construct and run ffmpeg command
                 ffmpeg_cmd = [
                     "ffmpeg",
                     "-f", "concat",
                     "-safe", "0", # Allow unsafe file paths (absolute paths used here)
                     "-i", str(list_file_path),
                     "-c", "copy", # Fast concatenation without re-encoding
                     str(final_audio_path)
                 ]
                 logger.info(f"Running ffmpeg command: {' '.join(ffmpeg_cmd)}")
                 result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=False)

                 if result.returncode == 0:
                     logger.info(f"Successfully concatenated audio chunks to: {final_audio_path}")
                     audio_path = final_audio_path # Set the final path for DB update
                     
                     # Clean up chunk files and list file
                     try:
                         os.remove(list_file_path)
                         shutil.rmtree(chunk_dir_path) # Remove _chunks directory
                         logger.info(f"Cleaned up audio chunks and list file for session {session_id}.")
                     except Exception as cleanup_e:
                         logger.error(f"Error during chunk cleanup for session {session_id}: {cleanup_e}")
                 else:
                     logger.error(f"ffmpeg concatenation failed for session {session_id}. Return code: {result.returncode}")
                     logger.error(f"ffmpeg stderr: {result.stderr}")
                     # Keep audio_path as None
                     # Optionally, attempt to remove the (potentially incomplete) final file
                     if final_audio_path.exists(): os.remove(final_audio_path) 

             except Exception as concat_e:
                 logger.error(f"Error during audio concatenation process for session {session_id}: {concat_e}", exc_info=True)
                 # Keep audio_path as None
                 if list_file_path.exists(): os.remove(list_file_path)
                 if final_audio_path.exists(): os.remove(final_audio_path)

        else:
             logger.warning(f"No audio chunk paths found for session {session_id}. Cannot create final audio file.")

        # 3. Extract Speaker Tag Events
        speaker_tags = sorted(
            [m for m in markers if m.get('marker_type') == 'speaker_tag_event'],
            key=lambda x: x.get('timestamp', 0)
        )
        logger.info(f"Found {len(speaker_tags)} speaker tag events.")

        # 4. Apply Speaker Tags to Segments
        refined_segments = segments.copy()
        tag_idx = 0
        for i, segment in enumerate(refined_segments):
            segment_start = segment.get('start')
            segment_end = segment.get('end')
            
            while tag_idx < len(speaker_tags):
                tag = speaker_tags[tag_idx]
                tag_time = tag.get('timestamp')
                tag_speaker = tag.get('speaker_id')
                
                if tag_time is None or tag_speaker is None:
                     tag_idx += 1; continue
                if segment_start is not None and tag_time < segment_start:
                     tag_idx += 1; continue
                if (segment_start is None or tag_time >= segment_start) and \
                   (segment_end is None or tag_time <= segment_end):
                    original_speaker = segment.get('speaker')
                    if original_speaker != tag_speaker:
                        refined_segments[i]['speaker'] = tag_speaker
                    tag_idx += 1
                elif segment_end is not None and tag_time > segment_end:
                    break
                else:
                     tag_idx += 1

        # 5. Generate Final Transcript Text
        lines = []
        for segment in refined_segments:
            speaker = segment.get('speaker', 'UNKNOWN')
            text = segment.get('text', '').strip()
            if text:
                lines.append(f"{speaker}: {text}")
        full_transcript_text = "\n".join(lines)
        logger.info(f"Generated final transcript text ({len(full_transcript_text)} chars) for session {session_id}.")

        # 6. Save Final Transcript File(s)
        transcript_filename_base = stop_request.transcription_filename or session_id
        transcript_txt_filename = f"{transcript_filename_base}.txt"
        transcript_path = session_storage_path / transcript_txt_filename
        
        # Save the .txt file
        try:
             with open(transcript_path, 'w', encoding='utf-8') as f:
                 f.write(full_transcript_text)
             logger.info(f"Saved transcript text file to: {transcript_path}")
        except IOError as e:
             logger.error(f"Failed to save transcript text file to {transcript_path}: {e}")
             transcript_path = None
        logger.warning(f"Generation/saving of other formats (PDF, DOCX) not implemented.")

    except Exception as e:
        logger.error(f"Error during final processing for session {session_id}: {e}", exc_info=True)
        logger.error(traceback.format_exc())
        await session_manager.update_session_status(db, str(session_id), "error_processing")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed during final processing: {e}")

    # 7. Update Database with final artifacts and status
    logger.info(f"Updating session {session_id} completion status in DB...")
    # Use the actual paths (or None if saving/concatenation failed)
    success = await session_manager.update_session_completion(
        db,
        str(session_id),
        audio_path=str(audio_path) if audio_path else None, # Use final concatenated path
        transcript_path=str(transcript_path) if transcript_path else None,
        transcript_text=full_transcript_text,
        final_segments=refined_segments
    )

    if not success:
         logger.error(f"Failed to update session {session_id} completion status in DB after processing.")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session completion status in DB after processing.")

    logger.info(f"Session {session_id} stopped and processed successfully.")
    return StopSessionResponse(
        session_id=str(session_id),
        status="completed",
        completion_timestamp=datetime.utcnow() 
    )

@router.post("/sessions/{session_id}/pause", 
            status_code=status.HTTP_200_OK,
            summary="Pause a recording session")
async def pause_session(
    session_id: UUID, # Use UUID for path validation
    db: AsyncSession = Depends(get_db_session) # Inject DB session
):
    """
    Sets the session status to 'paused' in the database.
    """
    session = await session_manager.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.status not in ["recording"]:
        logger.warning(f"Attempted to pause session {session_id} which is not recording (status: {session.status})")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, 
                            detail=f"Session is not currently recording (status: {session.status}).")

    if await session_manager.update_session_status(db, str(session_id), "paused"):
         logger.info(f"Session {session_id} paused.")
         return {"session_id": str(session_id), "status": "paused", "timestamp": datetime.utcnow()}
    else:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session status.")

@router.post("/sessions/{session_id}/resume", 
            status_code=status.HTTP_200_OK,
            summary="Resume a paused recording session")
async def resume_session(
    session_id: UUID, # Use UUID for path validation
    db: AsyncSession = Depends(get_db_session) # Inject DB session
):
    """
    Sets the session status back to 'recording' in the database.
    """
    session = await session_manager.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.status != "paused":
        logger.warning(f"Attempted to resume session {session_id} which is not paused (status: {session.status})")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, 
                            detail=f"Session is not currently paused (status: {session.status}).")

    if await session_manager.update_session_status(db, str(session_id), "recording"):
        logger.info(f"Session {session_id} resumed.")
        return {"session_id": str(session_id), "status": "recording", "timestamp": datetime.utcnow()}
    else:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session status.")

@router.post("/sessions/{session_id}/cancel", 
            status_code=status.HTTP_200_OK,
            summary="Cancel a recording session and discard data")
async def cancel_session(
    session_id: UUID, # Use UUID for path validation
    db: AsyncSession = Depends(get_db_session) # Inject DB session
):
    """
    Sets the session status to 'cancelled' in the database.
    Does not delete the record, but marks it as cancelled.
    """
    session = await session_manager.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if session.status in ["stopped", "cancelled"]:
         logger.warning(f"Attempted to cancel an already stopped/cancelled session: {session_id}")
         return {"session_id": str(session_id), "status": session.status, "timestamp": datetime.utcnow()}

    # Update status first
    success = await session_manager.update_session_status(db, str(session_id), "cancelled")
    cancel_time = datetime.utcnow()

    if not success:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session status to cancelled.")

    # TODO: Trigger cleanup?
    # - Signal WebSocket handler (happens automatically based on status check)
    # - Delete temporary files (if any were created outside WS handler)
    logger.info(f"Cancelling session {session_id}. No data deletion implemented, status set to cancelled.")
    
    # Do not remove from DB, just update status
    # session_manager.remove_session(db, str(session_id))

    return {"session_id": str(session_id), "status": "cancelled", "timestamp": cancel_time}

# --- NEW Endpoints for Session Listing and Retrieval --- 

# Define response model for list item
class SessionListItem(BaseModel):
     session_id: UUID
     session_name: str
     start_time: datetime
     status: str
     event_metadata: Optional[dict] = None # Include metadata summary
     
class ListSessionsResponse(BaseModel):
     sessions: List[SessionListItem]

@router.get("/sessions", 
            response_model=ListSessionsResponse, 
            summary="List previous sessions for the user")
async def list_sessions(
    request: Request, # To get user ID from headers/auth later
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    current_user_id: str = Depends(get_current_user_id) # Inject user ID
):
    """Retrieves a list of past recording sessions for the authenticated user."""
    # Use the injected user ID
    # TODO: Get user_id from authenticated request (e.g., request.state.user_id)
    # user_id = "current-user" # Placeholder
    user_id = current_user_id
    
    sessions_data = await session_manager.list_sessions(db, user_id, limit, offset)
    # Pydantic will automatically validate the structure based on SessionListItem
    return ListSessionsResponse(sessions=sessions_data)
    
# Define response model for full session details
class SessionDetailsResponse(BaseModel):
     session_id: UUID
     session_name: str
     status: str
     start_time: datetime
     last_update: datetime
     completion_time: Optional[datetime] = None
     detected_language: Optional[str] = None
     event_metadata: Optional[EventMetadataSchema] = None # Use schema for validation
     participants: Optional[List[ParticipantSchema]] = None # Use schema
     # output_preferences: Optional[dict] = None # Include if needed
     transcription_segments: Optional[List[dict]] = None # Array of segments
     markers: Optional[List[dict]] = None # Array of markers
     audio_storage_path: Optional[str] = None
     transcript_storage_path: Optional[str] = None
     full_transcript_text: Optional[str] = None # Editable transcript text
     # Add derived fields if needed, e.g., audio_url from audio_storage_path
     audio_url: Optional[str] = None 

@router.get("/sessions/{session_id}", 
            response_model=SessionDetailsResponse, 
            summary="Get full details for a specific session")
async def get_session_details(
    session_id: UUID, 
    request: Request, # Add request to construct full URL
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieves the full details for a specific recording session."""
    session_dict = await session_manager.get_session_dict(db, str(session_id))
    if not session_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        
    # Construct the audio URL relative to the gateway base path
    if session_dict.get("audio_storage_path"):
        # Assuming gateway path is /api/transcription
        # request.url.path gives the full path requested to *this* service
        # We want the path to the *new* audio endpoint
        audio_endpoint_path = f"/api/transcription/sessions/{session_id}/audio"
        session_dict["audio_url"] = audio_endpoint_path
        logger.debug(f"Constructed audio_url: {session_dict['audio_url']}")
    else:
        session_dict["audio_url"] = None
        
    # Pydantic will validate the dictionary against SessionDetailsResponse
    return session_dict
    
# Define request body model for updating session details
class UpdateSessionRequest(BaseModel):
     session_name: Optional[str] = None
     event_metadata: Optional[EventMetadataSchema] = None
     participants: Optional[List[ParticipantSchema]] = None
     full_transcript_text: Optional[str] = None
     # Add other editable fields if needed

class UpdateSessionResponse(BaseModel):
     session_id: UUID
     status: str = "updated"
     updated_at: datetime

@router.put("/sessions/{session_id}", 
            response_model=UpdateSessionResponse, 
            summary="Update details of a session")
async def update_session_details(
    session_id: UUID, 
    update_data: UpdateSessionRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Updates the editable details of a specific recording session."""
    # Convert Pydantic model to dict, excluding unset fields to avoid overwriting with None
    update_dict = update_data.dict(exclude_unset=True)
    
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")
        
    success = await session_manager.update_session_details(db, str(session_id), update_dict)
    
    if not success:
        # Check if session exists before raising 500
        session_exists = await session_manager.get_session(db, str(session_id))
        if not session_exists:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        else:
             # Update failed for other reason (logged in manager)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session details.")
             
    return UpdateSessionResponse(session_id=session_id, updated_at=datetime.utcnow())

# --- Marker Endpoint --- 

@router.post("/sessions/{session_id}/markers",
            response_model=AddMarkerResponse,
            status_code=status.HTTP_201_CREATED,
            summary="Add a timeline marker to a session")
async def add_marker(
    session_id: UUID,
    marker_request: AddMarkerRequest,
    request: Request, # To get user ID from auth later
    db: AsyncSession = Depends(get_db_session),
    current_user_id: str = Depends(get_current_user_id) # Inject user ID
):
    """Adds a marker to the specified session's timeline."""
    session = await session_manager.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Allow adding markers only during recording or paused states?
    if session.status not in ["recording", "paused"]:
         logger.warning(f"Attempted to add marker to session {session_id} with status {session.status}")
         raise HTTPException(
             status_code=status.HTTP_409_CONFLICT, 
             detail=f"Markers can only be added during an active (recording/paused) session. Current status: {session.status}"
         )
     
    # Use the injected user ID and add it to the marker data
    user_id = current_user_id
    marker_dict = marker_request.dict()
    marker_dict['user_id'] = user_id
    
    marker_id = await session_manager.add_marker_to_session(db, str(session_id), marker_dict)
    
    if not marker_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save marker to session.")
        
    return AddMarkerResponse(marker_id=marker_id, timestamp=datetime.utcnow())

# --- Endpoint to Retrieve Final Transcription --- 

@router.get("/sessions/{session_id}/transcription",
            response_model=GetTranscriptionResponse,
            summary="Get final transcription for a session")
async def get_transcription(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieves the final transcription text and segments for a completed session."""
    logger.info(f"Received request for transcription for session: {session_id}")
    session = await session_manager.get_session(db, str(session_id))

    if not session:
        logger.warning(f"Transcription request failed: Session {session_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Allow retrieval for completed, interrupted, or error states?
    # For now, let's allow retrieval if text/segments exist, regardless of exact status.
    if session.full_transcript_text is None and not session.transcription_segments:
        logger.warning(f"Transcription request for session {session_id}: No transcript data available (Status: {session.status}).")
        # Return 404 or an empty response? 404 seems appropriate if no data exists yet.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcription data not yet available for this session.")

    logger.info(f"Returning transcription data for session {session_id}.")
    return GetTranscriptionResponse(
        session_id=session.session_id,
        full_transcript_text=session.full_transcript_text,
        transcription_segments=session.transcription_segments,
        last_update=session.last_update
    )

# --- Existing File Upload Endpoint (Renamed for Clarity) ---

@router.post("/transcribe-file", 
             summary="(Util) Transcribe a single audio file with diarization",
             tags=["Utility"]) # Add tag
async def transcribe_audio_diarized_util(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session) # Inject DB session even if not directly used
):
    """
    Utility endpoint: Receives a single audio file, performs transcription 
    and speaker diarization, and returns segments with speaker labels.
    This is NOT used for the live transcription feature.
    """
    # Check if models are loaded using the centralized function
    if not are_models_loaded():
        # Models should have been loaded at startup by the lifespan manager.
        # If not, something went wrong during startup.
        logger.error("Models were not loaded successfully during application startup.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Transcription/Diarization models are not available. Check service logs."
        )

    logger.info(f"Received file for utility transcription: {file.filename}, content type: {file.content_type}")

    if not file.content_type.startswith("audio/"):
        logger.warning(f"Received non-audio file: {file.filename} ({file.content_type})")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload an audio file."
        )

    temp_audio_path = None
    try:
        start_time = time.time()
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_audio_file:
            content = await file.read()
            temp_audio_file.write(content)
            temp_audio_path = temp_audio_file.name
        logger.info(f"Temporary audio file created at: {temp_audio_path}")

        # 1. Load Audio
        logger.info("Loading audio...")
        audio = whisperx.load_audio(temp_audio_path)
        logger.info("Audio loaded.")

        # Get models for the detected or default language (defaulting to 'en')
        # Note: Transcription itself detects language, but alignment needs it upfront.
        # For simplicity, we'll transcribe first, then get the specific align model.
        
        # 2. Transcribe
        logger.info(f"Starting transcription (batch: {BATCH_SIZE})...")
        whisper_model, diarize_model, _ = get_models() # Get whisper and diarize models
        if not whisper_model:
             raise RuntimeError("Whisper model is not loaded.")
             
        result = whisper_model.transcribe(audio, batch_size=BATCH_SIZE)
        transcribe_time = time.time()
        detected_language = result.get("language", "en") # Default to 'en' if not detected
        logger.info(f"Transcription finished in {transcribe_time - start_time:.2f}s. Detected language: {detected_language}")

        # 3. Align Whisper output
        logger.info(f"Loading/getting alignment model for '{detected_language}' and aligning...")
        # Get the specific alignment model for the detected language
        _ , _, align_model_tuple = get_models(language_code=detected_language)
        if align_model_tuple is None:
             logger.error(f"Alignment model for language '{detected_language}' could not be loaded.")
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail=f"Failed to load alignment model for detected language: {detected_language}"
             )
        model_a, metadata = align_model_tuple
        
        # Align results
        result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
        align_time = time.time()
        logger.info(f"Alignment finished in {align_time - transcribe_time:.2f}s.")

        # 4. Diarize
        logger.info("Starting diarization...")
        if not diarize_model:
             raise RuntimeError("Diarization model is not loaded.")
             
        diarize_segments = diarize_model(audio)
        # Assign speaker labels
        result = whisperx.assign_word_speakers(diarize_segments, result)
        diarize_assign_time = time.time()
        logger.info(f"Diarization and speaker assignment finished in {diarize_assign_time - align_time:.2f}s.")

        # Prepare response
        output_segments = []
        for segment in result["segments"]:
            output_segments.append({
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": segment.get("text", "").strip(),
                "speaker": segment.get("speaker", "UNKNOWN")
            })

        total_time = time.time() - start_time
        logger.info(f"Processing completed for {file.filename} in {total_time:.2f}s.")

    except Exception as e:
        logger.error(f"Error during processing for {file.filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}"
        )
    finally:
        # Clean up the temporary file
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            logger.info(f"Temporary file {temp_audio_path} deleted.")
        await file.close()

    return {
        "filename": file.filename,
        "language": result.get("language"),
        "segments": output_segments
        } 

@router.get("/sessions/{session_id}/audio",
            summary="Get the audio file for a session",
            response_class=FileResponse # Use FileResponse directly
           )
async def get_session_audio(
    session_id: UUID,
    request: Request, # Can be used for auth checks if needed
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieves the concatenated audio file for a completed session."""
    logger.info(f"Request received for audio for session: {session_id}")
    session = await session_manager.get_session(db, str(session_id))

    if not session:
        logger.warning(f"Audio request failed: Session {session_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    if not session.audio_storage_path:
        logger.warning(f"Audio request failed: No audio file path stored for session {session_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found for this session.")

    audio_path = pathlib.Path(session.audio_storage_path)
    
    if not audio_path.is_file():
        logger.error(f"Audio request failed: Audio file not found at stored path: {audio_path}")
        # Maybe update DB state here if file is missing?
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file is missing or inaccessible.")
        
    # TODO: Add permission check - does the requesting user own this session?
    # user_id_from_auth = request.state.user_id # Assuming auth middleware sets this
    # if session.user_id != user_id_from_auth:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    # Determine filename for download
    # Use session name if available, fallback to session_id
    filename_base = session.session_name or str(session_id)
    download_filename = f"{filename_base}{audio_path.suffix}"
    
    # Determine media type based on suffix (simple check)
    media_type = "audio/webm" if audio_path.suffix.lower() == ".webm" else "application/octet-stream"
    
    logger.info(f"Serving audio file: {audio_path} as {download_filename} (type: {media_type})")
    return FileResponse(path=audio_path, media_type=media_type, filename=download_filename) 