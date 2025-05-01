# Record & Transcribe Live Feature Implementation Plan

## Implementation Progress
**Frontend Progress**: ~90% Integrated ✅ (Core recording/playback/editing/fetching integrated)
**Backend Progress**: ~95% Complete ✅ (Core functionality done, PDF/DOCX pending)
**Docker Progress**: 100% Complete ✅
**Overall Progress**: ~70% Complete ⏳

**Current Status**: Frontend UI components and structure are largely complete and integrated with the live backend via the API gateway. Backend service structure includes database integration (PostgreSQL) for session persistence, automatic table creation, WebSocket endpoint for streaming/processing/storage, core session management endpoints, and artifact saving logic in `/stop` (TXT/WEBM). Docker configuration (`Dockerfile`, `docker-compose.yml`) is complete.

**Key Outstanding Issues**
1. [ ] WebSocket Authentication: This is a significant gap. The current implementation in RecordingControlPanel.js connects to the WebSocket URL (/api/transcription/stream/{session_id}) provided by the /start-session endpoint without passing any authentication token. Standard browser WebSocket APIs don't support custom headers. The backend websocket_routes.py endpoint also does not appear to perform any authentication checks upon connection. The API gateway's auth-middleware typically doesn't intercept WebSocket upgrade requests in the same way as standard HTTP requests. This means the WebSocket connection is likely unauthenticated. This needs to be addressed. Common solutions involve passing the token as a query parameter in the WebSocket URL (requires backend modification to read and validate) or sending an authentication message immediately after connection (requires both frontend and backend changes). Decide on a robust strategy (query parameter or post-connection message) and implement it in both RecordingControlPanel.js and websocket_routes.py.
2. [ ] Utility Endpoint Auth: The plan notes the /transcribe-file utility endpoint bypasses auth in the gateway config. This should be reviewed and likely secured if it poses a risk or is intended for use beyond simple testing.
3. [ ] Frontend Auth Handling (REST): Frontend components (SessionBrowserPanel, RecordingControlPanel, RealtimeTaggingPanel, RecordTranscribe, TranscriptionDisplay) correctly import AuthContext to get the token and getGatewayUrl to construct API endpoints. The pattern of including the Authorization: Bearer <token> header in fetch calls seems to be followed where implemented (e.g., SessionBrowserPanel, TranscriptionDisplay, RecordTranscribe save). Crucially, end-to-end testing must verify this header is present and correct on all authenticated API calls.
4. [ ] Audio Serving: The backend currently returns a placeholder URL (/placeholder/audio/...) for audio playback (GET /sessions/{id}). A proper mechanism to serve the stored audio files (e.g., via a dedicated FastAPI route serving static files or using pre-signed URLs if applicable) needs to be implemented. Replace the placeholder audio URL logic in GET /sessions/{id} (transcribe_routes.py) with a functional way to serve the concatenated audio files stored in the ARTIFACT_STORAGE_BASE_PATH.
5. [ ] Missing Feature: As noted, PDF/DOCX generation is not implemented in the /stop endpoint (transcribe_routes.py).
6. [ ] Potential Issue: The backend currently uses hardcoded or placeholder user IDs (e.g., "current-user" in list_sessions, taking user_id from request body in add_marker and start_session). This needs modification to properly integrate with the authentication system, likely by extracting the X-User-ID header passed by the API gateway's auth-middleware within the FastAPI request context/dependencies.
7. [ ] Potential Memory Issue: The most likely source of high memory usage would be the transcriptionText state variable if a transcription (either live or loaded) becomes extremely long (e.g., hours of audio). The current implementation loads the entire text into this variable. While likely acceptable for moderate use, be mindful of this for very long sessions. Techniques like virtual scrolling or pagination within TranscriptionDisplay could mitigate this if it becomes a practical problem.
8. [ ] Secure Utility Endpoint: Review if the /transcribe-file endpoint needs authentication via the API gateway.
9. [ ] 

