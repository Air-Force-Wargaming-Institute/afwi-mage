import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
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
  Error as ErrorIcon,
  GetApp as DownloadIcon
} from '@material-ui/icons';
import { useTranscription, ACTIONS, RECORDING_STATES } from '../../contexts/TranscriptionContext';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

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

// WebSocket constants
const WS_RECONNECT_DELAY_BASE = 2000; // ms

const RecordingControlPanel = ({ 
  waveformRef,
  isAudioPlaying: isParentAudioPlaying,
  currentPlaybackTime: parentCurrentPlaybackTime,
  duration: parentDuration,
  isWaveformReady: parentIsWaveformReady,
  onPlayPause,
  onStopPlayback,
  onSliderChange,
  onSliderChangeCommitted,
  apiError: parentApiError
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useTranscription();
  const { user, token } = useContext(AuthContext);
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
    customCaveat,
    isFinalizingTranscript,
  } = state;

  const intervalRef = useRef(null);
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [recorderError, setRecorderError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [networkStatus, setNetworkStatus] = useState('online');
  const [retryCount, setRetryCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef(null);
  const isStreamingStateRef = useRef(isStreaming);

  const isPlaybackMode = !!loadedSessionId;

  useEffect(() => {
    isStreamingStateRef.current = isStreaming;
  }, [isStreaming]);

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
  
  const connectWebSocket = useCallback((streamingUrl) => {
    if (!streamingUrl || loadedSessionId) return null;
    
    const wsUrl = streamingUrl;

    try {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('[WebSocket] Closing existing connection before reconnecting.');
        wsRef.current.close(1000, "Client initiated reconnect"); 
      }
      
      console.log(`[WebSocket] Attempting to connect to: ${wsUrl}`);
      setNetworkStatus('connecting');
      setSnackbarMessage('Connecting to transcription service...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        setIsStreaming(true);
        setRetryCount(0);
        setSnackbarMessage('WebSocket connection established');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        dispatch({ 
            type: ACTIONS.SET_WEBSOCKET_SENDER, 
            payload: (message) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    try {
                        wsRef.current.send(JSON.stringify(message));
                        return true;
                    } catch (error) {
                        console.error('[WebSocket] Error sending message via context function:', error);
                        return false;
                    }
                } else {
                    console.warn('[WebSocket] Attempted to send message via context when WS not open.');
                    return false;
                }
            }
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data);
          
          if (data.type === 'transcription_update') {
            console.log('[WebSocket] Received transcription segments:', 
              data.segments.length, 
              'segments. First segment:', 
              data.segments[0], 
              'Last segment:', 
              data.segments[data.segments.length - 1]
            );
            
            dispatch({ type: ACTIONS.APPEND_TRANSCRIPTION_SEGMENTS, payload: data.segments });
            console.log('[WebSocket] Dispatched APPEND_TRANSCRIPTION_SEGMENTS action');
          } else if (data.type === 'status_update') {
             console.log(`Status Update: ${data.status} - ${data.message}`);
             if (data.status === 'error') {
                 setSnackbarMessage(data.message || 'Error during processing.');
                 setSnackbarSeverity('error');
                 setSnackbarOpen(true);
             }
          } 
        } catch (error) {
          console.error('[WebSocket] Error parsing message or processing data:', error);
          console.error('[WebSocket] Raw message data:', event.data);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
        setIsStreaming(false);
        wsRef.current = null;
        
        dispatch({ type: ACTIONS.SET_WEBSOCKET_SENDER, payload: null });

        const userStopped = recordingState === RECORDING_STATES.STOPPED || recordingState === RECORDING_STATES.INACTIVE;
        if (event.code === 1000 || event.code === 1001 || userStopped) { 
            setNetworkStatus('offline');
            setRetryCount(0);
            setSnackbarMessage('WebSocket disconnected cleanly.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            return;
        }

        if (!userStopped && retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = WS_RECONNECT_DELAY_BASE * Math.pow(2, retryCount);
          setRetryCount(prev => prev + 1);
          setNetworkStatus('reconnecting');
          setSnackbarMessage(`WebSocket disconnected. Retrying connection in ${delay/1000}s...`);
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
          
          setTimeout(() => {
            if (state.recordingState === RECORDING_STATES.RECORDING || state.recordingState === RECORDING_STATES.PAUSED) {
               console.log(`[WebSocket] Attempting reconnect #${retryCount + 1}...`);
               connectWebSocket(streamingUrl);
            }
          }, delay); 
        } else if (!userStopped) {
          setNetworkStatus('offline');
          setSnackbarMessage('Failed to reconnect. Recording locally.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setSnackbarMessage('WebSocket connection error.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      };
      
      return ws;

    } catch (error) {
      console.error('[WebSocket] Connection setup error:', error);
      setNetworkStatus('offline');
      setSnackbarMessage(`WebSocket connection failed: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      if (wsRef.current) {
           wsRef.current = null;
      }
      return null;
    }
  }, [loadedSessionId, recordingState, retryCount, dispatch, state.recordingState]);
  
  const streamAudioChunk = useCallback((audioChunk) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isStreaming) {
         console.warn('[WebSocket] Attempted to send chunk while not connected/streaming.');
         return;
     }
    
    try {
      wsRef.current.send(audioChunk);
    } catch (error) {
      console.error('[WebSocket] Error sending audio chunk:', error);
      setSnackbarMessage('Error streaming audio. Check connection.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
    }
  }, [isStreaming]);

  const uploadAndTranscribeAudio = useCallback(async (audioBlob, inputFilename) => {
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[TranscriptionUtil] No audio data to upload.');
      setSnackbarMessage('No audio data for utility transcription.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!token) {
      console.error('[TranscriptionUtil] Auth token not available for upload.');
      setSnackbarMessage('Auth token missing. Cannot upload file.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const formData = new FormData();
    const filename = inputFilename && inputFilename.includes('.') ? inputFilename : 'recording.webm';
    formData.append('file', audioBlob, filename);

    console.log(`[TranscriptionUtil] Uploading ${filename} (${(audioBlob.size / 1024).toFixed(2)} KB) for utility transcription...`);
    setSnackbarMessage(`Uploading ${filename} for transcription...`);
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      const response = await fetch(getGatewayUrl('/api/transcription/transcribe-file'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TranscriptionUtil] API Error (${response.status}):`, errorText);
        throw new Error(`Server error ${response.status}: ${errorText || 'Failed to transcribe file'}`);
      }

      const result = await response.json();
      console.log('[TranscriptionUtil] Transcription result:', result);
      const lang = result.language || 'N/A';
      const numSegments = result.segments ? result.segments.length : 0;
      setSnackbarMessage(`File transcribed (${lang}, ${numSegments} segments). Check console for details.`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (error) {
      console.error('[TranscriptionUtil] Error uploading or transcribing file:', error);
      setSnackbarMessage(`Error during utility transcription: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

  const initializeRecording = useCallback(async () => {
    if (loadedSessionId) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Cannot record while viewing a past session.' });
      return null;
    }
    
    try {
      setIsInitializing(true);
      setRecorderError(null);
      
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
        
        setRecorderError(errorMsg.slice(0, -2));
        setIsInitializing(false);
        return null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000
      });
      setMediaRecorder(recorder);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(localChunks => [...localChunks, e.data]);
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isStreamingStateRef.current) {
            console.warn(
              '[WebSocket] Attempted to send chunk while not connected/streaming (checked with refs).',
              'WS ReadyState:', wsRef.current ? wsRef.current.readyState : 'No WS instance',
              'isStreaming Ref:', isStreamingStateRef.current
            );
            return;
          }
          try {
            wsRef.current.send(e.data);
          } catch (error) {
            console.error('[WebSocket] Error sending audio chunk:', error);
          }
        }
      };
      
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
      
      const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
      const apiPayload = {
        user_id: user?.username || 'unknown-user',
        session_name: audioFilename,
        output_format_preferences: { 
          audio_format: 'mp3', 
          transcription_format: 'pdf' 
        },
        event_metadata: {
          ...eventMetadata,
          classification: fullClassification,
        },
        participants: currentParticipants
      };
      
      try {
        console.log('[API] Would start session with payload:', apiPayload);
        
        const response = await fetch(getGatewayUrl('/api/transcription/start-session'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(apiPayload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
        }
        
        const sessionData = await response.json();
        dispatch({ type: ACTIONS.SET_SESSION_ID, payload: sessionData.session_id });
        
        connectWebSocket(sessionData.streaming_url); 
        
        setIsInitializing(false);
        setSnackbarMessage('Recording session started');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        return recorder;
      } catch (error) {
        console.error('[API] Error starting session:', error);
        setSnackbarMessage('Failed to connect to server. Recording will continue locally.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }
      
      return recorder;
    } catch (error) {
      console.error('Error initializing recording:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        setRecorderError('Microphone access denied. Please allow microphone access and try again.');
      } else {
        setRecorderError(`Failed to initialize recording: ${error.message}`);
      }
      
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to initialize recording: ' + error.message });
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      setMediaRecorder(null);
      setIsInitializing(false);
      return null;
    }
  }, [
    loadedSessionId, dispatch, token, user,
    audioFilename, eventMetadata, 
    selectedClassification, caveatType, customCaveat, 
    participants, connectWebSocket,
    audioStream 
  ]);

  const startRecording = useCallback(async () => {
    if (loadedSessionId) return;
    
    const recorder = await initializeRecording();
    if (recorder) {
      recorder.start(AUDIO_CHUNK_DURATION);
      
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      dispatch({ type: ACTIONS.SET_RECORDING_TIME, payload: 0 });
      setAudioChunks([]);
      
      setSnackbarMessage('Recording started');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } else {
      console.log("Initialization failed, cannot start recording.");
    }
  }, [loadedSessionId, initializeRecording, dispatch, token]);

  const pauseRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || recordingState !== RECORDING_STATES.RECORDING) return;
    
    try {
      mediaRecorder.pause();
      
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.PAUSED });
      
      if (sessionId && token) {
        const pauseUrl = getGatewayUrl(`/api/transcription/sessions/${sessionId}/pause`);
        console.log(`[API] Pausing session: ${pauseUrl}`);
        
        const response = await fetch(pauseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API Error (${response.status}): ${await response.text() || response.statusText}`);
        }
        
        setSnackbarMessage('Recording paused');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error pausing session:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to sync pause state with server.' });
    }
  }, [loadedSessionId, mediaRecorder, recordingState, dispatch, sessionId, token]);

  const resumeRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || recordingState !== RECORDING_STATES.PAUSED) return;
    
    try {
      mediaRecorder.resume();
      
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      
      if (sessionId && token) {
        const resumeUrl = getGatewayUrl(`/api/transcription/sessions/${sessionId}/resume`);
        console.log(`[API] Resuming session: ${resumeUrl}`);
        
        const response = await fetch(resumeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API Error (${response.status}): ${await response.text() || response.statusText}`);
        }
        
        setSnackbarMessage('Recording resumed');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to sync resume state with server.' });
    }
  }, [loadedSessionId, mediaRecorder, recordingState, dispatch, sessionId, token, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

  const retranscribeFinalAudio = useCallback(async (sessionId, completeAudioBlob) => {
    if (!sessionId || !token) {
      console.error('[FinalTranscription] Missing session ID or token');
      return;
    }
    
    if (!completeAudioBlob || completeAudioBlob.size === 0) {
      console.error('[FinalTranscription] Missing or empty audio blob');
      return;
    }

    // Helper function to format timestamps (HH:MM:SS)
    const formatTimestampForFile = (seconds) => {
      if (seconds === null || seconds === undefined) return "00:00:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return [
        h.toString().padStart(2, '0'),
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
      ].join(':');
    };

    try {
      console.log(`[FinalTranscription] Starting final transcription of audio blob: ${(completeAudioBlob.size / 1024).toFixed(2)} KB`);
      
      setSnackbarMessage('Performing final transcription for improved accuracy...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      
      const formData = new FormData();
      formData.append('file', completeAudioBlob, `session_${sessionId}.webm`);
      
      console.log('[FinalTranscription] Sending audio blob to transcribe-file endpoint...');
      const transcribeResponse = await fetch(getGatewayUrl('/api/transcription/transcribe-file'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!transcribeResponse.ok) {
        const errorText = await transcribeResponse.text();
        throw new Error(`Failed to transcribe audio: ${transcribeResponse.status} - ${errorText}`);
      }
      
      console.log('[FinalTranscription] Received response from transcribe-file endpoint');
      const transcribeResult = await transcribeResponse.json();
      console.log('[FinalTranscription] Response parsed:', transcribeResult);
      
      if (!transcribeResult.segments || !Array.isArray(transcribeResult.segments)) { // Allow empty segments array
        console.warn('[FinalTranscription] No segments array in transcription result:', transcribeResult);
        setSnackbarMessage('Final transcription produced no segments data.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        // Update DB with empty text if appropriate, or handle as error
        dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: "" }); 
        // Optionally PUT empty text to backend here if that's the desired outcome
        // For now, we'll let it proceed to generate empty fullTextWithTimestamps
      }
      
      const sortedSegments = transcribeResult.segments ? [...transcribeResult.segments].sort((a, b) => (a.start || 0) - (b.start || 0)) : [];
      
      let fullTextWithTimestamps = '';
      sortedSegments.forEach(segment => {
        if (segment.text && segment.text.trim() !== "") { // Ensure text is not just whitespace
          // Provide a default speaker label if 'speaker' is missing or UNKNOWN
          const speakerName = segment.speaker && segment.speaker !== 'UNKNOWN' ? segment.speaker : 'SPEAKER';
          const speakerLabel = `${speakerName}: `;
          const startTime = formatTimestampForFile(segment.start); // segment.start should exist
          fullTextWithTimestamps += `[${startTime}] ${speakerLabel}${segment.text.trim()}\n`;
        }
      });
      
      if (transcribeResult.segments && transcribeResult.segments.length > 0 && !fullTextWithTimestamps) {
        console.warn('[FinalTranscription] Segments found, but all had empty or whitespace-only text. Transcript will be empty.');
      } else if (!fullTextWithTimestamps && (!transcribeResult.segments || transcribeResult.segments.length === 0)) {
        console.warn('[FinalTranscription] Generated transcript text is empty. Original segments were likely empty or missing.');
      }
      
      // Ensure fullTextWithTimestamps is at least an empty string if no valid segments found
      fullTextWithTimestamps = fullTextWithTimestamps || "";

      console.log(`[FinalTranscription] Generated transcript text with timestamps (${fullTextWithTimestamps.length} chars).`);
      
      dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: fullTextWithTimestamps });
      
      console.log('[FinalTranscription] Updating database with new transcript text (with timestamps)');
      const updateResponse = await fetch(getGatewayUrl(`/api/transcription/sessions/${sessionId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_transcript_text: fullTextWithTimestamps,
          // Optionally, if the backend should also store these re-transcribed segments:
          // transcription_segments: sortedSegments, 
        })
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update transcript in database: ${updateResponse.status} - ${errorText}`);
      }
      
      const updateResult = await updateResponse.json();
      console.log('[FinalTranscription] Database update successful:', updateResult);
      
      setSnackbarMessage('Final transcript updated with enhanced accuracy');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('[FinalTranscription] Error:', error);
      setSnackbarMessage(`Final transcript update had an issue: ${error.message}`);
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
    }
  }, [token, dispatch, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

  const stopRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED)) return;
    
    // Set loading state immediately
    dispatch({ type: ACTIONS.SET_IS_FINALIZING_TRANSCRIPT, payload: true });
    setSnackbarMessage('Finalizing session...'); // General message initially
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    const sessionToStop = sessionId;
    const currentAudioFilename = audioFilename || 'Untitled_Recording';

    let successfullyStoppedOnBackend = false;

    try {
      mediaRecorder.stop();
      // Recording state is set to STOPPED, UI will reflect this part quickly
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.STOPPED }); 
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Closing connection on stop...');
        wsRef.current.close(1000, "Recording stopped by user");
      }
      setIsStreaming(false); 
      isStreamingStateRef.current = false;

      if (sessionToStop && token) {
        console.log(`[API] Attempting to stop session ${sessionToStop} on backend.`);

        try {
          const stopSessionUrl = getGatewayUrl(`/api/transcription/sessions/${sessionToStop}/stop`);
          const requestBody = {
            audio_filename: currentAudioFilename,
            transcription_filename: currentAudioFilename,
          };
          
          const response = await fetch(stopSessionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] Error stopping session ${sessionToStop}:`, response.status, errorText);
            setSnackbarMessage(`Server error finalizing session: ${errorText || response.statusText}`);
            setSnackbarSeverity('error');
            throw new Error(`Server error ${response.status} during session stop`);
          } else {
            const result = await response.json();
            console.log(`[API] Session ${sessionToStop} stopped successfully on backend:`, result);
            setSnackbarMessage('Session finalized. Fetching final transcript...');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            successfullyStoppedOnBackend = true;
            
            dispatch({ type: ACTIONS.MARK_SESSION_SAVED }); 

            console.log(`[API] Fetching final transcript for session ${sessionToStop}`);

            try {
              const transcriptUrl = getGatewayUrl(`/api/transcription/sessions/${sessionToStop}/transcription`);
              const transcriptResponse = await fetch(transcriptUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (!transcriptResponse.ok) {
                const errorText = await transcriptResponse.text();
                throw new Error(`Failed to fetch final transcript: ${transcriptResponse.status} ${errorText}`);
              }
              const transcriptData = await transcriptResponse.json();
              dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: transcriptData.full_transcript_text || "" });
              
              setSnackbarMessage('Final transcript loaded.');
              setSnackbarSeverity('success');
            } catch (fetchTranscriptError) {
              console.error('[API] Error fetching final transcript:', fetchTranscriptError);
              setSnackbarMessage(`Error fetching final transcript: ${fetchTranscriptError.message}`);
              setSnackbarSeverity('error');
              throw fetchTranscriptError;
            }
          }
        } catch (apiStopError) {
          console.error(`[API] Network or other error stopping session ${sessionToStop}:`, apiStopError);
          throw apiStopError;
        }
      } else {
        console.warn('[API] No session ID or token available to stop session on backend.');
        setSnackbarMessage('No active server session to stop. Local recording only.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        dispatch({ type: ACTIONS.SET_IS_FINALIZING_TRANSCRIPT, payload: false });
      }
      
      // Local audio blob processing (backup)
      const completeAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      if (completeAudioBlob.size > 0) {
        try {
          const downloadUrl = URL.createObjectURL(completeAudioBlob);
          if (waveformRef && waveformRef.current) {
            // waveformRef.current.loadBlob(completeAudioBlob); // Commented out as per previous review, WaveSurfer loads differently in parent
          }
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${currentAudioFilename}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
          console.log('Audio also saved locally (backup).');
        } catch (saveError) {
          console.error('Error processing local audio blob:', saveError);
        }
      }

    } catch (error) { 
      console.error('Error during stopRecording process:', error);
      setSnackbarMessage(`Failed to stop recording: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to stop recording: ' + error.message });
    } finally {
      setAudioChunks([]);
      setMediaRecorder(null);
      dispatch({ type: ACTIONS.SET_WEBSOCKET_SENDER, payload: null });
      dispatch({ type: ACTIONS.SET_IS_FINALIZING_TRANSCRIPT, payload: false }); 
      if (snackbarMessage && !snackbarOpen) setSnackbarOpen(true);
    }
  },
  [
    loadedSessionId, mediaRecorder, recordingState, token, user,
    audioStream, dispatch, sessionId, 
    audioFilename, 
    audioChunks,
    setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen,
    waveformRef 
  ]
);

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

  const handleDownloadAudio = async () => {
    if (!loadedSessionId || !audioUrl || !token) {
      setSnackbarMessage('Audio not available for download or not authenticated.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setSnackbarMessage('Preparing audio for download...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      const response = await fetch(audioUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch audio: ${response.status} ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      let filename = 'downloaded_audio';
      if (audioFilename) {
        filename = audioFilename.includes('.') ? audioFilename : `${audioFilename}.webm`;
      } else if (audioUrl) {
        try {
            const urlPath = new URL(audioUrl).pathname;
            const lastSegment = urlPath.substring(urlPath.lastIndexOf('/') + 1);
            if (lastSegment) filename = lastSegment;
        } catch (e) { /* ignore_error */ }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setSnackbarMessage('Audio download started.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (error) {
      console.error('Error downloading audio:', error);
      setSnackbarMessage(`Failed to download audio: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    return () => {
      dispatch({ type: ACTIONS.SET_WEBSOCKET_SENDER, payload: null });
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('[WebSocket] Closing connection on component unmount.');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dispatch]);
  
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      if (recordingState === RECORDING_STATES.RECORDING && sessionId) {
        connectWebSocket(sessionId);
      }
    };
    
    const handleOffline = () => {
      setNetworkStatus('offline');
      setSnackbarMessage('Network connection lost. Recording will continue locally.');
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
      
      {(recorderError || parentApiError) && (
        <Box className={classes.errorWrapper}>
          <ErrorIcon className={classes.errorIcon} />
          <Typography className={classes.errorText}>
            {recorderError || parentApiError}
          </Typography>
        </Box>
      )}
      
      <Box className={classes.audioVisualizer}>
        {isStreaming && ( <Typography className={classes.statusChip}>Streaming</Typography> )}
        {isInitializing && ( <Box className={classes.loadingOverlay}><CircularProgress /></Box> )}
        
        <Box className={classes.waveform} ref={waveformRef}>
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
          {(isPlaybackMode && audioUrl && !parentIsWaveformReady) && (
               <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body2" color="textSecondary">Loading audio...</Typography>
               </Box>
           )}
        </Box>
      </Box>

      {isPlaybackMode && (
          <Box className={classes.sliderContainer}>
              <Slider
                  aria-label="Audio Progress"
                  value={parentCurrentPlaybackTime} 
                  min={0}
                  max={parentDuration}
                  onChange={onSliderChange}
                  onChangeCommitted={onSliderChangeCommitted}
                  disabled={!parentIsWaveformReady || parentDuration === 0}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => formatTime(value)}
                  step={0.1}
              />
          </Box>
      )}

      <Box className={classes.recordingControls}>
        {!isPlaybackMode ? (
          <>
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
          <>
            <Tooltip title={isParentAudioPlaying ? "Pause" : "Play"} arrow>
              <span>
                <Button
                  variant="contained" color="primary"
                  startIcon={isParentAudioPlaying ? <PauseCircleFilledIcon /> : <PlayCircleFilledIcon />}
                  onClick={onPlayPause}
                  disabled={!parentIsWaveformReady || !audioUrl}
                  size="large"
                >
                  {isParentAudioPlaying ? 'Pause' : 'Play'}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Stop Playback" arrow>
              <span>
                <Button
                  variant="contained" className={classes.stopButton}
                  startIcon={<StopIcon />}
                  onClick={onStopPlayback}
                  disabled={!parentIsWaveformReady || !audioUrl}
                  size="large"
                >
                  Stop
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Download Audio File" arrow>
              <span>
                <Button
                  variant="outlined" 
                  color="default"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadAudio}
                  disabled={!parentIsWaveformReady || !audioUrl || !loadedSessionId}
                  size="large"
                >
                  Download Audio
                </Button>
              </span>
            </Tooltip>
          </>
        )}
      </Box>

      <Box className={classes.recordingInfo}>
        <Typography variant="body2" color="textSecondary" sx={{ flexGrow: 1 }}>
          {isPlaybackMode ? 
            (parentIsWaveformReady ? (isParentAudioPlaying ? 'Playing...' : 'Ready to Play') : 'Loading...') :
            (recordingState === RECORDING_STATES.RECORDING ? 'Recording...' :
            recordingState === RECORDING_STATES.PAUSED ? 'Paused' :
            recordingState === RECORDING_STATES.STOPPED ? 'Stopped' : 'Ready to Record')}
        </Typography>

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
                {parentIsWaveformReady ? `${formatTime(parentCurrentPlaybackTime)} / ${formatTime(parentDuration)}` : '--:-- / --:--'}
            </Typography>
         )}
      </Box>
      
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