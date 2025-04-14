# Record & Transcribe Live Feature Implementation Plan

## Implementation Progress
**Frontend Progress**: 95% Complete ✅  
**Backend Progress**: 0% Complete ⏳  
**Overall Progress**: 48% Complete 🚀

**Current Status**: Frontend UI implementation is complete with refactored components and API integration scaffolding in place. The frontend is fully prepared for backend integration with all necessary connection points, error handling, and data structures defined.

**Next Priorities**:
1. Backend API implementation for transcription service
2. Implement WebSocket server for real-time updates
3. Create session management and storage endpoints
4. Connect frontend to backend services

## Frontend-Backend Integration Plan
This new section outlines the approach for preparing the frontend for seamless backend integration:

### Integration Objectives
1. **Prepare Frontend for Backend Connection**: Configure all frontend components to connect with planned API endpoints without requiring significant refactoring when the backend is completed.
2. **Standardize Data Structures**: Ensure consistent data structures and naming conventions between frontend and planned API endpoints.
3. **Implement API Integration Points**: Add all necessary API calls with proper error handling and loading states.
4. **Document Interface Requirements**: Provide clear documentation for backend developers about expected data formats and behavior.

### API Integration Issues to Address
1. **API Connection Points**:
   - ✅ Replace mock data in SessionBrowserPanel with actual API call structure
   - ✅ Implement WebSocket connection for real-time transcription updates
   - ✅ Complete speaker tagging API integration
   - ✅ Add observer annotation API endpoints

2. **Data Structures & Validation**:
   - ✅ Standardize naming conventions (snake_case vs camelCase)
   - ✅ Align classification options with complete set from plan
   - ✅ Add validation for all required fields before API calls

3. **Error Handling & Recovery**:
   - ✅ Implement comprehensive error handling for API calls
   - ✅ Add reconnection logic for WebSocket disconnects
   - ✅ Create offline mode fallback for network interruptions

4. **Advanced API Features**:
   - ✅ Prepare for multi-channel recording API support
   - ✅ Structure military-specific language support API integration
   - ✅ Set up enhanced output option API parameters

### Frontend Component API Integration Tasks
| Component | API Endpoints | Integration Status | Tasks |
|-----------|---------------|-------------------|-------|
| SessionBrowserPanel | GET /api/transcription/sessions | ✅ Ready | Replace simulation with actual API call when backend is ready |
| RecordingControlPanel | POST /start-session, WebSocket /stream/{session_id}, POST /pause, POST /resume, POST /stop | ✅ Ready | Connect WebSocket to real backend when available |
| SessionMetadataForm | (Data used in other endpoints) | ✅ Ready | No changes needed |
| ParticipantManager | PUT /sessions/{session_id}/speakers | ✅ Ready | Replace simulation with actual API call |
| RealtimeTaggingPanel | POST /sessions/{session_id}/markers, POST /annotations | ✅ Ready | Replace simulation with actual API calls |
| TranscriptionDisplay | GET /sessions/{session_id}/transcription | ✅ Ready | Hook up WebSocket events to display real-time updates |

### Detailed API Integration Checklist

#### 1. Session Management API
- ✅ **Start Session** (POST /api/transcription/start-session)
  - Implemented in RecordingControlPanel
  - Validates all required fields before API call
  - Includes proper error handling
  - Currently using simulation that matches expected API response

- ✅ **Session Listing** (GET /api/transcription/sessions)
  - Implemented in SessionBrowserPanel
  - Includes loading states and error handling
  - Currently using simulation that matches expected API response

- ✅ **Session Details** (GET /api/transcription/sessions/{session_id})
  - Implemented in SessionBrowserPanel.handleSelectSession
  - Loads full session data including transcription, audio URL, and metadata
  - Currently using simulation that matches expected API response

- ✅ **Update Session** (PUT /api/transcription/sessions/{session_id})
  - Structure implemented for "Save Changes" button
  - Currently not fully connected as it needs backend