**Next Priorities**:
1.  **Testing:** Conduct thorough end-to-end testing of the fully integrated system.
2.  **Backend - Implement Other Output Formats:** Add logic to `/stop` to generate PDF/DOCX based on request. (Lower Priority)
3.  Refine WebSocket segment info (e.g., enhance confidence reporting). (Lower Priority)

## Frontend-Backend Integration Guide

This guide outlines what's been prepared on the frontend and what backend developers need to implement.

### API Integration Status

**Components Integrated:**
- `SessionBrowserPanel.js`: ✅ Fetches session list and details via API gateway with auth.
- `RecordingControlPanel.js`: ✅ Uses live API calls & WS connection. ✅ Provides WS sender via context.
- `TranscriptionDisplay.js`: ✅ Renders transcription from context state (live updates via WS). ✅ Fetches final transcript via API gateway for loaded sessions.
- `RealtimeTaggingPanel.js`: ✅ Saves markers via live API call. ✅ Sends speaker tags via WebSocket context function.
- `RecordTranscribe.js`: ✅ Handles saving edited session data (`PUT /sessions/{id}`) for loaded sessions.
- `ParticipantManager.js` / `SessionMetadataForm.js`: ✅ Allow editing when session is loaded (no separate API calls needed for save).

**Components Pending Integration:**
- None (Core integration complete).

### Integration Steps for Frontend Developers

1.  **End-to-End Testing:** Thoroughly test all interactions (recording, playback, editing, saving, markers, tags), refine error messages, loading states, and UI feedback based on live API/WebSocket behavior.
2.  **State Management & Context Review:**
    - Implement logic to track/compare initial loaded data vs. current state to enable/disable the "Save Changes" button accurately.
    - Ensure state updates are consistent after saving changes.
3.  **Reconnection Logic:** Test WebSocket reconnection logic under various scenarios (server restart, temporary network loss).
4.  **Backend - Implement Other Output Formats (Optional):** If needed, implement PDF/DOCX generation on backend.
5.  **(Cleanup) Remove Unused Code:** Remove `frontend/src/services/transcriptionService.js`.

### Backend Implementation Requirements

The backend needs to implement these endpoints to connect with the frontend:

#### Core API Endpoints

| Endpoint                                          | Method    | Status                          | Description                               |
|---------------------------------------------------|-----------|---------------------------------|-------------------------------------------|
| `/api/transcription/start-session`                | POST      | ✅ Done                         | Initialize a recording session (DB)       |
| `/api/transcription/stream/{session_id}`          | WebSocket | ✅ Done (Handles Streaming, Processing, Storage) | Audio streaming, processing, updates    |
| `/api/transcription/sessions/{session_id}/pause`  | POST      | ✅ Done                         | Pause recording (DB update)               |
| `/api/transcription/sessions/{session_id}/resume` | POST      | ✅ Done                         | Resume recording (DB update)              |
| `/api/transcription/sessions/{session_id}/stop`   | POST      | ✅ Done (Handles core finalize, PDF/DOCX TBD) | Stop, apply tags, concat audio, save artifacts, finalize DB |
| `/api/transcription/sessions/{session_id}/cancel` | POST      | ✅ Done                         | Cancel recording session (DB update)      |
| `/api/transcription/sessions`                     | GET       | ✅ Done                         | List previous sessions (DB)               |
| `/api/transcription/sessions/{session_id}`        | GET       | ✅ Done                         | Get session details (DB)                  |
| `/api/transcription/sessions/{session_id}/transcription` | GET  | ✅ Done                         | Get final transcription text/segments (DB)|
| `/api/transcription/sessions/{session_id}/markers` | POST     | ✅ Done                         | Add timeline marker (DB)                  |
| `/api/transcription/sessions/{session_id}/speakers` | WebSocket | ✅ Done (Via `speaker_tag` event) | Tag current speaker (Event stored in DB)  |
| `/api/transcription/sessions/{session_id}`        | PUT       | ✅ Done                         | Update session details (DB)               |
| `/api/transcription/transcribe-file`              | POST      | ✅ Done                         | Basic file transcription util (Not for live) |

