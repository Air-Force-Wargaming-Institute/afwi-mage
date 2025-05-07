from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
import logging
import json
import io
import numpy as np
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import asyncio
import whisperx
from datetime import datetime
import os # Import os
import pathlib # Import pathlib
from typing import Optional

from websocket_manager import manager # Import the manager instance
from model_loader import get_models, are_models_loaded # Import model loading utilities
from config import (
    DEVICE, BATCH_SIZE, HF_TOKEN, 
    WEBSOCKET_BUFFER_SECONDS, DIARIZATION_MIN_CHUNK_MS,
    ARTIFACT_STORAGE_BASE_PATH
)
from session_manager import session_manager # Import Session Manager
from database import get_db_session, TranscriptionSession 
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)

# --- START EDIT ---
# Placeholder function for token validation (replace with actual logic)
async def validate_token(token: str) -> bool:
    """Placeholder for actual token validation logic."""
    # if not token:
    #     return False
    # # In a real scenario, decode JWT, call auth service, etc.
    # logger.debug(f"Validating token (length: {len(token)})...") # Basic check
    # # For now, just check if it's not empty
    # return len(token) > 10 # Example: Simple length check
    return True
# --- END EDIT ---

# Constants
TARGET_SAMPLE_RATE = 16000
# BUFFER_DURATION_SECONDS = 5 # Process audio every N seconds - Use config
# MIN_CHUNK_DURATION_MS = 100 # Minimum duration for a diarization segment - Use config
AUDIO_FORMAT = "webm"

# Function to save audio chunk
async def save_audio_chunk(session_id: str, audio_bytes: bytes, db: AsyncSession) -> Optional[str]:
    """Saves an audio chunk to a session-specific directory and updates the DB."""
    try:
        session = await session_manager.get_session(db, session_id)
        if not session:
            logger.error(f"[{session_id}] Cannot save chunk, session not found.")
            return None

        # Define chunk storage path
        chunk_dir = pathlib.Path(ARTIFACT_STORAGE_BASE_PATH) / session_id / "_chunks"
        chunk_dir.mkdir(parents=True, exist_ok=True)

        # Create a unique filename (e.g., using timestamp)
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        chunk_filename = f"chunk_{timestamp_str}.{AUDIO_FORMAT}"
        chunk_path = chunk_dir / chunk_filename

        # Write the chunk
        with open(chunk_path, "wb") as f:
            f.write(audio_bytes)
        
        chunk_path_str = str(chunk_path.resolve()) # Store absolute path
        logger.debug(f"[{session_id}] Saved audio chunk to: {chunk_path_str}")

        # Update DB
        if session.audio_chunk_paths is None:
            session.audio_chunk_paths = []
        session.audio_chunk_paths.append(chunk_path_str)
        session.last_update = datetime.utcnow()
        await db.commit()
        logger.debug(f"[{session_id}] Updated audio_chunk_paths in DB.")
        return chunk_path_str

    except OSError as e:
        logger.error(f"[{session_id}] OS Error saving audio chunk {chunk_path}: {e}", exc_info=True)
        await db.rollback() # Rollback DB changes on file error
        return None
    except Exception as e:
        logger.error(f"[{session_id}] Unexpected error saving audio chunk: {e}", exc_info=True)
        await db.rollback()
        return None

