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
    ARTIFACT_STORAGE_BASE_PATH, AUDIO_FORMAT, TARGET_SAMPLE_RATE
)
from session_manager import session_manager # Import Session Manager
from database import get_db_session, TranscriptionSession 
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)

# --- START EDIT ---
# Placeholder function for token validation (replace with actual logic)
# async def validate_token(token: str) -> bool:
#     """Placeholder for actual token validation logic."""
#     # if not token:
#     #     return False
#     # # In a real scenario, decode JWT, call auth service, etc.
#     # logger.debug(f"Validating token (length: {len(token)})...") # Basic check
#     # # For now, just check if it's not empty
#     # return len(token) > 10 # Example: Simple length check
#     return True
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

# Reverted process_audio_buffer to work with BytesIO directly
async def process_audio_buffer(accumulated_audio_buffer: io.BytesIO, session_id: str, db: AsyncSession):
    """Processes the entire accumulated audio buffer."""
    session = await session_manager.get_session(db, session_id)
    if not session:
        logger.error(f"[{session_id}] Session not found during buffer processing.")
        return
        
    buffer_size = accumulated_audio_buffer.getbuffer().nbytes
    if buffer_size == 0:
        logger.debug(f"[{session_id}] Accumulated audio buffer empty, skipping processing.")
        return

    # Ensure we process from the beginning of the buffer
    accumulated_audio_buffer.seek(0)

    try:
        # Load the entire accumulated buffer
        audio_segment = AudioSegment.from_file(accumulated_audio_buffer, format=AUDIO_FORMAT)
        duration_ms = len(audio_segment)
        logger.info(f"[{session_id}] Processing {duration_ms / 1000.0:.2f}s of accumulated audio (buffer size: {buffer_size} bytes)..." )
        
        # --- Preprocessing --- 
        audio_segment = audio_segment.set_frame_rate(TARGET_SAMPLE_RATE)
        samples = np.array(audio_segment.get_array_of_samples()).astype(np.float32) / 32768.0
        audio_np = samples

        current_language = session.detected_language or "en"
        whisper_model, _, align_model_tuple = get_models(language_code=current_language)

        if not whisper_model:
             logger.error(f"[{session_id}] Whisper model not loaded. Cannot process buffer.")
             error_message = json.dumps({"type": "status_update", "status": "error", "message": "Core models unavailable."}) 
             await manager.send_personal_message(error_message, session_id)
             return

        # 1. Transcription of the entire buffer
        logger.debug(f"[{session_id}] Starting transcription of accumulated buffer...")
        transcription_result = whisper_model.transcribe(audio_np, batch_size=BATCH_SIZE)
        detected_language = transcription_result.get("language", current_language)
        if detected_language != current_language:
             await session_manager.set_detected_language(db, session_id, detected_language)
             current_language = detected_language
        
        logger.debug(f"[{session_id}] Transcription complete. Detected language: {detected_language}")

        segments = transcription_result["segments"]
        if not segments:
            logger.info(f"[{session_id}] No segments transcribed from accumulated buffer.")
            return

        # Re-fetch align_model_tuple if language changed
        if detected_language != current_language:
             logger.info(f"[{session_id}] Language changed. Getting correct alignment model for {detected_language}.")
             _, _, align_model_tuple = get_models(language_code=detected_language)
             
        if align_model_tuple is None:
            logger.error(f"[{session_id}] Alignment model for {detected_language} failed to load. Skipping alignment.")
            # NOTE: Sending RAW segments here might send the entire transcription repeatedly.
            # We will address filtering in the next step if this basic approach works.
            message = json.dumps({
                "type": "transcription_update", 
                "segments": segments, # Sending all segments for now
                "is_final": False, 
                "status": "warning",
                "message": "Alignment skipped."
            })
            await manager.send_personal_message(message, session_id)
            # Store raw segments anyway
            try:
                session.transcription_segments = segments # Overwrite with latest full set
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
        logger.warning(f"[{session_id}] Diarization has been SKIPPED. Assigning UNKNOWN to speakers.")
        processed_segments_list = aligned_result.get("segments", []) if isinstance(aligned_result, dict) else aligned_result if isinstance(aligned_result, list) else []
        for seg_idx, seg_data in enumerate(processed_segments_list):
            processed_segments_list[seg_idx]['speaker'] = seg_data.get('speaker', 'UNKNOWN')

        output_segments = []
        for segment_data in processed_segments_list:
             speaker = segment_data.get("speaker", "UNKNOWN")
             text = segment_data.get("text", "").strip()
             start = segment_data.get("start")
             end = segment_data.get("end")
             word_confidences = [w.get('score', 0) for w in segment_data.get('words', []) if 'score' in w]
             segment_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else None

             output_segments.append({
                 "speaker": speaker,
                 "text": text,
                 "start": start,
                 "end": end,
                 "confidence": segment_confidence
             })
        
        if output_segments:
             # TODO (Next Step): Filter output_segments to send only NEW segments.
             # For now, we send all segments generated from the full buffer.
             new_segments_to_send = output_segments # Placeholder - sending all for now
             
             try:
                  # Store the LATEST FULL set of segments from processing the entire buffer
                  session.transcription_segments = output_segments 
                  session.last_update = datetime.utcnow()
                  await db.commit()
                  logger.info(f"[{session_id}] Stored {len(output_segments)} processed segments in DB (full refresh)." )
             except Exception as e_db_store:
                  await db.rollback()
                  logger.error(f"[{session_id}] Failed to store refreshed segments in DB: {e_db_store}", exc_info=True)

             # Send update via WebSocket (currently sending all segments)
             if new_segments_to_send:
                 message_payload = {
                     "type": "transcription_update",
                     "segments": new_segments_to_send,
                     "status": "in_progress",
                     "is_final": False
                 }
                 logger.info(f"[{session_id}] Sending {len(new_segments_to_send)} processed segments via WebSocket (currently includes previously sent)." )
                 await manager.send_personal_message(json.dumps(message_payload), session_id)
             else:
                 logger.info(f"[{session_id}] No NEW segments to send (filtering not yet implemented)." )
        else:
             logger.info(f"[{session_id}] No text segments produced after processing accumulated buffer.")

    except CouldntDecodeError:
        # If decoding fails even on the accumulated buffer, there might be a deeper issue
        logger.error(f"[{session_id}] Could not decode accumulated audio buffer. Size: {buffer_size}. THIS IS UNEXPECTED.")
        error_message = json.dumps({"type": "status_update", "status": "error", "message": "Accumulated audio decode error."}) 
        await manager.send_personal_message(error_message, session_id)
    except Exception as e_proc:
        logger.error(f"[{session_id}] Error during accumulated buffer processing: {e_proc}", exc_info=True)
        error_message = json.dumps({"type": "status_update", "status": "error", "message": f"Transcription failed: {str(e_proc)[:100]}..."}) 
        await manager.send_personal_message(error_message, session_id)
    # Note: We do NOT close or clear the accumulated_audio_buffer here, as it's managed by the caller (websocket_endpoint)

