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
from typing import Optional, Tuple, List, Dict # Updated typing
from sqlalchemy.orm.attributes import flag_modified # <-- ADD THIS IMPORT

from websocket_manager import manager # Import the manager instance
from model_loader import get_models, are_models_loaded # Import model loading utilities
from config import (
    DEVICE, BATCH_SIZE, HF_TOKEN, 
    WEBSOCKET_BUFFER_SECONDS, # DIARIZATION_MIN_CHUNK_MS, # No longer used here
    ARTIFACT_STORAGE_BASE_PATH, AUDIO_FORMAT, TARGET_SAMPLE_RATE
)
from session_manager import session_manager # Import Session Manager
from database import get_db_session, TranscriptionSession 
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory store for session-specific transcription progress
# { "session_id": {"last_processed_duration_seconds": 0.0, "all_segments": []} }
session_transcription_progress: Dict[str, Dict] = {}


# Placeholder function for token validation (replace with actual logic) - REMOVED as it was commented out

# Constants
# TARGET_SAMPLE_RATE = 16000 # Defined in config
# AUDIO_FORMAT = "webm" # Defined in config


# Function to save the final accumulated audio
async def save_final_accumulated_audio(session_id_str: str, audio_data: bytes, db_session: AsyncSession, base_path_str: str) -> Optional[str]:
    """Saves the complete accumulated audio data to a final file and updates the DB."""
    if not audio_data:
        logger.info(f"[{session_id_str}] No data in final accumulator to save.")
        return None
    
    session_storage_path = pathlib.Path(base_path_str) / session_id_str
    session_storage_path.mkdir(parents=True, exist_ok=True)
    
    final_audio_filename = f"complete_session_audio_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.{AUDIO_FORMAT}"
    final_audio_path = session_storage_path / final_audio_filename
    
    try:
        with open(final_audio_path, "wb") as f:
            f.write(audio_data)
        logger.info(f"[{session_id_str}] Saved final accumulated audio to: {final_audio_path}")
        
        session_obj = await session_manager.get_session(db_session, session_id_str)
        if session_obj:
            session_obj.audio_storage_path = str(final_audio_path.resolve())
            session_obj.last_update = datetime.utcnow()
            await db_session.commit()
            logger.info(f"[{session_id_str}] Updated audio_storage_path in DB to {final_audio_path}")
            return str(final_audio_path.resolve())
        else:
            logger.error(f"[{session_id_str}] Session not found in DB to update final audio path.")
            return None
    except OSError as e:
        logger.error(f"[{session_id_str}] OS Error saving final audio {final_audio_path}: {e}", exc_info=True)
        if db_session: await db_session.rollback()
        return None
    except Exception as e:
        logger.error(f"[{session_id_str}] Unexpected error saving final audio: {e}", exc_info=True)
        if db_session: await db_session.rollback()
        return None

# REMOVED save_audio_chunk function as it's no longer needed for final file assembly.
# Individual chunk saving logic is removed.

