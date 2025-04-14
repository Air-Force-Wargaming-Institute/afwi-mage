// RecordTranscribe.js
// This component is used to record and transcribe audio in a new MAGE browserwindow.

import React, { useState, useEffect, useRef } from 'react';
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
import { getApiUrl } from '../../config';
import { GradientBorderPaper, GradientText, StyledContainer, AnimatedGradientPaper } from '../../styles/StyledComponents';
import { DeleteButton } from '../../styles/ActionButtons';
import { useTranscription, ACTIONS, RECORDING_STATES } from '../../contexts/TranscriptionContext';
import SessionBrowserPanel from './SessionBrowserPanel';
import RecordingControlPanel from './RecordingControlPanel';
import SessionMetadataForm from './SessionMetadataForm';
import ParticipantManager from './ParticipantManager';
import RealtimeTaggingPanel from './RealtimeTaggingPanel';
import TranscriptionDisplay from './TranscriptionDisplay';

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
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    padding: theme.spacing(1.5),
    gap: theme.spacing(2),
  },
  mainContentPanel: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    height: '100%',
  },
  controlPanel: {
    padding: theme.spacing(1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    overflowY: 'auto',
    height: '100%',
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
const getBannerStyle = (baseClassification, theme) => { // Now takes baseClassification
  if (!baseClassification || baseClassification === 'SELECT A SECURITY CLASSIFICATION') {
    return { display: 'none' }; // Hide banner if no classification
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
  
  // Remove local refs and state related to recording controls/waveform
  // const intervalRef = useRef(null);
  // const waveformRef = useRef(null); 
  // const wavesurferRef = useRef(null);
  // const [audioStream, setAudioStream] = useState(null);
  // const [mediaRecorder, setMediaRecorder] = useState(null);
  // const [audioChunks, setAudioChunks] = useState([]);
  // const [isInitializing, setIsInitializing] = useState(false);
  
  // Keep state not moved
  // const transcriptionPanelRef = useRef(null); // For scrolling transcription
  const [confirmCloseDialog, setConfirmCloseDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // const [customMarkerLabel, setCustomMarkerLabel] = useState(''); // Moved
  const [closeWarningType, setCloseWarningType] = useState('');

  // Extract state from context
  const {
    sessionId,
    recordingState, // Still needed for read-only checks maybe?
    // recordingTime, // Managed by RecordingControlPanel
    transcriptionText,
    audioFilename, // Session Name
    error, // Still needed for snackbar
    participants, // Needed for participant manager
    classification: selectedClassification, // Needed for forms
    caveatType, // Needed for forms
    customCaveat, // Needed for forms
    eventMetadata, // Needed for forms
    // markers: activeMarkers, // Handled by child
    // availableMarkerTypes, // Handled by child
    loadedSessionId // Still needed for mode checks
  } = state;

  // --- Helper function to check for unsaved form data ---
  // This logic might need adjustment based on which component handles saving changes for loaded sessions
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
  
  // Generate a random color for participants (Keep - needed for add participant)
  // const getRandomColor = () => {
  //   const colors = ['#4285f4', '#ea4335', '#34a853', '#fbbc05', '#9c27b0', '#00bcd4', '#ff5722', '#3f51b5'];
  //   return colors[Math.floor(Math.random() * colors.length)];
  // };

  // Handle beforeunload event (Keep)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isRecordingActive = recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED;
      const hasData = hasUnsavedFormData();
      const shouldWarn = isRecordingActive || (!loadedSessionId && hasData);
      if (shouldWarn) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [recordingState, loadedSessionId, audioFilename, eventMetadata, participants, selectedClassification]);

  // Handle close window button (Keep)
  const handleCloseWindow = () => {
    const isRecordingActive = recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED;
    const hasData = hasUnsavedFormData();
    if (isRecordingActive) {
      setCloseWarningType('recording'); 
      setConfirmCloseDialog(true);
    } else if (!loadedSessionId && hasData) {
      setCloseWarningType('formData'); 
      setConfirmCloseDialog(true);
    } else {
      window.close();
    }
  };

  // Display error message in snackbar (Keep)
  useEffect(() => {
    if (error) { // Check error from state
      setSnackbarMessage(error);
      setSnackbarOpen(true);
      // Optionally clear the error after showing
      // dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    }
  }, [error]);

  // Cancel recording function (Keep - handles dialog interaction)
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
  
  // Add a new participant placeholder (Keep - belongs to participant manager section)
  // const addNewParticipantPlaceholder = () => { ... };

  // Handle changes in the inline participant fields (Keep - belongs to participant manager section)
  // const handleParticipantChange = (id, field, value) => { ... };

  // Remove participant function (Keep - belongs to participant manager section)
  // const removeParticipant = (id) => { ... };

  // Auto-scroll transcription panel (Keep)
  // useEffect(() => {
  //   if (transcriptionPanelRef.current) {
  //     transcriptionPanelRef.current.scrollTop = transcriptionPanelRef.current.scrollHeight;
  //   }
  // }, [transcriptionText]); // Scroll when text changes

  // Determine if fields should be disabled (Keep - used by multiple sections)
  const isReadOnly = loadedSessionId || recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED;
  
  // Construct the full classification string for display (Keep)
  const fullClassificationDisplay = constructClassificationString(selectedClassification, caveatType, customCaveat);

  return (
    <Box className={classes.root}>
      {/* Classification Banner */}
      <Box
        className={classes.classificationBanner}
        sx={{ ...getBannerStyle(selectedClassification, theme), display: fullClassificationDisplay ? 'block' : 'none'}}
      >
        {fullClassificationDisplay}
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
          <SessionBrowserPanel />
        </Grid>

        {/* Right Panel: Main Area */}
        <Grid item xs={12} md={10} style={{ height: '100%', overflowY: 'auto' }}>
            <Grid container spacing={2} className={classes.fullHeight}>
              {/* Inner Left Column (Controls/Info/Forms) */}
              <Grid item xs={12} md={5} style={{ height: '100%' }}>
                <GradientBorderPaper className={classes.controlPanel}>
                  {/* Recording Controls */}
                  <RecordingControlPanel />
                  <Divider />

                  {/* Session Metadata Form */}
                  <SessionMetadataForm isReadOnly={isReadOnly} />
                  <Divider />

                  {/* Participants Form */}
                  <ParticipantManager isReadOnly={isReadOnly} />
                  <Divider />

                  {/* Save Changes button (Remains, logic needs review) */}
                  {loadedSessionId && (
                     <Button variant="contained" color="secondary" size="small" startIcon={<SaveIcon />} onClick={() => { /* TODO: Implement save */ }} style={{ marginTop: '8px' }}>
                         Save Changes
                     </Button>
                  )}

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
                    <RealtimeTaggingPanel isReadOnly={isReadOnly} />
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
          {sessionId ? `Session ID: ${sessionId}` : 'No active session'}
        </Typography>
        <Box></Box>
      </Box>

      {/* Dialogs */}
      <Dialog open={confirmCloseDialog} onClose={() => setConfirmCloseDialog(false)}>
        <DialogTitle>Confirm Close</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {closeWarningType === 'recording' && 'You have an active recording session. Closing now will discard your recording. Do you want to continue?'}
            {closeWarningType === 'formData' && 'You have unsaved changes in the new session form. Closing now will discard this information. Do you want to continue?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCloseDialog(false)} color="primary">Cancel</Button>
          <Button onClick={() => { if (closeWarningType === 'recording') { cancelRecording(); } window.close(); }} color="error">
             {closeWarningType === 'recording' ? 'Discard Recording & Close' : 'Discard Changes & Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} message={snackbarMessage} />
    </Box>
  );
};

export default RecordTranscribe;


