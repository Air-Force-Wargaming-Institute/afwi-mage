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
  RESET_STATE: 'RESET_STATE'
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
  availableMarkerTypes: [...defaultMarkerTypes]
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
      return { ...state, transcriptionText: action.payload };
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
        caveatType: null,
        customCaveat: ''
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
      const newMarker = {
          id: `marker-${Date.now()}`,
          marker_type: action.payload.type,
          timestamp: action.payload.timestamp,
          description: `${action.payload.label} at ${formatTime(action.payload.timestamp)}`,
          classification: action.payload.classification,
      };
      return { ...state, markers: [...state.markers, newMarker] };
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
    case ACTIONS.RESET_STATE:
      const preservedMarkerTypes = state.availableMarkerTypes;
      return {
          ...initialState,
          availableMarkerTypes: preservedMarkerTypes
      };
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