#### Integration Steps for Frontend Developers

1.  **Replace Simulations:** Remove all simulated `fetch` calls, `setTimeout` delays, and dummy data generation within the frontend components (`RecordingControlPanel`, `RealtimeTaggingPanel`, `TranscriptionDisplay`, `SessionBrowserPanel`, etc.).
2.  **API Gateway Integration:** Update all API calls to use the `getGatewayUrl` function (similar to `MultiAgentHILChat.js`) to route requests through the central API gateway.
3.  **Authentication:** Implement logic to retrieve the authentication token (likely from `AuthContext`, similar to `MultiAgentHILChat.js`) and include it in the `Authorization: Bearer <token>` header for all API requests to the backend service via the gateway.
4.  **WebSocket Connection:** Implement a live WebSocket connection to the backend endpoint (`/api/transcription/stream/{session_id}`) using the URL provided by the `/start-session` response. Handle incoming messages (transcription updates, status) and outgoing messages (speaker tags) according to the defined protocol. Implement robust connection/disconnection/error handling.
5.  **State Management:** Ensure the frontend state (managed by `TranscriptionContext`) is correctly updated based on live data received from the API and WebSocket.
6.  **Error Handling:** Test and refine error handling based on actual responses and potential failures from the live backend and gateway.

#### Backend Implementation Requirements (Recap)

1.  **WebSocket Implementation**: ✅ Done
    - Handles audio streaming, buffering, transcription (WhisperX), diarization (WhisperX), segment updates, DB storage, and progressive audio chunk saving.

2. **Session Management**: ✅ Done (DB Integration)
   - Implemented session creation, DB storage (PostgreSQL), retrieval, status updates (pause, resume, cancel, stop).
   - `/stop` endpoint handles artifact saving (TXT/WEBM) and tag application.

3. **Transcription Engine**: ✅ Done (WhisperX Integration)
    - WhisperX used for transcription and diarization within WebSocket flow.
    - Speaker identification handled by WhisperX diarization + speaker tag application in `/stop`.
    - Timeline markers stored via `/markers` endpoint.

4. **Testing with Frontend**: ⏳ Needed
    - Backend endpoints are implemented and ready for connection.
    - Frontend needs connection to live backend endpoints via the API gateway.
    - Simulation code in frontend needs removal.

## Backend Service Architecture (Recommendation)

We recommend structuring the backend service as follows:

1. **API Layer**:
   - RESTful endpoints for session management
   - WebSocket server for streaming
   - Authorization and validation

2. **Processing Layer**:
   - Audio processing and chunking
   - Transcription service integration
   - Speaker diarization

3. **Storage Layer**:
   - Session metadata storage
   - Audio file storage
   - Transcription and marker storage

## API Documentation for Backend Developers

### API Overview
The Record & Transcribe Live feature uses RESTful API endpoints for session lifecycle management and data retrieval, and a WebSocket connection for real-time audio streaming and transcription/diarization updates. Session data is persisted in a PostgreSQL database.

### Required API Endpoints

#### 1. Start Recording Session
- **Endpoint**: `/api/transcription/start-session`
- **Method**: POST
- **Status**: ✅ Done
- **Purpose**: Initialize a new recording session and return a session ID
- **Request Body**: 
  ```json
  {
    "user_id": "string",
    "session_name": "string",
    "output_format_preferences": {
      "audio_format": "mp3|wav|m4a",
      "transcription_format": "pdf|txt|docx"
    },
    "event_metadata": {
      "wargame_name": "string",
      "scenario": "string",
      "phase": "string",
      "classification": "string",
      "location": "string",
      "organization": "string",
      "datetime": "ISO datetime"
    },
    "participants": [
      {
        "id": "string",
        "name": "string",
        "role": "string",
        "rank": "string",
        "organization": "string",
        "profile_image": "base64 string|url"
      }
    ]
  }
  ```