# Replaced process_audio_buffer with process_live_transcription_update_sliding_window
async def process_live_transcription_update_sliding_window(
    full_audio_bytes: bytes,
    session_id: str,
    db: AsyncSession,
    current_transcribed_duration_seconds: float  # How much was processed before this call
) -> Tuple[List[Dict], float]: # Returns new_segments, new_total_processed_duration_seconds
    if not full_audio_bytes:
        return [], current_transcribed_duration_seconds

    try:
        full_segment_audio = AudioSegment.from_file(io.BytesIO(full_audio_bytes), format=AUDIO_FORMAT)
        total_duration_seconds = len(full_segment_audio) / 1000.0

        if total_duration_seconds <= current_transcribed_duration_seconds:
            logger.debug(f"[{session_id}] No new audio beyond {current_transcribed_duration_seconds:.2f}s for sliding window.")
            return [], current_transcribed_duration_seconds

        start_ms = int(current_transcribed_duration_seconds * 1000)
        end_ms = int(total_duration_seconds * 1000)
        
        new_audio_slice = full_segment_audio[start_ms:end_ms]
        duration_of_slice_seconds = len(new_audio_slice) / 1000.0

        # Avoid processing tiny slivers of audio which might be due to timing issues or very small final chunks
        if duration_of_slice_seconds <= 0.1: # Increased threshold slightly
            logger.debug(f"[{session_id}] New audio slice too short ({duration_of_slice_seconds:.3f}s), skipping transcription for this pass.")
            return [], total_duration_seconds # Return new total duration, but no new segments

        logger.info(f"[{session_id}] Sliding window: Processing new slice from {current_transcribed_duration_seconds:.2f}s to {total_duration_seconds:.2f}s (slice duration: {duration_of_slice_seconds:.2f}s)")
        
        new_audio_slice_resampled = new_audio_slice.set_frame_rate(TARGET_SAMPLE_RATE)
        samples_np = np.array(new_audio_slice_resampled.get_array_of_samples()).astype(np.float32) / 32768.0

        session_db_obj = await session_manager.get_session(db, session_id)
        if not session_db_obj:
            logger.error(f"[{session_id}] Session not found during sliding window processing.")
            return [], total_duration_seconds
            
        current_language = session_db_obj.detected_language or "en"
        whisper_model, _, align_model_tuple = get_models(language_code=current_language)

        if not whisper_model:
             logger.error(f"[{session_id}] Whisper model not loaded for sliding window. Cannot process.")
             # Consider sending a status update to the client if this happens
             return [], total_duration_seconds 

        transcription_result = whisper_model.transcribe(samples_np, batch_size=BATCH_SIZE)
        detected_language_for_slice = transcription_result.get("language", current_language)
        
        if detected_language_for_slice != current_language:
             logger.info(f"[{session_id}] Language for slice ({detected_language_for_slice}) differs from session ({current_language}). Updating session.")
             await session_manager.set_detected_language(db, session_id, detected_language_for_slice)
             current_language = detected_language_for_slice # Update for alignment model
             _, _, align_model_tuple = get_models(language_code=current_language)
             
        raw_segments_from_slice = transcription_result.get("segments", [])
        if not raw_segments_from_slice:
            logger.info(f"[{session_id}] No segments transcribed from the current audio slice.")
            return [], total_duration_seconds

        final_segments_for_slice = []
        if align_model_tuple:
            align_model, align_metadata = align_model_tuple
            try:
                aligned_result = whisperx.align(raw_segments_from_slice, align_model, align_metadata, samples_np, DEVICE, return_char_alignments=False)
                final_segments_for_slice = aligned_result.get("segments", [])
                logger.debug(f"[{session_id}] Alignment complete for slice. Got {len(final_segments_for_slice)} aligned segments.")
            except Exception as align_e:
                logger.error(f"[{session_id}] Error during alignment for slice: {align_e}", exc_info=True)
                final_segments_for_slice = raw_segments_from_slice # Fallback to raw if alignment fails
        else:
            logger.warning(f"[{session_id}] Alignment model for {current_language} not available for slice. Using raw segments.")
            final_segments_for_slice = raw_segments_from_slice
            
        output_segments_this_call = []
        for seg_data in final_segments_for_slice:
             relative_start = seg_data.get("start")
             relative_end = seg_data.get("end")
             abs_start = (relative_start + current_transcribed_duration_seconds) if relative_start is not None else None
             abs_end = (relative_end + current_transcribed_duration_seconds) if relative_end is not None else None

             word_confidences = [w.get('score', 0) for w in seg_data.get('words', []) if 'score' in w]
             segment_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else None

             output_segments_this_call.append({
                 "speaker": "UNKNOWN", # Diarization is skipped
                 "text": seg_data.get("text", "").strip(),
                 "start": abs_start,
                 "end": abs_end,
                 "confidence": segment_confidence
             })
        
        logger.info(f"[{session_id}] Produced {len(output_segments_this_call)} segments from this slice.")
        return output_segments_this_call, total_duration_seconds

    except CouldntDecodeError:
        logger.error(f"[{session_id}] Sliding window: Could not decode full audio buffer. Size: {len(full_audio_bytes)} bytes.", exc_info=True)
        return [], current_transcribed_duration_seconds
    except Exception as e_proc:
        logger.error(f"[{session_id}] Sliding window: Error during processing: {e_proc}", exc_info=True)
        return [], current_transcribed_duration_seconds