async def process_audio_buffer(audio_buffer: io.BytesIO, session_id: str, db: AsyncSession):
    """Processes the audio buffer: transcribes, aligns, and diarizes."""
    session = await session_manager.get_session(db, session_id) # Get session object
    if not session:
        logger.error(f"[{session_id}] Session not found during buffer processing.")
        return
        
    if audio_buffer.getbuffer().nbytes == 0:
        logger.debug(f"[{session_id}] Audio buffer empty, skipping processing.")
        return

    try:
        audio_buffer.seek(0)
        audio_segment = AudioSegment.from_file(audio_buffer, format=AUDIO_FORMAT)
        duration_ms = len(audio_segment)
        logger.info(f"[{session_id}] Processing {duration_ms / 1000.0:.2f}s of audio from buffer...")
        
        # --- Preprocessing --- 
        audio_segment = audio_segment.set_frame_rate(TARGET_SAMPLE_RATE)
        samples = np.array(audio_segment.get_array_of_samples()).astype(np.float32) / 32768.0
        audio_np = samples

        current_language = session.detected_language or "en"
        whisper_model, _, align_model_tuple = get_models(language_code=current_language) # diarize_model is None

        if not whisper_model: # Removed check for diarize_model
             logger.error(f"[{session_id}] Whisper model not loaded. Cannot process buffer.")
             error_message = json.dumps({"type": "status_update", "status": "error", "message": "Core models unavailable."}) 
             await manager.send_personal_message(error_message, session_id)
             return

        # 1. Transcription
        logger.debug(f"[{session_id}] Starting transcription...")
        transcription_result = whisper_model.transcribe(audio_np, batch_size=BATCH_SIZE)
        detected_language = transcription_result.get("language", current_language)
        # Update session language if changed
        if detected_language != current_language:
             await session_manager.set_detected_language(db, session_id, detected_language)
             current_language = detected_language
        
        logger.debug(f"[{session_id}] Transcription complete. Detected language: {detected_language}")

        segments = transcription_result["segments"]
        if not segments:
            logger.info(f"[{session_id}] No segments transcribed from buffer.")
            return # Nothing more to do

        if detected_language != current_language: # This condition might be redundant due to above update
             logger.info(f"[{session_id}] Language changed. Getting correct alignment model for {detected_language}.")
             _, _, align_model_tuple = get_models(language_code=detected_language) # diarize_model is None
             
        if align_model_tuple is None:
            logger.error(f"[{session_id}] Alignment model for {detected_language} failed to load. Skipping alignment.") # Removed diarization from msg
            raw_text = " ".join([seg.get('text', '').strip() for seg in segments])
            message = json.dumps({
                "type": "transcription_update", 
                "text": raw_text, 
                "segments": segments, 
                "is_final": False, 
                "status": "warning",
                "message": "Alignment skipped." # Removed Diarization
            })
            await manager.send_personal_message(message, session_id)
            # Still store raw segments if alignment fails but transcription worked
            if segments:
                try:
                    if session.transcription_segments is None: session.transcription_segments = []
                    session.transcription_segments.extend(segments) # Store raw segments
                    session.last_update = datetime.utcnow()
                    await db.commit()
                    logger.info(f"[{session_id}] Stored {len(segments)} RAW segments in DB due to alignment failure.")
                except Exception as e_db:
                    await db.rollback()
                    logger.error(f"[{session_id}] Failed to store RAW segments in DB: {e_db}", exc_info=True)
            return
            
        align_model, align_metadata = align_model_tuple
        logger.debug(f"[{session_id}] Aligning transcription...")
        aligned_result = whisperx.align(segments, align_model, align_metadata, audio_np, DEVICE, return_char_alignments=False)
        logger.debug(f"[{session_id}] Alignment complete.")

        # Diarization SKIPPED
        logger.debug(f"[{session_id}] Diarization (SKIPPED)...")
        # if duration_ms < DIARIZATION_MIN_CHUNK_MS: 
        #      logger.info(f"[{session_id}] Audio chunk too short ({duration_ms}ms) for diarization, assigning UNKNOWN speaker.")
        #      processed_segments_list = aligned_result["segments"]
        #      for seg in processed_segments_list:
        #          seg['speaker'] = 'UNKNOWN'
        # else:
        #      logger.debug(f"[{session_id}] Performing diarization...")
        #      # diarize_model is None
        #      # if not diarize_model:
        #      #     logger.error(f"[{session_id}] Diarization model not loaded. Skipping.")
        #      #     processed_segments_list = aligned_result["segments"]
        #      #     for seg in processed_segments_list:
        #      #         seg['speaker'] = 'UNKNOWN'
        #      # else:
        #      #     diarize_segments = diarize_model(audio_np)
        #      #     diarized_result = whisperx.assign_word_speakers(diarize_segments, aligned_result["segments"])
        #      #     
        #      #     if isinstance(diarized_result, dict) and "segments" in diarized_result:
        #      #         processed_segments_list = diarized_result["segments"]
        #      #     elif isinstance(diarized_result, list):
        #      #         processed_segments_list = diarized_result
        #      #     else:
        #      #         logger.error(f"[{session_id}] Unexpected result format from assign_word_speakers. Skipping assignment.")
        #      #         processed_segments_list = aligned_result["segments"] # Fallback
        #      #         for seg in processed_segments_list:
        #      #             seg['speaker'] = 'UNKNOWN'
        #      logger.debug(f"[{session_id}] Diarization complete.")
        logger.warning(f"[{session_id}] Diarization has been SKIPPED. Assigning UNKNOWN to speakers.")
        processed_segments_list = aligned_result.get("segments", []) if isinstance(aligned_result, dict) else aligned_result if isinstance(aligned_result, list) else []
        for seg in processed_segments_list:
            seg['speaker'] = 'UNKNOWN'

        output_segments = []
        # combined_text = "" # We will generate combined text at the end in /stop
        # Use the correctly identified list of processed segments
        for segment in processed_segments_list: 
             speaker = segment.get("speaker", "UNKNOWN") # Will be UNKNOWN
             text = segment.get("text", "").strip()
             start = segment.get("start")
             end = segment.get("end")
             # Calculate confidence if available (using word confidences if available)
             word_confidences = [w.get('score', 0) for w in segment.get('words', []) if 'score' in w]
             segment_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else None

             output_segments.append({
                 "speaker": speaker,
                 "text": text,
                 "start": start,
                 "end": end,
                 "confidence": segment_confidence # Use calculated confidence
             })
             # Append text for potential full transcript view
             # combined_text += f"{speaker}: {text}\n"
        
        # ---> Store segments in DB session <---
        if output_segments:
             try:
                  if session.transcription_segments is None:
                      session.transcription_segments = []
                  # Append new segments - SQLAlchemy tracks changes to mutable JSON
                  session.transcription_segments.extend(output_segments)
                  session.last_update = datetime.utcnow()
                  await db.commit()
                  logger.info(f"[{session_id}] Stored {len(output_segments)} processed segments in DB.")
             except Exception as e:
                  await db.rollback()
                  logger.error(f"[{session_id}] Failed to store segments in DB: {e}", exc_info=True)

             # Send update via WebSocket (Correctly indented)
             message = json.dumps({
                 "type": "transcription_update",
                 "segments": output_segments, # Send structured segments
                 "status": "in_progress",
                 "is_final": False # Indicate these are intermediate results
             })
             logger.info(f"[{session_id}] Sending {len(output_segments)} processed segments via WebSocket.")
             await manager.send_personal_message(message, session_id)
        else: # Correctly indented relative to the `if output_segments:`
             logger.info(f"[{session_id}] No text segments produced after processing.")

    except CouldntDecodeError:
        logger.warning(f"[{session_id}] Could not decode buffered audio. Buffer cleared.")
        error_message = json.dumps({"type": "status_update", "status": "error", "message": "Audio decode error."}) 
        await manager.send_personal_message(error_message, session_id)
    except Exception as e:
        logger.error(f"[{session_id}] Error during buffer processing: {e}", exc_info=True)
        error_message = json.dumps({"type": "status_update", "status": "error", "message": f"Transcription/Diarization failed: {str(e)[:100]}..."}) 
        await manager.send_personal_message(error_message, session_id)
    finally:
        # Clear the buffer after processing attempts
        audio_buffer.seek(0)
        audio_buffer.truncate()
        logger.debug(f"[{session_id}] Audio buffer cleared.")

