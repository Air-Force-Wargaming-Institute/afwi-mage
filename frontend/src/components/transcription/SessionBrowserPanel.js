// frontend/src/components/transcription/SessionBrowserPanel.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Paper,
  CircularProgress
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Add as AddIcon } from '@material-ui/icons';
import { useTranscription, ACTIONS } from '../../contexts/TranscriptionContext';
import { GradientBorderPaper } from '../../styles/StyledComponents';
import { getApiUrl } from '../../config';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1.5),
    overflowY: 'auto',
  },
  header: {
    marginBottom: theme.spacing(1.5),
  },
  sessionList: {
    flexGrow: 1,
    overflowY: 'auto',
    marginBottom: theme.spacing(1.5),
  },
  listItem: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    // Add styling for selected item
    // selected: {
    //   backgroundColor: theme.palette.action.selected,
    // }
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  errorMessage: {
    color: theme.palette.error.main,
    textAlign: 'center',
    padding: theme.spacing(2),
  },
}));

const SessionBrowserPanel = () => {
  const classes = useStyles();
  const { state, dispatch } = useTranscription();
  const { previousSessions, loadedSessionId } = state;
  
  // Add loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // This will be replaced with an actual API call when backend is ready
        // For now, use a simulated API call structure that will match the expected backend response
        const sessionApiUrl = getApiUrl('TRANSCRIPTION', '/api/transcription/sessions');
        
        // Temporarily use the dummy data to simulate response
        // In production, the commented code would be used
        /* 
        const response = await fetch(sessionApiUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        dispatch({ type: ACTIONS.SET_PREVIOUS_SESSIONS, payload: data.sessions || [] });
        */
        
        // Simulate API response with dummy data
        setTimeout(() => {
          const dummySessions = [
            { session_id: 'sess_123', session_name: 'Morning Briefing', created_at: '2024-07-28T10:00:00Z', classification: 'Secret' },
            { session_id: 'sess_456', session_name: 'Wargame Alpha - Phase 1', created_at: '2024-07-27T14:30:00Z', classification: 'Top Secret' },
            { session_id: 'sess_789', session_name: 'Unclassified Test', created_at: '2024-07-26T09:15:00Z', classification: 'Unclassified' },
          ];
          dispatch({ type: ACTIONS.SET_PREVIOUS_SESSIONS, payload: dummySessions });
          setIsLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error("Error fetching previous sessions:", error);
        setError('Failed to load previous sessions: ' + error.message);
        setIsLoading(false);
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load previous sessions.' });
      }
    };
    
    fetchSessions();
  }, [dispatch]);

  const handleSelectSession = async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Set the loadedSessionId optimistically
      dispatch({ type: ACTIONS.SET_LOADED_SESSION_ID, payload: sessionId });

      // 2. Fetch full session data from API using sessionId
      const sessionDetailsUrl = getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}`);
      
      // In production, use the following code:
      /*
      const response = await fetch(sessionDetailsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch session details: ${response.status} ${response.statusText}`);
      }
      const sessionData = await response.json();
      */
      
      // Simulate API call with dummy data
      setTimeout(() => {
        // Match the structure expected from the API
        const selectedSessionData = {
          session_id: sessionId,
          session_name: previousSessions.find(s => s.session_id === sessionId)?.session_name || "Loaded Session",
          audio_url: "/path/to/dummy/audio.mp3", // Placeholder
          transcription_text: `This is the loaded transcript for session ${sessionId}.\n\nIt contains previously recorded text.`, // Placeholder
          participants: [{ id: 'p1', name: 'Loaded Speaker 1', role: 'Role', color: '#4285f4' }], // Placeholder
          event_metadata: {
            wargame_name: 'Loaded Wargame',
            scenario: 'Loaded Scenario',
            phase: 'Loaded Phase',
            location: 'Loaded Location',
            organization: 'Loaded Org',
            classification: previousSessions.find(s => s.session_id === sessionId)?.classification || 'Unclassified',
            caveat_type: 'none',
            custom_caveat: ''
          },
          markers: [{id: 'm1', marker_type: 'decision', timestamp: 30, description:'Loaded Marker', classification:'Secret'}],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // 3. Dispatch LOAD_SESSION_DATA with fetched data
        dispatch({ type: ACTIONS.LOAD_SESSION_DATA, payload: selectedSessionData });
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error loading session details:", error);
      setError('Failed to load session details: ' + error.message);
      setIsLoading(false);
      // Reset loadedSessionId if failed
      dispatch({ type: ACTIONS.SET_LOADED_SESSION_ID, payload: null });
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load session details.' });
    }
  };

  const handleStartNewSession = () => {
    dispatch({ type: ACTIONS.START_NEW_SESSION });
  };

  return (
    <GradientBorderPaper className={classes.root}>
      <Typography variant="h6" className={classes.header}>Sessions</Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleStartNewSession}
        fullWidth
        style={{ marginBottom: '16px' }}
        disabled={isLoading}
      >
        Start New Session
      </Button>
      <Divider />
      <Typography variant="subtitle1" gutterBottom style={{ marginTop: '16px' }}>Previous Recordings</Typography>
      
      {/* Show loading indicator */}
      {isLoading && (
        <Box className={classes.loaderContainer}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {/* Show error message */}
      {error && (
        <Typography className={classes.errorMessage} variant="body2">
          {error}
        </Typography>
      )}
      
      <Box className={classes.sessionList}>
        {!isLoading && !error && previousSessions.length > 0 ? (
          <List dense disablePadding>
            {previousSessions.map((session) => (
              <ListItem
                key={session.session_id}
                button
                onClick={() => handleSelectSession(session.session_id)}
                className={classes.listItem}
                selected={loadedSessionId === session.session_id}
                disabled={isLoading}
              >
                <ListItemText
                  primary={session.session_name}
                  secondary={`${new Date(session.created_at).toLocaleDateString()} - ${session.classification}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          !isLoading && !error && (
            <Typography variant="body2" color="textSecondary" align="center">
              No previous sessions found.
            </Typography>
          )
        )}
      </Box>
    </GradientBorderPaper>
  );
};

export default SessionBrowserPanel; 