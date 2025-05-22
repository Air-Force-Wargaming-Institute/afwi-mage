from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request, Body, Depends, Query, Form
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
import asyncio # Added for asyncio.sleep
import math # Add math for floor operation
import pandas as pd

# Import config constants directly using relative path
from config import DEVICE, BATCH_SIZE, ARTIFACT_STORAGE_BASE_PATH # Import new config
# Import session management and schemas using relative paths
from session_manager import session_manager # Use the refactored session manager instance
from schemas import (
     StartSessionRequest, StartSessionResponse, 
     StopSessionRequest, StopSessionResponse, 
     ParticipantSchema, EventMetadataSchema, # Import needed schemas for responses/updates
     AddMarkerRequest, AddMarkerResponse, # Import marker schemas
     GetTranscriptionResponse, # Import new response model
     UpdateSessionRequest, # Ensure this is the one from schemas.py
     UploadAudioResponse,
     UpdateSessionResponse as SchemaUpdateSessionResponse # Alias the one from schemas.py if needed
)
# Import the centralized model loader and getter using relative path
from model_loader import get_models, are_models_loaded
# Import DB session dependency and model using relative path
from database import get_db_session, TranscriptionSession 
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)

# Helper function to format time in HH:MM:SS
def format_time(seconds: float) -> str:
    if seconds is None:
        return "00:00:00"
    if not isinstance(seconds, (int, float)):
        try:
            seconds = float(seconds) # Attempt conversion
        except (ValueError, TypeError):
            logger.warning(f"Invalid type for seconds: {seconds}. Returning placeholder.")
            return "00:00:00" 

    h = math.floor(seconds / 3600)
    m = math.floor((seconds % 3600) / 60)
    s = math.floor(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

# --- NEW HELPER FUNCTION ---
def generate_transcript_with_speaker_paragraphs(segments: List[dict], markers: List[dict]) -> str:
    """
    Generates a single transcript string by interleaving transcription segments
    (grouped into paragraphs by speaker) and timeline markers chronologically.
    Paragraphs are formatted as SPEAKER_LABEL [START_TIME - END_TIME]: Text.
    """
    processed_items = []
    if segments:
        for seg in segments:
            # Ensure segments have 'start' and 'text' for processing
            if seg.get("start") is not None and seg.get("text") is not None:
                processed_items.append({
                    "time": seg.get("start"),
                    "type": "segment",
                    "text": seg.get("text", "").strip(),
                    "speaker": seg.get("speaker", "UNKNOWN"),
                    "end": seg.get("end") # Crucial for paragraph end time
                })
            else:
                logger.warning(f"Skipping segment due to missing 'start' or 'text': {seg}")


    if markers:
        for marker in markers:
            if marker.get("timestamp") is not None:
                processed_items.append({
                    "time": marker.get("timestamp"),
                    "type": "marker",
                    "marker_type": marker.get("marker_type", "generic_marker"),
                    "description": marker.get("description"), # For custom markers
                    "speaker_name": marker.get("speaker_name"), # For speaker_tag_event
                    "speaker_role": marker.get("speaker_role")  # For speaker_tag_event
                })
            else:
                logger.warning(f"Skipping marker due to missing 'timestamp': {marker}")

    # Filter out items with no time for sorting (should be rare after checks)
    processed_items = [item for item in processed_items if item.get("time") is not None]
    processed_items.sort(key=lambda x: x["time"])

    output_lines = []
    current_speaker_segments = []
    current_speaker_label = None
    paragraph_start_time = None
    paragraph_end_time = None

    def finalize_paragraph():
        nonlocal output_lines, current_speaker_segments, current_speaker_label, paragraph_start_time, paragraph_end_time
        if current_speaker_segments:
            full_paragraph_text = " ".join(current_speaker_segments)
            formatted_start = format_time(paragraph_start_time)
            formatted_end = format_time(paragraph_end_time if paragraph_end_time is not None else paragraph_start_time) # Handle if end time is None
            output_lines.append(f"[{formatted_start} - {formatted_end}] {current_speaker_label}: {full_paragraph_text}")
        current_speaker_segments = []
        current_speaker_label = None
        paragraph_start_time = None
        paragraph_end_time = None

    for item in processed_items:
        if item["type"] == "segment":
            segment_text = item["text"]
            if not segment_text: # Skip empty text segments
                if item.get("end") is not None and paragraph_start_time is not None and item["speaker"] == current_speaker_label:
                    # If an empty segment from the current speaker still has a valid end time, update paragraph_end_time
                    paragraph_end_time = max(paragraph_end_time or item["end"], item["end"])
                continue

            if item["speaker"] == current_speaker_label:
                current_speaker_segments.append(segment_text)
                if item.get("end") is not None:
                    paragraph_end_time = max(paragraph_end_time or item["end"], item["end"])
            else:
                finalize_paragraph()
                current_speaker_label = item["speaker"]
                current_speaker_segments.append(segment_text)
                paragraph_start_time = item["time"]
                paragraph_end_time = item.get("end", item["time"])
        
        elif item["type"] == "marker":
            finalize_paragraph() # Finalize any pending speaker paragraph before a marker
            formatted_timestamp = format_time(item["time"])
            marker_display_type = item['marker_type'].upper()
            
            if item['marker_type'] == "speaker_tag_event":
                speaker_name_display = item.get('speaker_name', 'Unknown Speaker')
                speaker_role_display = f" ({item.get('speaker_role', 'N/A')})" if item.get('speaker_role') else ""
                output_lines.append(f"[{formatted_timestamp}]        (*** SPEAKER: {speaker_name_display}{speaker_role_display} ***)")
            else: # Generic markers or custom ones
                description = item.get('description')
                if description and description.startswith(f"{marker_display_type} at"): # Avoid redundant "at TIME" if description already has it.
                    output_lines.append(f"[{formatted_timestamp}]        (*** {description} ***)")
                else:
                    output_lines.append(f"[{formatted_timestamp}]        (*** {marker_display_type}{f': {description}' if description else ''} ***)")


    finalize_paragraph() # Finalize any remaining paragraph after the loop

    return '\n\n'.join(output_lines)
# --- END NEW HELPER FUNCTION ---

# --- START NEW FULL AUDIO PROCESSING FUNCTION ---
async def process_entire_audio_for_final_transcript(
    audio_path: str,
    language_code: Optional[str] = "en",
    num_participants: Optional[int] = None
) -> List[dict]:
    logger.info(f"Starting full audio processing for final transcript: {audio_path}")
    if not os.path.exists(audio_path):
        logger.error(f"Audio file not found for final processing: {audio_path}")
        return []

    try:
        # Ensure latest models are fetched, especially if language might change
        whisper_model, diarize_model, align_model_tuple = get_models(language_code=language_code)

        if not whisper_model:
            logger.error("Whisper model not loaded. Cannot perform final transcription.")
            return []

        audio = whisperx.load_audio(audio_path)

        logger.info(f"Final Transcribe: Transcribing entire audio...")
        transcription_result = whisper_model.transcribe(audio, batch_size=BATCH_SIZE)
        detected_language = transcription_result.get("language", language_code or "en")
        logger.info(f"Final Transcribe: Detected language: {detected_language}")

        current_segments = transcription_result.get("segments", [])
        if not current_segments:
            logger.warning(f"Final Transcribe: No segments produced by Whisper for {audio_path}.")
            return []

        # Reload align model if language changed or initial one was for a different language
        if detected_language != language_code or align_model_tuple is None:
            logger.info(f"Final Transcribe: Updating alignment model for language: {detected_language}")
            _ , _, align_model_tuple = get_models(language_code=detected_language)

        aligned_segments_data = {"segments": current_segments, "word_segments": []}
        if align_model_tuple:
            model_a, metadata = align_model_tuple
            logger.info(f"Final Transcribe: Aligning transcription...")
            aligned_segments_data = whisperx.align(
                current_segments, model_a, metadata, audio, DEVICE, return_char_alignments=False
            )
        else:
            logger.warning(f"Final Transcribe: Alignment model for '{detected_language}' not available. Using unaligned segments for structure.")
            # Ensure word_segments structure for assign_word_speakers if using raw segments
            word_segments_from_raw = []
            for seg_raw in current_segments:
                if 'words' in seg_raw and isinstance(seg_raw['words'], list):
                    word_segments_from_raw.extend(seg_raw['words'])
            aligned_segments_data['word_segments'] = word_segments_from_raw
        
        final_segments_with_speaker = aligned_segments_data.get("segments", [])

        if diarize_model:
            logger.info(f"Final Transcribe: Performing diarization on entire audio...")
            min_speakers_param = 1
            max_speakers_param = num_participants if num_participants and num_participants > 0 else None
            
            try:
                # PyAnnote's DiarizationPipeline can take the audio file path directly
                diarization_annotation = diarize_model(audio_path, min_speakers=min_speakers_param, max_speakers=max_speakers_param)

                if diarization_annotation is not None and not isinstance(diarization_annotation, pd.DataFrame):
                    if not diarization_annotation.labels():
                        diarize_segments_df = pd.DataFrame(columns=['speaker', 'start', 'end'])
                    else:
                        turns = []
                        for turn, _, speaker_label in diarization_annotation.itertracks(yield_label=True):
                            turns.append({'start': turn.start, 'end': turn.end, 'speaker': speaker_label})
                        diarize_segments_df = pd.DataFrame(turns) if turns else pd.DataFrame(columns=['speaker', 'start', 'end'])
                elif isinstance(diarization_annotation, pd.DataFrame):
                    diarize_segments_df = diarization_annotation
                else:
                    diarize_segments_df = pd.DataFrame(columns=['speaker', 'start', 'end'])

                if not diarize_segments_df.empty:
                    logger.info(f"Final Transcribe: Assigning word speakers...")
                    # Ensure aligned_segments_data has 'word_segments' if not produced by whisperx.align
                    if 'word_segments' not in aligned_segments_data or not aligned_segments_data['word_segments']:
                        if aligned_segments_data.get('segments'): # if segments exist, try to create word_segments from them
                            word_segments_from_segments_reprocess = []
                            for seg_reprocess in aligned_segments_data['segments']:
                                if 'words' in seg_reprocess and isinstance(seg_reprocess['words'], list):
                                    word_segments_from_segments_reprocess.extend(seg_reprocess['words'])
                            aligned_segments_data['word_segments'] = word_segments_from_segments_reprocess
                        else: # No segments means no words
                            aligned_segments_data['word_segments'] = []
                    result_with_speakers = whisperx.assign_word_speakers(diarize_segments_df, aligned_segments_data)
                    final_segments_with_speaker = result_with_speakers.get("segments", [])
                else:
                    logger.warning("Final Transcribe: Diarization produced no speaker segments. Speaker labels will be UNKNOWN.")
                    for seg in final_segments_with_speaker: seg.setdefault('speaker', 'UNKNOWN')
            except Exception as e_diarize:
                logger.error(f"Final Transcribe: Error during diarization or speaker assignment: {e_diarize}", exc_info=True)
                for seg in final_segments_with_speaker: seg.setdefault('speaker', 'UNKNOWN')
        else:
            logger.warning("Final Transcribe: Diarization model not available. Speaker labels will be UNKNOWN.")
            for seg in final_segments_with_speaker: seg.setdefault('speaker', 'UNKNOWN')
        
        output_segments = []
        for seg_data in final_segments_with_speaker:
            segment_words = seg_data.get('words', [])
            word_confidences = []
            if isinstance(segment_words, list):
                for w_seg in segment_words:
                    if isinstance(w_seg, dict) and 'score' in w_seg and w_seg['score'] is not None:
                        word_confidences.append(w_seg['score'])
            segment_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else None
            output_segments.append({
                "speaker": seg_data.get("speaker", "UNKNOWN"),
                "text": seg_data.get("text", "").strip(),
                "start": seg_data.get("start"),
                "end": seg_data.get("end"),
                "confidence": segment_confidence
            })

        logger.info(f"Final Transcribe: Processing complete. Generated {len(output_segments)} segments.")
        return output_segments

    except Exception as e:
        logger.error(f"Error during final audio processing for {audio_path}: {e}", exc_info=True)
        return []
# --- END NEW FULL AUDIO PROCESSING FUNCTION ---

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

@router.post("/api/transcription/start-session", 
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
    ws_url = f"{ws_scheme}://{request.url.netloc}/api/ws/transcription/stream/{session_id}"

    return StartSessionResponse(
        session_id=session_id,
        start_timestamp=datetime.utcnow(), # Use current time, DB might have default
        streaming_url=ws_url
    )

@router.post("/api/transcription/sessions/{session_id}/stop",
            response_model=StopSessionResponse,
            summary="Stop and finalize a recording session")
async def stop_session(
    session_id: UUID,
    stop_request: StopSessionRequest = Body(...),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Signals the WebSocket to stop the recording session, finalize processing,
    save artifacts, and updates status in DB.
    The actual audio saving and final segment processing is now primarily handled
    by the WebSocket handler upon detecting the 'stopped' status.
    """
    logger.info(f"Received stop request for session: {session_id}")
    session = await session_manager.get_session(db, str(session_id))
    if not session:
        logger.error(f"Stop request failed: Session {session_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # Check if session is already in a terminal state
    if session.status in ["stopped", "completed", "cancelled", "error_processing", "error", "interrupted"]:
        logger.warning(f"Attempted to stop session {session_id} which is already in a terminal status: '{session.status}'.")
        return StopSessionResponse(
             session_id=str(session_id),
             status=session.status, # Return existing terminal status
             completion_timestamp=session.completion_time or session.last_update # Use existing times
        )

    # Signal the WebSocket handler by setting the session status to "stopped"
    # The WebSocket handler will detect this change, perform final processing 
    # (including saving main_audio_accumulator and final transcription_segments),
    # and then close the WebSocket connection.
    logger.info(f"Setting session {session_id} status to 'stopped' to signal WebSocket handler.")
    await session_manager.update_session_status(db, str(session_id), "stopped")

    # --- MODIFIED: Polling for WebSocket finalization ---
    max_wait_seconds = 20  # Max time to wait for WebSocket to finalize
    poll_interval_seconds = 0.75 # How often to check DB
    waited_seconds = 0
    ws_processing_assumed_complete = False

    logger.info(f"[{session_id}] Waiting for WebSocket handler to save final audio and all segments...")
    while waited_seconds < max_wait_seconds:
        await db.refresh(session) # Get the latest state from DB
        
        # Check conditions indicating WS has finished its main DB updates:
        if session.audio_storage_path and session.completion_time:
            logger.info(f"[{session_id}] WebSocket finalized: audio_storage_path and completion_time are set.")
            ws_processing_assumed_complete = True
            break
        
        if session.status not in ["recording", "paused", "stopped"]: # If WS changed status to terminal
            logger.info(f"[{session_id}] WebSocket finalized: session status is now '{session.status}'.")
            ws_processing_assumed_complete = True
            break
            
        if session.completion_time and session.status == "stopped":
             logger.info(f"[{session_id}] WebSocket handler set completion_time. Assuming finalization.")
             ws_processing_assumed_complete = True
             break

        await asyncio.sleep(poll_interval_seconds)
        waited_seconds += poll_interval_seconds
        logger.debug(f"[{session_id}] Polling for WS finalization... waited {waited_seconds:.1f}s. Current status: {session.status}, audio_path: {session.audio_storage_path}, completion_time: {session.completion_time}")

    if not ws_processing_assumed_complete:
        logger.warning(f"[{session_id}] Timed out waiting for WebSocket handler to fully signal completion after {max_wait_seconds}s. Proceeding with available data.")
    # --- END MODIFICATION ---

    # Re-fetch the session to get updated info (like audio_storage_path and final segments)
    # that should have been populated by the WebSocket handler.
    await db.refresh(session) 
    logger.info(f"Refreshed session {session_id} data after polling/timeout. Final status from DB: {session.status}")

    # The WebSocket handler should have updated session.transcription_segments and session.audio_storage_path.
    # This route now finalizes any remaining metadata or text formatting if necessary.

    final_audio_path_str = session.audio_storage_path
    reprocessed_segments = [] # Initialize reprocessed_segments

    if final_audio_path_str and os.path.exists(final_audio_path_str):
        logger.info(f"[{session_id}] Starting full reprocessing of audio file: {final_audio_path_str}")
        num_participants = len(session.participants) if session.participants else 0
        language_for_reprocessing = session.detected_language or "en"
        
        reprocessed_segments = await process_entire_audio_for_final_transcript(
            final_audio_path_str,
            language_code=language_for_reprocessing,
            num_participants=num_participants
        )
        if reprocessed_segments:
            logger.info(f"[{session_id}] Full reprocessing generated {len(reprocessed_segments)} segments.")
            # Overwrite segments from live processing with these more accurate ones
            refined_segments = reprocessed_segments # Use this for generating full text
        else:
            logger.warning(f"[{session_id}] Full reprocessing did not generate new segments. Using existing segments if any.")
            refined_segments = session.transcription_segments or [] 
    else:
        logger.warning(f"[{session_id}] No final audio path or file does not exist. Skipping full reprocessing. Path: {final_audio_path_str}")
        refined_segments = session.transcription_segments or []
    
    markers_from_db = session.markers or []
    
    logger.info(f"[{session_id}] Using {len(refined_segments)} segments (after potential reprocessing) and {len(markers_from_db)} markers for final transcript generation.")
    
    # Generate an intermediate full_transcript_text from live segments (can include timestamps)
    # This version is saved to the DB and might be overwritten by the frontend's retranscribe.
    if refined_segments or markers_from_db:
        intermediate_full_transcript_text = generate_transcript_with_speaker_paragraphs(refined_segments, markers_from_db)
        logger.info(f"Generated final transcript text with markers for DB for session {session_id}.")
    else:
        intermediate_full_transcript_text = ""
        logger.info(f"[{session_id}] No refined segments or markers for final transcript text.")

    # Update Database with final text transcript path and mark as 'completed' if it was 'stopped'.
    # The WebSocket handler should have set audio_storage_path and transcription_segments.
    # This call mainly finalizes status to 'completed' and saves text transcript path.
    
    final_status_for_db = session.status
    final_completion_time = session.completion_time
    
    if final_status_for_db == "stopped":
        final_status_for_db = "completed"
        if not final_completion_time:
            final_completion_time = datetime.utcnow()
    elif final_status_for_db not in ["completed", "interrupted", "error", "cancelled"]:
        logger.warning(f"[{session_id}] Unexpected session status '{final_status_for_db}' after WS processing. Setting to 'completed'.")
        final_status_for_db = "completed"
        if not final_completion_time:
            final_completion_time = datetime.utcnow()

    update_success = await session_manager.update_session_completion(
        db,
        str(session_id),
        audio_path=final_audio_path_str,
        transcript_text=intermediate_full_transcript_text,
        final_segments=refined_segments
    )
    
    if update_success:
        session.status = final_status_for_db
        session.completion_time = final_completion_time
        # session.last_update is set by update_session_completion
        await db.commit()
        logger.info(f"Session {session_id} finalized in DB. Status: {session.status}")
    else:
        logger.error(f"Failed to update session {session_id} completion details in DB after processing.")

    # Re-fetch one last time to ensure the response reflects the absolute latest state.
    await db.refresh(session)

    logger.info(f"Session {session_id} stop process complete. Final API status: {session.status}")
    return StopSessionResponse(
        session_id=str(session_id),
        status=session.status,
        completion_timestamp=session.completion_time or datetime.utcnow()
    )

@router.post("/api/transcription/sessions/{session_id}/pause", 
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

@router.post("/api/transcription/sessions/{session_id}/resume", 
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

@router.post("/api/transcription/sessions/{session_id}/cancel", 
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

@router.get("/api/transcription/sessions", 
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

@router.get("/api/transcription/sessions/{session_id}", 
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
    
class UpdateSessionResponse(BaseModel): # This local definition is fine if it's what the route should return
     session_id: UUID
     status: str = "updated"
     updated_at: datetime

@router.put("/api/transcription/sessions/{session_id}", 
            response_model=SchemaUpdateSessionResponse, # Uses the aliased UpdateSessionResponse
            summary="Update details of a session")
async def update_session_details(
    session_id: UUID, 
    update_data: UpdateSessionRequest, # Crucially, this should now refer to the imported schemas.UpdateSessionRequest
    db: AsyncSession = Depends(get_db_session)
):
    """Updates the editable details of a specific recording session."""
    # Convert Pydantic model to dict, excluding unset fields to avoid overwriting with None
    update_dict = update_data.dict(exclude_unset=True)
    
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")
    
    client_provided_full_transcript_text = update_dict.get("full_transcript_text")
        
    success = await session_manager.update_session_details(db, str(session_id), update_dict)
    
    if not success:
        # Check if session exists before raising 500
        session_exists = await session_manager.get_session(db, str(session_id))
        if not session_exists:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        else:
             # Update failed for other reason (logged in manager)
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update session details.")

    # If update was successful AND client_provided_full_transcript_text is not None
    # (meaning it was explicitly sent, even if empty string), write the .txt file.
    # --- MODIFICATION START for update_session_details ---
    session_after_update = await session_manager.get_session(db, str(session_id)) # Re-fetch to get all current data
    if not session_after_update:
        logger.error(f"Session {session_id} not found after presumed successful update. Cannot proceed with transcript file writing.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Session data inconsistent after update.")

    text_to_write_to_file = ""

    if client_provided_full_transcript_text is not None:
        text_to_write_to_file = client_provided_full_transcript_text
        logger.info(f"Using client-provided full_transcript_text for session {session_id}.")
    elif "markers" in update_dict or "transcription_segments" in update_dict: # Check if relevant fields were updated
        logger.info(f"Regenerating full_transcript_text for session {session_id} due to updated markers/segments.")
        current_segments = session_after_update.transcription_segments or []
        current_markers = session_after_update.markers or []
        
        text_to_write_to_file = generate_transcript_with_speaker_paragraphs(current_segments, current_markers)
        
        session_after_update.full_transcript_text = text_to_write_to_file
        session_after_update.last_update = datetime.utcnow()
        try:
            await db.commit()
            await db.refresh(session_after_update)
            logger.info(f"Successfully saved regenerated full_transcript_text to DB for session {session_id}.")
        except Exception as e_commit:
            await db.rollback()
            logger.error(f"Failed to commit regenerated full_transcript_text to DB for session {session_id}: {e_commit}")
    else:
        text_to_write_to_file = session_after_update.full_transcript_text or ""
        logger.info(f"Using existing full_transcript_text from DB for session {session_id} for file writing.")
    # --- MODIFICATION END for update_session_details ---
    
    # Write the determined transcript text to file
    # if client_provided_full_transcript_text is not None: # This condition is now handled by text_to_write_to_file logic
    # session_after_update = await session_manager.get_session(db, str(session_id)) # Already fetched
    # if session_after_update: # Already checked
    session_storage_path = pathlib.Path(ARTIFACT_STORAGE_BASE_PATH) / str(session_id)
    session_storage_path.mkdir(parents=True, exist_ok=True)

    # Use session_name for the file, fallback to session_id
    filename_base = session_after_update.session_name or str(session_id)
    transcript_txt_filename = f"{filename_base}.txt"
    transcript_txt_full_path = session_storage_path / transcript_txt_filename

    try:
        with open(transcript_txt_full_path, 'w', encoding='utf-8') as f:
            f.write(text_to_write_to_file)
        logger.info(f"Saved/Updated final transcript text file to: {transcript_txt_full_path} (via update_session_details)")

        # Update transcript_storage_path in the DB if it's different or needs to be set
        if session_after_update.transcript_storage_path != str(transcript_txt_full_path.resolve()):
            session_after_update.transcript_storage_path = str(transcript_txt_full_path.resolve())
            session_after_update.last_update = datetime.utcnow()
            await db.commit() # Commit this specific change
            logger.info(f"Updated transcript_storage_path in DB to {transcript_txt_full_path}")
    except IOError as e_io:
        logger.error(f"Failed to save transcript text file to {transcript_txt_full_path} (via update_session_details): {e_io}")

    return SchemaUpdateSessionResponse(session_id=session_id, updated_at=datetime.utcnow())

# --- Marker Endpoint --- 

@router.post("/api/transcription/sessions/{session_id}/markers",
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
    # ADD THIS LOG:
    logger.info(f"BACKEND_LIVE_MARKER_REQUEST: Received marker_request.dict(): {marker_request.dict()}")

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
    
    # ADD THIS LOG:
    logger.info(f"BACKEND_LIVE_MARKER_DICT_TO_SAVE: marker_dict before calling add_marker_to_session: {marker_dict}")
    
    marker_id = await session_manager.add_marker_to_session(db, str(session_id), marker_dict)
    
    if not marker_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save marker to session.")
        
    return AddMarkerResponse(marker_id=marker_id, timestamp=datetime.utcnow())

# --- Endpoint to Retrieve Final Transcription --- 

@router.get("/api/transcription/sessions/{session_id}/transcription",
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

# --- START EDIT ---
@router.delete("/api/transcription/sessions/{session_id}",
               status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete a specific session")
async def delete_session_endpoint(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session)
    # current_user_id: str = Depends(get_current_user_id) # Optional: Add ownership check
):
    """
    Deletes a specific transcription session by its ID.
    This will remove the session record from the database.
    """
    logger.info(f"Received request to delete session: {session_id}")

    # Optional: Add check to ensure user owns the session before deleting
    # session_to_check = await session_manager.get_session(db, str(session_id))
    # if not session_to_check:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    # if session_to_check.user_id != current_user_id:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not authorized to delete this session.")

    success = await session_manager.delete_session(db, str(session_id))

    if not success:
        # session_manager.delete_session logs whether it was a 404 or a 500-type error
        # We can assume if it failed after finding it, it's a server error.
        # If it couldn't find it, get_session within delete_session would have logged.
        # For simplicity, we can re-check existence if needed or rely on delete_session's outcome.
        # Re-checking existence to give a more accurate error:
        existing_session = await session_manager.get_session(db, str(session_id))
        if not existing_session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found, cannot delete.")
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete session from database.")

    # If successful, FastAPI will automatically return a 204 No Content response.
    # No need to return anything explicitly.
    return
# --- END EDIT ---

# --- Existing File Upload Endpoint (Renamed for Clarity) ---

@router.post("/api/transcription/transcribe-file", 
             summary="(Util) Transcribe a single audio file (NO DIARIZATION)",
             tags=["Utility"]) 
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
            detail="Transcription/Alignment models are not available. Check service logs."
        )

    logger.info(f"Received file for utility transcription: {file.filename}, content type: {file.content_type}")

    # Define allowed extensions
    allowed_extensions = [".m4a", ".mp3", ".webm", ".mp4", ".mpga", ".wav", ".mpeg"]
    file_extension = pathlib.Path(file.filename).suffix.lower() if file.filename else ""

    # Validate file type based on content_type or extension
    is_audio_content_type = file.content_type.startswith("audio/")
    is_allowed_extension = file_extension in allowed_extensions

    if not (is_audio_content_type or is_allowed_extension):
        logger.warning(f"Received file with unsupported type: {file.filename} (Content-Type: {file.content_type}, Extension: {file_extension})")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Please upload an audio file. Allowed extensions: {', '.join(allowed_extensions)}"
        )

    temp_audio_path = None
    try:
        start_time = time.time()
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
        whisper_model, _, _ = get_models() # Diarize model is None
        if not whisper_model:
             raise RuntimeError("Whisper model is not loaded.")
             
        result = whisper_model.transcribe(audio, batch_size=BATCH_SIZE)
        transcribe_time = time.time()
        detected_language = result.get("language", "en")
        logger.info(f"Transcription finished in {transcribe_time - start_time:.2f}s. Detected language: {detected_language}")

        # 3. Align Whisper output
        logger.info(f"Loading/getting alignment model for '{detected_language}' and aligning...")
        _ , _, align_model_tuple = get_models(language_code=detected_language) # Diarize model is None
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

        # Diarization SKIPPED
        logger.info("Diarization and speaker assignment (SKIPPED)...")
        # diarize_model will be None from get_models()
        # if not diarize_model:
             # logger.warning("Diarization model not available. Skipping diarization.")
        # else:
            # diarize_segments = diarize_model(audio)
            # result = whisperx.assign_word_speakers(diarize_segments, result)
            # diarize_assign_time = time.time()
            # logger.info(f"Diarization and speaker assignment finished in {diarize_assign_time - align_time:.2f}s.")
        logger.warning("Diarization and speaker assignment have been SKIPPED.")

        output_segments = []
        segments_to_process = result.get("segments", []) if isinstance(result, dict) else result if isinstance(result, list) else []
        for segment in segments_to_process:
            output_segments.append({
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": segment.get("text", "").strip(),
                "speaker": "UNKNOWN" # Speaker is UNKNOWN as diarization is skipped
            })

        total_time = time.time() - start_time
        logger.info(f"Processing completed for {file.filename} in {total_time:.2f}s (Diarization SKIPPED).")

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

@router.get("/api/transcription/sessions/{session_id}/audio",
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

@router.post("/api/transcription/upload-audio",
            response_model=UploadAudioResponse,
            summary="Upload audio, provide metadata, create session, transcribe, and store.")
async def upload_audio_with_metadata(
    request: Request,
    file: UploadFile = File(...),
    session_name: str = Form(...),
    security_classification: str = Form(...),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session)
):
    if not are_models_loaded():
        logger.error("Models were not loaded successfully during application startup.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Transcription models are not available. Check service logs."
        )

    # Define allowed extensions
    allowed_extensions = [".m4a", ".mp3", ".webm", ".mp4", ".mpga", ".wav", ".mpeg"]
    file_extension = pathlib.Path(file.filename).suffix.lower() if file.filename else ""

    # Validate file type based on content_type or extension
    is_audio_content_type = file.content_type.startswith("audio/")
    is_allowed_extension = file_extension in allowed_extensions

    if not (is_audio_content_type or is_allowed_extension):
        logger.warning(f"Received file with unsupported type: {file.filename} (Content-Type: {file.content_type}, Extension: {file_extension})")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Please upload an audio file. Allowed extensions: {', '.join(allowed_extensions)}"
        )
    
    # Assuming SECURITY_CLASSIFICATIONS is a list/constant available for validation
    # For example: from frontend_constants import SECURITY_CLASSIFICATIONS 
    # Or define it in backend config if it's shared knowledge
    # For this snippet, direct string comparison or a helper function would be used.
    # Placeholder for actual validation logic of security_classification:
    # if not security_classification or security_classification == "SELECT A SECURITY CLASSIFICATION" : 
    if not security_classification or security_classification.startswith("SELECT A"): # More robust placeholder check
        logger.warning(f"Invalid security classification provided: {security_classification}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid security classification is required.")

    # Prepare data for session creation
    event_meta = EventMetadataSchema(classification=security_classification) # Assuming classification is the main field to set here
    session_start_data = StartSessionRequest(
        session_name=session_name, # User provided session name
        event_metadata=event_meta,
        participants=[] # No participants by default for uploaded files
    )

    session_id_str = await session_manager.create_session(db, session_start_data, current_user_id)
    if not session_id_str:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session for uploaded file.")
    
    logger.info(f"Created session {session_id_str} for uploaded file (original: {file.filename}, session name: {session_name})")
    session_id_uuid = UUID(session_id_str)

    session_artifact_path = pathlib.Path(ARTIFACT_STORAGE_BASE_PATH) / session_id_str
    session_artifact_path.mkdir(parents=True, exist_ok=True)
    
    file_suffix = pathlib.Path(file.filename).suffix if file.filename else ".audio"
    saved_audio_filename = f"uploaded_audio_original{file_suffix}" # More specific name
    saved_audio_full_path = session_artifact_path / saved_audio_filename
    temp_audio_path_for_processing = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as temp_audio_file_for_upload:
            content = await file.read()
            temp_audio_file_for_upload.write(content)
            temp_audio_path_for_processing = temp_audio_file_for_upload.name
        
        shutil.copy2(temp_audio_path_for_processing, saved_audio_full_path)
        logger.info(f"Uploaded audio file saved to: {saved_audio_full_path}")

        # Update session with audio storage path immediately
        current_session = await session_manager.get_session(db, session_id_str)
        if not current_session: # Should not happen if create_session succeeded
            logger.error(f"Session {session_id_str} not found after creation for audio path update.")
            # Consider how to handle this error, maybe cleanup session? For now, raise.
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Session consistency error after creation.")

        current_session.audio_storage_path = str(saved_audio_full_path.resolve())
        current_session.last_update = datetime.utcnow()
        await db.commit()
        logger.info(f"Session {session_id_str} DB updated with audio path: {saved_audio_full_path}")
        
        # Perform transcription and diarization on the saved audio file
        logger.info(f"Starting transcription for uploaded audio: {saved_audio_full_path}. num_participants will be dynamic (None).")
        
        language_for_processing = current_session.detected_language or "en" # Get language from session or default

        final_segments = await process_entire_audio_for_final_transcript(
            str(saved_audio_full_path.resolve()),
            language_code=language_for_processing,
            num_participants=None # CRITICAL: Ensures PyAnnote determines speaker count
        )

        if not final_segments:
            logger.warning(f"Transcription of {saved_audio_full_path} resulted in no segments.")
            
        full_transcript_text = generate_transcript_with_speaker_paragraphs(final_segments, []) # No live markers
        
        # Save the .txt transcript using the session_name for the file
        transcript_txt_filename = f"{session_name}_transcript.txt" # Use the user-provided session name
        transcript_txt_full_path = session_artifact_path / transcript_txt_filename
        with open(transcript_txt_full_path, 'w', encoding='utf-8') as f:
            f.write(full_transcript_text)
        logger.info(f"Text transcript saved to: {transcript_txt_full_path}")

        # Update the session as completed with all details
        update_success = await session_manager.update_session_completion(
            db,
            session_id_str,
            audio_path=str(saved_audio_full_path.resolve()),
            transcript_path=str(transcript_txt_full_path.resolve()),
            transcript_text=full_transcript_text,
            final_segments=final_segments
            # detected_language will be set by process_entire_audio if it changes
        )
        
        # Also ensure status is 'completed' explicitly and set completion time
        if update_success:
            # Re-fetch session to make sure we're updating the latest version
            session_after_processing = await session_manager.get_session(db, session_id_str)
            if session_after_processing: # Check if session still exists
                session_after_processing.status = "completed"
                session_after_processing.completion_time = datetime.utcnow()
                session_after_processing.last_update = datetime.utcnow() # Ensure last_update is current
                await db.commit()
                logger.info(f"Session {session_id_str} finalized status as 'completed' and set completion time.")
            else:
                # This case should ideally not be reached if update_success was true and session existed.
                logger.error(f"Session {session_id_str} not found after update_session_completion returned success.")
                update_success = False # Mark as failed for response
        else: # update_session_completion failed
            logger.error(f"Failed to update session {session_id_str} completion details in DB after processing uploaded file.")
            
        details_url_str = str(request.url_for("get_session_details", session_id=session_id_uuid))

        return UploadAudioResponse(
            session_id=session_id_uuid,
            session_name=session_name, # Return the user-provided session name
            status="completed" if update_success else "processing_error", # More specific status
            message="Audio file processed successfully." if update_success else "Error during final database update for session.",
            details_url=details_url_str if update_success else None
        )

    except HTTPException: # Re-raise HTTP exceptions from our own code or FastAPI
        if 'session_id_str' in locals() and session_id_str: # Check if session_id was created
             await session_manager.update_session_status(db, session_id_str, "error_processing")
        raise
    except Exception as e:
        logger.error(f"General error processing uploaded audio file {file.filename} (session: {session_id_str if 'session_id_str' in locals() else 'N/A'}): {e}", exc_info=True)
        if 'session_id_str' in locals() and session_id_str: # Check if session_id was created
             await session_manager.update_session_status(db, session_id_str, "error_processing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process uploaded audio file: {str(e)}"
        )
    finally:
        if temp_audio_path_for_processing and os.path.exists(temp_audio_path_for_processing):
            os.remove(temp_audio_path_for_processing)
            logger.debug(f"Temporary processing file {temp_audio_path_for_processing} deleted.")
        if file: # Ensure file is closed
            await file.close()

# (Other existing routes)
# ...
# --- END EDIT ---

# --- Existing File Upload Endpoint (Renamed for Clarity) ---

@router.post("/api/transcription/transcribe-file", 
             summary="(Util) Transcribe a single audio file (NO DIARIZATION)",
             tags=["Utility"]) 
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
            detail="Transcription/Alignment models are not available. Check service logs."
        )

    logger.info(f"Received file for utility transcription: {file.filename}, content type: {file.content_type}")

    # Define allowed extensions
    allowed_extensions = [".m4a", ".mp3", ".webm", ".mp4", ".mpga", ".wav", ".mpeg"]
    file_extension = pathlib.Path(file.filename).suffix.lower() if file.filename else ""

    # Validate file type based on content_type or extension
    is_audio_content_type = file.content_type.startswith("audio/")
    is_allowed_extension = file_extension in allowed_extensions

    if not (is_audio_content_type or is_allowed_extension):
        logger.warning(f"Received file with unsupported type: {file.filename} (Content-Type: {file.content_type}, Extension: {file_extension})")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Please upload an audio file. Allowed extensions: {', '.join(allowed_extensions)}"
        )

    temp_audio_path = None
    try:
        start_time = time.time()
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
        whisper_model, _, _ = get_models() # Diarize model is None
        if not whisper_model:
             raise RuntimeError("Whisper model is not loaded.")
             
        result = whisper_model.transcribe(audio, batch_size=BATCH_SIZE)
        transcribe_time = time.time()
        detected_language = result.get("language", "en")
        logger.info(f"Transcription finished in {transcribe_time - start_time:.2f}s. Detected language: {detected_language}")

        # 3. Align Whisper output
        logger.info(f"Loading/getting alignment model for '{detected_language}' and aligning...")
        _ , _, align_model_tuple = get_models(language_code=detected_language) # Diarize model is None
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

        # Diarization SKIPPED
        logger.info("Diarization and speaker assignment (SKIPPED)...")
        # diarize_model will be None from get_models()
        # if not diarize_model:
             # logger.warning("Diarization model not available. Skipping diarization.")
        # else:
            # diarize_segments = diarize_model(audio)
            # result = whisperx.assign_word_speakers(diarize_segments, result)
            # diarize_assign_time = time.time()
            # logger.info(f"Diarization and speaker assignment finished in {diarize_assign_time - align_time:.2f}s.")
        logger.warning("Diarization and speaker assignment have been SKIPPED.")

        output_segments = []
        segments_to_process = result.get("segments", []) if isinstance(result, dict) else result if isinstance(result, list) else []
        for segment in segments_to_process:
            output_segments.append({
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": segment.get("text", "").strip(),
                "speaker": "UNKNOWN" # Speaker is UNKNOWN as diarization is skipped
            })

        total_time = time.time() - start_time
        logger.info(f"Processing completed for {file.filename} in {total_time:.2f}s (Diarization SKIPPED).")

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

@router.get("/api/transcription/sessions/{session_id}/audio",
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