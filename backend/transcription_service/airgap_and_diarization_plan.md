# Transcription Service: Diarization and Airgapped Deployment Plan

## Overview

This document outlines the steps to re-enable speaker diarization in the transcription service and prepare the service for airgapped deployment.

## Part 1: Re-enabling Diarization (for Batch File Transcription)

The initial focus for diarization will be on the batch file transcription endpoint (`/api/transcription/transcribe-file`). Live diarization for streaming can be a future enhancement.

### Tasks:

1.  **Modify `backend/transcription_service/model_loader.py`:**
    *   [ ] In the `load_all_models` function:
        *   [ ] Uncomment the line: `models["diarize"] = whisperx.diarize.DiarizationPipeline(use_auth_token=HF_TOKEN, device=DEVICE)`
        *   [ ] Remove or comment out: `logger.warning("Diarization model loading has been SKIPPED.")`
        *   [ ] Update the final log message from `"--- Model Loading Complete (Diarization SKIPPED) ---"` to `"--- Model Loading Complete ---"`.
    *   [ ] In the `get_models` function:
        *   [ ] Change the return statement from:
            `return models["whisper"], None, models["align"].get(language_code)`
            to:
            `return models["whisper"], models["diarize"], models["align"].get(language_code)`
    *   [ ] In the `are_models_loaded` function:
        *   [ ] (Optional) Consider if `models["diarize"]` should also be checked for the service to be considered "fully" loaded. (Decision: Yes, it is checked)
        *   [ ] Update docstring to reflect that the diarization model can also be loaded.

2.  **Modify `backend/transcription_service/transcribe_routes.py`:**
    *   [ ] Locate the `transcribe_audio_diarized_util` endpoint (around line 538).
    *   [ ] Change the summary from `"(Util) Transcribe a single audio file (NO DIARIZATION)"` to `"(Util) Transcribe a single audio file (WITH DIARIZATION)"`.
    *   [ ] Uncomment the diarization block within this function (around lines 592-609).
    *   [ ] Update the `get_models` call within this endpoint from:
        `whisper_model, _, align_model_tuple = get_models(...)`
        to:
        `whisper_model, diarize_model, align_model_tuple = get_models(language_code=language_code)`
        (Ensure `language_code` is defined appropriately before this call).

3.  **Verify `backend/transcription_service/requirements.txt`:**
    *   [ ] Ensure `pyannote.audio>=3.1.1` is present (Verified).
    *   [ ] Ensure `whisperx` is present (Verified, via GitHub URL).

4.  **Consider `HF_TOKEN` for Diarization Models:**
    *   [ ] Confirm default diarization models used by `whisperx.diarize.DiarizationPipeline` (e.g., `pyannote/speaker-diarization-3.1`, `pyannote/segmentation-3.0`). (Confirmed)
    *   [ ] Ensure `HF_TOKEN` is available in the environment if models are gated. (Present in `docker-compose.yml` as `HF_TOKEN=${HF_TOKEN:-}`). (Confirmed)
    *   [ ] Note: For airgapping, this token is needed *once* when pre-downloading models. (Noted)

## Part 2: Preparing for Airgapped Deployment

### Tasks:

1.  **Python Dependencies (`backend/transcription_service/requirements.txt`):**
    *   [ ] **Pin All Versions:** Review `requirements.txt` and change all `>=` versions to specific `==` versions. Examples:
        *   [ ] `fastapi>=0.111.1` -> `fastapi==0.111.1` (or latest known good)
        *   [ ] `uvicorn[standard]>=0.29.0` -> `uvicorn[standard]==0.29.0`
        *   [ ] `python-dotenv>=1.0.1` -> `python-dotenv==1.0.1`
        *   [ ] `python-multipart>=0.0.9` -> `python-multipart==0.0.9`
        *   [ ] `pyannote.audio>=3.1.1` -> `pyannote.audio==3.1.1` (confirm compatibility)
        *   [ ] `pydub>=0.25.1` -> `pydub==0.25.1`
        *   [ ] `numpy>=1.24.0` -> `numpy==1.26.4` (confirm compatibility)
        *   [ ] `asyncpg>=0.29.0` -> `asyncpg==0.29.0`
        *   [ ] `SQLAlchemy>=2.0` -> `SQLAlchemy==2.0.30`
        *   [ ] `setuptools-rust>=1.1.2` -> `setuptools-rust==1.9.0`
        *   [ ] `onnxruntime` -> `onnxruntime==1.18.0` (or specific version, ensure consistency with CPU/GPU choice)
    *   [ ] **`whisperx` from GitHub (in `Dockerfile`):**
        *   **Option A (Pin commit - Preferred):**
            *   [ ] Identify the latest stable commit hash for `m-bain/whisperX`.
            *   [ ] Change `RUN pip install git+https://github.com/m-bain/whisperX.git`
                  to `RUN pip install git+https://github.com/m-bain/whisperX.git@<commit_hash>#egg=whisperx`.
        *   **Option B (Full Vendor - If Option A is problematic):**
            *   [ ] Clone/submodule `whisperX` into `backend/transcription_service/vendor/whisperX`.
            *   [ ] Update `Dockerfile`: `COPY ./vendor/whisperX /app/vendor/whisperX`
            *   [ ] Update `Dockerfile`: `RUN pip install /app/vendor/whisperX`.
    *   [ ] **Torch/Torchaudio:** Verified as pinned in `Dockerfile`.

