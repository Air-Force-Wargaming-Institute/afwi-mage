import logging
import whisperx
import os
from config import (
    DEFAULT_MODEL,
    DEVICE,
    COMPUTE_TYPE,
    HF_TOKEN,
    MODEL_CACHE_DIR,
    HF_HOME,
)

logger = logging.getLogger(__name__)

# Global storage for loaded models
models = {
    "whisper": None,
    "diarize": None,
    "align": {}, # Dictionary to store align models by language {lang_code: (model, metadata)}
}

# Flag to track loading status
models_loaded = False

def load_all_models(language_code: str = "en"):
    """
    Loads the Whisper model, Diarization model, and Alignment model.
    Attempts to load alignment model for the specified language.
    """
    global models_loaded
    if models_loaded:
        logger.info("Models already loaded.")
        # Ensure alignment model for the requested language is loaded if needed later
        if language_code not in models["align"]:
             _load_alignment_model(language_code)
        return

    logger.info("--- Starting Model Loading ---")
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    os.makedirs(HF_HOME, exist_ok=True)

    try:
        # 1. Load Whisper Model
        logger.info(f"Loading WhisperX model '{DEFAULT_MODEL}' (device: {DEVICE}, compute: {COMPUTE_TYPE})...")
        models["whisper"] = whisperx.load_model(
            DEFAULT_MODEL,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            download_root=MODEL_CACHE_DIR,
            # language=language_code # Set initial language? Might re-infer later.
        )
        logger.info("WhisperX model loaded successfully.")

        # 2. Load Diarization Model
        logger.info("Loading Diarization model...")
        # Requires HF_TOKEN if model is gated and not cached
        models["diarize"] = whisperx.DiarizationPipeline(use_auth_token=HF_TOKEN, device=DEVICE)
        logger.info("Diarization model loaded successfully.")

        # 3. Load Alignment Model (for the default language initially)
        _load_alignment_model(language_code)

        models_loaded = True # Set flag on successful load
        logger.info("--- Model Loading Complete ---")

    except ImportError as e:
        logger.error(f"ImportError during model loading: {e}. Ensure all dependencies (like pyannote.audio) are installed.", exc_info=True)
        reset_models()
    except Exception as e:
        logger.error(f"Failed to load models: {e}", exc_info=True)
        logger.error("Ensure models are pre-downloaded into the correct cache directories for air-gapped environments.")
        logger.error(f"WhisperX cache expected: {MODEL_CACHE_DIR}")
        logger.error(f"HuggingFace cache expected: {HF_HOME}")
        if "requires you to agree" in str(e) or "401 Client Error" in str(e):
            logger.error("Pyannote diarization model might require HuggingFace authentication (HF_TOKEN) and agreeing to terms.")
        reset_models()

def _load_alignment_model(language_code: str):
    """Loads or retrieves the alignment model for a specific language."""
    if not language_code:
         logger.warning("Cannot load alignment model without language code.")
         return None, None
         
    if language_code in models["align"]:
        logger.debug(f"Alignment model for '{language_code}' already loaded.")
        return models["align"][language_code]

    logger.info(f"Loading alignment model for language: {language_code}...")
    try:
        model_a, metadata = whisperx.load_align_model(language_code=language_code, device=DEVICE)
        models["align"][language_code] = (model_a, metadata)
        logger.info(f"Alignment model for '{language_code}' loaded successfully.")
        return model_a, metadata
    except Exception as e:
        logger.error(f"Failed to load alignment model for language '{language_code}': {e}", exc_info=True)
        # Don't mark all models as unloaded, just this one failed
        return None, None

def get_models(language_code: str = "en"):
    """Returns the loaded models, ensuring alignment model for the language exists."""
    if not models_loaded:
        # Attempt to load if not already loaded (e.g., for dev server reloading)
        logger.warning("Models not loaded. Attempting lazy load...")
        load_all_models(language_code)
        if not models_loaded:
             raise RuntimeError("Models failed to load.")

    # Ensure alignment model for the specific language is loaded
    if language_code not in models["align"]:
        _load_alignment_model(language_code)

    return models["whisper"], models["diarize"], models["align"].get(language_code) # Returns (model, metadata) or None

def reset_models():
    """Resets the model state."""
    global models_loaded
    models["whisper"] = None
    models["diarize"] = None
    models["align"] = {}
    models_loaded = False
    logger.warning("Models have been reset due to loading errors.")

def are_models_loaded() -> bool:
     """Checks if the core models (Whisper, Diarize) are loaded."""
     return models_loaded and models["whisper"] is not None and models["diarize"] is not None 