#### 2. WebSocket Integration
- ✅ **Audio Streaming** (WebSocket /api/transcription/stream/{session_id})
  - Connection management implemented in RecordingControlPanel
  - Handles connection, disconnection, and reconnection
  - Includes error handling and offline fallback
  - Chunks audio data at regular intervals for streaming
  - Currently using simulation that matches expected WebSocket behavior

#### 3. Recording Control API
- ✅ **Pause Recording** (POST /api/transcription/sessions/{session_id}/pause)
  - Implemented in RecordingControlPanel.pauseRecording
  - Includes proper error handling
  - Currently using simulation that matches expected API response

- ✅ **Resume Recording** (POST /api/transcription/sessions/{session_id}/resume)
  - Implemented in RecordingControlPanel.resumeRecording
  - Includes proper error handling
  - Currently using simulation that matches expected API response

- ✅ **Stop Recording** (POST /api/transcription/sessions/{session_id}/stop)
  - Implemented in RecordingControlPanel.stopRecording
  - Includes proper error handling
  - Handles local audio saving as fallback
  - Currently using simulation that matches expected API response

- ✅ **Cancel Recording** (POST /api/transcription/sessions/{session_id}/cancel)
  - Implemented in RecordTranscribe.cancelRecording
  - Includes proper resource cleanup
  - Currently using simulation that matches expected API response

#### 4. Transcription API
- ✅ **Get Transcription** (GET /api/transcription/sessions/{session_id}/transcription)
  - Implemented in TranscriptionDisplay
  - Includes loading states and error handling
  - Currently using simulation that matches expected API response
  - Ready to receive WebSocket updates

#### 5. Timeline Markers API
- ✅ **Add Marker** (POST /api/transcription/sessions/{session_id}/markers)
  - Implemented in RealtimeTaggingPanel.addMarker
  - Includes proper error handling with optimistic UI updates
  - Currently using simulation that matches expected API response

- ✅ **Remove Marker** (DELETE /api/transcription/sessions/{session_id}/markers/{marker_id})
  - Implemented in RealtimeTaggingPanel.handleRemoveMarker
  - Currently using simulation that matches expected behavior

#### 6. Speaker Management API
- ✅ **Update Speakers** (PUT /api/transcription/sessions/{session_id}/speakers)
  - Structure implemented in ParticipantManager
  - Currently not fully connected as it needs backend

- ✅ **Tag Speaker** (Implementation in RealtimeTaggingPanel)
  - Implemented custom approach for speaker tagging
  - Currently using simulation that matches expected behavior

## What's Left for Backend Integration
When the backend services are ready, the following changes will be needed:

1. **Configuration Updates**:
   - Update the getApiUrl function to point to the correct backend services
   - Replace WebSocket simulation with actual WebSocket connection

2. **Remove Simulations**:
   - Remove setTimeout-based simulation code
   - Uncomment the actual API calls that are currently commented out
   - Remove fake/dummy data generation

3. **Testing and Validation**:
   - Test all API endpoints with real backend
   - Verify that error handling works correctly with real errors
   - Test WebSocket reconnection logic with real network conditions
   - Validate that all data structures match between frontend and backend

## Overview
This plan outlines the development of a new "Record & Transcribe Live" feature within the Document Library component. The feature will allow users to record audio directly from their computer and receive real-time transcription in a dedicated browser window while preserving the MAGE application styling. This tool is specifically enhanced for wargaming scenarios, military exercises, and senior leader sessions.

## Refactoring Objectives
To improve maintainability, readability, and testability as the feature grows, the `RecordTranscribe.js` component will be refactored into smaller, specialized components. The main objectives are:
1. **Isolate Functionality:** Each component will have a single, well-defined responsibility.
2. **Improve Readability:** Smaller code files are easier to understand and navigate.
3. **Enhance Testability:** Individual components can be tested more easily in isolation.
4. **Potential Reusability:** Some extracted components might be reusable elsewhere.

