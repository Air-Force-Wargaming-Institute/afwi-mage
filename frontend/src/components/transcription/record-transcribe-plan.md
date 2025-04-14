# Record & Transcribe Live Feature Implementation Plan

## Implementation Progress
**Frontend Progress**: 100% Complete ✅  
**Backend Progress**: 0% Complete ⏳  
**Overall Progress**: 50% Complete 🚀

**Current Status**: Frontend UI implementation and API integration scaffolding are complete. The frontend is fully prepared for backend integration with all necessary connection points, error handling, data structures, and WebSocket implementation defined. Backend development is now the critical path.

**Next Priorities**:
1. Develop backend transcription service
2. Implement WebSocket server for real-time updates
3. Create session management and storage endpoints
4. Connect frontend to backend services using established API patterns

## Frontend-Backend Integration Guide

This guide outlines what's been prepared on the frontend and what backend developers need to implement.

### API Integration Status

All frontend components have been prepared for backend integration:

1. **API Connection Points**: ✅ Complete
   - All necessary API endpoints are scaffolded
   - WebSocket connection infrastructure is in place
   - Error handling is implemented across all components

2. **Data Structures**: ✅ Complete  
   - All expected request and response formats are defined
   - Data validation is implemented for API calls
   - Consistent naming conventions are used

3. **Error Handling & Recovery**: ✅ Complete
   - Comprehensive error handling for all API interactions
   - Reconnection logic for WebSocket disconnects
   - Offline mode fallbacks implemented

4. **User Experience**: ✅ Complete
   - Loading states for all asynchronous operations
   - Appropriate feedback for user actions
   - Clear error messaging

### Backend Implementation Requirements

The backend needs to implement these endpoints to connect with the frontend:

