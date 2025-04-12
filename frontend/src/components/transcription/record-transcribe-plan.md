# Record & Transcribe Live Feature Implementation Plan

## Implementation Progress
**Frontend Progress**: 70% Complete ✅  
**Backend Progress**: 0% Complete ⏳  
**Overall Progress**: 35% Complete 🚀

**Current Status**: Frontend UI implementation is complete with all core components, styling, and basic functionality in place. The application can record audio, visualize waveforms, and simulate transcription. Backend API implementation is needed for actual transcription functionality.

**Next Priorities**:
1. Backend API implementation for transcription service
2. WebSocket integration for real-time updates
3. Finalize military-specific output formats
4. Implement advanced wargame-specific features

## Overview
This plan outlines the development of a new "Record & Transcribe Live" feature within the Document Library component. The feature will allow users to record audio directly from their computer and receive real-time transcription in a dedicated browser window while preserving the MAGE application styling. This tool is specifically enhanced for wargaming scenarios, military exercises, and senior leader sessions.

## Frontend Implementation Checklist

### 1. DocumentLibrary Component Updates
- [x] Add "Record & Transcribe Live" button to the Audio Transcription section
- [x] Create handler function to open a new browser window with proper dimensions
- [x] Pass necessary theme/styling information to the new window

### 2. RecordTranscribe Component Development
- [x] Set up basic component structure with Material-UI components
- [x] Implement responsive layout with sections for:
  - [x] Header with title and close button
  - [x] Recording controls (start, pause, stop)
  - [x] Audio visualization (waveform display)
  - [x] File naming inputs (for both audio and PDF outputs)
  - [x] Live transcription preview panel
  - [x] Status indicators (recording status, transcription status)
- [x] Add confirmation dialog for window close during active recording

### 3. Audio Recording Implementation
- [x] Implement MediaRecorder API usage for browser audio capture
- [x] Create audio stream handling and processing
- [x] Add waveform visualization using a library like wavesurfer.js
- [x] Implement audio data chunks collection for backend processing
- [x] Add multi-channel recording support for different speakers
- [ ] Implement noise filtering and audio enhancement for wargaming environments

### 4. UI/UX Elements
- [x] Design recording controls with proper visual feedback
- [x] Create pulsing recording indicator
- [x] Implement timer display for recording duration
- [x] Add input fields for naming output files with validation
- [x] Design transcription preview area with auto-scrolling
- [x] Implement proper error states and user notifications
- [x] Create UI elements for wargame-specific timeline markers
- [x] Design speaker identification and timeline visualization
- [x] Add classification marking controls and indicators

### 5. Window Management
- [x] Set up beforeunload event handler for close warnings
- [x] Implement proper window state management to continue recording in background
- [ ] Add functionality to reconnect to existing recording session if window is reopened
- [ ] Create dual-window operation modes (side-by-side, picture-in-picture)
- [ ] Implement screen capture integration

### 6. Styling & Theme Integration
- [x] Import and apply MAGE application theme
- [x] Create consistent styling with the main application
- [x] Ensure proper dark mode compatibility
- [x] Use gradient borders and other styling patterns from the main application
- [x] Design color-coding system for speaker identification
- [x] Create visual styling for classification markers

### 7. Enhanced Metadata Capture
- [x] Design and implement structured event information fields:
  - [x] Wargame name and scenario input fields
  - [x] Phase and exercise classification level selectors
  - [x] Location, date/time, and organizational information inputs
  - [ ] Document linkage to existing wargame materials
- [x] Create metadata management interface
- [ ] Add validation rules for required military metadata
- [ ] Implement metadata export functionality

### 8. Participant Management
- [x] Develop participant configuration interface
  - [x] Speaker identification and role assignment before recording starts
  - [x] Military/civilian grade and organization fields for each participant
  - [ ] Profile picture upload or avatar selection
- [ ] Create participant template saving and loading functionality
- [x] Implement linkage between speakers and transcription segments
- [ ] Add voice signature capture and recognition system

### 9. Advanced UI Features
- [x] Multi-Speaker Visualization
  - [x] Implement color-coded transcription by speaker with profile pictures
  - [x] Create speaker timeline showing who spoke when and for how long
  - [ ] Add voice signature recognition to automatically identify speakers
- [x] Wargame-Specific Timeline Markers
  - [x] Design one-click buttons to mark key moments (decision points, insights, questions)
  - [x] Implement visual timeline with color-coded markers for different event types
  - [x] Add functionality to flag critical information during recording
- [ ] Dual-Window Operation Mode
  - [ ] Create option for side-by-side display with wargame materials
  - [ ] Implement picture-in-picture mode that stays visible during other activities
  - [ ] Add screen capture integration to record relevant visuals alongside audio

### 10. Military-Specific Transcription Features
- [x] Domain-Specific Language Support
  - [ ] Implement military terminology and acronym recognition with proper formatting
  - [ ] Create custom dictionary upload for scenario-specific terms
  - [ ] Add automatic linkage of mentioned capabilities/systems to reference information
- [x] Security Classification Handling
  - [x] Develop classification marker integration throughout transcript
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
8. ~~Create classification handling and marking system~~
9. Create military-standard output format templates
10. Prepare documentation for backend team with API requirements

## Open Questions
- What is the maximum recording duration that should be supported?
- Are there specific audio quality requirements (bitrate, channels, etc.)?
- Should users be able to save partial transcriptions before finalizing?
- What classification levels need to be supported?
- What military reporting formats should be prioritized?
- How will speaker voice signatures be stored securely?
- What level of offline functionality is required for disconnected operations?
- Are there specific military acronyms or terminology libraries that should be integrated?