- **Response**: 
  ```json
  {
    "session_id": "string",
    "status": "initialized",
    "start_timestamp": "ISO datetime",
    "streaming_url": "string", // WebSocket URL for streaming audio
    "collaboration_url": "string" // URL for observers to join
  }
  ```

#### 2. Stream Audio Chunks
- **Endpoint**: WebSocket connection to `/api/transcription/stream/{session_id}`
- **Method**: WebSocket
- **Status**: ✅ Done (Handles Streaming, Processing, Storage)
- **Purpose**: Stream audio chunks to the server for processing
- **Events**:
  - Client sends: Binary audio chunks with channel metadata
  - Server sends: Transcription updates, status updates, speaker identification

#### 3. Get Live Transcription
- **Endpoint**: `/api/transcription/sessions/{session_id}/transcription`
- **Method**: GET
- **Status**: ✅ Done
- **Purpose**: Get the final transcription text for a completed session.
- **Response**: 
  ```json
  {
    "session_id": "string",
    "full_transcript_text": "string", // The final, potentially edited transcript
    "transcription_segments": [ // The structured segments used to build the text
      {
        "speaker": "string",
        "text": "string",
        "start": "float",
        "end": "float",
        "confidence": "float"
      }
      // ... more segments
    ],
    "last_update": "ISO datetime"
  }
  ```

#### 4. Pause Recording
- **Endpoint**: `/api/transcription/sessions/{session_id}/pause`
- **Method**: POST
- **Status**: ✅ Done
- **Purpose**: Pause the current recording session (updates DB status)
- **Response**: 
  ```json
  {
    "session_id": "string",
    "status": "paused",
    "timestamp": "ISO datetime"
  }
  ```

#### 5. Resume Recording
- **Endpoint**: `/api/transcription/sessions/{session_id}/resume`
- **Method**: POST
- **Status**: ✅ Done
- **Purpose**: Resume a paused recording session (updates DB status)
- **Response**: 
  ```json
  {
    "session_id": "string",
    "status": "recording",
    "timestamp": "ISO datetime"
  }
  ```

#### 6. Add Timeline Marker
- **Endpoint**: `/api/transcription/sessions/{session_id}/markers`
- **Method**: POST
- **Status**: ✅ Done
- **Purpose**: Add a marker to the session's marker list in the DB.
- **Request Body**:
  ```json
  {
    "marker_type": "string", // e.g., "decision", "insight", "custom_label"
    "timestamp": "float", // Recording time in seconds
    "description": "string", // Optional
    "classification": "string", // Optional
    "user_id": "string" // TODO: Get from auth context
  }
  ```
- **Response**:
  ```json
  {
    "marker_id": "string", // Unique ID for the marker
    "status": "added",
    "timestamp": "ISO datetime" // DB add timestamp
  }
  ```

#### 7. Stop Recording and Finalize
- **Endpoint**: `/api/transcription/sessions/{session_id}/stop`
- **Method**: POST
- **Status**: ✅ Done (Handles core finalize, PDF/DOCX TBD)
- **Purpose**: Stop recording, apply tags, concat audio, save artifacts, finalize DB
- **Request Body**: 
  ```json
  {
    "audio_filename": "string", // Base name for saving output
    "transcription_filename": "string", // Base name for transcript
    // Other options for final processing can be added here
    "output_formats": ["pdf", "docx", "txt", "aar", "executive_summary"] // Desired output formats
  }
  ```
- **Response**: 
  ```json
  {
    "session_id": "string",
    "status": "completed",
    "completion_timestamp": "ISO datetime",
    // Details about saved files might be added here later
    // "audio_file_path": "string",
    // "transcript_file_path": "string"
  }
  ```

#### 8. Cancel Recording
- **Endpoint**: `/api/transcription/sessions/{session_id}/cancel`
- **Method**: POST
- **Status**: ✅ Done (Updates DB status)
- **Purpose**: Cancel the recording session (marks status as 'cancelled' in DB).
- **Response**: 
  ```json
  {
    "session_id": "string",
    "status": "cancelled",
    "timestamp": "ISO datetime"
  }
  ```

