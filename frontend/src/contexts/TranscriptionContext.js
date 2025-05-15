import React, { createContext, useContext, useReducer } from 'react';

// Define action types
export const ACTIONS = {
  SET_SESSION_ID: 'SET_SESSION_ID',
  SET_RECORDING_STATE: 'SET_RECORDING_STATE',
  SET_RECORDING_TIME: 'SET_RECORDING_TIME',
  SET_TRANSCRIPTION_TEXT: 'SET_TRANSCRIPTION_TEXT',
  SET_AUDIO_FILENAME: 'SET_AUDIO_FILENAME',
  SET_ERROR: 'SET_ERROR',
  SET_PARTICIPANTS: 'SET_PARTICIPANTS',
  SET_CLASSIFICATION: 'SET_CLASSIFICATION',
  SET_CAVEAT_TYPE: 'SET_CAVEAT_TYPE',
  SET_CUSTOM_CAVEAT: 'SET_CUSTOM_CAVEAT',
  SET_EVENT_METADATA: 'SET_EVENT_METADATA',
  SET_MARKERS: 'SET_MARKERS',
  ADD_MARKER: 'ADD_MARKER',
  REMOVE_MARKER: 'REMOVE_MARKER',
  ADD_CUSTOM_MARKER_TYPE: 'ADD_CUSTOM_MARKER_TYPE',
  RESET_STATE: 'RESET_STATE',
  APPEND_TRANSCRIPTION_SEGMENTS: 'APPEND_TRANSCRIPTION_SEGMENTS',
  // New actions for session browsing
  SET_PREVIOUS_SESSIONS: 'SET_PREVIOUS_SESSIONS',
  SET_LOADED_SESSION_ID: 'SET_LOADED_SESSION_ID',
  LOAD_SESSION_DATA: 'LOAD_SESSION_DATA', // Action to load all data for a selected session
  START_NEW_SESSION: 'START_NEW_SESSION', // Action to clear loaded session and reset relevant fields
  // Actions for tracking changes
  SET_IS_DIRTY: 'SET_IS_DIRTY',
  MARK_SESSION_SAVED: 'MARK_SESSION_SAVED', // Resets dirty flag and updates initial data
  DELETE_SESSION_SUCCESS: 'DELETE_SESSION_SUCCESS',
  SET_WEBSOCKET_SENDER: 'SET_WEBSOCKET_SENDER',
  SET_PLAYBACK_TIME: 'SET_PLAYBACK_TIME',
};

// Define recorder states
export const RECORDING_STATES = {
  INACTIVE: 'inactive',
  RECORDING: 'recording',
  PAUSED: 'paused',
  STOPPED: 'stopped'
};

// Default marker types
const defaultMarkerTypes = [
  { id: 'marker-decision', label: 'Decision Point', type: 'decision', color: 'primary' },
  { id: 'marker-insight', label: 'Insight', type: 'insight', color: 'primary' },
  { id: 'marker-question', label: 'Question', type: 'question', color: 'primary' },
  { id: 'marker-action', label: 'Action Item', type: 'action_item', color: 'primary' },
  { id: 'marker-risk', label: 'Key Risk', type: 'key_risk', color: 'secondary' },
];