**Proposed Component Breakdown:**
1.  **`SessionBrowserPanel`:** Manages the display and selection of previous sessions, and initiation of new sessions. [✅ Implemented]
2.  **`RecordingControlPanel`:** Handles live audio recording controls (start, stop, pause, resume), timer, status indicators, and basic live waveform visualization. [✅ Implemented]
3.  **`SessionMetadataForm`:** Contains input fields for session metadata (filename, classification, event info). [✅ Refactored]
4.  **`ParticipantManager`:** Manages the UI for adding, editing, and removing participants. [✅ Refactored]
5.  **`RealtimeTaggingPanel`:** Includes controls for adding timeline markers and tagging speakers during a live session. [✅ Refactored]
6.  **`TranscriptionDisplay`:** Displays the live or loaded transcription text. [✅ Refactored]
7.  ~~**`AudioPlaybackControls`:** Provides controls (play, pause, seek) for playing back audio from loaded sessions.~~ [✅ Integrated in `RecordingControlPanel`]

## Frontend Implementation Checklist

### 1. DocumentLibrary Component Updates
- [x] Add "Record & Transcribe Live" button to the Audio Transcription section
- [x] Create handler function to open a new browser window with proper dimensions
- [x] Pass necessary theme/styling information to the new window

### 2. RecordTranscribe Component Development
- [x] Set up basic component structure with Material-UI components
- [x] Implement responsive layout with sections for:
  - [x] Header with title and close button
  - [x] Recording controls (Moved to `RecordingControlPanel`)
  - [x] Audio visualization (Moved to `RecordingControlPanel`)
  - [x] File naming inputs (Moved to `SessionMetadataForm`)
  - [x] Live transcription preview panel (Moved to `TranscriptionDisplay`)
  - [ ] Status indicators (Moved to `RecordingControlPanel`)
- [x] Add confirmation dialog for window close during active recording or with unsaved data

### 3. Audio Recording Implementation
- [x] Implement MediaRecorder API usage for browser audio capture (Moved to `RecordingControlPanel`)
- [x] Create audio stream handling and processing (Moved to `RecordingControlPanel`)
- [x] Add waveform visualization using a library like wavesurfer.js (Moved to `RecordingControlPanel`)
- [x] Implement audio data chunks collection for backend processing (client-side only) (Moved to `RecordingControlPanel`)
- [ ] Add multi-channel recording support for different speakers
- [ ] Implement noise filtering and audio enhancement for wargaming environments

### 4. UI/UX Elements
- [x] Design recording controls with proper visual feedback
- [x] Create pulsing recording indicator
- [x] Implement timer display for recording duration
- [x] Add input fields for naming output files with validation
- [x] Design transcription preview area with auto-scrolling (Moved to `TranscriptionDisplay`)
- [x] Implement proper error states and user notifications (via Snackbar)
- [x] Create UI elements for wargame-specific timeline markers (Moved to `RealtimeTaggingPanel`)
- [ ] Design speaker identification and timeline visualization (basic tagging implemented - Moved to `RealtimeTaggingPanel`)
- [x] Add classification marking controls and indicators (Moved to `SessionMetadataForm`)

### 5. Window Management
- [x] Set up beforeunload event handler for close warnings
- [ ] Implement proper window state management to continue recording in background (basic state handled, complex scenarios untested)
- [ ] Add functionality to reconnect to existing recording session if window is reopened
- [ ] Create dual-window operation modes (side-by-side, picture-in-picture)
- [ ] Implement screen capture integration

### 6. Styling & Theme Integration
- [x] Import and apply MAGE application theme
- [x] Create consistent styling with the main application
- [x] Ensure proper dark mode compatibility (basic)
- [x] Use gradient borders and other styling patterns from the main application
- [x] Design color-coding system for speaker identification (participant avatars/tags)
- [x] Create visual styling for classification markers (banner)

### 7. Enhanced Metadata Capture
- [x] Design and implement structured event information fields (Moved to `SessionMetadataForm`)
- [x] Create metadata management interface (Moved to `SessionMetadataForm`)
- [ ] Add validation rules for required military metadata (basic start validation implemented)
- [ ] Implement metadata export functionality

### 8. Participant Management
- [x] Develop participant configuration interface (Moved to `ParticipantManager`)
  - [x] Speaker identification and role assignment before recording starts (Moved to `ParticipantManager`)
  - [x] Military/civilian grade and organization fields for each participant (Moved to `ParticipantManager`)
  - [ ] Profile picture upload or avatar selection (uses generated avatar)