@router.websocket("/api/ws/transcription/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for streaming audio, accumulating, processing, and saving chunks.
    """
    db: AsyncSession = None
    main_audio_accumulator = io.BytesIO() # Accumulates ALL incoming audio bytes
    last_process_time = asyncio.get_event_loop().time()

    logger.info(f"[{session_id}] WebSocket connection attempt. Token validation skipped.")

    try:
        async for session_db in get_db_session():
            db = session_db
            break 
        if db is None:
             logger.error(f"[{session_id}] Failed to obtain DB session. Closing WS.")
             await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="DB unavailable")
             return
             
        if not await session_manager.is_session_active(db, session_id):
            logger.warning(f"WS attempt for invalid/inactive session: {session_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid session")
            return

        if not are_models_loaded():
            logger.error(f"[{session_id}] Models not loaded. Closing WS.")
            await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER, reason="Models unavailable")
            return

        await manager.connect(websocket, session_id)
        await session_manager.update_session_status(db, session_id, "recording")

        # --- Main Loop --- 
        while True:
            session = await session_manager.get_session(db, session_id)
            if not session:
                 logger.warning(f"[{session_id}] Session disappeared. Closing WS.")
                 raise WebSocketDisconnect(code=status.WS_1011_INTERNAL_ERROR, reason="Session lost")
                 
            session_status = session.status
            if session_status in ["stopped", "cancelled", "error", "interrupted"]:
                 logger.info(f"[{session_id}] Session status {session_status}. Closing WS.")
                 # Process final accumulated buffer
                 if main_audio_accumulator.tell() > 0:
                     logger.info(f"[{session_id}] Processing final accumulated buffer on close.")
                     await process_audio_buffer(main_audio_accumulator, session_id, db) # Pass the whole buffer
                 else:
                     logger.info(f"[{session_id}] Accumulator empty on close.")
                 raise WebSocketDisconnect(code=status.WS_1001_GOING_AWAY, reason=f"Session ended ({session_status})")

            if session_status == "paused":
                 await asyncio.sleep(1)
                 continue
                 
            try:
                data = await asyncio.wait_for(websocket.receive(), timeout=1.0) 
            except asyncio.TimeoutError:
                current_time = asyncio.get_event_loop().time()
                # Process the buffer if it contains data and the interval has passed
                if main_audio_accumulator.tell() > 0 and (current_time - last_process_time) >= WEBSOCKET_BUFFER_SECONDS:
                    logger.debug(f"[{session_id}] Processing accumulated audio due to timeout.")
                    await process_audio_buffer(main_audio_accumulator, session_id, db) # Pass the whole buffer
                    last_process_time = current_time # Reset timer ONLY after processing
                continue # Continue loop after timeout check

            if data["type"] == "websocket.disconnect":
                logger.info(f"[{session_id}] WebSocket disconnect message received.")
                raise WebSocketDisconnect(code=data.get("code", 1000))
            
            elif data.get("type") == "websocket.receive" and data.get("text") is not None:
                 # Handle text messages (e.g., speaker tags)
                 try:
                     message_data = json.loads(data["text"])
                     msg_type = message_data.get("type")
                     if msg_type == "speaker_tag":
                         speaker_id = message_data.get("speaker_id")
                         timestamp = message_data.get("timestamp")
                         if speaker_id and isinstance(timestamp, (int, float)):
                             logger.info(f"[{session_id}] Received speaker tag: Spk={speaker_id}, T={timestamp:.2f}s")
                             await session_manager.add_speaker_tag_event(db, session_id, speaker_id, timestamp)
                         else:
                             logger.warning(f"[{session_id}] Invalid speaker_tag msg: {message_data}")
                     else:
                          logger.warning(f"[{session_id}] Unknown text msg type: {msg_type}")
                 except Exception as e_text:
                      logger.error(f"[{session_id}] Error processing text msg: {e_text}", exc_info=True)
            
            elif data.get("type") == "websocket.receive" and data.get("bytes") is not None:
                 audio_bytes_received = data.get('bytes')
                 if not audio_bytes_received:
                     continue
                 
                 # Append to main accumulator
                 main_audio_accumulator.write(audio_bytes_received)
                 
                 # Persistently save the individual chunk
                 await save_audio_chunk(session_id, audio_bytes_received, db)

                 # Check if it's time to process the accumulated buffer
                 current_time = asyncio.get_event_loop().time()
                 if (current_time - last_process_time) >= WEBSOCKET_BUFFER_SECONDS:
                    logger.debug(f"[{session_id}] Processing accumulated audio due to interval.")
                    await process_audio_buffer(main_audio_accumulator, session_id, db) # Pass the whole buffer
                    last_process_time = current_time # Reset timer ONLY after processing

    except WebSocketDisconnect as e_ws_disconnect:
        logger.info(f"[{session_id}] WebSocket disconnected (code: {e_ws_disconnect.code}, reason: {e_ws_disconnect.reason})")
        if db:
             # Process final buffer if any audio was accumulated
             if main_audio_accumulator.tell() > 0:
                 logger.info(f"[{session_id}] Processing final accumulated buffer on disconnect...")
                 await process_audio_buffer(main_audio_accumulator, session_id, db)
             else:
                 logger.info(f"[{session_id}] Accumulator empty on disconnect.")
             # Update session status if needed
             session_on_disconnect = await session_manager.get_session(db, session_id)
             current_status = session_on_disconnect.status if session_on_disconnect else None
             if current_status in ["recording", "paused"]:
                 logger.info(f"[{session_id}] Setting session status to 'interrupted' due to disconnect.")
                 await session_manager.update_session_status(db, session_id, "interrupted")
        else:
             logger.warning(f"[{session_id}] DB session unavailable during disconnect cleanup.")
             
    except Exception as loop_error:
        logger.error(f"[{session_id}] Unexpected error in WebSocket loop: {loop_error}", exc_info=True)
        if db:
             session_check = await session_manager.get_session(db, session_id)
             if session_check:
                await session_manager.update_session_status(db, session_id, "error")
             else:
                logger.error(f"[{session_id}] Cannot set status to error, session not found.")
        try:
            error_payload = json.dumps({"type": "status_update", "status": "error", "message": "Internal server error."}) 
            await websocket.send_text(error_payload)
        except Exception: pass # Ignore if cannot send
        
    finally:
        # Ensure resources are cleaned up
        if manager: # Disconnect from manager
             # Simplified disconnect assuming one websocket per session_id
             if session_id in manager.active_connections and manager.active_connections[session_id] == websocket:
                manager.disconnect(session_id)

        main_audio_accumulator.close() # Close the main BytesIO buffer
        if db: # Close DB session if obtained
             await db.close()
        logger.info(f"[{session_id}] Cleaned up WebSocket resources for session.")