#### Core API Endpoints

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/transcription/start-session` | POST | ⏳ Needed | Initialize a recording session |
| `/api/transcription/stream/{session_id}` | WebSocket | ⏳ Needed | Audio streaming and real-time transcription |
| `/api/transcription/sessions/{session_id}/pause` | POST | ⏳ Needed | Pause recording |
| `/api/transcription/sessions/{session_id}/resume` | POST | ⏳ Needed | Resume recording |
| `/api/transcription/sessions/{session_id}/stop` | POST | ⏳ Needed | Stop and finalize recording |
| `/api/transcription/sessions/{session_id}/cancel` | POST | ⏳ Needed | Cancel recording session |
| `/api/transcription/sessions` | GET | ⏳ Needed | List previous sessions |
| `/api/transcription/sessions/{session_id}` | GET | ⏳ Needed | Get session details |
| `/api/transcription/sessions/{session_id}/transcription` | GET | ⏳ Needed | Get transcription text |
| `/api/transcription/sessions/{session_id}/markers` | POST | ⏳ Needed | Add timeline marker |
| `/api/transcription/sessions/{session_id}/speakers` | PUT | ⏳ Needed | Update speaker information |
| `/api/transcription/sessions/{session_id}` | PUT | ⏳ Needed | Update session details |

#### Integration Steps for Backend Developers

1. **WebSocket Implementation**:
   - Create WebSocket server at `/api/transcription/stream/{session_id}`
   - Implement binary audio reception
   - Send transcription updates in the format defined in the API Documentation section

2. **Session Management**:
   - Implement session creation, storage, and retrieval
   - Support pausing, resuming, and stopping sessions
   - Include metadata management

3. **Transcription Engine**:
   - Implement speech-to-text processing
   - Support speaker identification (if possible)
   - Handle classification markers

4. **Testing with Frontend**:
   - Once endpoints are implemented, update the frontend `getApiUrl` function
   - Uncomment the actual API calls (currently commented out in the frontend code)
   - Remove simulation code

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
The Record & Transcribe Live feature requires a set of RESTful API endpoints and a WebSocket connection for real-time updates. The frontend is built to work with these endpoints and can handle various types of errors and network conditions.

### Required API Endpoints

#### 1. Start Recording Session
- **Endpoint**: `/api/transcription/start-session`
- **Method**: POST
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
- **Purpose**: Stream audio chunks to the server for processing
- **Events**:
  - Client sends: Binary audio chunks with channel metadata
  - Server sends: Transcription updates, status updates, speaker identification

#### 3. Get Live Transcription
- **Endpoint**: `/api/transcription/sessions/{session_id}/transcription`
- **Method**: GET
- **Purpose**: Get the current transcription state
- **Response**: 
  ```json
  {
    "session_id": "string",
    "transcription": [
      {
        "segment_id": "string",
        "speaker_id": "string",
        "text": "string",
        "start_time": "float",
        "end_time": "float",
        "confidence": "float",
        "classification": "string",
        "markers": ["decision", "insight", "question"]
      }
    ],
    "is_final": false,
    "last_update": "ISO datetime"
  }
  ```

#### 4. Pause Recording
- **Endpoint**: `/api/transcription/sessions/{session_id}/pause`
- **Method**: POST
- **Purpose**: Pause the current recording session
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
- **Purpose**: Resume a paused recording session
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
- **Purpose**: Add a marker to the timeline
- **Request Body**:
  ```json
  {
    "marker_type": "decision|insight|question|action_item",
    "timestamp": "float",
    "description": "string",
    "classification": "string",
    "user_id": "string"
  }
  ```
- **Response**:
  ```json
  {
    "marker_id": "string",
    "status": "added",
    "timestamp": "ISO datetime"
  }
  ```

#### 7. Stop Recording and Finalize
- **Endpoint**: `/api/transcription/sessions/{session_id}/stop`
- **Method**: POST
- **Purpose**: Stop recording and finalize the transcription
- **Request Body**: 
  ```json
  {
    "audio_filename": "string",
    "transcription_filename": "string",
    "include_timestamps": boolean,
    "include_speakers": boolean,
    "classification": "string",
    "output_formats": ["pdf", "docx", "txt", "aar", "executive_summary"],
    "additional_processing": {
      "speaker_diarization": boolean,
      "highlight_low_confidence": boolean,
      "include_markers": boolean,
      "include_annotations": boolean
    }
  }
  ```
- **Response**: 
  ```json
  {
    "session_id": "string",
    "status": "completed",
    "audio_file": {
      "filename": "string",
      "path": "string",
      "duration_seconds": number,
      "size_bytes": number
    },
    "output_files": [
      {
        "type": "transcript|aar|summary",
        "format": "pdf|docx|txt",
        "filename": "string",
        "path": "string",
        "word_count": number,
        "size_bytes": number
      }
    ],
    "completion_timestamp": "ISO datetime"
  }
  ```

#### 8. Cancel Recording
- **Endpoint**: `/api/transcription/sessions/{session_id}/cancel`
- **Method**: POST
- **Purpose**: Cancel the recording and discard all data
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
- **Purpose**: Retrieve a list of past recording sessions for the current user.
- **Response**:
  ```json
  {
    "sessions": [
      {
        "session_id": "string",
        "session_name": "string",
        "created_at": "ISO datetime",
        "classification": "string"
      }
      // ... more sessions
    ]
  }
  ```

#### 10. Get Session Details
- **Endpoint**: `/api/transcription/sessions/{session_id}`
- **Method**: GET
- **Purpose**: Retrieve the full details for a specific recording session.
- **Response**:
  ```json
  {
    "session_id": "string",
    "session_name": "string",
    "audio_url": "string", // URL to fetch/stream the audio
    "transcription_text": "string",
    "participants": [
      {
        "id": "string",
        "name": "string",
        "role": "string",
        "rank": "string",
        "organization": "string",
        "profile_image": "base64 string|url"
      }
    ],
    "event_metadata": {
      "wargame_name": "string",
      "scenario": "string",
      "phase": "string",
      "classification": "string",
      "caveat_type": "none|custom",
      "custom_caveat": "string",
      "location": "string",
      "organization": "string",
      "datetime": "ISO datetime"
    },
    "markers": [
      {
        "id": "string",
        "marker_type": "string",
        "timestamp": "float",
        "description": "string",
        "classification": "string" 
      }
    ],
    "created_at": "ISO datetime",
    "updated_at": "ISO datetime"
  }
  ```

#### 11. Update Session Details
- **Endpoint**: `/api/transcription/sessions/{session_id}`
- **Method**: PUT
- **Purpose**: Update the editable details of a past recording session.
- **Request Body**: Contains the fields to be updated
  ```json
  {
    "session_name": "string", // Optional
    "transcription_text": "string", // Optional
    "event_metadata": { ... }, // Optional
    "participants": [ ... ] // Optional
  }
  ```
- **Response**:
  ```json
  {
    "session_id": "string",
    "status": "updated",
    "updated_at": "ISO datetime"
  }
  ```

### WebSocket Protocol
The WebSocket connection is used for two primary purposes:
1. Streaming audio chunks from the client to the server for processing
2. Receiving real-time transcription updates from the server

The WebSocket messages are expected in these formats:

**Client to Server (Audio Chunks)**:
- Binary data representing an audio chunk (WebM format)

**Server to Client (Transcription Updates)**:
```json
{
  "type": "transcription_update",
  "text": "Full transcription text with previous and new content",
  "segments": [
    {
      "segment_id": "string",
      "speaker_id": "string",
      "text": "string",
      "start_time": float,
      "end_time": float,
      "confidence": float
    }
  ],
  "status": "in_progress"
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
{
  "type": "speaker_identification",
  "speaker_id": "string",
  "timestamp": float,
  "confidence": float
}
```

### Authentication
All API endpoints should require standard authentication. The frontend will pass authentication tokens in request headers as per the existing application authentication flow.

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

1. **Backend Development (Current Priority)**:
   - Develop the transcription service API
   - Implement WebSocket server for audio streaming
   - Create session storage and management
   - Integrate with speech-to-text services

2. **Integration Phase**:
   - Connect frontend to backend APIs
   - Uncomment actual API calls in frontend code
   - Remove simulation/placeholder code
   - Test full system integration

3. **Enhanced Features (After Integration)**:
   - Multi-channel recording support
   - Speaker identification
   - Military-specific output formats
   - Offline capability
   - Advanced noise filtering

## Technical Considerations

### Backend Performance
- Optimize for real-time audio processing
- Consider using worker processes for transcription
- Implement efficient storage for audio and transcription data
- Use caching for frequently accessed sessions

### Security
- Implement proper authentication for all endpoints
- Secure WebSocket connections with appropriate protocols
- Ensure proper handling of classified materials
- Implement secure storage of audio and transcription data

### Military Environment Requirements
- Support for classification marking
- Compliance with data handling requirements
- Operation in limited connectivity environments
- Efficient bandwidth usage

## Open Questions for Backend Implementation
- Which speech-to-text service will be used for transcription?
- How will speaker identification be implemented?
- What database structure will store session data?
- How will audio files be stored and secured?
- What are the performance requirements for real-time transcription?
- How will the system handle network interruptions during recording?
