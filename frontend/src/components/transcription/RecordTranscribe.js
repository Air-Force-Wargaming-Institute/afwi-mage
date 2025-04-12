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
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(1.5),
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
  },
  participantFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    flexGrow: 1,
    marginLeft: theme.spacing(2),
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
  
  // Local refs and state that don't need to be in context
  const intervalRef = useRef(null);
  const waveformRef = useRef(null);
  const transcriptionPanelRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [confirmCloseDialog, setConfirmCloseDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [customMarkerLabel, setCustomMarkerLabel] = useState(''); // State for custom marker input
  
  // Extract state from context
  const {
    sessionId,
    recordingState,
    recordingTime,
    transcriptionText,
    audioFilename,
    error,
    participants,
    classification: selectedClassification,
    caveatType,
    customCaveat,
    eventMetadata,
    markers: activeMarkers,
    availableMarkerTypes // Get available marker types from context
  } = state;
  
  // Generate a random color for participants
  const getRandomColor = () => {
    const colors = [
      '#4285f4', // blue
      '#ea4335', // red
      '#34a853', // green
      '#fbbc05', // yellow
      '#9c27b0', // purple
      '#00bcd4', // cyan
      '#ff5722', // orange
      '#3f51b5', // indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Handle beforeunload event to prevent accidental closing
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [recordingState]);
  
  // Handle close window button
  const handleCloseWindow = () => {
    if (recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED) {
      setConfirmCloseDialog(true);
    } else {
      window.close();
    }
  };
  
  // Start timer for recording duration
  useEffect(() => {
    if (recordingState === RECORDING_STATES.RECORDING) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: ACTIONS.SET_RECORDING_TIME, payload: recordingTime + 1 });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [recordingState, recordingTime, dispatch]);
  
  // Initialize wavesurfer
  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4285f4',
        progressColor: '#34a853',
        cursorColor: '#fbbc05',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 80,
        barGap: 2,
        responsive: true,
        normalize: true,
        partialRender: true,
        backend: 'WebAudio'
      });
      
      wavesurferRef.current = wavesurfer;
    }
    
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, []);
  
  // Display error message in snackbar
  useEffect(() => {
    if (state.error) {
      setSnackbarMessage(state.error);
      setSnackbarOpen(true);
    }
  }, [state.error]);
  
  // Initialize media recorder and audio stream
  const initializeRecording = async () => {
    try {
      setIsInitializing(true);
      
      // Request audio stream permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      // Initialize media recorder
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      // Handle data available event
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(chunks => [...chunks, e.data]);
          
          // Update waveform visualization
          if (wavesurferRef.current) {
            const audioUrl = URL.createObjectURL(e.data);
            wavesurferRef.current.load(audioUrl);
            URL.revokeObjectURL(audioUrl);
          }
        }
      };
      
      // Start session with API
      if (participants.length === 0) {
        // Add a default participant if none exist
        dispatch({ 
          type: ACTIONS.SET_PARTICIPANTS, 
          payload: [{
            id: 'default-participant',
            name: 'Speaker 1',
            role: 'Primary Speaker',
            color: getRandomColor(),
          }]
        });
      }
      
      const sessionResponse = await fetch(getApiUrl('TRANSCRIPTION', '/api/transcription/start-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'current-user', // This would be replaced with actual user ID in production
          session_name: audioFilename || 'Untitled Recording',
          output_format_preferences: {
            audio_format: 'mp3',
            transcription_format: 'pdf'
          },
          event_metadata: {
            ...eventMetadata,
            // Construct full classification for API
            classification: constructClassificationString(selectedClassification, caveatType, customCaveat),
            datetime: new Date().toISOString()
          },
          participants: participants
        })
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to start transcription session');
      }
      
      const sessionData = await sessionResponse.json();
      dispatch({ type: ACTIONS.SET_SESSION_ID, payload: sessionData.session_id });
      
      // Setup audio analyzer for live waveform visualization
      if (stream && wavesurferRef.current) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const canvas = document.createElement('canvas');
        const canvasContext = canvas.getContext('2d');
        canvas.width = waveformRef.current.clientWidth;
        canvas.height = waveformRef.current.clientHeight;
        waveformRef.current.innerHTML = '';
        waveformRef.current.appendChild(canvas);
        
        const drawWaveform = () => {
          if (recordingState === RECORDING_STATES.RECORDING) {
            requestAnimationFrame(drawWaveform);
            analyser.getByteTimeDomainData(dataArray);
            
            canvasContext.fillStyle = theme.palette.background.paper;
            canvasContext.fillRect(0, 0, canvas.width, canvas.height);
            canvasContext.lineWidth = 2;
            canvasContext.strokeStyle = '#4285f4';
            canvasContext.beginPath();
            
            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0;
              const y = v * (canvas.height / 2);
              
              if (i === 0) {
                canvasContext.moveTo(x, y);
              } else {
                canvasContext.lineTo(x, y);
              }
              
              x += sliceWidth;
            }
            
            canvasContext.lineTo(canvas.width, canvas.height / 2);
            canvasContext.stroke();
          }
        };
        
        drawWaveform();
      }
      
      setIsInitializing(false);
      return recorder;
    } catch (error) {
      console.error('Error initializing recording:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to initialize recording: ' + error.message });
      setIsInitializing(false);
      throw error;
    }
  };
  
  // Start recording function
  const startRecording = async () => {
    try {
      const recorder = await initializeRecording();
      
      recorder.start(1000); // Collect chunks every second
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      dispatch({ type: ACTIONS.SET_RECORDING_TIME, payload: 0 });
      setAudioChunks([]);
      
      // Simulate periodic transcription updates 
      // In a real implementation, this would be replaced with WebSocket connection
      // to receive live transcription updates from the server
      simulateTranscriptionUpdates();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to start recording: ' + error.message });
    }
  };
  
  // Pause recording function
  const pauseRecording = async () => {
    if (mediaRecorder && recordingState === RECORDING_STATES.RECORDING) {
      mediaRecorder.pause();
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.PAUSED });
      
      try {
        await fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/pause`), {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error pausing session:', error);
      }
    }
  };
  
  // Resume recording function
  const resumeRecording = async () => {
    if (mediaRecorder && recordingState === RECORDING_STATES.PAUSED) {
      mediaRecorder.resume();
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      
      try {
        await fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/resume`), {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error resuming session:', error);
      }
    }
  };
  
  // Stop recording function
  const stopRecording = async () => {
    if (mediaRecorder && (recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED)) {
      mediaRecorder.stop();
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.STOPPED });
      
      // Stop all tracks on the stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      // Use a default filename if none provided
      const baseFilename = audioFilename || 'Untitled_Recording';
      
      try {
        // Update API call to use the single baseFilename for both
        await fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/stop`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio_filename: baseFilename, 
            transcription_filename: baseFilename, 
            include_timestamps: true,
            include_speakers: true,
            // Construct full classification for API
            classification: constructClassificationString(selectedClassification, caveatType, customCaveat),
            output_formats: ['pdf', 'docx', 'txt'],
            additional_processing: {
              speaker_diarization: true,
              highlight_low_confidence: true,
              include_markers: true,
              include_annotations: true
            }
          })
        });
        
        // Combine audio chunks and create a downloadable file
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' }); // Consider appropriate mime type
        const audioUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = audioUrl;
        // Update download filename to use baseFilename
        a.download = `${baseFilename}.mp3`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(audioUrl);
        
      } catch (error) {
        console.error('Error stopping session:', error);
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to stop recording: ' + error.message });
      }
    }
  };
  
  // Cancel recording function
  const cancelRecording = async () => {
    if (recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED) {
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      dispatch({ type: ACTIONS.RESET_STATE });
      setAudioChunks([]);
      
      if (sessionId) {
        try {
          await fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/cancel`), {
            method: 'POST'
          });
        } catch (error) {
          console.error('Error cancelling session:', error);
        }
      }
    }
  };
  
  // Add a new participant placeholder directly to the list
  const addNewParticipantPlaceholder = () => {
    const newPlaceholder = {
      id: `participant-${Date.now()}`,
      name: '', // Start with empty fields
      role: '',
      rank: '',
      organization: '',
      color: getRandomColor(),
    };
    
    dispatch({ type: ACTIONS.SET_PARTICIPANTS, payload: [...participants, newPlaceholder] });
  };
  
  // Handle changes in the inline participant fields
  const handleParticipantChange = (id, field, value) => {
    const updatedParticipants = participants.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    dispatch({ type: ACTIONS.SET_PARTICIPANTS, payload: updatedParticipants });

    // Debounced API update could go here if needed
    // Update speaker information if a session is already active
    // Consider debouncing this to avoid excessive API calls during typing
    if (sessionId) {
      try {
        fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/speakers`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ speakers: updatedParticipants })
        });
      } catch (error) {
        console.error('Error updating speakers:', error);
      }
    }
  };

  // Remove participant function (remains the same)
  const removeParticipant = (id) => {
    dispatch({ 
      type: ACTIONS.SET_PARTICIPANTS, 
      payload: participants.filter(p => p.id !== id) 
    });
    // Also update API if session active
    if (sessionId) {
      try {
        fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/speakers`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ speakers: participants.filter(p => p.id !== id) })
        });
      } catch (error) {
        console.error('Error updating speakers after removal:', error);
      }
    }
  };
  
  // Add a timeline marker
  const addMarker = (markerType) => { // markerType is now an object { type, label, ... }
    const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
    const payload = {
        type: markerType.type,
        label: markerType.label,
        timestamp: recordingTime,
        // Use constructed classification for marker object
        classification: fullClassification,
    };

    dispatch({ type: ACTIONS.ADD_MARKER, payload: payload });

    // Send marker to API (adjust payload as needed for API)
    if (sessionId) {
      try {
        fetch(getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/markers`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Match payload structure with API expectation from record-transcribe-plan.md
          body: JSON.stringify({
            marker_type: markerType.type,
            timestamp: recordingTime,
            description: `${markerType.label} marker added`,
            // Use constructed classification for API call
            classification: fullClassification,
            user_id: 'current-user' // Replace with actual user ID
          })
        });
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    }
  };
  
  // Add a custom marker type to the list
  const handleAddCustomMarkerType = () => {
    const trimmedLabel = customMarkerLabel.trim();
    if (trimmedLabel) {
      dispatch({ type: ACTIONS.ADD_CUSTOM_MARKER_TYPE, payload: trimmedLabel });
      setCustomMarkerLabel(''); // Clear input field
      setSnackbarMessage(`Added new marker type: ${trimmedLabel}`);
      setSnackbarOpen(true);
    } else {
      setSnackbarMessage('Please enter a label for the custom marker type.');
      setSnackbarOpen(true);
    }
  };
  
  // Simulate transcription updates (for demonstration)
  const simulateTranscriptionUpdates = () => {
    // This is just a simulation for testing the UI
    // In a real implementation, this would be replaced with actual data from the API
    const demoTexts = [
      "Starting the recording process...",
      "Hello, this is a test recording for the MAGE system.",
      "We are now demonstrating the real-time transcription capability.",
      "This feature is particularly useful for wargaming sessions and military exercises.",
      "As you can see, the transcription is updated in real-time as we speak.",
      "You can add timeline markers to highlight important moments during the session.",
      "The system supports multiple speakers and can differentiate between them.",
      "All of this is happening with proper security classification handling.",
      "At the end of the session, you'll be able to download both audio and transcription files.",
      "This concludes our demonstration of the Record & Transcribe Live feature."
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < demoTexts.length && (recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED)) {
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        
        dispatch({ 
          type: ACTIONS.SET_TRANSCRIPTION_TEXT, 
          payload: transcriptionText + `\n\n[${formatTime(recordingTime)}] ${randomParticipant?.name || 'Speaker'}: ${demoTexts[index]}`
        });
        
        // Auto-scroll to bottom of transcription panel
        if (transcriptionPanelRef.current) {
          transcriptionPanelRef.current.scrollTop = transcriptionPanelRef.current.scrollHeight;
        }
        
        index++;
      } else {
        clearInterval(interval);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  };
  
  // Handler for clicking a speaker tag
  const handleSpeakerTagClick = (participant) => {
    if (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED) {
      setSnackbarMessage('Can only tag speakers during active or paused recording.');
      setSnackbarOpen(true);
      return;
    }

    const currentTime = recordingTime; // Capture current time
    console.log(`Speaker tag clicked: ${participant.name} (ID: ${participant.id}) at time ${formatTime(currentTime)}`);
    setSnackbarMessage(`Tagged speaker: ${participant.name} at ${formatTime(currentTime)}`);
    setSnackbarOpen(true);

    // TODO: Implement logic to associate this speaker with the current/nearby
    // transcription segment around `currentTime`. This might involve:
    // 1. Finding the relevant transcription segment(s) based on `currentTime`.
    // 2. Updating the segment's speaker_id in the local state (transcriptionText formatting).
    // 3. Sending an annotation/update to the backend API (e.g., via WebSocket or a dedicated endpoint like /annotations) 
    //    to tag the segment on the server with the participant.id and currentTime.
    //    Example API call structure might look like the Add Observer Annotation endpoint.
  };
  
  // Validation logic for starting recording
  const checkCanStartRecording = () => {
    const hasFilename = audioFilename && audioFilename.trim() !== '';
    const hasWargameName = eventMetadata.wargame_name && eventMetadata.wargame_name.trim() !== '';
    const hasNamedParticipant = participants.length > 0 && participants.some(p => p.name && p.name.trim() !== '');
    // Updated classification check
    const hasSelectedClassification = selectedClassification && selectedClassification !== 'SELECT A SECURITY CLASSIFICATION';
    const hasSelectedCaveatType = caveatType === 'none' || (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '');

    // Update return condition
    return hasFilename && hasWargameName && hasNamedParticipant && hasSelectedClassification && hasSelectedCaveatType;
  };

  const canStartRecording = checkCanStartRecording();
  const isStartDisabled = isInitializing || !canStartRecording;

  // Build tooltip title based on unmet conditions
  let startButtonTooltip = '';
  if (!canStartRecording) {
    const missing = [];
    if (!audioFilename || audioFilename.trim() === '') missing.push('Output Filename');
    if (!eventMetadata.wargame_name || eventMetadata.wargame_name.trim() === '') missing.push('Wargame Name');
    if (!participants.some(p => p.name && p.name.trim() !== '')) missing.push('at least one Participant with a Name');
    // Updated classification tooltip messages
    if (!selectedClassification || selectedClassification === 'SELECT A SECURITY CLASSIFICATION') {
      missing.push('Security Classification');
    } else {
      if (!caveatType) {
        missing.push('Caveat Selection (No Caveats or Caveats)');
      } else if (caveatType === 'custom' && (!customCaveat || customCaveat.trim() === '')) {
        missing.push('Custom Caveat Text');
      }
    }
    startButtonTooltip = `Please provide: ${missing.join(', ')}`;
  }

  // Construct the full classification string for display and banner
  const fullClassificationDisplay = constructClassificationString(selectedClassification, caveatType, customCaveat);

  return (
    <Box className={classes.root}>
      {/* Classification Banner - Updated logic */}
      <Box 
        className={classes.classificationBanner} 
        // Pass base classification for color, display based on full string
        sx={{ ...getBannerStyle(selectedClassification, theme), display: fullClassificationDisplay ? 'block' : 'none'}} 
      >
        {/* Display the fully constructed string */}
        {fullClassificationDisplay}
      </Box>
      
      {/* Header */}
      <Box className={classes.header}>
        <GradientText>
          <Typography variant="h4">Record & Transcribe Live</Typography>
        </GradientText>
        <IconButton onClick={handleCloseWindow}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* Main Content */}
      <Box className={classes.content}>
        <Grid container spacing={2} className={classes.fullHeight}>
          {/* Left Panel - Controls and Information */}
          <Grid item xs={12} md={4}>
            <GradientBorderPaper className={classes.controlPanel}>
              {/* Recording Controls */}
              <Box>
                <Typography variant="h6" gutterBottom>Recording Controls</Typography>
                
                <Box className={classes.audioVisualizer}>
                  <Box className={classes.waveform} ref={waveformRef}>
                    {recordingState === RECORDING_STATES.INACTIVE && (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100%' 
                      }}>
                        <Typography variant="body2" color="textSecondary">
                          Awaiting audio input...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                <Box className={classes.recordingControls}>
                  {recordingState === RECORDING_STATES.INACTIVE && (
                    <Tooltip title={isStartDisabled ? startButtonTooltip : 'Start Recording'} arrow>
                      <span> 
                        <Button
                          variant="contained"
                          className={classes.recordButton}
                          startIcon={<MicIcon />}
                          onClick={startRecording}
                          disabled={isStartDisabled}
                        >
                          {isInitializing ? 'Initializing...' : 'Start Recording'}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  
                  {recordingState === RECORDING_STATES.RECORDING && (
                    <>
                      <Button
                        variant="contained"
                        className={classes.pauseButton}
                        startIcon={<PauseIcon />}
                        onClick={pauseRecording}
                      >
                        Pause
                      </Button>
                      <Button
                        variant="contained"
                        className={classes.stopButton}
                        startIcon={<StopIcon />}
                        onClick={stopRecording}
                      >
                        Stop
                      </Button>
                    </>
                  )}
                  
                  {recordingState === RECORDING_STATES.PAUSED && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayIcon />}
                        onClick={resumeRecording}
                      >
                        Resume
                      </Button>
                      <Button
                        variant="contained"
                        className={classes.stopButton}
                        startIcon={<StopIcon />}
                        onClick={stopRecording}
                      >
                        Stop
                      </Button>
                    </>
                  )}
                </Box>
                
                <Box className={classes.recordingInfo}>
                  {recordingState === RECORDING_STATES.RECORDING && (
                    <Box className={classes.recordingIndicator} />
                  )}
                  {recordingState === RECORDING_STATES.PAUSED && (
                    <Box className={classes.pausedIndicator} />
                  )}
                  {recordingState === RECORDING_STATES.STOPPED && (
                    <Box className={classes.stoppedIndicator} />
                  )}
                  <Typography className={classes.recordingTime}>
                    {formatTime(recordingTime)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                    {recordingState === RECORDING_STATES.RECORDING ? 'Recording...' : 
                     recordingState === RECORDING_STATES.PAUSED ? 'Paused' : 
                     recordingState === RECORDING_STATES.STOPPED ? 'Stopped' : 'Ready'}
                  </Typography>
                </Box>
              </Box>
              
              <Divider />
              
              {/* File Naming */}
              <Box className={classes.formSection}>
                <Typography variant="h6" className={classes.formTitle}>Output Filename</Typography>
                <Box className={classes.inputFields}>
                  <TextField
                    label="Output Filename* (no extension)"
                    variant="outlined"
                    fullWidth
                    value={audioFilename}
                    onChange={(e) => dispatch({ type: ACTIONS.SET_AUDIO_FILENAME, payload: e.target.value })}
                    placeholder="Enter a filename for output audio and transcript files"
                    className={classes.fileNameInput}
                    disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    helperText="Used for both audio (.mp3) and transcript (.pdf) files."
                  />
                </Box>
              </Box>
              
              <Divider />
              
              {/* Classification */}
              <Box className={classes.formSection}>
                <Typography variant="h6" className={classes.formTitle}>Classification</Typography>
                <FormControl variant="outlined" fullWidth required margin="dense">
                  <InputLabel id="security-classification-label">Security Classification</InputLabel>
                  <Select
                    labelId="security-classification-label"
                    value={selectedClassification}
                    onChange={(e) => dispatch({ type: ACTIONS.SET_CLASSIFICATION, payload: e.target.value })}
                    label="Security Classification"
                    disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    error={selectedClassification === 'SELECT A SECURITY CLASSIFICATION'}
                  >
                    <MenuItem 
                      value="SELECT A SECURITY CLASSIFICATION" 
                      disabled 
                      style={{ fontStyle: 'italic', color: theme.palette.text.disabled }}
                    >
                      Select a Security Classification...
                    </MenuItem>
                    {/* Simplified Options */}
                    <MenuItem value="Unclassified">Unclassified</MenuItem>
                    <MenuItem value="Secret">Secret</MenuItem>
                    <MenuItem value="Top Secret">Top Secret</MenuItem>
                  </Select>
                </FormControl>

                {/* Caveat Selection */}
                {selectedClassification !== 'SELECT A SECURITY CLASSIFICATION' && (
                  <FormControl component="fieldset" margin="dense" fullWidth disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}>
                    <RadioGroup 
                      row 
                      aria-label="caveats"
                      name="caveat-selection"
                      value={caveatType}
                      onChange={(e) => dispatch({ type: ACTIONS.SET_CAVEAT_TYPE, payload: e.target.value })}
                    >
                      <FormControlLabel value="none" control={<Radio size="small" />} label="No Caveats" />
                      <FormControlLabel value="custom" control={<Radio size="small" />} label="Caveats" />
                    </RadioGroup>
                  </FormControl>
                )}

                {/* Custom Caveat Input */}
                {selectedClassification !== 'SELECT A SECURITY CLASSIFICATION' && caveatType === 'custom' && (
                  <TextField
                    label="Enter Caveats (e.g., REL TO USA, FVEY)"
                    variant="outlined"
                    fullWidth
                    margin="dense"
                    value={customCaveat}
                    onChange={(e) => dispatch({ type: ACTIONS.SET_CUSTOM_CAVEAT, payload: e.target.value })}
                    disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    required
                    helperText="Separate multiple caveats with commas."
                  />
                )}
              </Box>
              
              <Divider />
              
              {/* Participants */}
              <Box className={classes.formSection}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Key Participants</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addNewParticipantPlaceholder}
                    disabled={recordingState === RECORDING_STATES.RECORDING}
                    size="small"
                  >
                    Add Participant
                  </Button>
                </Box>
                
                <Box className={classes.participantsList}>
                  {participants.length > 0 ? (
                    <List dense disablePadding>
                      {participants.map((participant) => (
                        <ListItem key={participant.id} className={classes.participantListItem}>
                          <ListItemAvatar sx={{ mt: 1.5 }}>
                            <Avatar style={{ backgroundColor: participant.color || theme.palette.primary.main }}>
                              {participant.name ? participant.name.charAt(0) : <PersonIcon fontSize="small"/>}
                            </Avatar>
                          </ListItemAvatar>
                          
                          <Box className={classes.participantFields}>
                            <TextField
                              label="Name"
                              variant="outlined"
                              size="small"
                              fullWidth
                              value={participant.name}
                              onChange={(e) => handleParticipantChange(participant.id, 'name', e.target.value)}
                              disabled={recordingState === RECORDING_STATES.RECORDING}
                            />
                            <Box className={classes.participantFieldRow}>
                              <TextField
                                label="Role"
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={participant.role}
                                onChange={(e) => handleParticipantChange(participant.id, 'role', e.target.value)}
                                disabled={recordingState === RECORDING_STATES.RECORDING}
                              />
                              <TextField
                                label="Rank"
                                variant="outlined"
                                size="small"
                                fullWidth
                                value={participant.rank}
                                onChange={(e) => handleParticipantChange(participant.id, 'rank', e.target.value)}
                                disabled={recordingState === RECORDING_STATES.RECORDING}
                              />
                            </Box>
                            <TextField
                              label="Organization"
                              variant="outlined"
                              size="small"
                              fullWidth
                              value={participant.organization}
                              onChange={(e) => handleParticipantChange(participant.id, 'organization', e.target.value)}
                              disabled={recordingState === RECORDING_STATES.RECORDING}
                            />
                          </Box>
                          
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => removeParticipant(participant.id)}
                            disabled={recordingState === RECORDING_STATES.RECORDING || participants.length <= 1}
                            sx={{ ml: 1, alignSelf: 'center' }}
                          >
                            <DeleteButton size="small" />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary" align="center" sx={{mt: 2}}>
                      Click "Add Participant". (At least one participant is required to begin recording.)
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Divider />
              
              {/* Event Metadata */}
              <Box className={classes.metadataSection}>
                <Typography variant="h6" gutterBottom>Event Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Wargame Name*"
                      variant="outlined"
                      fullWidth
                      size="small"
                      value={eventMetadata.wargame_name}
                      onChange={(e) => dispatch({ 
                        type: ACTIONS.SET_EVENT_METADATA, 
                        payload: {...eventMetadata, wargame_name: e.target.value}
                      })}
                      disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Scenario"
                      variant="outlined"
                      fullWidth
                      size="small"
                      value={eventMetadata.scenario}
                      onChange={(e) => dispatch({ 
                        type: ACTIONS.SET_EVENT_METADATA, 
                        payload: {...eventMetadata, scenario: e.target.value}
                      })}
                      disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phase"
                      variant="outlined"
                      fullWidth
                      size="small"
                      value={eventMetadata.phase}
                      onChange={(e) => dispatch({ 
                        type: ACTIONS.SET_EVENT_METADATA, 
                        payload: {...eventMetadata, phase: e.target.value}
                      })}
                      disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Recording Location"
                      variant="outlined"
                      fullWidth
                      size="small"
                      value={eventMetadata.location}
                      onChange={(e) => dispatch({ 
                        type: ACTIONS.SET_EVENT_METADATA, 
                        payload: {...eventMetadata, location: e.target.value}
                      })}
                      disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Organization"
                      variant="outlined"
                      fullWidth
                      size="small"
                      value={eventMetadata.organization}
                      onChange={(e) => dispatch({ 
                        type: ACTIONS.SET_EVENT_METADATA, 
                        payload: {...eventMetadata, organization: e.target.value}
                      })}
                      disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                    />
                  </Grid>
                </Grid>
              </Box>
            </GradientBorderPaper>
          </Grid>
          
          {/* Right Panel - Transcription and Timeline */}
          <Grid item xs={12} md={8}>
            <GradientBorderPaper className={classes.fullHeight} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Realtime Tagging Header */}
              <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, mb: 1 }}> 
                <Typography variant="h5" align="center">Realtime Tagging</Typography>
              </Box>
              
              {/* Timeline Markers - Further Reduced Padding */}
              <Box sx={{ px: 1.5, pb: 0.5 }}> 
                <Typography variant="h6">Tag Transcription with Timeline Markers</Typography> 
                {/* Dynamic Marker Buttons */}
                <Box className={classes.timelineMarkers} sx={{ mt: 0.5 }}> 
                  {Array.isArray(availableMarkerTypes) && availableMarkerTypes.map((markerType) => (
                    <Button
                      key={markerType.id}
                      variant="outlined"
                      color={markerType.color === 'default' ? 'inherit' : markerType.color} // Use inherit for default
                      startIcon={<FlagIcon />}
                      onClick={() => addMarker(markerType)} // Pass the whole markerType object
                      disabled={recordingState !== RECORDING_STATES.RECORDING}
                      className={classes.markerButton}
                    >
                      {markerType.label}
                    </Button>
                  ))}
                </Box>
                {/* Add Custom Marker UI */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                  <TextField 
                    label="New Marker Label"
                    variant="outlined"
                    size="small"
                    value={customMarkerLabel}
                    onChange={(e) => setCustomMarkerLabel(e.target.value)}
                    sx={{ flexGrow: 1 }}
                    disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                  />
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={handleAddCustomMarkerType}
                    disabled={recordingState === RECORDING_STATES.RECORDING || recordingState === RECORDING_STATES.PAUSED}
                  >
                    Add Type
                  </Button>
                </Box>
                
                {/* Display active markers - Reduced Margin */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}> 
                  {Array.isArray(activeMarkers) && activeMarkers.map((marker) => (
                    <Chip
                      key={marker.id}
                      // Attempt to find label from available types, fallback to marker_type
                      label={`${availableMarkerTypes.find(mt => mt.type === marker.marker_type)?.label || marker.marker_type} at ${formatTime(marker.timestamp)}`}
                      color="primary" // Or potentially use the color from availableMarkerTypes if needed
                      size="small"
                      onDelete={() => dispatch({ type: ACTIONS.REMOVE_MARKER, payload: marker.id })}
                    />
                  ))}
                </Box>
              </Box>
              
              {/* Speaker Tags Section - Further Reduced Padding */}
              <Box sx={{ px: 1.5, pb: 1 }} className={classes.speakerTagsSection}> 
                <Typography variant="h6">Tag Current Speaker</Typography>
                <Box className={classes.speakerTagsContainer} sx={{ mt: 0.5 }}>
                  {participants
                    .filter(p => p.name && p.name.trim() !== '') // Only show participants with non-empty names
                    .map((participant) => (
                      <Chip
                        key={participant.id}
                        avatar={
                          <Avatar style={{ 
                            backgroundColor: participant.color || theme.palette.primary.main, 
                            width: 24, // Smaller avatar for chip
                            height: 24, 
                            fontSize: '0.8rem' 
                          }}>
                            {participant.name.charAt(0)}
                          </Avatar>
                        }
                        label={participant.name}
                        onClick={() => handleSpeakerTagClick(participant)}
                        size="medium"
                        disabled={recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED}
                        sx={{ // Use sx prop for dynamic styling
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: participant.color || theme.palette.primary.light,
                          backgroundColor: 'transparent', // Ensure default background is transparent
                          '& .MuiChip-label': { // Target label for padding
                             paddingLeft: '8px', 
                             paddingRight: '8px',
                          },
                          '&:hover': {
                            backgroundColor: participant.color ? `${participant.color}2A` : theme.palette.action.hover, // Add alpha transparency (e.g., 2A for ~16%)
                          },
                          // Style when disabled
                          '&.Mui-disabled': {
                            borderColor: theme.palette.action.disabledBackground,
                            opacity: 0.6,
                            cursor: 'not-allowed',
                            '&:hover': {
                               backgroundColor: 'transparent',
                            }
                          }
                        }}
                      />
                    ))
                  } 
                  {participants.filter(p => p.name && p.name.trim() !== '').length === 0 && (
                    <Typography variant="body2" color="textSecondary">
                      Add participants with names in the left panel to enable speaker tagging.
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Divider sx={{ mx: 2 }}/> {/* Divider only between sections */} 
              
              {/* Live Transcription */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Centered Header - Changed to h5 */}
                <Typography variant="h5" align="center" gutterBottom sx={{ pt: 1.5, pb: 1 }}> 
                  Live Transcription
                </Typography>
                <AnimatedGradientPaper 
                  className={classes.transcriptionPanel} 
                  ref={transcriptionPanelRef}
                >
                  {transcriptionText ? (
                    <Typography variant="body1" className={classes.transcriptionText}>
                      {transcriptionText}
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography variant="body2" color="textSecondary">
                        Transcription will appear here when recording starts
                      </Typography>
                    </Box>
                  )}
                </AnimatedGradientPaper>
              </Box>
            </GradientBorderPaper>
          </Grid>
        </Grid>
      </Box>
      
      {/* Status Bar */}
      <Box className={classes.statusBar}>
        <Typography variant="body2" color="textSecondary">
          {sessionId ? `Session ID: ${sessionId}` : 'No active session'}
        </Typography>
        <Box>
          {recordingState === RECORDING_STATES.STOPPED && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              onClick={stopRecording}
            >
              Save & Process
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Dialogs */}
      <Dialog
        open={confirmCloseDialog}
        onClose={() => setConfirmCloseDialog(false)}
      >
        <DialogTitle>Confirm Close</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have an active recording session. Closing now will discard your recording.
            Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCloseDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              cancelRecording();
              window.close();
            }} 
            color="error"
          >
            Discard & Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for error messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message={snackbarMessage}
      >
        <Paper style={{ 
          backgroundColor: theme.palette.error.main, 
          color: theme.palette.error.contrastText, 
          padding: theme.spacing(2), 
          borderRadius: theme.shape.borderRadius 
        }}>
          <Typography variant="body2">{snackbarMessage}</Typography>
        </Paper>
      </Snackbar>
    </Box>
  );
};

export default RecordTranscribe;