#### 9. List Previous Sessions
- **Endpoint**: `/api/transcription/sessions`
- **Method**: GET
- **Status**: ✅ Done
- **Purpose**: Retrieve a list of past recording sessions for the user (from DB).
- **Response**:
  ```json
  {
    "sessions": [
      {
        "session_id": "uuid",
        "session_name": "string",
        "start_time": "ISO datetime",
        "status": "string",
        "event_metadata": { /* subset of event metadata */ }
      }
      // ... more sessions
    ]
  }
  ```

#### 10. Get Session Details
- **Endpoint**: `/api/transcription/sessions/{session_id}`
- **Method**: GET
- **Status**: ✅ Done
- **Purpose**: Retrieve the full details for a specific recording session (from DB).
- **Response**: (Corresponds to `SessionDetailsResponse` schema in `transcribe_routes.py`)
  ```json
  {
    "session_id": "uuid",
    "session_name": "string",
    "status": "string",
    "start_time": "ISO datetime",
    "last_update": "ISO datetime",
    "completion_time": "ISO datetime | null",
    "detected_language": "string | null",
    "event_metadata": { /* full EventMetadataSchema */ },
    "participants": [ /* list of ParticipantSchema */ ],
    "transcription_segments": [ /* list of processed segments */ ],
    "markers": [ /* list of marker objects, includes speaker tag events */ ],
    "audio_storage_path": "string | null",
    "transcript_storage_path": "string | null",
    "full_transcript_text": "string | null", // Editable transcript
    "audio_url": "string | null" // Derived URL for playback
  }
  ```

#### 11. Update Session Details
- **Endpoint**: `/api/transcription/sessions/{session_id}`
- **Method**: PUT
- **Status**: ✅ Done
- **Purpose**: Update the editable details of a past recording session (in DB).
- **Request Body**: 
  ```json
  {
    "session_name": "string", // Optional
    "event_metadata": { /* EventMetadataSchema */ }, // Optional
    "participants": [ /* ParticipantSchema */ ], // Optional
    "full_transcript_text": "string" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "session_id": "uuid",
    "status": "updated",
    "updated_at": "ISO datetime"
  }
  ```

#### 12. Basic File Transcription (Not for Live Feature)
- **Endpoint**: `/api/transcription/transcribe-file`
- **Method**: POST
- **Status**: ✅ Done
- **Purpose**: Transcribe a single uploaded audio file (used by `transcribe_client.py`). **Not directly used by the live frontend.**
- **Request Body**: `multipart/form-data` with `file` field.
- **Response**:
  ```json
  {
    "filename": "string",
    "language": "string",
    "segments": [
      {
        "start": "float",
        "end": "float",
        "text": "string",
        "speaker": "string"
      }
    ]
  }
  ```

### WebSocket Protocol
The WebSocket connection at `/api/transcription/stream/{session_id}` is used for:
1. Streaming audio chunks (WebM format) from the client to the server.
2. Receiving processed transcription segments (including text, speaker, timestamps, confidence) from the server.
3. Sending speaker tag events from the client to the server.

The WebSocket messages are expected in these formats:

**Client to Server (Audio Chunks)**:
- Binary data representing an audio chunk (WebM format)

**Server to Client (Transcription Updates)**:
```json
{ 
  "type": "transcription_update",
  "segments": [
     {
        "speaker": "string | UNKNOWN",
        "text": "string",
        "start": "float",
        "end": "float",
        "confidence": "float | null"
      }
      // ... more segments from the processed buffer
   ],
  "status": "in_progress",
  "is_final": false
}
```

**Server to Client (Status Updates)**:
```json
{
  "type": "status_update",
  "status": "processing|paused|error|completed",
  "message": "Optional status message"
}
```

**Server to Client (Speaker Identification)**:
```json
// Note: Speaker ID is now included within the 'transcription_update' segments.
// This separate message type is likely no longer needed.
```

**Client to Server (Speaker Tag)**:
```json
{ 
  "type": "speaker_tag",
  "speaker_id": "string", // ID of the participant being tagged
  "timestamp": float // Recording time in seconds when tag occurred
}
```

