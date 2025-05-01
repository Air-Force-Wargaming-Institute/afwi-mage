// frontend/src/components/transcription/SessionBrowserPanel.js
import React, { useState, useEffect, useContext } from 'react';
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
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

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
  const { token } = useContext(AuthContext);
  
  // Add loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setIsLoading(false);
        return; // Don't fetch if no token
      }
      try {
        setIsLoading(true);
        setError(null);
        
        const sessionApiUrl = getGatewayUrl('/api/transcription/sessions');
        
        const response = await fetch(sessionApiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch sessions: ${response.status} ${errorText || response.statusText}`);
        }
        const data = await response.json();
        dispatch({ type: ACTIONS.SET_PREVIOUS_SESSIONS, payload: data.sessions || [] });
        
      } catch (error) {
        console.error("Error fetching previous sessions:", error);
        setError('Failed to load previous sessions: ' + error.message);
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load previous sessions.' });
      } finally {
         setIsLoading(false);
      }
    };
    
    fetchSessions();
  }, [dispatch, token]);

  const handleSelectSession = async (sessionId) => {
    if (!token) {
        setError("Authentication token not found.");
        return; 
    }
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Set the loadedSessionId optimistically
      dispatch({ type: ACTIONS.SET_LOADED_SESSION_ID, payload: sessionId });

      // 2. Fetch full session data from API using sessionId
      const sessionDetailsUrl = getGatewayUrl(`/api/transcription/sessions/${sessionId}`);
      
      const response = await fetch(sessionDetailsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch session details: ${response.status} ${errorText || response.statusText}`);
      }
      const sessionData = await response.json();
      
      // 3. Dispatch LOAD_SESSION_DATA with actual fetched data
      dispatch({ type: ACTIONS.LOAD_SESSION_DATA, payload: sessionData });
      
    } catch (error) {
      console.error("Error loading session details:", error);
      setError('Failed to load session details: ' + error.message);
      // Reset loadedSessionId if failed
      dispatch({ type: ACTIONS.SET_LOADED_SESSION_ID, payload: null });
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load session details.' });
    } finally {
       setIsLoading(false);
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
                  secondary={`${new Date(session.start_time).toLocaleDateString()} - ${session.event_metadata?.classification || 'N/A'}`}
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