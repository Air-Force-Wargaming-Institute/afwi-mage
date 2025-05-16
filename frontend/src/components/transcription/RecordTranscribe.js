// RecordTranscribe.js
// This component is used to record and transcribe audio in a new MAGE browserwindow.

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Grid,
  Divider,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  useTheme,
  Snackbar,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { 
  Mic as MicIcon, 
  Stop as StopIcon, 
  Pause as PauseIcon, 
  FiberManualRecord as RecordIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
} from '@material-ui/icons';
import WaveSurfer from 'wavesurfer.js';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import { GradientBorderPaper, GradientText, StyledContainer, AnimatedGradientPaper } from '../../styles/StyledComponents';
import { DeleteButton } from '../../styles/ActionButtons';
import { useTranscription, ACTIONS, RECORDING_STATES } from '../../contexts/TranscriptionContext';
import SessionBrowserPanel from './SessionBrowserPanel';
import RecordingControlPanel from './RecordingControlPanel';
import SessionMetadataForm from './SessionMetadataForm';
import ParticipantManager from './ParticipantManager';
import RealtimeTaggingPanel from './RealtimeTaggingPanel';
import TranscriptionDisplay from './TranscriptionDisplay';

// Utility for basic deep comparison (replace with lodash.isEqual if available/preferred)
const deepCompare = (obj1, obj2) => {
    try {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    } catch (e) {
        console.error("Comparison error:", e);
        return false; // Treat comparison error as unequal
    }
};

// Styling for the RecordTranscribe component
const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default,
    overflow: 'hidden',
  },
  header: {
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    backgroundColor: theme.palette.background.default,
    zIndex: 1100,
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    padding: theme.spacing(1.5),
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(8), // Ensure this doesn't get cut off by 100% height children
  },
  mainContentPanel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    height: '100%',
  },
  controlPanel: {
    // padding: theme.spacing(1.5), // REMOVED - GradientBorderPaper has its own padding
    display: 'flex',
    flexDirection: 'column',
    // gap: theme.spacing(1.5), // REMOVED - Will be applied to inner scrollable Box
    // overflowY: 'auto', // REMOVED - GradientBorderPaper should not scroll
    height: '100%', // Ensures GradientBorderPaper fills its Grid cell
  },
  audioVisualizer: {
    height: '100px',
    marginBottom: theme.spacing(1.5),
    position: 'relative',
  },
  waveform: {
    width: '100%',
    height: '100%',
    background: 'rgba(30, 30, 30, 0.7)',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    position: 'relative',
  },
  recordingControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
  },
  recordingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  recordingTime: {
    fontFamily: 'monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  recordingIndicator: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#ea4335',
    animation: '$pulse 1.5s infinite',
  },
  pausedIndicator: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#fbbc05',
  },
  stoppedIndicator: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#34a853',
  },
  recordButton: {
    backgroundColor: '#ea4335',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#c62828',
    },
  },
  pauseButton: {
    backgroundColor: '#fbbc05',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#f9a825',
    },
  },
  stopButton: {
    backgroundColor: '#34a853',
    color: '#ffffff',
    '&:hover': {
      backgroundColor: '#2e7d32',
    },
  },
  transcriptionPanel: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1.5),
    marginTop: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
  },
  transcriptionText: {
    whiteSpace: 'pre-wrap',
    fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
    lineHeight: 1.8,
    textAlign: 'left',
  },
  formSection: {
    marginBottom: theme.spacing(1.5),
  },
  formTitle: {
    marginBottom: theme.spacing(0.5),
  },
  inputFields: {
    display: 'flex',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(0.5),
  },
  fileNameInput: {
    flex: 1,
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0.5, 2),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  participantChip: {
    margin: theme.spacing(0.5),
    backgroundColor: props => props.color || theme.palette.primary.main,
  },
  participantsList: {
    maxHeight: '250px',
    overflow: 'auto',
    marginBottom: theme.spacing(1.5),
  },
  participantListItem: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    alignItems: 'flex-start',
    disableGutters: true,
  },
  participantFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    flexGrow: 1,
    marginLeft: 0,
  },
  participantFieldRow: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  metadataSection: {
    marginBottom: theme.spacing(1.5),
  },
  timelineMarkers: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  speakerTagsSection: {
    marginTop: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  speakerTagsContainer: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
  },
  speakerSegment: {
    borderLeft: props => `4px solid ${props.color || theme.palette.primary.main}`,
    paddingLeft: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  speakerAvatar: {
    backgroundColor: props => props.color || theme.palette.primary.main,
  },
  markerButton: {
    marginRight: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
  },
  classificationBanner: {
    padding: theme.spacing(0.5),
    textAlign: 'center',
    fontWeight: 'bold',
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.6,
      transform: 'scale(1.1)',
    },
    '100%': {
      opacity: 1,
      transform: 'scale(1)',
    },
  },
  fullHeight: {
    height: '100%',
  },
  isDirty: {
    // Add isDirty from context state
  },
  initialLoadedData: {
    // Add initial data from context state
  },
  stickyFooter: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    zIndex: 1050,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  }
}));

