# Transcription Service (`transcription_service`)

This service provides audio transcription and speaker diarization capabilities using the [WhisperX](https://github.com/m-bain/whisperX) library, which utilizes FasterWhisper and Pyannote.Audio.

## API Endpoints

- **POST `/api/transcribe/`**
  - **Description:** Transcribes an uploaded audio file and assigns speaker labels to segments.
  - **Request Body:** Requires a file upload (`multipart/form-data`) with the key `file` containing the audio data.
  - **Supported Audio Formats:** Any format supported by FFMPEG (e.g., mp3, wav, m4a, flac, ogg).
  - **Response (Success - 200 OK):**
    ```json
    {
      "filename": "your_audio.mp3",
      "language": "en", // Detected language code
      "segments": [
        {
          "start": 0.123,
          "end": 5.456,
          "text": "This is the first segment of speech.",
          "speaker": "SPEAKER_00"
        },
        {
          "start": 5.890,
          "end": 10.111,
          "text": "This is the second segment from a different speaker.",
          "speaker": "SPEAKER_01"
        },
        // ... more segments
      ]
    }
    ```
  - **Response (Error - 415 Unsupported Media Type):** If the uploaded file is not recognized as an audio type.
  - **Response (Error - 500 Internal Server Error):** If transcription/diarization fails.
  - **Response (Error - 503 Service Unavailable):** If the required models failed to load during service startup.

- **GET `/health`**
  - **Description:** Health check endpoint.
  - **Response (Success - 200 OK):**
    ```json
    {
      "status": "healthy",
      "service": "transcription_service"
    }
    ```

- **GET `/`**
  - **Description:** Root endpoint providing a welcome message.
  - **Response (Success - 200 OK):**
    ```json
    {
      "message": "Welcome to the transcription_service API"
    }
    ```

## Environment Variables

- `TRANSCRIPTION_SERVICE_PORT`: Port the service listens on (Default: `8012`).
- `CORS_ORIGINS`: Comma-separated list of allowed origins for CORS (Default: `*`).
- `LOG_LEVEL`: Logging level (e.g., `info`, `debug`) (Default: `info`).
- `MODEL_CACHE_DIR`: Directory *inside the container* for WhisperX/FasterWhisper models (Default: `/app/.cache/whisperx`). Maps to host `./data/whisper_models`.
- `HF_HOME`: Directory *inside the container* for Hugging Face models (Pyannote, alignment) (Default: `/app/.cache/huggingface`). Maps to host `./data/huggingface_cache`.
- `DEFAULT_MODEL`: Whisper model identifier used by WhisperX (e.g., `base`, `small`, `medium`, `large-v2`, `large-v3`) (Default: `large-v2`).
- `DEVICE`: Compute device (`cuda` or `cpu`) (Default: `cuda`).
- `COMPUTE_TYPE`: Quantization type for FasterWhisper (`float16`, `int8`, `float32`) (Default: `float16`).
- `BATCH_SIZE`: Batch size for transcription (Default: `16`).
- `HF_TOKEN`: Hugging Face API token (Optional). Required for downloading gated models like Pyannote speaker diarization if not already cached. Passed from host environment.
- `NVIDIA_VISIBLE_DEVICES`: Controls GPU visibility (Default: `all`).

## Setup and Running (Air-Gapped Focus)

Operating in an air-gapped environment requires downloading all necessary components beforehand on an internet-connected machine and transferring them.

### Prerequisites (Offline Machine)
- Docker and Docker Compose
- NVIDIA Container Toolkit (for GPU support)
- NVIDIA GPU with sufficient VRAM.

### Preparation (Online Machine)

1.  **Download Python Wheels:**
    - Create a `requirements.txt` file locally matching the one in `backend/transcription_service/`.
    - Create an empty directory, e.g., `wheels`.
    - Run the `pip download` command specified in the `Dockerfile` comments, adjusting `--python-version` and `--platform` if your target machine differs significantly (though `manylinux` often works). *Crucially, ensure you download wheels for `whisperx` and ALL its dependencies (like `faster-whisper`, `pyannote.audio`, `onnxruntime-gpu`, `torch`, `torchaudio`, etc.)*.
    ```bash
    mkdir wheels
    pip download --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: --extra-index-url https://download.pytorch.org/whl/cu126 -r requirements.txt -d ./wheels
    ```
    - Transfer the entire `wheels` directory to the offline machine, placing it inside `backend/transcription_service/`.

2.  **Download Models:**
    - **WhisperX/FasterWhisper Models:** Download the desired base Whisper model weights (e.g., `large-v2`) compatible with FasterWhisper. These often involve multiple files (`model.bin`, `config.json`, `tokenizer.json`, `vocabulary.txt`). Consult the [FasterWhisper documentation](https://github.com/guillaumekln/faster-whisper#usage) or model card on Hugging Face for the exact files. Place these model files within a subdirectory reflecting the model name inside the **host directory** `./backend/data/whisper_models/`. For example:
      ```
      backend/data/whisper_models/large-v2/
      ├── model.bin
      ├── config.json
      └── ... (other necessary files)
      ```
    - **Alignment Models:** WhisperX uses alignment models. These are typically downloaded automatically via Hugging Face. You need to trigger this download online and cache them. Run a minimal Python script using `whisperx.load_align_model` for a target language (e.g., 'en') and ensure the files are cached (usually in `~/.cache/huggingface/` or respecting `HF_HOME`).
    - **Pyannote.Audio Models:** Diarization requires models like `pyannote/speaker-diarization-3.1` and `pyannote/segmentation-3.0`. These are gated models on Hugging Face.
        - Create a Hugging Face account and accept the terms for these models on their respective model pages.
        - Obtain a Hugging Face User Access Token (`HF_TOKEN`) from your HF profile settings.
        - Run a Python script on the online machine using `pyannote.audio` and your token to trigger the download and caching (e.g., `from pyannote.audio import Pipeline; pipeline = Pipeline.from_pretrained('pyannote/speaker-diarization-3.1', use_auth_token='YOUR_HF_TOKEN')`).
    - **Transfer Caches:** Copy the entire contents of the Hugging Face cache (typically `~/.cache/huggingface/` or the directory specified by `HF_HOME` during the online download step) to the **host directory** `./backend/data/huggingface_cache/` on the offline machine.

### Offline Build & Run

1.  **Modify Dockerfile:** In `backend/transcription_service/Dockerfile`:
    - **Uncomment** the two lines for offline pip installation:
      ```dockerfile
      COPY wheels /app/wheels
      RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt
      ```
    - **Comment out** the online pip installation lines:
      ```dockerfile
      # COPY requirements.txt requirements.txt
      # RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu126
      ```

2.  **Build the Image:** Navigate to the `backend` directory on the offline machine and run:
    ```bash
    docker-compose build transcription_service
    ```

3.  **Set Hugging Face Token:** Although models are cached, Pyannote might still check credentials. Set the `HF_TOKEN` environment variable on the host machine before running docker-compose. You can add it to a `.env` file in the `backend` directory:
    ```.env
    HF_TOKEN=your_hugging_face_read_token
    ```
    *Ensure this `.env` file is not committed to version control if the token is sensitive.*

4.  **Run the Container:**
    ```bash
    docker-compose up transcription_service
    # Or for detached mode:
    docker-compose up -d transcription_service 
    ```
    The service should now start and load the models from the mounted host directories (`./data/whisper_models` and `./data/huggingface_cache`).

## Dependencies

- FastAPI, Uvicorn
- WhisperX
- FasterWhisper (WhisperX dependency)
- Pyannote.Audio (WhisperX dependency)
- PyTorch (with CUDA support recommended)
- ONNXRuntime-GPU (Optional, for specific backends)
- FFMPEG (installed in Docker image) 