2.  **Dockerfile Hardening (`backend/transcription_service/Dockerfile`):**
    *   [ ] **Base Image:** `FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04` is specific (Good).
    *   [ ] **System Packages (`apt-get`):**
        *   [ ] Verify if `python3.10` can be installed from default Ubuntu 22.04 repositories without `ppa:deadsnakes/ppa`.
        *   [ ] If so, remove `add-apt-repository -y ppa:deadsnakes/ppa` and `software-properties-common` (if not needed otherwise).
    *   [ ] **Pip Install:**
        *   [ ] Ensure `requirements.txt` is fully pinned (see step 1).
        *   [ ] (Optional Extreme Airgap Build): Consider `--no-index --find-links=/local/wheels/` if building the image itself in an airgapped environment. For now, assume image is built with internet access.

3.  **Model Pre-downloading and Management:**
    *   [ ] **Identify All Models:**
        *   [ ] Whisper model: Confirm `DEFAULT_MODEL` from `config.py`.
        *   [ ] Alignment models: List all languages to support (e.g., "en").
        *   [ ] Diarization model: Confirm specific model(s) pulled by `whisperx.diarize.DiarizationPipeline` (e.g., `pyannote/speaker-diarization-3.1`, `pyannote/segmentation-3.0`).
    *   [ ] **Define Pre-download Procedure:**
        *   [ ] Write a script or detailed manual steps to download all identified models using `whisperx.load_model`, `whisperx.load_align_model`, and `whisperx.diarize.DiarizationPipeline` into specified cache directories (`MODEL_CACHE_DIR` for Whisper, `HF_HOME` for others).
        *   [ ] Ensure the script uses the correct environment variables (`HF_TOKEN` if necessary).
    *   [ ] **Verify Cache Paths:** `MODEL_CACHE_DIR` and `HF_HOME` are correctly set and mapped in `docker-compose.yml` to host volumes (`../data/transcription/whisper_models`, `../data/transcription/huggingface_cache`).

4.  **Review `docker-compose.yml` (`transcription` service):**
    *   [ ] `build: ./transcription_service` (Good).
    *   [ ] `HF_TOKEN=${HF_TOKEN:-}` (Good for initial download; may not be needed at runtime if models fully cached, but safer to keep).
    *   [ ] Volumes for caches correctly mapped (Good).

5.  **Application Code Review for External Calls:**
    *   [ ] Briefly scan Python files in `backend/transcription_service/` (beyond model loading) for any unintended external HTTP/HTTPS calls.

6.  **Documentation for Airgapped Setup:**
    *   [ ] Create/update `README.md` or a new `AIRGAPPED_DEPLOYMENT.md` in `backend/transcription_service/` with:
        *   [ ] Instructions on maintaining pinned dependencies.
        *   [ ] List of models to pre-download.
        *   [ ] Step-by-step model pre-download instructions.
        *   [ ] Instructions for placing models into host volumes.
        *   [ ] Docker image build command (`docker-compose build transcription_service`).
        *   [ ] Instructions for running in an airgapped environment (e.g., `docker load`, `docker-compose up`).

## Future Considerations:

*   [ ] Live diarization for streaming endpoint (`/api/ws/transcription/stream/{session_id}`).
*   [ ] More robust error handling for diarization failures.
*   [ ] Configuration options for diarization (e.g., min/max speakers). 