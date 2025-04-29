import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Refresh as RefreshIcon } from '@material-ui/icons';
import { useTranscription, RECORDING_STATES, ACTIONS } from '../../contexts/TranscriptionContext';
import { AnimatedGradientPaper } from '../../styles/StyledComponents';
import { getApiUrl } from '../../config';

const useStyles = makeStyles((theme) => ({
  transcriptionPanel: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1.5),
    marginTop: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    position: 'relative',
  },
  transcriptionText: {
    whiteSpace: 'pre-wrap',
    fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
    lineHeight: 1.8,
    textAlign: 'left',
  },
  errorMessage: {
    color: theme.palette.error.main,
    marginBottom: theme.spacing(1),
  },
  reconnectButton: {
    marginTop: theme.spacing(1),
  },
  connectionStatus: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.7rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
  },
  connected: {
    color: theme.palette.success.main,
  },
  connecting: {
    color: theme.palette.warning.main,
  },
  disconnected: {
    color: theme.palette.error.main,
  },
  loadingOverlay: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
}));

// WebSocket connection states
const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
};

const TranscriptionDisplay = () => {
  const classes = useStyles();
  const { state, dispatch } = useTranscription();
  const { 
    transcriptionText, 
    loadedSessionId, 
    sessionId, 
    recordingState 
  } = state;
  
  const transcriptionPanelRef = useRef(null);
  const webSocketRef = useRef(null);
  
  // Local state for WebSocket connection
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [connectionError, setConnectionError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (loadedSessionId || !sessionId || recordingState !== RECORDING_STATES.RECORDING) {
      return;
    }
    
    // Disconnect existing WebSocket if any
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    try {
      setConnectionState(CONNECTION_STATES.CONNECTING);
      setConnectionError(null);
      
      // In actual implementation, use proper WebSocket URL from API
      // const wsUrl = getApiUrl('WEBSOCKET', `/api/transcription/stream/${sessionId}`);
      
      // For development, use a placeholder URL - this will actually throw an error
      // but the implementation structure is correct for when backend is available
      const wsUrl = `ws://localhost:8000/api/transcription/stream/${sessionId}`;
      
      // Instead of creating an actual connection, we'll fake it for now
      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      
      // This would be the actual WebSocket implementation when backend is ready
      /*
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connection established');
        setConnectionState(CONNECTION_STATES.CONNECTED);
        webSocketRef.current = ws;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcription_update') {
            // Handle incoming transcription update
            dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: data.text });
          } else if (data.type === 'status_update') {
            // Handle status update
            console.log(`[WebSocket] Status update: ${data.status}`);
          } else if (data.type === 'speaker_identification') {
            // Handle speaker identification
            console.log(`[WebSocket] Speaker identified: ${data.speaker_id}`);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('Connection error. Please try reconnecting.');
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
      };
      
      ws.onclose = (event) => {
        console.log(`[WebSocket] Connection closed with code ${event.code}`);
        webSocketRef.current = null;
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
        
        // Attempt to reconnect after delay if closed unexpectedly during recording
        if (recordingState === RECORDING_STATES.RECORDING && !event.wasClean) {
          setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };
      */
      
      // Simulate connection success for development
      setTimeout(() => {
        console.log('[WebSocket] Simulated connection established');
        setConnectionState(CONNECTION_STATES.CONNECTED);
        webSocketRef.current = { 
          close: () => console.log('[WebSocket] Simulated close') 
        };
        
        // Start fake transcription updates if in recording state
        if (recordingState === RECORDING_STATES.RECORDING) {
          startFakeTranscriptionUpdates();
        }
      }, 1500);
      
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError(`Failed to connect: ${error.message}`);
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
    }
  }, [dispatch, loadedSessionId, recordingState, sessionId]);
  
  // Simulate transcription updates for development
  const startFakeTranscriptionUpdates = () => {
    const updates = [
      "Starting transcription...",
      "Starting transcription...\n\nSpeaker 1: Hello and welcome to today's session.",
      "Starting transcription...\n\nSpeaker 1: Hello and welcome to today's session.\n\nSpeaker 2: Thank you for having me here.",
      "Starting transcription...\n\nSpeaker 1: Hello and welcome to today's session.\n\nSpeaker 2: Thank you for having me here.\n\nSpeaker 1: Let's begin by discussing the key objectives.",
      "Starting transcription...\n\nSpeaker 1: Hello and welcome to today's session.\n\nSpeaker 2: Thank you for having me here.\n\nSpeaker 1: Let's begin by discussing the key objectives.\n\nSpeaker 2: I think we should focus on the timeline first."
    ];
    
    updates.forEach((text, index) => {
      setTimeout(() => {
        if (recordingState === RECORDING_STATES.RECORDING) {
          dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: text });
        }
      }, (index + 1) * 3000);
    });
  };
  
  // Fetch transcription for loaded sessions
  const fetchTranscription = useCallback(async () => {
    if (!loadedSessionId) return;
    
    try {
      setIsLoading(true);
      setConnectionError(null);
      
      // In actual implementation, use the API endpoint
      const transcriptionUrl = getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${loadedSessionId}/transcription`);
      
      // For now, we'll simulate the API call
      console.log(`[API] Fetching transcription from ${transcriptionUrl}`);
      
      /*
      const response = await fetch(transcriptionUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch transcription: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      // Update transcription text with fetched data
      dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: data.transcription.map(segment => 
        `[${formatTime(segment.start_time)}] ${segment.speaker_id ? `${findSpeakerName(segment.speaker_id)}: ` : ''}${segment.text}`
      ).join('\n\n') });
      */
      
      // Simulate API response
      setTimeout(() => {
        // For now, we'll use the transcription already in state
        // If it's empty, we'll simulate some content
        if (!state.transcriptionText) {
          dispatch({ 
            type: ACTIONS.SET_TRANSCRIPTION_TEXT, 
            payload: "This is a simulated transcription for the loaded session.\n\nIt would normally be retrieved from the backend API."
          });
        }
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('[API] Error fetching transcription:', error);
      setConnectionError(`Failed to fetch transcription: ${error.message}`);
      setIsLoading(false);
    }
  }, [loadedSessionId, dispatch, state.transcriptionText]);
  
  // Connect to WebSocket when recording starts
  useEffect(() => {
    if (recordingState === RECORDING_STATES.RECORDING && !loadedSessionId && sessionId) {
      connectWebSocket();
    } else if (recordingState !== RECORDING_STATES.RECORDING && webSocketRef.current) {
      // Close WebSocket when recording stops
      webSocketRef.current.close();
      webSocketRef.current = null;
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
    }
    
    // Clean up WebSocket on unmount
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
    };
  }, [recordingState, loadedSessionId, sessionId, connectWebSocket]);
  
  // Fetch transcription when loaded session changes
  useEffect(() => {
    if (loadedSessionId) {
      fetchTranscription();
    }
  }, [loadedSessionId, fetchTranscription]);
  
  // Auto-scroll transcription panel
  useEffect(() => {
    if (transcriptionPanelRef.current) {
      transcriptionPanelRef.current.scrollTop = transcriptionPanelRef.current.scrollHeight;
    }
  }, [transcriptionText]);
  
  // Helper function for retry
  const handleRetryConnection = () => {
    if (loadedSessionId) {
      fetchTranscription();
    } else {
      connectWebSocket();
    }
  };
  
  // Connection status indicator
  const renderConnectionStatus = () => {
    if (loadedSessionId) return null;
    
    let statusText = '';
    let statusClass = '';
    
    switch (connectionState) {
      case CONNECTION_STATES.CONNECTED:
        statusText = 'Connected';
        statusClass = classes.connected;
        break;
      case CONNECTION_STATES.CONNECTING:
        statusText = 'Connecting...';
        statusClass = classes.connecting;
        break;
      case CONNECTION_STATES.DISCONNECTED:
        statusText = 'Disconnected';
        statusClass = classes.disconnected;
        break;
      default:
        return null;
    }
    
    return (
      <Typography className={`${classes.connectionStatus} ${statusClass}`}>
        {statusText}
      </Typography>
    );
  };

  return (
    <AnimatedGradientPaper className={classes.transcriptionPanel} ref={transcriptionPanelRef}>
      {/* Connection status indicator */}
      {renderConnectionStatus()}
      
      {/* Loading overlay */}
      {isLoading && (
        <Box className={classes.loadingOverlay}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 16, color: 'white' }}>
            Loading transcription...
          </Typography>
        </Box>
      )}
      
      {/* Error message */}
      {connectionError && (
        <Box textAlign="center" mb={2}>
          <Typography variant="body2" className={classes.errorMessage}>
            {connectionError}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRetryConnection}
            className={classes.reconnectButton}
          >
            Retry
          </Button>
        </Box>
      )}
      
      {/* Transcription content */}
      {transcriptionText ? (
        <Typography variant="body1" className={classes.transcriptionText}>
          {transcriptionText}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" color="textSecondary">
            {loadedSessionId ? 'No transcript found for this session.' : 'Transcription will appear here...'}
          </Typography>
        </Box>
      )}
    </AnimatedGradientPaper>
  );
};

export default TranscriptionDisplay; 