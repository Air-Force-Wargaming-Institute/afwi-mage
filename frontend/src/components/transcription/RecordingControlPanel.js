import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Tooltip, 
  useTheme,
  Slider,
  CircularProgress,
  Snackbar
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import { 
  Mic as MicIcon, 
  Stop as StopIcon, 
  Pause as PauseIcon, 
  PlayArrow as PlayIcon,
  PlayCircleFilled as PlayCircleFilledIcon,
  PauseCircleFilled as PauseCircleFilledIcon,
  Error as ErrorIcon
} from '@material-ui/icons';
import WaveSurfer from 'wavesurfer.js';
import { getApiUrl } from '../../config';
import { useTranscription, ACTIONS, RECORDING_STATES } from '../../contexts/TranscriptionContext';

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
    return '';
  }
  if (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '') {
    return `${baseClassification}//${customCaveat.trim().toUpperCase()}`;
  }
  return baseClassification;
};

// Generate a random color for participants (used if default is needed)
const getRandomColor = () => {
    const colors = ['#4285f4', '#ea4335', '#34a853', '#fbbc05', '#9c27b0', '#00bcd4', '#ff5722', '#3f51b5'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const useStyles = makeStyles((theme) => ({
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
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  recordingTime: {
    fontFamily: 'monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    minWidth: '80px',
    textAlign: 'right',
  },
  playbackTimeContainer: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    minWidth: '120px',
    textAlign: 'right',
  },
  sliderContainer: {
    width: '100%',
    padding: theme.spacing(0, 1),
    marginBottom: theme.spacing(1),
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
  '@keyframes pulse': {
    '0%': { opacity: 1, transform: 'scale(1)' },
    '50%': { opacity: 0.6, transform: 'scale(1.1)' },
    '100%': { opacity: 1, transform: 'scale(1)' },
  },
  errorWrapper: {
    backgroundColor: theme.palette.error.light + '20',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  errorIcon: {
    color: theme.palette.error.main,
  },
  errorText: {
    color: theme.palette.error.main,
    fontWeight: 'medium',
    fontSize: '0.875rem',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.shape.borderRadius,
    zIndex: 10,
  },
  statusChip: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.7rem',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    zIndex: 5,
    fontWeight: 'bold',
  },
}));

// Audio processing configuration
const AUDIO_CHUNK_DURATION = 1000; // milliseconds per chunk
const MAX_RETRY_ATTEMPTS = 3;

const RecordingControlPanel = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useTranscription();
  const { 
    recordingState, 
    recordingTime, 
    sessionId, 
    loadedSessionId, 
    audioUrl,
    participants,
    audioFilename,
    eventMetadata,
    classification: selectedClassification,
    caveatType,
    customCaveat
  } = state;

  // Local state and refs managed by this component
  const intervalRef = useRef(null);
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Enhanced error states
  const [recorderError, setRecorderError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('online');
  const [retryCount, setRetryCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Add Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const isSeekingRef = useRef(false);

  const isPlaybackMode = !!loadedSessionId;
  
  // WebSocket references
  const wsRef = useRef(null);

  // --- WaveSurfer Initialization and Event Handling ---
  useEffect(() => {
    if (waveformRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: theme.palette.primary.light,
        progressColor: theme.palette.secondary.main,
        cursorColor: theme.palette.warning.main,
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

      // Playback Event Listeners
      wavesurfer.on('ready', () => {
        console.log('WaveSurfer ready');
        setDuration(wavesurfer.getDuration());
        setPlaybackTime(0);
        setIsPlaying(false);
        setIsWaveformReady(true);
      });
      wavesurfer.on('audioprocess', (time) => {
        if (!isSeekingRef.current) {
            setPlaybackTime(time);
        }
      });
      wavesurfer.on('finish', () => {
        console.log('WaveSurfer finished playing');
        setIsPlaying(false);
        setPlaybackTime(duration);
      });
       wavesurfer.on('seek', (progress) => {
         const newTime = progress * duration;
         setPlaybackTime(newTime);
         console.log('Seeked to:', newTime);
       });

      // Cleanup
      return () => {
        wavesurfer.unAll();
        wavesurfer.destroy();
        wavesurferRef.current = null;
      };
    }
  }, [theme, duration]);

  // Effect to load audio or reset state
  useEffect(() => {
    if (wavesurferRef.current) {
      if (isPlaybackMode && audioUrl) {
        console.log("Loading audio for playback:", audioUrl);
        setIsWaveformReady(false);
        setDuration(0);
        setPlaybackTime(0);
        setIsPlaying(false);
        wavesurferRef.current.load(audioUrl);
      } else if (!isPlaybackMode) {
        wavesurferRef.current.empty();
        setIsWaveformReady(false);
        setDuration(0);
        setPlaybackTime(0);
        setIsPlaying(false);
      }
    }
  }, [isPlaybackMode, audioUrl]);

  // --- Timer Logic ---
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
  
  // --- WebSocket Connection Management ---
  const connectWebSocket = useCallback((sessionId) => {
    if (!sessionId || loadedSessionId) return null;
    
    try {
      // Close existing WebSocket if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // This is a simulation for now until backend is ready
      console.log(`[WebSocket] Would connect to stream for session ${sessionId}`);
      
      // In actual implementation, use the proper WebSocket URL
      // const wsUrl = getApiUrl('WEBSOCKET', `/api/transcription/stream/${sessionId}`);
      
      // Simulated WebSocket for development
      wsRef.current = {
        send: (data) => {
          console.log('[WebSocket] Would send chunk:', data instanceof Blob ? `Blob (${data.size} bytes)` : data);
        },
        close: () => {
          console.log('[WebSocket] Connection closed');
          wsRef.current = null;
          setIsStreaming(false);
        }
      };
      
      setIsStreaming(true);
      setSnackbarMessage('WebSocket connection established');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      return wsRef.current;
      
      // Actual WebSocket implementation would look like this:
      /*
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        setIsStreaming(true);
        setApiError(null);
        setNetworkStatus('online');
        setRetryCount(0);
        wsRef.current = ws;
      };
      
      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: ${event.code}`);
        setIsStreaming(false);
        
        // Try to reconnect if closed unexpectedly during recording
        if (recordingState === RECORDING_STATES.RECORDING && !event.wasClean && retryCount < MAX_RETRY_ATTEMPTS) {
          setRetryCount(prev => prev + 1);
          setNetworkStatus('reconnecting');
          
          setTimeout(() => {
            if (recordingState === RECORDING_STATES.RECORDING) {
              connectWebSocket(sessionId);
            }
          }, 2000 * (retryCount + 1)); // Exponential backoff
        } else if (retryCount >= MAX_RETRY_ATTEMPTS) {
          setNetworkStatus('offline');
          setApiError('Failed to maintain connection to server. Recording will continue locally.');
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setApiError('Connection error. Will try to reconnect...');
        
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
      
      return ws;
      */
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setApiError(`WebSocket error: ${error.message}`);
      setNetworkStatus('offline');
      return null;
    }
  }, [loadedSessionId, retryCount, recordingState]);
  
  // Function to stream audio chunks to server
  const streamAudioChunk = useCallback((audioChunk) => {
    if (!wsRef.current || !isStreaming) return;
    
    try {
      // In the real implementation this would send the binary audio data
      wsRef.current.send(audioChunk);
    } catch (error) {
      console.error('[WebSocket] Error sending audio chunk:', error);
      setApiError(`Failed to stream audio: ${error.message}`);
      
      // Connection might be broken, try to reconnect
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        connectWebSocket(sessionId);
      }
    }
  }, [connectWebSocket, isStreaming, retryCount, sessionId]);

  // --- Recording Logic ---
  const initializeRecording = useCallback(async () => {
    if (loadedSessionId) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Cannot record while viewing a past session.' });
      return null;
    }
    
    try {
      setIsInitializing(true);
      setRecorderError(null);
      setApiError(null);
      
      // Check for required fields
      const hasFilename = audioFilename && audioFilename.trim() !== '';
      const hasWargameName = eventMetadata?.wargame_name && eventMetadata.wargame_name.trim() !== '';
      const hasNamedParticipant = participants.length > 0 && participants.some(p => p.name && p.name.trim() !== '');
      const hasSelectedClassification = selectedClassification && selectedClassification !== 'SELECT A SECURITY CLASSIFICATION';
      const hasSelectedCaveatType = !hasSelectedClassification || caveatType === 'none' || (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '');
      
      if (!hasFilename || !hasWargameName || !hasNamedParticipant || !hasSelectedClassification || !hasSelectedCaveatType) {
        let errorMsg = 'Please provide required information: ';
        if (!hasFilename) errorMsg += 'Session Name, ';
        if (!hasWargameName) errorMsg += 'Wargame Name, ';
        if (!hasNamedParticipant) errorMsg += 'at least one named Participant, ';
        if (!hasSelectedClassification) errorMsg += 'Security Classification, ';
        else if (!hasSelectedCaveatType) errorMsg += 'Custom Caveat, ';
        
        setRecorderError(errorMsg.slice(0, -2)); // Remove trailing comma and space
        setIsInitializing(false);
        return null;
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000 // 128 kbps
      });
      setMediaRecorder(recorder);

      // Handle data available events
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Add to local chunks storage
          setAudioChunks(chunks => [...chunks, e.data]);
          
          // Stream to server if connected
          streamAudioChunk(e.data);
        }
      };
      
      // Ensure we have participants, or create a default one
      let currentParticipants = participants;
      if (currentParticipants.length === 0) {
        currentParticipants = [{
          id: 'default-participant',
          name: 'Speaker 1',
          role: 'Primary Speaker',
          color: getRandomColor(),
        }];
        dispatch({ type: ACTIONS.SET_PARTICIPANTS, payload: currentParticipants });
      }
      
      // Create API payload
      const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
      const apiPayload = {
        user_id: 'current-user', // In production, use actual user ID
        session_name: audioFilename,
        output_format_preferences: { 
          audio_format: 'mp3', 
          transcription_format: 'pdf' 
        },
        event_metadata: {
          ...eventMetadata,
          classification: fullClassification,
          datetime: new Date().toISOString()
        },
        participants: currentParticipants
      };
      
      // Start API session
      try {
        const sessionApiUrl = getApiUrl('TRANSCRIPTION', '/api/transcription/start-session');
        console.log('[API] Would start session with payload:', apiPayload);
        
        // Simulate API call for now
        setTimeout(() => {
          // Generate fake session ID
          const fakeSessionId = `session_${Date.now()}`;
          
          // Set session ID in state
          dispatch({ type: ACTIONS.SET_SESSION_ID, payload: fakeSessionId });
          
          // Establish WebSocket connection
          connectWebSocket(fakeSessionId);
          
          setIsInitializing(false);
          setSnackbarMessage('Recording session started');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }, 1000);
        
        // In actual implementation:
        /*
        const response = await fetch(sessionApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error (${response.status}): ${errorText}`);
        }
        
        const sessionData = await response.json();
        dispatch({ type: ACTIONS.SET_SESSION_ID, payload: sessionData.session_id });
        
        // Establish WebSocket connection using the streaming URL from the response
        connectWebSocket(sessionData.session_id);
        */
      } catch (error) {
        console.error('[API] Error starting session:', error);
        setApiError(`Failed to start session: ${error.message}`);
        
        // We can still record locally even if API fails
        setSnackbarMessage('Failed to connect to server. Recording will continue locally.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }
      
      return recorder;
    } catch (error) {
      console.error('Error initializing recording:', error);
      
      if (error.name === 'NotAllowedError') {
        setRecorderError('Microphone access denied. Please allow microphone access and try again.');
      } else {
        setRecorderError(`Failed to initialize recording: ${error.message}`);
      }
      
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to initialize recording: ' + error.message });
      
      // Clean up any resources
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      setMediaRecorder(null);
      setIsInitializing(false);
      return null;
    }
  }, [
    loadedSessionId, dispatch, 
    audioFilename, eventMetadata, 
    selectedClassification, caveatType, customCaveat, 
    participants, connectWebSocket, streamAudioChunk
  ]);

  const startRecording = useCallback(async () => {
    if (loadedSessionId) return;
    
    const recorder = await initializeRecording();
    if (recorder) {
      // Start recording with regular chunks
      recorder.start(AUDIO_CHUNK_DURATION);
      
      // Update state
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      dispatch({ type: ACTIONS.SET_RECORDING_TIME, payload: 0 });
      setAudioChunks([]);
      
      // Start visualizing microphone input (this happens automatically with wavesurfer)
      // In the actual implementation, we might need to do more here
      
      setSnackbarMessage('Recording started');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } else {
      console.log("Initialization failed, cannot start recording.");
    }
  }, [loadedSessionId, initializeRecording, dispatch]);

  const pauseRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || recordingState !== RECORDING_STATES.RECORDING) return;
    
    try {
      // Pause the media recorder
      mediaRecorder.pause();
      
      // Update state
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.PAUSED });
      
      // API call to pause session
      if (sessionId) {
        const pauseUrl = getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/pause`);
        console.log(`[API] Would pause session: ${pauseUrl}`);
        
        // In actual implementation:
        /*
        const response = await fetch(pauseUrl, { method: 'POST' });
        
        if (!response.ok) {
          throw new Error(`API Error (${response.status}): ${await response.text()}`);
        }
        */
        
        // Simulate success
        setSnackbarMessage('Recording paused');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error pausing session:', error);
      setApiError(`Failed to pause session: ${error.message}`);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to sync pause state with server.' });
    }
  }, [loadedSessionId, mediaRecorder, recordingState, dispatch, sessionId]);

  const resumeRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || recordingState !== RECORDING_STATES.PAUSED) return;
    
    try {
      // Resume the media recorder
      mediaRecorder.resume();
      
      // Update state
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      
      // API call to resume session
      if (sessionId) {
        const resumeUrl = getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/resume`);
        console.log(`[API] Would resume session: ${resumeUrl}`);
        
        // In actual implementation:
        /*
        const response = await fetch(resumeUrl, { method: 'POST' });
        
        if (!response.ok) {
          throw new Error(`API Error (${response.status}): ${await response.text()}`);
        }
        */
        
        // Simulate success
        setSnackbarMessage('Recording resumed');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      setApiError(`Failed to resume session: ${error.message}`);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to sync resume state with server.' });
    }
  }, [loadedSessionId, mediaRecorder, recordingState, dispatch, sessionId]);

  const stopRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED)) return;
    
    try {
      // Stop the media recorder
      mediaRecorder.stop();
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.STOPPED });
      
      // Stop all audio tracks
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const baseFilename = audioFilename || 'Untitled_Recording';
      const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
      
      // API call to stop and finalize session
      if (sessionId) {
        // Prepare API payload
        const stopPayload = {
          audio_filename: baseFilename,
          transcription_filename: baseFilename,
          include_timestamps: true,
          include_speakers: true,
          classification: fullClassification,
          output_formats: ['pdf', 'docx', 'txt'],
          additional_processing: { 
            speaker_diarization: true, 
            highlight_low_confidence: true, 
            include_markers: true, 
            include_annotations: true 
          }
        };
        
        const stopUrl = getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/stop`);
        console.log(`[API] Would stop session: ${stopUrl}`);
        console.log(`[API] With payload:`, stopPayload);
        
        // In actual implementation:
        /*
        const response = await fetch(stopUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stopPayload)
        });
        
        if (!response.ok) {
          throw new Error(`API Error (${response.status}): ${await response.text()}`);
        }
        
        const result = await response.json();
        console.log('Stop session result:', result);
        */
        
        setSnackbarMessage('Recording stopped and saved');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
      
      // Save audio locally (for testing/backup)
      if (audioChunks.length > 0) {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const downloadUrl = URL.createObjectURL(audioBlob);
          
          // Display in waveform for visualization
          if (wavesurferRef.current) {
            wavesurferRef.current.loadBlob(audioBlob);
          }
          
          // Create download link
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${baseFilename}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
          
          console.log('Audio saved locally');
        } catch (saveError) {
          console.error('Error saving audio locally:', saveError);
        }
      } else {
        console.warn("No audio chunks were recorded to save locally.");
      }
    } catch (error) {
      console.error('Error stopping session:', error);
      setApiError(`Failed to stop recording: ${error.message}`);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to stop recording: ' + error.message });
    } finally {
      // Clean up resources
      setAudioChunks([]);
      setMediaRecorder(null);
      setIsStreaming(false);
    }
  }, [
    loadedSessionId, mediaRecorder, recordingState, 
    audioStream, dispatch, sessionId, 
    audioFilename, selectedClassification, caveatType, customCaveat, 
    audioChunks
  ]);

  // --- Validation Logic ---
  const checkCanStartRecording = () => {
    if (loadedSessionId) return false;
    const hasFilename = audioFilename && audioFilename.trim() !== '';
    const hasWargameName = eventMetadata?.wargame_name && eventMetadata.wargame_name.trim() !== '';
    const hasNamedParticipant = participants.length > 0 && participants.some(p => p.name && p.name.trim() !== '');
    const hasSelectedClassification = selectedClassification && selectedClassification !== 'SELECT A SECURITY CLASSIFICATION';
    const hasSelectedCaveatType = !hasSelectedClassification || caveatType === 'none' || (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '');
    return hasFilename && hasWargameName && hasNamedParticipant && hasSelectedClassification && hasSelectedCaveatType;
  };

  const canStartRecording = checkCanStartRecording();
  const isStartDisabled = isInitializing || !canStartRecording || !!loadedSessionId;

  let startButtonTooltip = '';
  if (loadedSessionId) {
    startButtonTooltip = 'Cannot start recording while viewing a past session.';
  } else if (!canStartRecording) {
    const missing = [];
    if (!audioFilename || audioFilename.trim() === '') missing.push('Session Name');
    if (!eventMetadata?.wargame_name || eventMetadata.wargame_name.trim() === '') missing.push('Wargame Name');
    if (!participants.some(p => p.name && p.name.trim() !== '')) missing.push('at least one Participant with a Name');
    if (!selectedClassification || selectedClassification === 'SELECT A SECURITY CLASSIFICATION') missing.push('Security Classification');
    else {
      if (!caveatType) missing.push('Caveat Selection');
      else if (caveatType === 'custom' && (!customCaveat || customCaveat.trim() === '')) missing.push('Custom Caveat Text');
    }
    if (missing.length > 0) startButtonTooltip = `Please provide: ${missing.join(', ')}`;
  }

  // --- Playback Handlers ---
  const handlePlayPause = () => {
    if (wavesurferRef.current && isWaveformReady) {
      wavesurferRef.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const handleStopPlayback = () => {
    if (wavesurferRef.current && isWaveformReady) {
      wavesurferRef.current.stop();
      setIsPlaying(false);
      setPlaybackTime(0);
    }
  };

  // Use useCallback for performance
  const handleSliderChange = useCallback((event, newValue) => {
      if (wavesurferRef.current && isWaveformReady && duration > 0) {
          const newTime = newValue;
          setPlaybackTime(newTime);
      }
  }, [isWaveformReady, duration]);

  const handleSliderChangeCommitted = useCallback((event, newValue) => {
       if (wavesurferRef.current && isWaveformReady && duration > 0) {
           isSeekingRef.current = true;
           const seekPosition = newValue / duration;
           wavesurferRef.current.seekTo(seekPosition);
           setTimeout(() => { isSeekingRef.current = false; }, 100);
       }
   }, [isWaveformReady, duration]);
   
  // Close WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // Handle global network status changes
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      // Attempt to reconnect if recording
      if (recordingState === RECORDING_STATES.RECORDING && sessionId) {
        connectWebSocket(sessionId);
      }
    };
    
    const handleOffline = () => {
      setNetworkStatus('offline');
      setApiError('Network connection lost. Recording will continue locally.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectWebSocket, recordingState, sessionId]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Controls</Typography>
      
      {/* Error Messages */}
      {(recorderError || apiError) && (
        <Box className={classes.errorWrapper}>
          <ErrorIcon className={classes.errorIcon} />
          <Typography className={classes.errorText}>
            {recorderError || apiError}
          </Typography>
        </Box>
      )}
      
      {/* Audio Visualizer */}
      <Box className={classes.audioVisualizer}>
        {/* Status indicator */}
        {isStreaming && (
          <Typography className={classes.statusChip}>
            Streaming
          </Typography>
        )}
        
        {/* Loading overlay */}
        {isInitializing && (
          <Box className={classes.loadingOverlay}>
            <CircularProgress />
          </Box>
        )}
        
        <Box className={classes.waveform} ref={waveformRef}>
          {/* Placeholder text shown initially */}
          {(!isPlaybackMode && recordingState === RECORDING_STATES.INACTIVE) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="textSecondary">Awaiting audio input...</Typography>
            </Box>
          )}
          {(isPlaybackMode && !audioUrl) && (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="textSecondary">No audio file found for this session.</Typography>
             </Box>
          )}
          {(isPlaybackMode && audioUrl && !isWaveformReady) && (
               <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body2" color="textSecondary">Loading audio...</Typography>
               </Box>
           )}
        </Box>
      </Box>

      {/* Playback Slider (Only in Playback Mode) */} 
      {isPlaybackMode && (
          <Box className={classes.sliderContainer}>
              <Slider
                  aria-label="Audio Progress"
                  value={playbackTime}
                  min={0}
                  max={duration}
                  onChange={handleSliderChange}
                  onChangeCommitted={handleSliderChangeCommitted}
                  disabled={!isWaveformReady || duration === 0}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatTime(value)}
                  step={0.1}
              />
          </Box>
      )}

      {/* Recording/Playback Controls */}
      <Box className={classes.recordingControls}>
        {!isPlaybackMode ? (
          <>
            {/* Recording Buttons */}
            {recordingState === RECORDING_STATES.INACTIVE && (
              <Tooltip title={isStartDisabled ? startButtonTooltip : 'Start Recording'} arrow>
                <span>
                  <Button 
                    variant="contained" 
                    className={classes.recordButton} 
                    startIcon={isInitializing ? <CircularProgress size={20} color="inherit" /> : <MicIcon />} 
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
                <Button variant="contained" className={classes.pauseButton} startIcon={<PauseIcon />} onClick={pauseRecording}>Pause</Button>
                <Button variant="contained" className={classes.stopButton} startIcon={<StopIcon />} onClick={stopRecording}>Stop & Save</Button>
              </>
            )}
            {recordingState === RECORDING_STATES.PAUSED && (
              <>
                <Button variant="contained" color="primary" startIcon={<PlayIcon />} onClick={resumeRecording}>Resume</Button>
                <Button variant="contained" className={classes.stopButton} startIcon={<StopIcon />} onClick={stopRecording}>Stop & Save</Button>
              </>
            )}
          </>
        ) : (
          /* Playback Controls */
          <>
            <Tooltip title={isPlaying ? "Pause" : "Play"} arrow>
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isPlaying ? <PauseCircleFilledIcon /> : <PlayCircleFilledIcon />}
                  onClick={handlePlayPause}
                  disabled={!isWaveformReady || !audioUrl}
                  size="large"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Stop Playback" arrow>
              <span>
                <Button
                  variant="contained"
                  className={classes.stopButton}
                  startIcon={<StopIcon />}
                  onClick={handleStopPlayback}
                  disabled={!isWaveformReady || !audioUrl}
                  size="large"
                >
                  Stop
                </Button>
              </span>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Recording Info / Status */}
      <Box className={classes.recordingInfo}>
        {/* Status Text/Indicator */} 
        <Typography variant="body2" color="textSecondary" sx={{ flexGrow: 1 }}>
          {isPlaybackMode ? 
            (isWaveformReady ? (isPlaying ? 'Playing...' : 'Ready to Play') : 'Loading...') :
            (recordingState === RECORDING_STATES.RECORDING ? 'Recording...' :
            recordingState === RECORDING_STATES.PAUSED ? 'Paused' :
            recordingState === RECORDING_STATES.STOPPED ? 'Stopped' : 'Ready to Record')}
        </Typography>

        {/* Timer/Time Display */} 
        {!isPlaybackMode ? (
             <> 
                 {recordingState === RECORDING_STATES.RECORDING && <Box className={classes.recordingIndicator} />}
                 {recordingState === RECORDING_STATES.PAUSED && <Box className={classes.pausedIndicator} />}
                 {(recordingState === RECORDING_STATES.STOPPED || recordingState === RECORDING_STATES.INACTIVE) && <Box className={classes.stoppedIndicator} />}
                 <Typography className={classes.recordingTime}>
                   {formatTime(recordingTime)}
                 </Typography>
             </>
         ) : (
            <Typography className={classes.playbackTimeContainer}>
                {isWaveformReady ? `${formatTime(playbackTime)} / ${formatTime(duration)}` : '--:-- / --:--'}
            </Typography>
         )}
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RecordingControlPanel; 