// Function to generate a unique ID (simple version)
const generateId = () => `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

// Function to generate kebab-case type from label
const generateTypeFromLabel = (label) => label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Initial state for the context
const initialState = {
  sessionId: null,
  recordingState: RECORDING_STATES.INACTIVE,
  recordingTime: 0,
  transcriptionText: '',
  audioFilename: '',
  error: null,
  participants: [],
  classification: 'SELECT A SECURITY CLASSIFICATION',
  caveatType: null,
  customCaveat: '',
  eventMetadata: {
    wargame_name: '',
    scenario: '',
    phase: '',
    location: '',
    organization: ''
  },
  markers: [],
  availableMarkerTypes: [...defaultMarkerTypes],
  // New state for session browsing
  previousSessions: [], // Will hold list like [{ id: '...', name: '...', date: '...' }, ...]
  loadedSessionId: null, // ID of the session currently loaded in the right panel
  audioUrl: null, // URL for playback when a session is loaded
  // State for tracking unsaved changes in loaded sessions
  initialLoadedData: null, // Stores the state when LOAD_SESSION_DATA was dispatched
  isDirty: false, // Flag to indicate if changes have been made since load/save
  sendWebSocketMessage: null,
  playbackTime: 0, // For tracking playback progress
};

// Reducer function to handle state updates
const transcriptionReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_SESSION_ID:
      return { ...state, sessionId: action.payload };
    case ACTIONS.SET_RECORDING_STATE:
      return { ...state, recordingState: action.payload };
    case ACTIONS.SET_RECORDING_TIME:
      return { ...state, recordingTime: action.payload };
    case ACTIONS.SET_TRANSCRIPTION_TEXT:
      let isNowDirty = state.isDirty;
      if (state.loadedSessionId && state.initialLoadedData) {
        isNowDirty = action.payload !== (state.initialLoadedData.transcriptionText || '');
      }
      return {
        ...state,
        transcriptionText: action.payload,
        isDirty: state.loadedSessionId ? isNowDirty : false,
      };
    case ACTIONS.SET_AUDIO_FILENAME:
      return { ...state, audioFilename: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_PARTICIPANTS:
      return { ...state, participants: action.payload };
    case ACTIONS.SET_CLASSIFICATION:
      return {
        ...state,
        classification: action.payload,
        caveatType: action.payload === 'SELECT A SECURITY CLASSIFICATION' ? null : state.caveatType,
        customCaveat: action.payload === 'SELECT A SECURITY CLASSIFICATION' ? '' : state.customCaveat
      };
    case ACTIONS.SET_CAVEAT_TYPE:
      return {
        ...state,
        caveatType: action.payload,
        customCaveat: action.payload === 'none' ? '' : state.customCaveat
      };
    case ACTIONS.SET_CUSTOM_CAVEAT:
      return { ...state, customCaveat: action.payload };
    case ACTIONS.SET_EVENT_METADATA:
      return { ...state, eventMetadata: action.payload };
    case ACTIONS.SET_MARKERS:
      return { ...state, markers: action.payload };
    case ACTIONS.ADD_MARKER:
      const newMarkers = [...state.markers, action.payload];
      let markerAddDirty = state.isDirty;
      if (state.loadedSessionId) {
        markerAddDirty = true;
      }
      return {
        ...state,
        markers: newMarkers,
        isDirty: markerAddDirty
      };
    case ACTIONS.REMOVE_MARKER:
      return {
        ...state,
        markers: state.markers.filter(marker => marker.id !== action.payload)
      };
    case ACTIONS.ADD_CUSTOM_MARKER_TYPE:
      const newLabel = action.payload;
      if (state.availableMarkerTypes.some(mt => mt.label.toLowerCase() === newLabel.toLowerCase())) {
          console.warn(`Marker type "${newLabel}" already exists.`);
          return state;
      }
      const newCustomMarkerType = {
          id: generateId(),
          label: newLabel,
          type: generateTypeFromLabel(newLabel),
          color: 'default'
      };
      return {
        ...state,
        availableMarkerTypes: [...state.availableMarkerTypes, newCustomMarkerType]
      };
    case ACTIONS.APPEND_TRANSCRIPTION_SEGMENTS: 
      console.log('[TranscriptionContext] Processing segments update:', action.payload);
      
      if (!action.payload || !Array.isArray(action.payload) || action.payload.length === 0) {
        console.warn('[TranscriptionContext] Received empty or invalid segments array');
        return state;
      }
      
      const sortedSegments = [...action.payload].sort((a, b) => (a.start || 0) - (b.start || 0));
      
      let fullText = '';
      sortedSegments.forEach(segment => {
        if (segment.text) {
          const speakerLabel = segment.speaker && segment.speaker !== 'UNKNOWN' 
            ? `${segment.speaker}: ` 
            : '';
          
          fullText += `${speakerLabel}${segment.text.trim()}\n`;
        }
      });
      
      console.log('[TranscriptionContext] Generated transcript text:', fullText);
      
      return { ...state, transcriptionText: fullText };
    case ACTIONS.RESET_STATE:
      const preservedMarkerTypes = state.availableMarkerTypes;
      return {
          ...initialState,
          availableMarkerTypes: preservedMarkerTypes
      };

    case ACTIONS.SET_PREVIOUS_SESSIONS:
      return { ...state, previousSessions: action.payload };

    case ACTIONS.SET_LOADED_SESSION_ID:
        return { ...state, loadedSessionId: action.payload };

    case ACTIONS.LOAD_SESSION_DATA:
      const loadedData = action.payload;
      const processedMarkers = (loadedData.markers || []).map(backendMarker => ({
        ...backendMarker,
        id: backendMarker.marker_id || `marker-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      }));
      const initialTranscript = loadedData.full_transcript_text || '';
      const initialClassification = loadedData.event_metadata?.classification || 'SELECT A SECURITY CLASSIFICATION';
      let initialCaveatType = null;
      let initialCustomCaveat = '';

      if (initialClassification && initialClassification !== 'SELECT A SECURITY CLASSIFICATION') {
          const parts = initialClassification.split('//');
          if (parts.length > 1 && parts[1].trim() !== '') {
              initialCaveatType = 'custom';
              initialCustomCaveat = parts[1].trim();
          } else {
              initialCaveatType = 'none';
          }
      }
      return {
        ...state,
        loadedSessionId: loadedData.session_id,
        sessionId: loadedData.session_id,
        audioFilename: loadedData.session_name || '',
        transcriptionText: initialTranscript,
        participants: loadedData.participants || [],
        eventMetadata: loadedData.event_metadata ? {
            wargame_name: loadedData.event_metadata.wargame_name || '',
            scenario: loadedData.event_metadata.scenario || '',
            phase: loadedData.event_metadata.phase || '',
            location: loadedData.event_metadata.location || '',
            organization: loadedData.event_metadata.organization || '',
        } : initialState.eventMetadata,
        classification: initialClassification.split('//')[0],
        caveatType: initialCaveatType,
        customCaveat: initialCustomCaveat,
        markers: processedMarkers,
        audioUrl: loadedData.audio_url || null,
        recordingState: RECORDING_STATES.STOPPED,
        recordingTime: 0,
        error: null,
        isDirty: false,
        initialLoadedData: { 
            audioFilename: loadedData.session_name || '',
            transcriptionText: initialTranscript, 
            participants: loadedData.participants || [],
            eventMetadata: loadedData.event_metadata ? { 
                wargame_name: loadedData.event_metadata.wargame_name || '',
                scenario: loadedData.event_metadata.scenario || '',
                phase: loadedData.event_metadata.phase || '',
                location: loadedData.event_metadata.location || '',
                organization: loadedData.event_metadata.organization || '',
            } : initialState.eventMetadata,
            classification: initialClassification.split('//')[0],
            caveatType: initialCaveatType,
            customCaveat: initialCustomCaveat,
            markers: processedMarkers, // Store initial markers for comparison
        },
        playbackTime: 0 // Reset playback time on new session load
      };

    case ACTIONS.START_NEW_SESSION:
      const preservedMarkerTypesNew = state.availableMarkerTypes;
      const preservedPreviousSessions = state.previousSessions;
      return {
        ...initialState,
        availableMarkerTypes: preservedMarkerTypesNew,
        previousSessions: preservedPreviousSessions,
        loadedSessionId: null,
        initialLoadedData: null,
        isDirty: false,
        playbackTime: 0 // Reset playback time
      };

    case ACTIONS.SET_IS_DIRTY:
        if (state.loadedSessionId) {
            return { ...state, isDirty: action.payload };
        }
        return state;
        
    case ACTIONS.MARK_SESSION_SAVED:
        const currentClassificationForSave = state.classification === 'SELECT A SECURITY CLASSIFICATION' ? '' : state.classification;
        return {
            ...state,
            isDirty: false,
            initialLoadedData: {
                audioFilename: state.audioFilename,
                transcriptionText: state.transcriptionText,
                participants: state.participants,
                eventMetadata: state.eventMetadata,
                classification: currentClassificationForSave,
                caveatType: state.caveatType,
                customCaveat: state.customCaveat,
                markers: [...state.markers],
            }
        };

    case ACTIONS.DELETE_SESSION_SUCCESS:
      const newPreviousSessions = state.previousSessions.filter(
        session => session.session_id !== action.payload
      );
      if (state.loadedSessionId === action.payload) {
        const preservedMarkerTypesDel = state.availableMarkerTypes;
        return {
          ...initialState,
          availableMarkerTypes: preservedMarkerTypesDel,
          previousSessions: newPreviousSessions,
          loadedSessionId: null,
          initialLoadedData: null,
          isDirty: false,
          sessionId: null,
          recordingState: RECORDING_STATES.INACTIVE,
          recordingTime: 0,
          transcriptionText: '',
          audioFilename: '',
          error: null,
          participants: [],
          classification: 'SELECT A SECURITY CLASSIFICATION',
          caveatType: null,
          customCaveat: '',
          eventMetadata: {
            wargame_name: '',
            scenario: '',
            phase: '',
            location: '',
            organization: ''
          },
          markers: [],
          audioUrl: null,
          sendWebSocketMessage: null,
          playbackTime: 0 // Reset playbackTime
        };
      }
      return {
        ...state,
        previousSessions: newPreviousSessions,
      };
    
    case ACTIONS.SET_WEBSOCKET_SENDER: 
      return { ...state, sendWebSocketMessage: action.payload };

    case ACTIONS.SET_PLAYBACK_TIME:
      return { ...state, playbackTime: action.payload };

    default:
      return state;
  }
};

// Helper function (needed for ADD_MARKER description) - add it outside the reducer
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
        h > 0 ? h.toString().padStart(2, '0') : '00',
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].join(':');
};

// Create context
export const TranscriptionContext = createContext();

// Provider component
export const TranscriptionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(transcriptionReducer, initialState);

  return (
    <TranscriptionContext.Provider value={{ state, dispatch }}>
      {children}
    </TranscriptionContext.Provider>
  );
};

// Custom hook to use the context
export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error('useTranscription must be used within a TranscriptionProvider');
  }
  return context;
};

export default TranscriptionProvider; 