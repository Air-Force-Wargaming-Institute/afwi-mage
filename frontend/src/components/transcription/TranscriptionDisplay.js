import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  TextField
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Refresh as RefreshIcon } from '@material-ui/icons';
import { useTranscription, RECORDING_STATES, ACTIONS } from '../../contexts/TranscriptionContext';
import { AnimatedGradientPaper } from '../../styles/StyledComponents';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

const useStyles = makeStyles((theme) => ({
  transcriptionPanel: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1.5),
    marginTop: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    position: 'relative',
    display: 'flex', 
    flexDirection: 'column', 
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
  editableTranscript: {
    flexGrow: 1, 
    '& .MuiOutlinedInput-root': {
        height: '100%', 
         display: 'flex',
         flexDirection: 'column',
    },
    '& .MuiOutlinedInput-input': {
        height: '100% !important', 
        overflowY: 'auto',
        padding: theme.spacing(1.5),
        fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
        lineHeight: 1.8,
    },
  },
}));

const TranscriptionDisplay = () => {
  const classes = useStyles();
  const { state, dispatch } = useTranscription();
  const { token } = useContext(AuthContext);
  const { 
    transcriptionText,
    loadedSessionId,
    recordingState,
  } = state;
  
  const transcriptionPanelRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isEditable = loadedSessionId && 
                     recordingState !== RECORDING_STATES.RECORDING && 
                     recordingState !== RECORDING_STATES.PAUSED;
  
  const fetchTranscription = useCallback(async () => {
    if (!loadedSessionId || !token) {
      if (!token) setError("Cannot fetch transcript: Authentication token not found.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const transcriptionUrl = getGatewayUrl(`/api/transcription/sessions/${loadedSessionId}/transcription`);
      
      console.log(`[API] Fetching transcription from ${transcriptionUrl}`);
      
      const response = await fetch(transcriptionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError("No transcription data found for this session.");
          dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: "" });
        } else {
          const errorText = await response.text();
          throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
        }
      } else {
        const data = await response.json();
        dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: data.full_transcript_text || "" });
      }
      
      setIsLoading(false);

    } catch (fetchError) {
      console.error('[API] Error fetching transcription:', fetchError);
      setError(`Failed to fetch transcription: ${fetchError.message}`);
      setIsLoading(false);
      dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: "" });
    }
  }, [loadedSessionId, dispatch, token]);
  
  useEffect(() => {
    if (loadedSessionId) {
      fetchTranscription();
    } else {
      setIsLoading(false);
      setError(null);
    }
  }, [loadedSessionId, fetchTranscription]);
  
  useEffect(() => {
    const isTextFieldFocused = document.activeElement?.tagName === 'TEXTAREA';
    if (transcriptionPanelRef.current && (!isEditable || !isTextFieldFocused) ) {
      transcriptionPanelRef.current.scrollTop = transcriptionPanelRef.current.scrollHeight;
    }
  }, [transcriptionText, isEditable]);
  
  useEffect(() => {
    console.log('[TranscriptionDisplay] transcriptionText updated:', 
      transcriptionText ? 
      `${transcriptionText.length} chars, starts with: "${transcriptionText.substring(0, 50)}${transcriptionText.length > 50 ? '...' : ''}"` : 
      'empty'
    );
  }, [transcriptionText]);
  
  const handleRetryConnection = () => {
    if (loadedSessionId && error) {
      fetchTranscription();
    }
  };

  const handleTranscriptChange = (event) => {
    dispatch({ type: ACTIONS.SET_TRANSCRIPTION_TEXT, payload: event.target.value });
  };

  return (
    <AnimatedGradientPaper 
        className={classes.transcriptionPanel} 
        ref={transcriptionPanelRef} 
        style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}
    >
      {isLoading && (
        <Box className={classes.loadingOverlay}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 16, color: 'white' }}>
            Loading transcription...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box textAlign="center" mb={2}>
          <Typography variant="body2" className={classes.errorMessage}>
            {error}
          </Typography>
          {loadedSessionId && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRetryConnection}
              className={classes.reconnectButton}
            >
              Retry Fetch
            </Button>
          )}
        </Box>
      )}
      
      {!isLoading && !error && (
        isEditable ? (
          <TextField
            multiline
            fullWidth
            variant="outlined"
            value={transcriptionText || ''} 
            onChange={handleTranscriptChange}
            placeholder="Edit transcription..."
            className={classes.editableTranscript}
            rows={10} 
            sx={{ flexGrow: 1, '& .MuiInputBase-root': { height: '100%' } }}
          />
        ) : transcriptionText ? (
          <Typography variant="body1" className={classes.transcriptionText}>
            {transcriptionText}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="textSecondary">
              {loadedSessionId ? 'No transcript available for this session or an error occurred.' : 'Transcription will appear here...'}
            </Typography>
          </Box>
        )
      )}
    </AnimatedGradientPaper>
  );
};

export default TranscriptionDisplay; 