// Helper function to format time in HH:MM:SS
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

// Helper function to construct full classification string
const constructClassificationString = (baseClassification, caveatType, customCaveat) => {
  if (!baseClassification || baseClassification === 'SELECT A SECURITY CLASSIFICATION') {
    return ''; // Return empty if base is not selected
  }
  if (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '') {
    return `${baseClassification}//${customCaveat.trim().toUpperCase()}`;
  }
  // If 'none' or no custom text, just return the base
  return baseClassification;
};

// Helper function to get banner style based on classification
const getBannerStyle = (baseClassification, theme, loadedSessionId) => { // Added loadedSessionId argument
  if (!baseClassification || baseClassification === 'SELECT A SECURITY CLASSIFICATION') {
    // If loadedSessionId exists but no classification, show a less intrusive default or a placeholder message
    if (loadedSessionId) { // Use the passed loadedSessionId argument
        return {
            backgroundColor: theme.palette.grey[300],
            color: theme.palette.getContrastText(theme.palette.grey[300]),
            minHeight: '24px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
    }
    return { display: 'none' }; // Hide banner if no classification and not a loaded session
  }
  const upperClass = baseClassification.toUpperCase();
  let backgroundColor = theme.palette.grey[700]; // Default

  if (upperClass.includes('UNCLASSIFIED')) {
    backgroundColor = theme.palette.success.main;
  } else if (upperClass.includes('TOP SECRET')) {
    backgroundColor = theme.palette.warning.main;
  } else if (upperClass.includes('SECRET')) {
    backgroundColor = theme.palette.error.main;
  }

  return {
    backgroundColor,
    color: theme.palette.getContrastText(backgroundColor),
  };
};

// Main RecordTranscribe component
const RecordTranscribe = () => {
  const theme = useTheme();
  const classes = useStyles();
  const { state, dispatch } = useTranscription();
  const { token } = useContext(AuthContext);
  
  const {
    sessionId,
    recordingState,
    transcriptionText,
    audioFilename,
    error,
    participants,
    classification: selectedClassification,
    caveatType,
    customCaveat,
    eventMetadata,
    loadedSessionId,
    isDirty,
    initialLoadedData,
    markers,
    audioUrl, // Already in context
    playbackTime, // Already in context for dispatch, local for control
    sendWebSocketMessage, // Added for RealtimeTaggingPanel access
  } = state;

  const [confirmCloseDialog, setConfirmCloseDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [closeWarningType, setCloseWarningType] = useState('');
  const [confirmNavigationDialog, setConfirmNavigationDialog] = useState(false);
  const [navigationAction, setNavigationAction] = useState(null);

  // --- START: WaveSurfer State Lifted from RecordingControlPanel --- 
  const waveformRef = useRef(null); // This ref will be passed to RecordingControlPanel for the container
  const wavesurferRef = useRef(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false); // Renamed from isPlaying for clarity
  const [currentPlaybackTimeForSlider, setCurrentPlaybackTimeForSlider] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const isSeekingRef = useRef(false); // To prevent audioprocess updates during seek
  const [currentObjectUrl, setCurrentObjectUrl] = useState(null); // For managing blob URLs
  const [apiError, setApiError] = useState(null); // For WaveSurfer/audio loading errors
  // --- END: WaveSurfer State --- 

  // Effect for isDirty check (remains the same)
  useEffect(() => {
    if (loadedSessionId && initialLoadedData) {
      const currentDataToCompare = {
        audioFilename: audioFilename,
        transcriptionText: transcriptionText,
        participants: participants,
        eventMetadata: eventMetadata,
        classification: selectedClassification === 'SELECT A SECURITY CLASSIFICATION' ? '' : selectedClassification,
        caveatType: caveatType,
        customCaveat: customCaveat,
        markers: markers, // Ensure markers are part of the comparison
      };
      
      const initialComparableData = {
        ...initialLoadedData,
        classification: initialLoadedData.classification === 'SELECT A SECURITY CLASSIFICATION' ? '' : initialLoadedData.classification,
        markers: initialLoadedData.markers || [], // Ensure initial markers are comparable
      };

      const areEqual = deepCompare(currentDataToCompare, initialComparableData);
      
      if (!areEqual && !isDirty) {
          dispatch({ type: ACTIONS.SET_IS_DIRTY, payload: true });
      } else if (areEqual && isDirty) {
          dispatch({ type: ACTIONS.SET_IS_DIRTY, payload: false });
      }
    }
  }, [
      loadedSessionId, initialLoadedData, audioFilename, transcriptionText, participants, 
      eventMetadata, selectedClassification, caveatType, customCaveat, isDirty, dispatch, markers
  ]);

  // --- START: WaveSurfer Initialization and Event Handling (Moved here) ---
  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) { // Initialize only once
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current, // waveformRef is the div in RecordingControlPanel
        waveColor: theme.palette.primary.light,
        progressColor: theme.palette.secondary.main,
        cursorColor: theme.palette.warning.main,
        barWidth: 2, barRadius: 3, cursorWidth: 1, height: 80, barGap: 2,
        responsive: true, normalize: true, partialRender: true, backend: 'WebAudio'
      });
      wavesurferRef.current = wavesurfer;

      wavesurfer.on('ready', () => {
        console.log('WaveSurfer ready (in RecordTranscribe)');
        setAudioDuration(wavesurfer.getDuration());
        setCurrentPlaybackTimeForSlider(0);
        dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: 0 });
        setIsWaveformReady(true);
        setIsAudioPlaying(false); // Ensure playing is false on ready
      });
      wavesurfer.on('audioprocess', (time) => {
        if (!isSeekingRef.current) {
          setCurrentPlaybackTimeForSlider(time);
          dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: time });
        }
      });
      wavesurfer.on('finish', () => {
        setIsAudioPlaying(false);
        setCurrentPlaybackTimeForSlider(wavesurferRef.current.getDuration()); // Go to end
        dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: wavesurferRef.current.getDuration() });
      });
      wavesurfer.on('seek', (progress) => {
        const newTime = progress * wavesurferRef.current.getDuration();
        setCurrentPlaybackTimeForSlider(newTime);
        dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: newTime });
      });
      wavesurfer.on('error', (err) => {
        console.error('WaveSurfer error (in RecordTranscribe):', err);
        setApiError(`WaveSurfer error: ${err.toString()}`);
        setIsWaveformReady(false);
      });
    }
    // Cleanup on component unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.unAll();
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        setCurrentObjectUrl(null);
      }
    };
  }, [theme, dispatch]); // Removed currentObjectUrl from deps, managed internally

  // Effect to load audio when audioUrl changes (Moved and adapted)
  useEffect(() => {
    if (wavesurferRef.current) {
      if (currentObjectUrl) { // Revoke previous if any
        URL.revokeObjectURL(currentObjectUrl);
        setCurrentObjectUrl(null);
      }
      if (loadedSessionId && audioUrl) {
        setIsWaveformReady(false); // Reset ready state
        setAudioDuration(0);
        setCurrentPlaybackTimeForSlider(0);
        dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: 0 });
        setIsAudioPlaying(false);

        const fetchAndLoadAudio = async () => {
          try {
            if (!token) throw new Error("Auth token missing");
            const response = await fetch(audioUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            setCurrentObjectUrl(objectUrl); 
            wavesurferRef.current.load(objectUrl);
          } catch (error) {
            console.error("Error fetching or loading audio:", error);
            setApiError(error.message);
            setIsWaveformReady(false);
          }
        };
        fetchAndLoadAudio();
      } else if (!loadedSessionId) { // If new session or reset
        wavesurferRef.current.empty();
        setIsWaveformReady(false);
        setAudioDuration(0);
        setCurrentPlaybackTimeForSlider(0);
        dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: 0 });
        setIsAudioPlaying(false);
      }
    }
  }, [loadedSessionId, audioUrl, token, dispatch]);
  // --- END: WaveSurfer Logic Moved ---

  // --- START: Playback Handlers (Moved here) ---
  const handlePlayPause = useCallback(() => {
    if (wavesurferRef.current && isWaveformReady) {
      dispatch({ type: ACTIONS.SET_IS_PLAYING, payload: !isAudioPlaying }); 
      wavesurferRef.current.playPause();
      setIsAudioPlaying(wavesurferRef.current.isPlaying());
    }
  }, [isWaveformReady, dispatch, isAudioPlaying]);

  const handleStopPlayback = useCallback(() => {
    if (wavesurferRef.current && isWaveformReady) {
      wavesurferRef.current.stop();
      setIsAudioPlaying(false);
      setCurrentPlaybackTimeForSlider(0);
      dispatch({ type: ACTIONS.SET_PLAYBACK_TIME, payload: 0 });
      dispatch({ type: ACTIONS.SET_IS_PLAYING, payload: false }); 
    }
  }, [isWaveformReady, dispatch]);

  const handleSliderChange = useCallback((event, newValue) => {
    if (isWaveformReady && audioDuration > 0) {
      setCurrentPlaybackTimeForSlider(newValue);
    }
  }, [isWaveformReady, audioDuration]);

  const handleSliderChangeCommitted = useCallback((event, newValue) => {
    if (wavesurferRef.current && isWaveformReady && audioDuration > 0) {
      isSeekingRef.current = true;
      const seekPosition = newValue / audioDuration;
      wavesurferRef.current.seekTo(seekPosition);
      // Event listener for 'seek' will dispatch SET_PLAYBACK_TIME
      setTimeout(() => { isSeekingRef.current = false; }, 100);
    }
  }, [isWaveformReady, audioDuration]);

  const hasUnsavedFormData = () => {
    // Check only if not loading a session and in inactive state
    if (loadedSessionId || recordingState !== RECORDING_STATES.INACTIVE) return false;

    const isFilenameEntered = audioFilename && audioFilename.trim() !== '';
    const isMetadataEntered = 
      (eventMetadata.wargame_name && eventMetadata.wargame_name.trim() !== '') ||
      (eventMetadata.scenario && eventMetadata.scenario.trim() !== '') ||
      (eventMetadata.phase && eventMetadata.phase.trim() !== '') ||
      (eventMetadata.location && eventMetadata.location.trim() !== '') ||
      (eventMetadata.organization && eventMetadata.organization.trim() !== '');
    const isParticipantEntered = participants.length > 0 && participants.some(p => p.name?.trim()); 
    const isClassificationSelected = selectedClassification !== 'SELECT A SECURITY CLASSIFICATION';

    return isFilenameEntered || isMetadataEntered || isParticipantEntered || isClassificationSelected;
  };
  
  // Effect to handle window close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const isRecordingActive = recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED;
      const hasNewSessionData = hasUnsavedFormData(); // Use the existing helper

      if (isRecordingActive || (loadedSessionId && isDirty) || (!loadedSessionId && hasNewSessionData)) {
        event.preventDefault(); // Standard for most browsers
        event.returnValue = ''; // Required for some browsers (displays a generic message)
        return ''; // For older browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, loadedSessionId, recordingState, hasUnsavedFormData]); // Add dependencies
  
  const handleCloseWindow = () => {
    const isRecordingActive = recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED;
    const hasData = hasUnsavedFormData();
    if (isRecordingActive) {
      setCloseWarningType('recording'); 
      setConfirmCloseDialog(true);
    } else if (isDirty && loadedSessionId) { // Check isDirty for loaded sessions
      setCloseWarningType('unsavedChanges');
      setConfirmCloseDialog(true);
    } else if (!loadedSessionId && hasData) {
      setCloseWarningType('formData'); 
      setConfirmCloseDialog(true);
    } else {
      window.close();
    }
  };

  const cancelRecording = async () => {
    if (loadedSessionId) {
        dispatch({ type: ACTIONS.START_NEW_SESSION });
        return;
    }
    // If it was an active recording, we need to signal the control panel somehow
    // Or perhaps the control panel handles its own cleanup on state change?
    // For now, just dispatch reset which should cascade state changes.
    
    // Is the API call still needed here, or should the Control Panel handle it on stop/cancel?
    // Let's assume Control Panel handles backend communication for start/stop/pause/resume/cancel of *its* actions.
    // This cancel is more about discarding frontend state.
    if (recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED) {
         if (sessionId) { // If a session was started on the backend
             try { 
                 // Send cancel signal to backend
                 await fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/cancel`), { method: 'POST' });
             } catch (err) {
                 console.error("Error sending cancel signal to backend:", err);
             }
         }
         // Reset the frontend state regardless of backend success
         dispatch({ type: ACTIONS.RESET_STATE });
    } else {
         // If inactive but potentially has unsaved data (handled by handleCloseWindow check)
         dispatch({ type: ACTIONS.RESET_STATE });
    }
  };
  
  const handleSaveChanges = async () => {
      if (!loadedSessionId || !token) {
          setSnackbarMessage("Cannot save: No session loaded or not authenticated.");
          setSnackbarOpen(true);
          return;
      }
      if (!isDirty) {
          setSnackbarMessage("No changes to save.");
          setSnackbarOpen(true);
          return;
      }

      const fullClassificationToSave = constructClassificationString(selectedClassification, caveatType, customCaveat);

      const finalPayload = {
        session_name: audioFilename,
        event_metadata: { 
            ...eventMetadata, 
            classification: fullClassificationToSave || null, 
        },
        participants: participants,
        full_transcript_text: transcriptionText,
        markers: markers.map(marker => { // Ensure markers are in the format expected by backend
            const { id, ...restOfMarker } = marker; // Assuming frontend uses 'id'
            return {
                ...restOfMarker,
                marker_id: id // Or whatever the backend expects for existing/new markers during PUT
            };
        }),
      };

      try {
          const saveUrl = getGatewayUrl(`/api/transcription/sessions/${loadedSessionId}`);
          const response = await fetch(saveUrl, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(finalPayload)
          });

          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to save changes: ${response.status} ${errorText || response.statusText}`);
          }

          const result = await response.json();
          setSnackbarMessage("Changes saved successfully.");
          setSnackbarOpen(true);
          dispatch({ type: ACTIONS.MARK_SESSION_SAVED });
          console.log("Save successful:", result);

      } catch (error) {
          console.error("Error saving session changes:", error);
          setSnackbarMessage(`Error saving changes: ${error.message}`);
          setSnackbarOpen(true);
          dispatch({ type: ACTIONS.SET_ERROR, payload: `Failed to save changes: ${error.message}` });
      }
  };

  const isFormDisabled = recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED;
  const isTaggingPanelReadOnly = loadedSessionId ? !isAudioPlaying : (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED);

  const fullClassificationDisplay = constructClassificationString(selectedClassification, caveatType, customCaveat);

  const handleNavigationAttempt = (actionToPerform) => {
    if (isDirty && loadedSessionId) {
      setNavigationAction(() => actionToPerform); // Store the action
      setConfirmNavigationDialog(true);
    } else {
      actionToPerform(); // Perform action directly if no unsaved changes
    }
  };

  const proceedWithNavigation = () => {
    if (navigationAction) {
      navigationAction();
    }
    setConfirmNavigationDialog(false);
    setNavigationAction(null);
  };

  const saveAndProceedWithNavigation = async () => {
    await handleSaveChanges(); // Assumes handleSaveChanges will set isDirty to false on success
    // Check if save was successful (isDirty became false) before proceeding
    if (!isDirty) { // Access updated isDirty from state (use the destructured isDirty)
        proceedWithNavigation();
    } else {
        // If save failed, do not proceed with navigation, keep dialog open or show error
        setSnackbarMessage("Save failed. Please resolve errors before navigating.");
        setSnackbarOpen(true);
        // Optionally, do not close the navigation dialog here
    }
  };

  return (
    <Box className={classes.root}>
      {/* Classification Banner */}
      <Box
        className={classes.classificationBanner}
        sx={{ ...getBannerStyle(selectedClassification, theme, loadedSessionId), // Pass loadedSessionId here
              display: (fullClassificationDisplay || (loadedSessionId && selectedClassification === 'SELECT A SECURITY CLASSIFICATION')) ? 'flex' : 'none' 
            }}
      >
        {fullClassificationDisplay || (loadedSessionId && selectedClassification === 'SELECT A SECURITY CLASSIFICATION' ? 'NO CLASSIFICATION SET' : '')}
      </Box>

      {/* Header */}
      <Box className={classes.header}>
        <GradientText>
          <Typography variant="h4">
              {loadedSessionId ? `Reviewing: ${audioFilename || 'Session'}` : 'Record & Transcribe Live' }
            </Typography>
        </GradientText>
        <IconButton onClick={handleCloseWindow}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Main Content Area */}
      <Box className={classes.content}>
        {/* Left Panel: Session Browser */}
        <Grid item xs={12} md={2} style={{ height: '100%', overflowY: 'auto' }}>
          <SessionBrowserPanel onNavigationAttempt={handleNavigationAttempt} />
        </Grid>

        {/* Right Panel: Main Area */}
        <Grid item xs={12} md={10} style={{ height: '100%', overflowY: 'auto' }}>
            <Grid container spacing={2} className={classes.fullHeight}>
              {/* Inner Left Column (Controls/Info/Forms) */}
              <Grid item xs={12} md={5} style={{ height: '100%' }}>
                <GradientBorderPaper className={classes.controlPanel}>
                  {/* Inner Box to handle scrolling and layout of children */}
                  <Box
                    style={{
                      height: '100%', // Fill GradientBorderPaper
                      overflowY: 'auto', // Enable vertical scrolling for content
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.spacing(1.5), // Layout for direct children
                      // The theme.spacing(3) padding comes from GradientBorderPaper itself
                    }}
                  >
                    {/* Pass WaveSurfer related props to RecordingControlPanel */}
                    <RecordingControlPanel
                      waveformRef={waveformRef} // Pass the ref for the div container
                      isAudioPlaying={isAudioPlaying}
                      currentPlaybackTime={currentPlaybackTimeForSlider} // Use local for slider
                      duration={audioDuration}
                      isWaveformReady={isWaveformReady}
                      onPlayPause={handlePlayPause}
                      onStopPlayback={handleStopPlayback}
                      onSliderChange={handleSliderChange}
                      onSliderChangeCommitted={handleSliderChangeCommitted}
                      apiError={apiError} // Pass WaveSurfer specific errors
                    />
                    <Divider />

                    {/* Session Metadata Form */}
                    <SessionMetadataForm isReadOnly={isFormDisabled} />
                    <Divider />

                    {/* Participants Form */}
                    <ParticipantManager isReadOnly={isFormDisabled} />
                    <Divider />
                    {/* Ensure no extra empty elements here if not needed */}
                  </Box>
                </GradientBorderPaper>
              </Grid>

              {/* Inner Right Column (Tagging/Transcription) */}
              <Grid item xs={12} md={7} style={{ height: '100%' }}>
                <GradientBorderPaper className={classes.fullHeight} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Conditional Header */}
                  <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, mb: 1 }}>
                    <Typography variant="h5" align="center">{loadedSessionId ? 'Review Session' : 'Realtime Interaction'}</Typography>
                  </Box>

                  {/* Realtime Tagging Panel */}
                  <Box sx={{ px: 1.5, pb: 1 }}>
                    <RealtimeTaggingPanel 
                        isReadOnly={isTaggingPanelReadOnly} 
                        isAudioPlaying={isAudioPlaying} // Pass playing state
                        // playbackTime is already in context, RealtimeTaggingPanel will use it
                    />
                  </Box>

                  <Divider sx={{ mx: 2 }}/>

                  {/* Transcription Display Section */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant="h5" align="center" gutterBottom sx={{ pt: 1.5, pb: 1 }}>
                       {loadedSessionId ? 'Session Transcript' : 'Live Transcription'}
                    </Typography>
                    <TranscriptionDisplay />
                  </Box>
                </GradientBorderPaper>
              </Grid>
            </Grid>
        </Grid>
      </Box>

      {/* Status Bar */}
      <Box className={classes.statusBar}>
        <Typography variant="body2" color="textSecondary">
          {error ? <span style={{color: theme.palette.error.main}}>{error}</span> : (sessionId ? `Session ID: ${sessionId}` : 'No active session')}
        </Typography>
        <Box>
            {/* Display isDirty status for debugging if needed */}
            {/* {loadedSessionId && <Chip label={isDirty ? "Unsaved Changes" : "Saved"} size="small" color={isDirty ? "secondary" : "primary"} />} */}
        </Box>
      </Box>

      {/* Sticky Footer for Save Button */}
      {loadedSessionId && (
        <Paper className={classes.stickyFooter} elevation={3}>
          <Button
            variant="contained"
            color="secondary"
            size="medium"
            startIcon={<SaveIcon />}
            onClick={handleSaveChanges}
            disabled={isFormDisabled || !isDirty}
          >
            Save Changes
          </Button>
        </Paper>
      )}

      {/* Dialogs */}
      <Dialog open={confirmCloseDialog} onClose={() => setConfirmCloseDialog(false)}>
        <DialogTitle>Confirm Close</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {closeWarningType === 'recording' && 'You have an active recording session. Closing now will discard your recording. Do you want to continue?'}
            {closeWarningType === 'formData' && 'You have unsaved changes in the new session form. Closing now will discard this information. Do you want tocontinue?'}
            {closeWarningType === 'unsavedChanges' && 'You have unsaved changes. Closing now will discard these changes. Do you want to continue?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCloseDialog(false)} color="primary">Cancel</Button>
          <Button 
            onClick={() => { 
              if (closeWarningType === 'recording') { 
                // Potentially call a method on RecordingControlPanel to stop and discard
                // For now, this assumes `cancelRecording` or a direct dispatch handles it.
                // dispatch({ type: ACTIONS.RESET_STATE }); // Or a more specific cancel action
              } 
              window.close(); 
            }} 
            color="error"
          >
             {closeWarningType === 'recording' ? 'Discard & Close' : 'Discard Changes & Close'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmNavigationDialog} onClose={() => setConfirmNavigationDialog(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Do you want to save them before navigating away?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmNavigationDialog(false); setNavigationAction(null); }} color="inherit">
            Cancel Navigation
          </Button>
          <Button onClick={proceedWithNavigation} color="error">
            Discard Changes
          </Button>
          <Button onClick={saveAndProceedWithNavigation} color="primary" variant="contained">
            Save and Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
        message={snackbarMessage} 
      />
    </Box>
  );
};

export default RecordTranscribe;


