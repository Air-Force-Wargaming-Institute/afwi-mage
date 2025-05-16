import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Avatar,
  Divider,
  Snackbar,
  useTheme,
  CircularProgress
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Flag as FlagIcon, Person as PersonIcon, Add as AddIcon } from '@material-ui/icons';
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

// Helper function to construct full classification string (needed for markers)
const constructClassificationString = (baseClassification, caveatType, customCaveat) => {
  if (!baseClassification || baseClassification === 'SELECT A SECURITY CLASSIFICATION') {
    return '';
  }
  if (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '') {
    return `${baseClassification}//${customCaveat.trim().toUpperCase()}`;
  }
  return baseClassification;
};

const useStyles = makeStyles((theme) => ({
  formSection: {
    marginBottom: theme.spacing(1.5),
  },
  formTitle: {
    marginBottom: theme.spacing(0.5),
    fontWeight: 'bold',
  },
  timelineMarkers: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  markerButton: {
    marginRight: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
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
  speakerAvatar: {
    backgroundColor: props => props.color || theme.palette.primary.main,
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  markerLoading: {
    position: 'relative',
    '& .MuiCircularProgress-root': {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -10,
      marginLeft: -10,
    },
  },
  errorMessage: {
    color: theme.palette.error.main,
    fontSize: '0.75rem',
    marginTop: theme.spacing(1),
  },
}));

const RealtimeTaggingPanel = ({ isReadOnly }) => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useTranscription();
  const { token, user } = useContext(AuthContext);
  const {
    sessionId,
    recordingState,
    recordingTime, // Needed for marker timestamp
    participants,
    markers: activeMarkers,
    availableMarkerTypes,
    loadedSessionId,
    // Need classification info for markers
    classification: selectedClassification,
    caveatType,
    customCaveat,
    sendWebSocketMessage,
  } = state;

  const [customMarkerLabel, setCustomMarkerLabel] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Added states for API integration
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [markerError, setMarkerError] = useState(null);
  const [isAddingCustomMarker, setIsAddingCustomMarker] = useState(false);
  const [pendingMarkerId, setPendingMarkerId] = useState(null);
  
  // Added states for speaker tagging
  const [taggingSpeaker, setTaggingSpeaker] = useState(false);
  const [speakerError, setSpeakerError] = useState(null);
  const [pendingSpeakerId, setPendingSpeakerId] = useState(null);

  // Add a timeline marker
  const addMarker = async (markerType) => {
    if (loadedSessionId || recordingState !== RECORDING_STATES.RECORDING) {
      setSnackbarMessage('Can only add markers during active recording.');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setIsAddingMarker(true);
      setMarkerError(null);
      setPendingMarkerId(markerType.id);
      
      if (!token) {
        setMarkerError("Authentication token not found.");
        setIsAddingMarker(false);
        setPendingMarkerId(null);
        return;
      }
      
      const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
      
      // Create local marker ID for optimistic UI update
      const localMarkerId = `marker-${Date.now()}`;
      
      // Add marker to local state (optimistic update)
      const newMarker = {
        id: localMarkerId,
        marker_type: markerType.type,
        timestamp: recordingTime,
        description: `${markerType.label} at ${formatTime(recordingTime)}`,
        classification: fullClassification,
        user_id: user?.username || 'unknown-user'
      };
      
      dispatch({ type: ACTIONS.ADD_MARKER, payload: {
        type: markerType.type,
        label: markerType.label,
        timestamp: recordingTime,
        classification: fullClassification
      }});

      // API Call to save marker
      if (sessionId) {
        // Prepare API payload based on API spec
        const markerPayload = {
          marker_type: markerType.type,
          timestamp: recordingTime,
          description: `${markerType.label} marker added at ${formatTime(recordingTime)}`,
          classification: fullClassification,
          user_id: user?.username || 'unknown-user'
        };
        
        // Endpoint URL
        const markerEndpoint = getGatewayUrl(`/api/transcription/sessions/${sessionId}/markers`);
        
        const response = await fetch(markerEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(markerPayload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Marker added successfully via API:', responseData);
        
        // Update UI on success
        setSnackbarMessage(`Added ${markerType.label} marker at ${formatTime(recordingTime)}`);
        setSnackbarOpen(true);
      } else {
        throw new Error("Session ID is missing, cannot save marker.");
      }
    } catch (error) {
      console.error('Error adding marker:', error);
      setMarkerError(`Failed to add marker: ${error.message}`);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to save marker to server.' });
      setSnackbarMessage('Failed to save marker to server.');
      setSnackbarOpen(true);
    } finally {
      setIsAddingMarker(false);
      setPendingMarkerId(null);
    }
  };

  // Add a custom marker type
  const handleAddCustomMarkerType = async () => {
    const trimmedLabel = customMarkerLabel.trim();
    if (!trimmedLabel) {
      setSnackbarMessage('Please enter a label for the custom marker type.');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setIsAddingCustomMarker(true);
      setMarkerError(null);
      
      dispatch({ type: ACTIONS.ADD_CUSTOM_MARKER_TYPE, payload: trimmedLabel });
      setCustomMarkerLabel('');
      
      // In a production app, we might want to persist custom marker types
      // This would require an additional API endpoint not currently defined
      
      // Simulate success
      setTimeout(() => {
        setSnackbarMessage(`Added new marker type: ${trimmedLabel}`);
        setSnackbarOpen(true);
        setIsAddingCustomMarker(false);
      }, 500);
    } catch (error) {
      console.error('Error adding custom marker type:', error);
      setMarkerError(`Failed to add custom marker type: ${error.message}`);
      setIsAddingCustomMarker(false);
      setSnackbarMessage('Failed to add custom marker type.');
      setSnackbarOpen(true);
    }
  };

  // Handler for clicking a speaker tag
  const handleSpeakerTagClick = async (participant) => {
    if (loadedSessionId || (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED)) {
      setSnackbarMessage('Can only tag speakers during active or paused recording.');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setTaggingSpeaker(true);
      setSpeakerError(null);
      setPendingSpeakerId(participant.id);
      
      const currentTime = recordingTime;
      console.log(`Attempting speaker tag: ${participant.name} (ID: ${participant.id}) at time ${formatTime(currentTime)}`);
      
      // Use the WebSocket sender function from context
      if (sendWebSocketMessage) {
        const speakerTagPayload = {
          type: "speaker_tag", // Explicitly define type for backend WS router
          speaker_id: participant.id,
          timestamp: currentTime
        };
        
        console.log('[WebSocket] Sending speaker_tag message:', speakerTagPayload);
        const success = sendWebSocketMessage(speakerTagPayload); // Send the message

        if (success) {
          // UI update on successful send attempt
          setSnackbarMessage(`Tagged speaker: ${participant.name} at ${formatTime(currentTime)}`);
          setSnackbarOpen(true);
          // Optimistic update? Maybe add a temporary marker?
          // dispatch({ type: ACTIONS.ADD_MARKER, payload: { type: 'speaker_tag_event', label: `Tagged ${participant.name}`, timestamp: currentTime }});
        } else {
          // Handle send failure (e.g., WS not connected)
          throw new Error("WebSocket not connected or send failed.");
        }
      } else {
        console.error("sendWebSocketMessage function not available in context.");
        throw new Error("Cannot send speaker tag: WebSocket sender not ready.");
      }
    } catch (error) {
      console.error('Error tagging speaker:', error);
      setSpeakerError(`Failed to tag speaker: ${error.message}`);
      setSnackbarMessage('Failed to tag speaker.');
      setSnackbarOpen(true);
    } finally {
      setTaggingSpeaker(false);
      setPendingSpeakerId(null);
    }
  };
  
  // Remove marker (with API integration)
  const handleRemoveMarker = async (markerId) => {
    if (loadedSessionId) return; // Can't remove markers in loaded session
    
    try {
      // Optimistic update - remove from local state first
      dispatch({ type: ACTIONS.REMOVE_MARKER, payload: markerId });
      
      // API call to remove marker would go here
      // This is not explicitly defined in the current API spec
      // But would be needed for a complete implementation
      
      if (sessionId) {
        // Possible endpoint structure
        // const removeMarkerEndpoint = getApiUrl('TRANSCRIPTION', `/api/transcription/sessions/${sessionId}/markers/${markerId}`);
        
        // This would be the actual API call to delete a marker
        /*
        const response = await fetch(removeMarkerEndpoint, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to remove marker: ${response.status}`);
        }
        */
        
        // Simulate success
        console.log(`[API] Would remove marker ${markerId} from session ${sessionId}`);
      }
    } catch (error) {
      console.error('Error removing marker:', error);
      setSnackbarMessage('Failed to remove marker from server.');
      setSnackbarOpen(true);
      
      // We could revert the optimistic update here if needed
      // by refetching markers from API
    }
  };

  return (
    <Box>
        {/* Timeline Markers Section */}
        <Box className={classes.formSection}>
            <Typography variant="h6" className={classes.formTitle}>Timeline Markers</Typography>
            <Box className={classes.timelineMarkers} sx={{ mt: 0.5 }}>
            {Array.isArray(availableMarkerTypes) && availableMarkerTypes.map((markerType) => (
                <Button
                    key={markerType.id}
                    variant="outlined"
                    color={markerType.color === 'default' ? 'inherit' : markerType.color}
                    startIcon={<FlagIcon />}
                    onClick={() => addMarker(markerType)}
                    disabled={isReadOnly || recordingState !== RECORDING_STATES.RECORDING || isAddingMarker || pendingMarkerId === markerType.id}
                    className={`${classes.markerButton} ${pendingMarkerId === markerType.id ? classes.markerLoading : ''}`}
                    size="small"
                >
                {pendingMarkerId === markerType.id ? (
                  <>
                    {markerType.label}
                    <CircularProgress size={20} />
                  </>
                ) : (
                  markerType.label
                )}
                </Button>
            ))}
            </Box>
            
            {markerError && (
              <Typography variant="body2" className={classes.errorMessage}>
                {markerError}
              </Typography>
            )}
            
            {/* Add Custom Marker UI */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
            <TextField
                label="New Marker Label"
                variant="outlined"
                size="small"
                value={customMarkerLabel}
                onChange={(e) => setCustomMarkerLabel(e.target.value)}
                sx={{ flexGrow: 1 }}
                disabled={isReadOnly || isAddingCustomMarker}
            />
            <Button 
                variant="contained" 
                size="small" 
                onClick={handleAddCustomMarkerType} 
                disabled={isReadOnly || isAddingCustomMarker || !customMarkerLabel.trim()} 
                startIcon={isAddingCustomMarker ? <CircularProgress size={20} /> : <AddIcon />}
            >
                Add Type
            </Button>
            </Box>
            {/* Display Active Markers */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            {Array.isArray(activeMarkers) && activeMarkers.map((marker) => (
                <Chip
                    key={marker.id}
                    label={`${availableMarkerTypes.find(mt => mt.type === marker.marker_type)?.label || marker.marker_type} at ${formatTime(marker.timestamp)}`}
                    color="primary" // Consider using marker specific color?
                    size="small"
                    onDelete={loadedSessionId ? undefined : () => handleRemoveMarker(marker.id)} // Allow delete only if not loaded
                    disabled={loadedSessionId} // Disable delete chip if loaded
                />
            ))}
            </Box>
        </Box>

        <Divider />

        {/* Speaker Tags Section - Conditionally render based on loadedSessionId */}
        {!loadedSessionId && (
            <Box sx={{ pt: 1.5 }} className={classes.speakerTagsSection}>
            <Typography variant="h6" className={classes.formTitle}>Tag Current Speaker</Typography>
            <Box className={classes.speakerTagsContainer} sx={{ mt: 0.5 }}>
                {participants.filter(p => p.name && p.name.trim() !== '').map((participant) => (
                <Chip
                    key={participant.id}
                    avatar={<Avatar style={{ backgroundColor: participant.color || theme.palette.primary.main, width: 24, height: 24, fontSize: '0.8rem' }}>{participant.name.charAt(0)}</Avatar>}
                    label={pendingSpeakerId === participant.id ? 'Tagging...' : participant.name}
                    onClick={() => handleSpeakerTagClick(participant)}
                    size="medium"
                    disabled={
                      isReadOnly || 
                      (recordingState !== RECORDING_STATES.RECORDING && recordingState !== RECORDING_STATES.PAUSED) || 
                      taggingSpeaker || 
                      pendingSpeakerId === participant.id
                    }
                    sx={{ 
                      cursor: 'pointer', 
                      border: '1px solid', 
                      borderColor: participant.color || theme.palette.primary.light, 
                      backgroundColor: 'transparent', 
                      '& .MuiChip-label': { 
                        paddingLeft: '8px', 
                        paddingRight: '8px' 
                      }, 
                      '&:hover': { 
                        backgroundColor: participant.color ? `${participant.color}2A` : theme.palette.action.hover 
                      }, 
                      '&.Mui-disabled': { 
                        borderColor: theme.palette.action.disabledBackground, 
                        opacity: 0.6, 
                        cursor: 'not-allowed', 
                        '&:hover': { 
                          backgroundColor: 'transparent' 
                        }
                      }
                    }}
                />
                ))}
                {participants.filter(p => p.name && p.name.trim() !== '').length === 0 && (
                <Typography variant="body2" color="textSecondary">Add participants with names to enable speaker tagging.</Typography>
                )}
            </Box>
            
            {speakerError && (
              <Typography variant="body2" className={classes.errorMessage}>
                {speakerError}
              </Typography>
            )}
            </Box>
        )}

        {/* Local Snackbar for component-specific messages */}
        <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} // Place differently from main snackbar
            message={snackbarMessage}
        />
    </Box>
  );
};

export default RealtimeTaggingPanel; 