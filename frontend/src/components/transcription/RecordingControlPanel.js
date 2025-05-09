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
  Error as ErrorIcon
} from '@material-ui/icons';
import WaveSurfer from 'wavesurfer.js';
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

const RecordingControlPanel = () => {
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
  const isStreamingStateRef = useRef(isStreaming);

  useEffect(() => {
    isStreamingStateRef.current = isStreaming;
  }, [isStreaming]);

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
  }, [theme]);

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
  const connectWebSocket = useCallback((streamingUrl) => {
    if (!streamingUrl || loadedSessionId) return null;
    
    // Append token as query parameter
    const wsUrl = streamingUrl;

    try {
      // Close existing WebSocket if any
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('[WebSocket] Closing existing connection before reconnecting.');
        wsRef.current.close(1000, "Client initiated reconnect"); 
      }
      
      console.log(`[WebSocket] Attempting to connect to: ${wsUrl}`);
      setNetworkStatus('connecting'); // Update status
      setSnackbarMessage('Connecting to transcription service...');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws; // Assign early to allow cleanup
      
      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        setIsStreaming(true);
        setApiError(null);
        setNetworkStatus('online');
        setRetryCount(0);
        setSnackbarMessage('WebSocket connection established');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        // Provide the sender function to the context
        dispatch({ 
            type: ACTIONS.SET_WEBSOCKET_SENDER, 
            payload: (message) => { // Define the sender function
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    try {
                        wsRef.current.send(JSON.stringify(message));
                        return true; // Indicate success
                    } catch (error) {
                        console.error('[WebSocket] Error sending message via context function:', error);
                        setApiError('Failed to send WebSocket message.');
                        // Optionally show snackbar
                        return false; // Indicate failure
                    }
                } else {
                    console.warn('[WebSocket] Attempted to send message via context when WS not open.');
                    setApiError('WebSocket not connected. Cannot send message.');
                    // Optionally show snackbar
                    return false; // Indicate failure
                }
            }
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data); // Log received message
          
          if (data.type === 'transcription_update') {
            // Dispatch action to update transcription in context
            // Assuming TranscriptionContext handles appending/updating segments
            if (data.segments && Array.isArray(data.segments)) {
               // Enhanced logging to debug transcription updates
               console.log('[WebSocket] Received transcription segments:', 
                 data.segments.length, 
                 'segments. First segment:', 
                 data.segments[0], 
                 'Last segment:', 
                 data.segments[data.segments.length - 1]
               );
               
               dispatch({ type: ACTIONS.APPEND_TRANSCRIPTION_SEGMENTS, payload: data.segments });
               console.log('[WebSocket] Dispatched APPEND_TRANSCRIPTION_SEGMENTS action');
            } else {
                console.warn('[WebSocket] Received transcription_update without valid segments array:', data);
            }
          } else if (data.type === 'status_update') {
             console.log(`Status Update: ${data.status} - ${data.message}`);
             // Potentially update UI based on backend status
             if (data.status === 'error') {
                 setApiError(data.message || 'WebSocket processing error.');
                 setSnackbarMessage(data.message || 'Error during processing.');
                 setSnackbarSeverity('error');
                 setSnackbarOpen(true);
             }
          } 
          // Add handling for other message types if needed

        } catch (error) {
          console.error('[WebSocket] Error parsing message or processing data:', error);
          console.error('[WebSocket] Raw message data:', event.data);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
        setIsStreaming(false);
        wsRef.current = null; // Clear ref on close
        
        // Clear the sender function from context on close
        dispatch({ type: ACTIONS.SET_WEBSOCKET_SENDER, payload: null });

        // Don't automatically reconnect if stopped cleanly by user or server
        const userStopped = recordingState === RECORDING_STATES.STOPPED || recordingState === RECORDING_STATES.INACTIVE;
        if (event.code === 1000 || event.code === 1001 || userStopped) { 
            setNetworkStatus('offline');
            setApiError(null); // Clear previous errors if closed cleanly
            setSnackbarMessage('WebSocket disconnected cleanly.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            return; // Don't reconnect
        }

        // Try to reconnect if closed unexpectedly during recording/paused
        if (!userStopped && retryCount < MAX_RETRY_ATTEMPTS) {
          const delay = WS_RECONNECT_DELAY_BASE * Math.pow(2, retryCount); // Exponential backoff
          setRetryCount(prev => prev + 1);
          setNetworkStatus('reconnecting');
          setApiError(`WebSocket closed unexpectedly. Retrying (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
          setSnackbarMessage(`WebSocket disconnected. Retrying connection in ${delay/1000}s...`);
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
          
          setTimeout(() => {
            // Only reconnect if still in a recording/paused state
            if (state.recordingState === RECORDING_STATES.RECORDING || state.recordingState === RECORDING_STATES.PAUSED) {
               console.log(`[WebSocket] Attempting reconnect #${retryCount + 1}...`);
               connectWebSocket(streamingUrl); // Retry connection
            }
          }, delay); 
        } else if (!userStopped) {
          // Max retries reached
          setNetworkStatus('offline');
          setApiError('Failed to maintain connection to server. Recording locally.');
          setSnackbarMessage('Failed to reconnect. Recording locally.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        // onclose will likely be called after onerror, handle state updates there
        setApiError('WebSocket connection error occurred.'); 
        setSnackbarMessage('WebSocket connection error.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        // No need to close here, onclose should handle it
      };
      
      return ws; // Return the WebSocket instance

    } catch (error) {
      console.error('[WebSocket] Connection setup error:', error);
      setApiError(`WebSocket setup failed: ${error.message}`);
      setNetworkStatus('offline');
      setSnackbarMessage(`WebSocket connection failed: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      if (wsRef.current) { // Ensure ref is cleared on setup error
           wsRef.current = null;
      }
      return null;
    }
  }, [loadedSessionId, recordingState, retryCount, dispatch, state.recordingState]);
  
  // Function to stream audio chunks to server
  const streamAudioChunk = useCallback((audioChunk) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isStreaming) {
         console.warn('[WebSocket] Attempted to send chunk while not connected/streaming.');
         return;
     }
    
    try {
      // Send the binary audio data (Blob)
      wsRef.current.send(audioChunk);
    } catch (error) {
      console.error('[WebSocket] Error sending audio chunk:', error);
      setApiError(`Failed to stream audio: ${error.message}`);
      setSnackbarMessage('Error streaming audio. Check connection.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
    }
  }, [isStreaming]);

  // --- New Function to Upload and Transcribe Full Audio File ---
  const uploadAndTranscribeAudio = useCallback(async (audioBlob, inputFilename) => {
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[TranscriptionUtil] No audio data to upload.');
      setApiError('No audio data to send for utility transcription.');
      setSnackbarMessage('No audio data for utility transcription.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!token) {
      console.error('[TranscriptionUtil] Auth token not available for upload.');
      setApiError('Authentication token missing. Cannot upload file.');
      setSnackbarMessage('Auth token missing. Cannot upload file.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    const formData = new FormData();
    // The backend expects the file under the key "file"
    // Use a generic name or the one from input, ensuring it has an extension
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
          // 'Content-Type': 'multipart/form-data' // This is set automatically by the browser when using FormData
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
      // TODO: Do something with the transcription result (e.g., display it, store in context)
      // For now, just show a success message with detected language
      const lang = result.language || 'N/A';
      const numSegments = result.segments ? result.segments.length : 0;
      setSnackbarMessage(`File transcribed (${lang}, ${numSegments} segments). Check console for details.`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (error) {
      console.error('[TranscriptionUtil] Error uploading or transcribing file:', error);
      setApiError(`Failed to transcribe utility: ${error.message}`);
      setSnackbarMessage(`Error during utility transcription: ${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [token, setApiError, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);
  // --- End of New Function ---

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
          setAudioChunks(localChunks => [...localChunks, e.data]);
          // Directly use wsRef.current and the new isStreamingStateRef.current for the check
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
            setApiError(`Failed to stream audio: ${error.message}`);
            // Optionally show snackbar or dispatch error to context
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
      
      // Start API session
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
        
        // Pass the actual streaming URL to connectWebSocket
        connectWebSocket(sessionData.streaming_url); 
        
        setIsInitializing(false);
        setSnackbarMessage('Recording session started');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        return recorder;
      } catch (error) {
        console.error('[API] Error starting session:', error);
        setApiError(`Failed to start session: ${error.message}`);
        
        // We can still record locally even if API fails
        setSnackbarMessage('Failed to connect to server. Recording will continue locally.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }
      
      return recorder; // Return recorder even if API call failed for local recording
    } catch (error) {
      console.error('Error initializing recording:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
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
  }, [loadedSessionId, initializeRecording, dispatch, token]);

  const pauseRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || recordingState !== RECORDING_STATES.RECORDING) return;
    
    try {
      // Pause the media recorder
      mediaRecorder.pause();
      
      // Update state
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.PAUSED });
      
      // API call to pause session
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
  }, [loadedSessionId, mediaRecorder, recordingState, dispatch, sessionId, token]);

  const resumeRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || recordingState !== RECORDING_STATES.PAUSED) return;
    
    try {
      // Resume the media recorder
      mediaRecorder.resume();
      
      // Update state
      dispatch({ type: ACTIONS.SET_RECORDING_STATE, payload: RECORDING_STATES.RECORDING });
      
      // API call to resume session
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
  }, [loadedSessionId, mediaRecorder, recordingState, dispatch, sessionId, token, setApiError, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen]);

  const stopRecording = useCallback(async () => {
    if (loadedSessionId || !mediaRecorder || (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED)) return;
    
    const sessionToStop = sessionId; // Capture session ID before potential state changes
    const currentAudioFilename = audioFilename || 'Untitled_Recording'; // Capture filename

    // Prepare to call the session stop endpoint
    let successfullyStoppedOnBackend = false; 

    try {
      // Stop the media recorder
      mediaRecorder.stop(); // This will trigger the final ondataavailable if any pending data
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
        setSnackbarMessage('Finalizing session on server...');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);

        try {
          const stopSessionUrl = getGatewayUrl(`/api/transcription/sessions/${sessionToStop}/stop`);
          const requestBody = {
            // Provide filenames as per StopSessionRequest schema
            audio_filename: currentAudioFilename, // Backend will add .webm if needed or use this as base
            transcription_filename: currentAudioFilename, // Backend will add .txt or use this as base
            // Other StopSessionRequest fields (like classification, output_formats, etc.)
            // can be added here if needed by the frontend to override backend defaults.
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
            setApiError(`Failed to finalize session on server: ${errorText || response.statusText}`);
            setSnackbarMessage(`Server error finalizing session: ${errorText || response.statusText}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            // successfullyStoppedOnBackend remains false
          } else {
            const result = await response.json();
            console.log(`[API] Session ${sessionToStop} stopped successfully on backend:`, result);
            setSnackbarMessage('Session finalized and saved on server.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            successfullyStoppedOnBackend = true;
            
            dispatch({ type: ACTIONS.MARK_SESSION_SAVED }); 
          }
        } catch (apiStopError) {
          console.error(`[API] Network or other error stopping session ${sessionToStop}:`, apiStopError);
          setApiError(`Network error finalizing session: ${apiStopError.message}`);
          setSnackbarMessage(`Network error finalizing session: ${apiStopError.message}`);
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          // successfullyStoppedOnBackend remains false
        }
      } else {
        console.warn('[API] No session ID or token available to stop session on backend.');
        setSnackbarMessage('No active server session to stop. Local recording only.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
      }
      
      const completeAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      if (completeAudioBlob.size > 0) {
        try {
          const downloadUrl = URL.createObjectURL(completeAudioBlob);
          if (wavesurferRef.current) {
            wavesurferRef.current.loadBlob(completeAudioBlob);
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
      } else {
        console.warn("No audio data was recorded to save locally.");
      }

    } catch (error) { 
      console.error('Error stopping recording process:', error);
      setApiError(`Failed to stop recording: ${error.message}`);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to stop recording: ' + error.message });
    } finally {
      setAudioChunks([]);
      setMediaRecorder(null);
      dispatch({ type: ACTIONS.SET_WEBSOCKET_SENDER, payload: null });
    }
  }, [
    loadedSessionId, mediaRecorder, recordingState, token, user,
    audioStream, dispatch, sessionId, 
    audioFilename, 
    audioChunks,
    uploadAndTranscribeAudio, 
    setApiError, setSnackbarMessage, setSnackbarSeverity, setSnackbarOpen
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
      // Clear the sender function from context on unmount
      dispatch({ type: ACTIONS.SET_WEBSOCKET_SENDER, payload: null });
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        console.log('[WebSocket] Closing connection on component unmount.');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dispatch]);
  
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