### Authentication
All API endpoints should require standard authentication through the API gateway service `backend\api_gateway\dynamic-conf.yaml`. Review the API-gateway to understand the necessary flow from frontend to backend and vice versa via the API gateway. **Frontend developers must ensure the Authorization header with the bearer token is included in requests routed through the gateway.** The existing `/transcribe-file` utility endpoint currently bypasses auth in the gateway config - this should likely be reviewed for production use.

### Error Handling
The frontend is designed to handle HTTP status codes and error messages with proper user feedback. Backend endpoints should:
- Return appropriate HTTP status codes (200, 400, 401, 403, 404, 500)
- Include detailed error messages in response bodies
- Follow consistent error format across all endpoints

### Data Formats
- Audio is streamed in 1-second chunks using WebM format with Opus codec
- Timestamps are represented as floating-point seconds from the start of recording
- All text fields use UTF-8 encoding
- Classification markers follow the standard format

## Next Steps

1.  **Frontend Integration:** Connect UI to live backend **via API Gateway**, implement auth, replace simulations.
2.  **End-to-End Testing:** Conduct thorough testing of the integrated system.
3.  **Backend - Implement Other Output Formats:** Add logic to `/stop` to generate PDF/DOCX based on request. (Lower Priority)
4.  Refine WebSocket segment info (e.g., enhance confidence reporting). (Lower Priority)

## Technical Considerations

### Backend Performance
- Optimize for real-time audio processing
- Consider using worker processes for transcription
- Implement efficient storage for audio and transcription data
- Use caching for frequently accessed sessions
- Transcription/Diarization is CPU/GPU intensive; ensure adequate resources.
- Database interactions within WebSocket should be fast; optimize queries.
- Consider async task queues (e.g., Celery) for lengthy final processing in `/stop` if needed.
- Efficient storage and retrieval of audio/transcript artifacts.

### Security
- Implement proper authentication for all endpoints **via the API Gateway**.
- Secure WebSocket connections with appropriate protocols (WSS).
- Ensure proper handling of classified materials
- Implement secure storage of audio and transcription data
- Ensure database access is properly secured.
- Validate user permissions for accessing/modifying sessions.
- Sanitize inputs for markers, session names, etc.
- Secure artifact storage (e.g., access control on S3 or filesystem permissions).

### Military Environment Requirements
- Support for classification marking
- Compliance with data handling requirements
- Operation in limited connectivity environments
- Efficient bandwidth usage
- Database Choice: PostgreSQL implemented.
- Schema: Defined in `database.py` (`TranscriptionSession` model).
- Audio Stitching: Implemented in `/stop` using ffmpeg concat demuxer.
- Final Processing: Uses streamed segments combined with speaker tags applied during `/stop`.
- Artifact Storage: Implemented using local storage path defined in config (`ARTIFACT_STORAGE_BASE_PATH`). Requires appropriate volume mapping and permissions in Docker/deployment.
- Speaker Tag Application: Implemented during `/stop` processing before saving final transcript.

## Open Questions for Backend Implementation
- Which speech-to-text service will be used for transcription? -> **Resolved (WhisperX)**
- How will speaker identification be implemented? -> **Resolved (WhisperX Diarization + Manual Tags)**
- What database structure will store session data? -> **Resolved (PostgreSQL, see `database.py`)**
- How will audio files be stored and secured? -> **Resolved (Local path storage, security relies on filesystem/infra)**
- What are the performance requirements for real-time transcription? -> **Addressed (GPU usage, batching)**
- How will the system handle network interruptions during recording? -> **Addressed (Session status set to 'interrupted', WS disconnects handled, frontend needs reconnection logic)**
- How will session data (metadata, participants, markers, audio paths, transcription text) be stored and retrieved? -> **Resolved (PostgreSQL ORM)**
- How will audio chunks received via WebSocket be processed and stitched together for transcription/storage? -> **Resolved (Progressive chunk saving, ffmpeg concat in `/stop`)**
