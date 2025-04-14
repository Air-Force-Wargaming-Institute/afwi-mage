from fastapi import APIRouter, UploadFile, File, HTTPException, status
import whisperx
import os
import tempfile
import logging
import time
from config import (
    DEFAULT_MODEL,
    DEVICE,
    COMPUTE_TYPE,
    BATCH_SIZE,
    HF_TOKEN,
    MODEL_CACHE_DIR, # Keep for whisperx model loading if needed
)

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Model Loading ---
# NOTE: Models are loaded lazily by whisperx on first use or explicitly.
# We load them here at startup for faster initial requests, but this increases startup time.
# For air-gapped, models MUST be pre-downloaded into the mapped cache volumes.

whisper_model = None
diarize_model = None

def load_models():
    global whisper_model, diarize_model
    try:
        logger.info(f"Loading WhisperX model '{DEFAULT_MODEL}' (device: {DEVICE}, compute: {COMPUTE_TYPE})...")
        # Ensure cache dir is used if specified, although whisperx might default elsewhere
        whisper_model = whisperx.load_model(
            DEFAULT_MODEL,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            download_root=MODEL_CACHE_DIR, # Point whisperx to the right cache
            # language="en" # Optional: Specify language if known
        )
        logger.info("WhisperX model loaded.")

        logger.info("Loading Diarization model...")
        # This will attempt to use models from HF_HOME cache first
        # Requires HF_TOKEN if model is gated and not cached
        diarize_model = whisperx.DiarizationPipeline(use_auth_token=HF_TOKEN, device=DEVICE)
        logger.info("Diarization model loaded.")

    except ImportError as e:
        logger.error(f"ImportError during model loading: {e}. Make sure all dependencies (like pyannote.audio) are installed.", exc_info=True)
        whisper_model = None
        diarize_model = None
    except Exception as e:
        logger.error(f"Failed to load models: {e}", exc_info=True)
        logger.error("Ensure models are pre-downloaded into the correct cache directories for air-gapped environments.")
        logger.error(f"WhisperX cache expected: {MODEL_CACHE_DIR}")
        logger.error(f"HuggingFace cache expected: {os.environ.get('HF_HOME')}")
        if "requires you to agree" in str(e) or "401 Client Error" in str(e):
             logger.error("Pyannote diarization model might require HuggingFace authentication (HF_TOKEN) and agreeing to terms.")
        whisper_model = None
        diarize_model = None

# Load models on startup (can be commented out for lazy loading)
load_models()

@router.post("/", summary="Transcribe audio file with diarization")
async def transcribe_audio_diarized(
    file: UploadFile = File(...)
):
    """
    Receives an audio file, performs transcription and speaker diarization,
    and returns segments with speaker labels.
    """
    if not whisper_model or not diarize_model:
        logger.error("Transcription/Diarization endpoint called, but models not loaded.")
        # Attempt to reload models if they failed initially
        if not whisper_model or not diarize_model:
             load_models()
        if not whisper_model or not diarize_model:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Transcription/Diarization models are not available."
            )

    logger.info(f"Received file: {file.filename}, content type: {file.content_type}")

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

        # 2. Transcribe
        logger.info(f"Starting transcription (model: {DEFAULT_MODEL}, batch: {BATCH_SIZE})...")
        result = whisper_model.transcribe(audio, batch_size=BATCH_SIZE)
        transcribe_time = time.time()
        logger.info(f"Transcription finished in {transcribe_time - start_time:.2f}s.")

        # 3. Align Whisper output
        logger.info("Loading alignment model and aligning...")
        # Align model loading might also need HF_TOKEN if not cached
        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=DEVICE)
        result = whisperx.align(result["segments"], model_a, metadata, audio, DEVICE, return_char_alignments=False)
        align_time = time.time()
        logger.info(f"Alignment finished in {align_time - transcribe_time:.2f}s.")

        # 4. Diarize
        logger.info("Starting diarization...")
        diarize_segments = diarize_model(audio)
        # Format for whisperx: HfApi().get_model("pyannote/speaker-diarization-3.1") -> doesn't work with local files
        # whisperx expects a DataFrame or specific dict format, let's stick to its processing
        # result = whisperx.assign_word_speakers(diarize_segments, result)
        # logger.info(f"Diarization finished and speakers assigned in {time.time() - align_time:.2f}s.")

        # Assign speaker labels from pyannote output to whisperx segments
        result = whisperx.assign_word_speakers(diarize_segments, result)
        diarize_assign_time = time.time()
        logger.info(f"Diarization and speaker assignment finished in {diarize_assign_time - align_time:.2f}s.")

        # Prepare response (list of segments with text and speaker)
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