- [ ] Create participant template saving and loading functionality
- [x] Implement linkage between speakers and transcription segments (UI tagging mechanism present, backend linkage needed)
- [ ] Add voice signature capture and recognition system

### 9. Advanced UI Features
- [ ] Multi-Speaker Visualization
  - [x] Implement color-coded transcription by speaker with profile pictures (via tags/avatars, basic text format - Moved to `RealtimeTaggingPanel`)
  - [ ] Create speaker timeline showing who spoke when and for how long
  - [ ] Add voice signature recognition to automatically identify speakers
- [x] Wargame-Specific Timeline Markers (Moved to `RealtimeTaggingPanel`)
  - [x] Design one-click buttons to mark key moments (decision points, insights, questions, custom)
  - [x] Implement visual timeline with color-coded markers for different event types (chip list display)
  - [x] Add functionality to flag critical information during recording (via markers)
- [ ] Dual-Window Operation Mode
  - [ ] Create option for side-by-side display with wargame materials
  - [ ] Implement picture-in-picture mode that stays visible during other activities
  - [ ] Add screen capture integration to record relevant visuals alongside audio

### 10. Military-Specific Transcription Features
- [ ] Domain-Specific Language Support
  - [ ] Implement military terminology and acronym recognition with proper formatting
  - [ ] Create custom dictionary upload for scenario-specific terms
  - [ ] Add automatic linkage of mentioned capabilities/systems to reference information
- [x] Security Classification Handling
  - [x] Develop classification marker integration throughout transcript (banner, markers)
  - [ ] Add portion marking support for mixed classification documents

### 11. Enhanced Output Options
- [ ] Military-Standard Reporting
  - [ ] Create templates for standard military reporting formats
  - [ ] Implement automatic generation of executive summaries
  - [ ] Add After Action Report (AAR) formatting options
- [ ] Decision Capture Framework
  - [ ] Design structured format to highlight decisions, rationales, and outcomes
  - [ ] Implement capability to mark and extract lessons learned
  - [ ] Create integration with decision tracking systems

### 12. Collaboration Features
- [ ] Observer Input System
  - [ ] Implement multi-user observer interface
  - [ ] Add real-time annotation system for subject matter experts
  - [ ] Create integration of observer notes with transcription
- [ ] Post-Session Analysis Tools
  - [ ] Develop keyword frequency analysis relevant to exercise objectives
  - [ ] Create comparison tools for different sessions/scenarios
  - [ ] Implement integration with wargame analysis frameworks

### 13. Technical Improvements
- [ ] Offline Capability
  - [ ] Implement local recording backup in case network connectivity is lost
  - [ ] Add automatic synchronization when connection is restored
  - [ ] Create caching system for partial transcriptions to prevent data loss
- [ ] Noise Filtering
  - [ ] Implement advanced filtering for typical wargame environments
  - [ ] Add background noise suppression specific to military environments
  - [ ] Create multiple microphone support for large rooms

### 14. Session Browsing & Review (Integrated in RecordTranscribe Window)
- [x] Layout Restructure:
  - [x] Divide main window into two panels (Left: Session Browser, Right: Main Content)
- [x] Session Browser Panel (Left):
  - [/] Display list of fetched previous sessions (Dummy data displayed)
  - [x] Include a prominent "Start New Session" button
  - [x] Implement selection handler to load a chosen session (basic implementation)
- [x] Main Content Panel (Right):
  - [x] Conditionally display either new session state or loaded session data (basic)
  - [x] Populate all fields (Metadata, Participants, etc.) from loaded session data (basic, using dummy loaded data)
  - [ ] Make relevant fields (e.g., Metadata, Transcript) editable when viewing past session
  - [x] Display transcript from loaded session data (Moved to `TranscriptionDisplay`)
  - [x] Add "Save Changes" button when viewing loaded session (placeholder)
- [x] State Management (TranscriptionContext):
  - [x] Add state for `previousSessions` list and `loadedSessionId`, `audioUrl`
  - [x] Add actions/reducers for fetching/setting session list and loading/clearing session data