@router.websocket("/api/ws/transcription/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for streaming audio, performing live transcription using a sliding window,
    and saving the complete audio file at the end.
    """
    db: AsyncSession = None
    main_audio_accumulator = io.BytesIO() # Accumulates ALL incoming audio bytes for final save
    last_transcription_process_time = asyncio.get_event_loop().time()

    # Initialize transcription progress for this session
    session_transcription_progress[session_id] = {
        "last_processed_duration_seconds": 0.0, 
        "all_segments": []
    }
    
    logger.info(f"[{session_id}] WebSocket connection attempt. Token validation skipped.")

    try:
        async for session_db_gen in get_db_session():
            db = session_db_gen
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
        logger.info(f"[{session_id}] WebSocket connected and session status set to 'recording'.")

        # --- Main Loop --- 
        while True:
            current_loop_time = asyncio.get_event_loop().time()
            session_from_db = await session_manager.get_session(db, session_id)
            if not session_from_db:
                 logger.warning(f"[{session_id}] Session disappeared from DB. Closing WS.")
                 raise WebSocketDisconnect(code=status.WS_1011_INTERNAL_ERROR, reason="Session lost")
                 
            session_status = session_from_db.status
            if session_status in ["stopped", "cancelled", "error", "interrupted"]:
                 logger.info(f"[{session_id}] Session status '{session_status}'. Processing final data and closing WebSocket.")
                 
                 # Final transcription processing for any remaining audio in the accumulator
                 if main_audio_accumulator.tell() > 0:
                     full_audio_final_snapshot = main_audio_accumulator.getvalue()
                     progress_info = session_transcription_progress.get(session_id, {"last_processed_duration_seconds": 0.0, "all_segments": []})
                     
                     logger.info(f"[{session_id}] Performing final transcription pass for status '{session_status}'.")
                     final_new_segments, _ = await process_live_transcription_update_sliding_window(
                         full_audio_final_snapshot, session_id, db, 
                         progress_info["last_processed_duration_seconds"]
                     )
                     if final_new_segments:
                         progress_info["all_segments"].extend(final_new_segments)
                         # No client update here as WS is closing

                 # Save complete audio from main_audio_accumulator
                 if main_audio_accumulator.tell() > 0:
                     final_audio_data_to_save = main_audio_accumulator.getvalue()
                     logger.info(f"[{session_id}] Saving final accumulated audio ({len(final_audio_data_to_save)} bytes) as session status is '{session_status}'.")
                     await save_final_accumulated_audio(session_id, final_audio_data_to_save, db, ARTIFACT_STORAGE_BASE_PATH)
                 else:
                     logger.info(f"[{session_id}] Accumulator empty on close for status '{session_status}'. No final audio to save.")

                 # Store all collected segments in the DB
                 final_segments_to_store = session_transcription_progress.get(session_id, {}).get("all_segments", [])
                 if final_segments_to_store:
                     session_from_db.transcription_segments = final_segments_to_store
                     # session_from_db.full_transcript_text = ... (generate from all_segments if needed by stop_session)
                     session_from_db.last_update = datetime.utcnow()
                     if session_status == "stopped" and not session_from_db.completion_time: # If explicitly stopped, mark completion time
                         session_from_db.completion_time = datetime.utcnow()
                     await db.commit()
                     logger.info(f"[{session_id}] Stored {len(final_segments_to_store)} total segments in DB on WebSocket close due to status '{session_status}'.")
                 
                 raise WebSocketDisconnect(code=status.WS_1001_GOING_AWAY, reason=f"Session ended ({session_status})")

            if session_status == "paused":
                 await asyncio.sleep(0.5) # Shorter sleep for paused state allows faster resume
                 last_transcription_process_time = current_loop_time # Reset timer to avoid immediate processing on resume
                 continue
                 
            received_data = None
            try:
                received_data = await asyncio.wait_for(websocket.receive(), timeout=0.1) 
            except asyncio.TimeoutError:
                pass # This is expected, loop continues to periodic processing check

            if received_data:
                if received_data["type"] == "websocket.disconnect":
                    logger.info(f"[{session_id}] WebSocket disconnect message received.")
                    raise WebSocketDisconnect(code=received_data.get("code", 1000))
                
                elif received_data.get("type") == "websocket.receive" and received_data.get("text"):
                     try:
                         message_data = json.loads(received_data["text"])
                         msg_type = message_data.get("type")
                         if msg_type == "speaker_tag":
                             speaker_id = message_data.get("speaker_id")
                             timestamp = message_data.get("timestamp") # This is recording time in seconds
                             if speaker_id and isinstance(timestamp, (int, float)):
                                 logger.info(f"[{session_id}] Received speaker tag: Spk={speaker_id}, T={timestamp:.2f}s")
                                 await session_manager.add_speaker_tag_event(db, session_id, speaker_id, timestamp)
                             else:
                                 logger.warning(f"[{session_id}] Invalid speaker_tag msg: {message_data}")
                         else:
                              logger.warning(f"[{session_id}] Unknown text msg type: {msg_type}")
                     except Exception as e_text:
                          logger.error(f"[{session_id}] Error processing text msg: {e_text}", exc_info=True)
                
                elif received_data.get("type") == "websocket.receive" and received_data.get("bytes"):
                     audio_bytes_received = received_data.get('bytes')
                     if audio_bytes_received:
                         main_audio_accumulator.write(audio_bytes_received)
                         # No more transcription_chunk_buffer
                         logger.debug(f"[{session_id}] Received {len(audio_bytes_received)} audio bytes. Main accumulator size: {main_audio_accumulator.tell()} bytes")
                         # Removed individual chunk saving (save_audio_chunk)
                     else:
                         logger.debug(f"[{session_id}] Received empty audio bytes packet.")


            # Periodic processing using sliding window
            if (current_loop_time - last_transcription_process_time) >= WEBSOCKET_BUFFER_SECONDS:
                if main_audio_accumulator.tell() > 0:
                    full_audio_snapshot = main_audio_accumulator.getvalue()
                    
                    current_progress = session_transcription_progress.get(session_id, {"last_processed_duration_seconds": 0.0, "all_segments": []})
                    last_processed_total_duration = current_progress["last_processed_duration_seconds"]

                    logger.debug(f"[{session_id}] Attempting periodic transcription. Accumulator size: {len(full_audio_snapshot)}, last processed duration: {last_processed_total_duration:.2f}s.")
                    
                    newly_generated_segments, updated_total_processed_duration = await process_live_transcription_update_sliding_window(
                        full_audio_snapshot,
                        session_id,
                        db,
                        last_processed_total_duration
                    )

                    if newly_generated_segments:
                        current_progress["all_segments"].extend(newly_generated_segments)
                        logger.info(f"[{session_id}] Sending {len(current_progress['all_segments'])} total segments to client after periodic update.")
                        message_payload = {
                            "type": "transcription_update",
                            "segments": current_progress["all_segments"], # Send all for frontend to render
                            "status": "in_progress",
                            "is_final": False 
                        }
                        await manager.send_personal_message(json.dumps(message_payload), session_id)
                    
                    current_progress["last_processed_duration_seconds"] = updated_total_processed_duration
                    session_transcription_progress[session_id] = current_progress # Update tracker
                else:
                    logger.debug(f"[{session_id}] Periodic check: Main accumulator empty, skipping transcription.")
                last_transcription_process_time = current_loop_time

    except WebSocketDisconnect as e_ws_disconnect:
        logger.info(f"[{session_id}] WebSocket disconnected (code: {e_ws_disconnect.code}, reason: '{e_ws_disconnect.reason}')")
        # This block handles cleanup for ANY disconnect, including graceful ones from above.
        if db:
            logger.info(f"[{session_id}] Finalizing data on WebSocketDisconnect...")
            # Perform a final transcription pass if there's accumulated audio
            if main_audio_accumulator.tell() > 0:
                final_full_audio_snapshot = main_audio_accumulator.getvalue()
                progress_info_on_disc = session_transcription_progress.get(session_id, {"last_processed_duration_seconds": 0.0, "all_segments": []})
                
                logger.info(f"[{session_id}] Performing final transcription pass on disconnect.")
                final_new_segments_on_disc, _ = await process_live_transcription_update_sliding_window(
                    final_full_audio_snapshot, session_id, db,
                    progress_info_on_disc["last_processed_duration_seconds"]
                )
                if final_new_segments_on_disc:
                    progress_info_on_disc["all_segments"].extend(final_new_segments_on_disc)
                
                # Save the complete audio stream from main_audio_accumulator
                logger.info(f"[{session_id}] Saving final accumulated audio ({len(final_full_audio_snapshot)} bytes) on disconnect.")
                await save_final_accumulated_audio(session_id, final_full_audio_snapshot, db, ARTIFACT_STORAGE_BASE_PATH)
            else:
                logger.info(f"[{session_id}] Accumulator empty on disconnect. No final audio to save.")

            # Update session in DB with all collected segments and final status
            final_session_state_on_disc = await session_manager.get_session(db, session_id)
            if final_session_state_on_disc:
                all_final_segments = session_transcription_progress.get(session_id, {}).get("all_segments", [])
                if all_final_segments:
                    final_session_state_on_disc.transcription_segments = all_final_segments
                
                current_status_on_disc = final_session_state_on_disc.status
                # If the session was 'recording' or 'paused', and disconnect wasn't due to 'stopped' or 'cancelled' (already handled), mark as 'interrupted'.
                if current_status_on_disc in ["recording", "paused"] and e_ws_disconnect.reason and not any(s in e_ws_disconnect.reason for s in ["Session ended (stopped)", "Session ended (cancelled)"]):
                    logger.info(f"[{session_id}] Setting session status to 'interrupted' due to unexpected WebSocket disconnect.")
                    final_session_state_on_disc.status = "interrupted"
                
                if not final_session_state_on_disc.completion_time and final_session_state_on_disc.status in ["stopped", "completed", "interrupted"]: # Ensure completion time if terminal
                    final_session_state_on_disc.completion_time = datetime.utcnow()

                final_session_state_on_disc.last_update = datetime.utcnow()
                await db.commit()
                logger.info(f"[{session_id}] Finalized session in DB on disconnect. Status: {final_session_state_on_disc.status}")
            else:
                logger.warning(f"[{session_id}] Session not found during disconnect cleanup, cannot update DB.")
        else:
             logger.warning(f"[{session_id}] DB session unavailable during disconnect cleanup.")
             
    except Exception as loop_error:
        logger.error(f"[{session_id}] Unexpected error in WebSocket loop: {loop_error}", exc_info=True)
        if db:
             session_check = await session_manager.get_session(db, session_id)
             if session_check and session_check.status not in ["stopped", "completed", "cancelled", "interrupted"]:
                await session_manager.update_session_status(db, session_id, "error")
             else:
                logger.error(f"[{session_id}] Session not found or already in terminal state, cannot set status to error.")
        try: # Attempt to notify client of error
            error_payload = json.dumps({"type": "status_update", "status": "error", "message": "Internal server error."}) 
            if websocket.client_state == 1: # STATE_CONNECTED = 1
                 await websocket.send_text(error_payload)
        except Exception: pass # Ignore if cannot send
        
    finally:
        if session_id in session_transcription_progress: # Clean up session progress tracking
            del session_transcription_progress[session_id]
            logger.debug(f"[{session_id}] Removed session progress from in-memory tracker.")

        if manager and manager.active_connections.get(session_id) == websocket: # Check if this specific websocket is the one registered
            manager.disconnect(session_id) # This logs internally
            logger.info(f"[{session_id}] WebSocket connection explicitly removed from manager.")

        if main_audio_accumulator: main_audio_accumulator.close()
        
        if db: 
             await db.close()
             logger.debug(f"[{session_id}] Database session closed.")
        logger.info(f"[{session_id}] Cleaned up WebSocket resources for session.")
