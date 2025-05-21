// frontend/src/components/transcription/SessionBrowserPanel.js
import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Paper,
  CircularProgress,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Add as AddIcon, Delete as DeleteIcon } from '@material-ui/icons';
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
    '&.Mui-selected': {
        backgroundColor: theme.palette.action.selected,
        '&:hover': {
            backgroundColor: theme.palette.action.selectedHover || theme.palette.action.hover, 
        }
    },
    paddingRight: theme.spacing(7),
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
  listItemSecondaryAction: {
    position: 'absolute',
    right: theme.spacing(1), 
    top: '50%',
    transform: 'translateY(-50%)',
  }
}));

const SessionBrowserPanel = ({ onNavigationAttempt }) => {
  const classes = useStyles();
  const { state, dispatch } = useTranscription();
  const { previousSessions, loadedSessionId, sessionListVersion } = state;
  const { token } = useContext(AuthContext);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setIsLoading(false);
        return; 
      }
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(getGatewayUrl('/api/transcription/sessions'), {
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
  }, [dispatch, token, sessionListVersion]);

  const handleSelectSession = async (sessionId) => {
    if (!token) {
        setError("Authentication token not found.");
        return; 
    }

    const action = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          dispatch({ type: ACTIONS.SET_LOADED_SESSION_ID, payload: sessionId });

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
          
          dispatch({ type: ACTIONS.LOAD_SESSION_DATA, payload: sessionData });
          
        } catch (error) {
          console.error("Error loading session details:", error);
          setError('Failed to load session details: ' + error.message);
          dispatch({ type: ACTIONS.SET_LOADED_SESSION_ID, payload: null });
          dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load session details.' });
        } finally {
           setIsLoading(false);
        }
    };

    if (loadedSessionId === sessionId) return; // Do nothing if the same session is clicked

    if (onNavigationAttempt) {
        onNavigationAttempt(action);
    } else {
        action();
    }
  };

  const handleStartNewSession = () => {
    const action = () => {
        dispatch({ type: ACTIONS.START_NEW_SESSION });
    };
    if (onNavigationAttempt) {
        onNavigationAttempt(action);
    } else {
        action();
    }
  };

  const openDeleteConfirm = (session, event) => {
    event.stopPropagation(); 
    setSessionToDelete(session);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setSessionToDelete(null);
    setShowDeleteConfirm(false);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || !token) {
      setError("Session to delete not specified or token missing.");
      closeDeleteConfirm();
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const deleteUrl = getGatewayUrl(`/api/transcription/sessions/${sessionToDelete.session_id}`);
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 204) {
          // Successfully deleted
        } else {
          const errorText = await response.text();
          throw new Error(`Failed to delete session: ${response.status} ${errorText || response.statusText}`);
        }
      }
      
      dispatch({ type: ACTIONS.DELETE_SESSION_SUCCESS, payload: sessionToDelete.session_id });
      
    } catch (deleteError) {
      console.error("Error deleting session:", deleteError);
      setError(`Failed to delete session: ${deleteError.message}`);
      dispatch({ type: ACTIONS.SET_ERROR, payload: `Failed to delete session: ${deleteError.message}` });
    } finally {
      setIsDeleting(false);
      closeDeleteConfirm();
    }
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
      
      {isLoading && !isDeleting && (
        <Box className={classes.loaderContainer}>
          <CircularProgress size={24} />
        </Box>
      )}
      
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
                disabled={isLoading || isDeleting}
              >
                <ListItemText
                  primary={session.session_name}
                  secondary={`${new Date(session.start_time).toLocaleDateString()} - ${session.event_metadata?.classification || 'N/A'}`}
                />
                <Box className={classes.listItemSecondaryAction}>
                  <Tooltip title="Delete session" placement="top">
                    <span> 
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        size="small"
                        onClick={(e) => openDeleteConfirm(session, e)}
                        disabled={isDeleting && sessionToDelete?.session_id === session.session_id}
                      >
                        {(isDeleting && sessionToDelete?.session_id === session.session_id) ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
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
      <Dialog open={showDeleteConfirm} onClose={closeDeleteConfirm}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete the session "<strong>{sessionToDelete?.session_name}</strong>"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirm} color="primary" disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteSession} color="secondary" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </GradientBorderPaper>
  );
};

export default SessionBrowserPanel; 