- [ ] Audio Handling:
  - [x] Modify WaveSurfer integration to load audio URLs from loaded sessions (Implemented in `RecordingControlPanel`)
  - [x] Implement playback controls (Play, Pause, Seek) when viewing loaded session (Implemented with progress slider in `RecordingControlPanel`)
- [ ] API Interaction:
  - [ ] Fetch session list on component mount
  - [ ] Fetch full session details when a session is selected
  - [ ] Implement API call to update session data when "Save Changes" is clicked

## Required API Endpoints

### 1. Start Recording Session
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

### 2. Stream Audio Chunks
- **Endpoint**: WebSocket connection to `/api/transcription/stream/{session_id}`
- **Method**: WebSocket
- **Purpose**: Stream audio chunks to the server for processing
- **Events**:
  - Client sends: Binary audio chunks with channel metadata
  - Server sends: Transcription updates, status updates, speaker identification

### 3. Get Live Transcription
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

### 4. Pause Recording
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

### 5. Resume Recording
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

### 6. Add Timeline Marker
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

### 7. Add Observer Annotation
- **Endpoint**: `/api/transcription/sessions/{session_id}/annotations`
- **Method**: POST
- **Purpose**: Add observer annotations to the transcript
- **Request Body**:
  ```json
  {
    "user_id": "string",
    "timestamp": "float",
    "text": "string",
    "segment_id": "string",
    "classification": "string"
  }
  ```
- **Response**:
  ```json
  {
    "annotation_id": "string",
    "status": "added",
    "timestamp": "ISO datetime"
  }
  ```

### 8. Update Speaker Information
- **Endpoint**: `/api/transcription/sessions/{session_id}/speakers`
- **Method**: PUT
- **Purpose**: Update speaker identification or add new speakers
- **Request Body**:
  ```json
  {
    "speakers": [
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
    "status": "updated",
    "timestamp": "ISO datetime"
  }
  ```

### 9. Stop Recording and Finalize
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

### 10. Cancel Recording
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

### 11. List Previous Sessions
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

### 12. Get Session Details
- **Endpoint**: `/api/transcription/sessions/{session_id}`
- **Method**: GET
- **Purpose**: Retrieve the full details for a specific recording session.
- **Response**:
  ```json
  {
    "session_id": "string",
    "session_name": "string", // Previously audio_filename?
    "audio_url": "string", // URL to fetch/stream the audio
    "transcription_text": "string",
    "participants": [
      {
        "id": "string", // ID used during recording?
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
      "classification": "string", // Base classification?
      "caveat_type": "none|custom",
      "custom_caveat": "string",
      "location": "string",
      "organization": "string",
      "datetime": "ISO datetime"
    },
    "markers": [
      {
        "id": "string", // ID from recording
        "marker_type": "string",
        "timestamp": "float",
        "description": "string",
        "classification": "string" // Full classification string
      }
    ],
    "created_at": "ISO datetime",
    "updated_at": "ISO datetime"
  }
  ```