@router.websocket("/api/transcription/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for streaming audio, buffering, transcription, and diarization.
    Handles saving audio chunks progressively.
    """
    # --- Validation and Setup ---
    db: AsyncSession = None # Initialize db variable
    # --- START EDIT ---
    # Extract token from query parameters
    token = websocket.query_params.get("token")
    logger.debug(f"[{session_id}] WebSocket connection attempt. Token provided: {'Yes' if token else 'No'}")

    # Validate token
    if not await validate_token(token):
        logger.warning(f"[{session_id}] WebSocket connection rejected due to invalid/missing token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    # --- END EDIT ---

    try:
        # Manually get a DB session for the WebSocket connection lifespan
        # Cannot use Depends() directly in WebSocket route
        async for session_db in get_db_session():
            db = session_db
            break # get_db_session yields only once
        if db is None:
             raise RuntimeError("Failed to get DB session for WebSocket")
             
        if not await session_manager.is_session_active(db, session_id):
            logger.warning(f"WebSocket connection attempt for invalid/inactive session: {session_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or inactive session")
            return

        if not are_models_loaded():
            logger.error(f"[{session_id}] Models not loaded. Cannot start WebSocket connection.")
            await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER, reason="Models not available")
            return

        await manager.connect(websocket, session_id)
        await session_manager.update_session_status(db, session_id, "recording")

        audio_buffer = io.BytesIO()
        last_process_time = asyncio.get_event_loop().time()

        # --- Main Loop --- 
        while True:
            session = await session_manager.get_session(db, session_id)
            if not session:
                 logger.warning(f"[{session_id}] Session disappeared during WebSocket connection. Closing.")
                 raise WebSocketDisconnect(code=status.WS_1011_INTERNAL_ERROR, reason="Session data lost")
                 
            session_status = session.status
            if session_status in ["stopped", "cancelled", "error", "interrupted"]:
                 logger.info(f"[{session_id}] Session status changed to {session_status}. Closing WebSocket.")
                 # Process final buffer before closing if needed
                 if audio_buffer.tell() > 0:
                     logger.info(f"[{session_id}] Processing final buffer before closing WebSocket.")
                     await process_audio_buffer(audio_buffer, session_id, db) 
                 raise WebSocketDisconnect(code=status.WS_1001_GOING_AWAY, reason=f"Session ended ({session_status})")

            if session_status == "paused":
                 await asyncio.sleep(1) # Wait while paused
                 continue # Skip receiving/processing
                 
            try:
                data = await asyncio.wait_for(websocket.receive(), timeout=1.0) 
            except asyncio.TimeoutError:
                # --- Buffer Processing on Timeout --- 
                current_time = asyncio.get_event_loop().time()
                if audio_buffer.tell() > 0 and (current_time - last_process_time) >= WEBSOCKET_BUFFER_SECONDS:
                    # Process the current buffer for transcription
                    await process_audio_buffer(audio_buffer, session_id, db)
                    last_process_time = current_time
                continue 

            if data["type"] == "websocket.disconnect":
                logger.info(f"[{session_id}] WebSocket disconnect message received.")
                raise WebSocketDisconnect(code=data.get("code", 1000))
            
            # --- Handle Text Messages (Speaker Tags) ---
            elif data.get("type") == "websocket.receive" and data.get("text") is not None:
                 try:
                     message_data = json.loads(data["text"])
                     msg_type = message_data.get("type")
                     
                     if msg_type == "speaker_tag":
                         speaker_id = message_data.get("speaker_id")
                         timestamp = message_data.get("timestamp")
                         if speaker_id and isinstance(timestamp, (int, float)):
                             logger.info(f"[{session_id}] Received speaker tag: Speaker={speaker_id}, Time={timestamp:.2f}s")
                             await session_manager.add_speaker_tag_event(db, session_id, speaker_id, timestamp)
                         else:
                             logger.warning(f"[{session_id}] Invalid speaker_tag message received: {message_data}")
                     else:
                          logger.warning(f"[{session_id}] Received unknown text message type: {msg_type}")
                          
                 except json.JSONDecodeError:
                     logger.warning(f"[{session_id}] Received non-JSON text message: {data['text'][:100]}...")
                 except Exception as e:
                      logger.error(f"[{session_id}] Error processing text message: {e}", exc_info=True)
            
            # --- Handle Audio Bytes --- 
            elif data.get("type") == "websocket.receive" and data.get("bytes") is not None:
                 audio_bytes = data.get('bytes')
                 if not audio_bytes:
                     continue
                 
                 # 1. Append to in-memory buffer for transcription processing
                 audio_buffer.write(audio_bytes)
                 
                 # 2. Save the raw chunk directly to file
                 await save_audio_chunk(session_id, audio_bytes, db)

                 # 3. Check if buffer needs processing for transcription
                 current_time = asyncio.get_event_loop().time()
                 if (current_time - last_process_time) >= WEBSOCKET_BUFFER_SECONDS:
                     await process_audio_buffer(audio_buffer, session_id, db)
                     last_process_time = current_time
            # else: ignore other message types

    except WebSocketDisconnect as e:
        logger.info(f"[{session_id}] WebSocket disconnected (code: {e.code}, reason: {e.reason})")
        if db:
             # Process final buffer if needed
             if audio_buffer.tell() > 0:
                 logger.info(f"[{session_id}] Processing final audio buffer on disconnect...")
                 await process_audio_buffer(audio_buffer, session_id, db) 
             # Update status if still recording/paused
             session = await session_manager.get_session(db, session_id)
             current_status = session.status if session else None
             if current_status in ["recording", "paused"]:
                 logger.info(f"[{session_id}] Setting session status to 'interrupted' due to disconnect.")
                 await session_manager.update_session_status(db, session_id, "interrupted")
        else:
             logger.warning(f"[{session_id}] DB session unavailable during disconnect cleanup.")
             
    except Exception as loop_error:
        logger.error(f"[{session_id}] Unexpected error in WebSocket loop: {loop_error}", exc_info=True)
        if db:
             await session_manager.update_session_status(db, session_id, "error")
        try:
            error_payload = json.dumps({"type": "status_update", "status": "error", "message": "Internal server error."}) 
            await websocket.send_text(error_payload)
        except Exception: pass
        
    finally:
        if manager:
             manager.disconnect(session_id)
        audio_buffer.close()
        # Ensure DB session is closed if obtained manually
        if db:
             await db.close()
        logger.info(f"[{session_id}] Cleaned up WebSocket resources.")