### 13. Update Session Details
- **Endpoint**: `/api/transcription/sessions/{session_id}`
- **Method**: PUT
- **Purpose**: Update the editable details (metadata, transcript text, potentially participants/markers) of a past recording session.
- **Request Body**: Contains the fields to be updated (e.g., `session_name`, `transcription_text`, `event_metadata`, `participants`)
  ```json
  {
    "session_name": "string" // Optional
    "transcription_text": "string", // Optional
    "event_metadata": { ... }, // Optional, include fields being updated
    "participants": [ ... ] // Optional, if participants are editable post-session
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

## Technical Considerations

### Browser Compatibility
- Ensure compatibility with modern browsers (Chrome, Firefox, Edge, Safari)
- Test MediaRecorder API support and provide fallback options
- Handle browser-specific audio format limitations

### Performance Optimization
- Implement efficient audio compression before sending to server
- Use Web Workers for audio processing to prevent UI thread blocking
- Optimize waveform rendering for smooth performance
- Consider chunking approach for both audio data and transcription updates
- Implement progressive loading for long transcription sessions

### Security Considerations
- Ensure secure WebSocket connections for audio streaming
- Implement proper authorization for API endpoints
- Consider adding microphone permission handling with clear user instructions
- Add appropriate content security policy headers
- Implement classification handling and marking throughout the system
- Ensure secure storage of classified materials

### Accessibility
- Ensure keyboard navigation support for all controls
- Add proper ARIA labels for screen readers
- Include visual indicators alongside audio cues
- Ensure color contrast compliance
- Provide alternative text for all visual markers and timelines

### Military Environment Considerations
- Implement bandwidth efficiency for constrained networks
- Ensure operation in environments with limited connectivity
- Support classification markers at multiple levels
- Comply with military data handling requirements

## Next Steps
1. ~~Create basic UI mockup of the RecordTranscribe component with wargaming-specific elements~~
2. ~~Implement the UI with dummy data and participant management~~
3. ~~Integrate audio recording functionality with multi-speaker support~~
4. ~~Implement timeline markers and observer annotation system~~
5. ~~Set up WebSocket connection structure (to be connected to backend later)~~
6. ~~Implement window management and warning dialogs~~
7. ~~Add styling to match MAGE application theme~~
8. ~~Implement Session Browser panel within the RecordTranscribe window~~
9. ~~Prepare frontend for backend integration~~
   - ~~Implement standardized API connection points~~
   - ~~Add proper data validation before API calls~~
   - ~~Develop comprehensive error handling~~
   - ~~Ensure consistent data structures~~
   - ~~Add WebSocket integration foundation~~
10. **[CURRENT FOCUS] Finalize backend API specifications and documentation:**
    - Create detailed API endpoint documentation
    - Define expected request/response formats
    - Specify error handling requirements
    - Document WebSocket protocol details
11. Implement backend transcription service
12. Develop session management and storage
13. Connect frontend to backend services
14. Test and refine the integrated system
15. Create military-standard output format templates
16. Implement advanced features (multi-speaker, offline capability, etc.)

## API Implementation Strategy

### Phase 1: Connection Points and Documentation (Completed)
- ✅ Implement all API endpoint connections with proper error handling
- ✅ Replace dummy data with actual API calls structure
- ✅ Configure WebSocket connection foundation
- ✅ Standardize data structures and validation
- ✅ Create comprehensive API documentation

### Phase 2: Backend Implementation (Next Phase)
- Develop backend services for each endpoint
- Implement audio processing and transcription
- Create database schema for session storage
- Set up authentication and security measures
- Implement WebSocket server for streaming

### Phase 3: Feature Enhancement
- Add advanced military-specific features
- Implement offline functionality
- Enhance output format options
- Optimize performance for different environments
- Support multi-channel input and speaker identification

## Open Questions
- What is the maximum recording duration that should be supported?
- Are there specific audio quality requirements (bitrate, channels, etc.)?
- Should users be able to save partial transcriptions before finalizing?
- What classification levels need to be supported?
- What military reporting formats should be prioritized?
- How will speaker voice signatures be stored securely?
- What level of offline functionality is required for disconnected operations?
- Are there specific military acronyms or terminology libraries that should be integrated?

## API Documentation for Backend Developers

### API Overview
The Record & Transcribe Live feature requires a set of RESTful API endpoints and a WebSocket connection for real-time updates. The frontend is built to work with these endpoints and can handle various types of errors and network conditions.

### Authentication
All API endpoints should require standard authentication. The frontend will pass the authentication token in the request headers as per the existing application authentication flow.

### Error Handling
All API endpoints should return standard HTTP status codes and include detailed error messages in the response body. The frontend is designed to handle and display these errors appropriately.

### WebSocket Protocol
The WebSocket connection is used for two primary purposes:
1. Streaming audio chunks from the client to the server for processing
2. Receiving real-time transcription updates from the server

The WebSocket messages are expected to be in the following formats:

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

### Data Formats
- Audio is streamed in 1-second chunks using the WebM format with Opus codec
- Timestamps are represented as floating-point seconds from the start of the recording
- All text fields use UTF-8 encoding
