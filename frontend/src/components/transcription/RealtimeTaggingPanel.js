import React, { useState, useContext, useEffect } from 'react';
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
import { Flag as FlagIcon, Person as PersonIcon, Add as AddIcon, Delete as DeleteIcon } from '@material-ui/icons';
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
  markerChip: {
    position: 'relative',
    margin: theme.spacing(0.5),
    paddingRight: theme.spacing(4),
    '& .MuiChip-deleteIcon': {
      position: 'absolute',
      right: theme.spacing(0.5),
      top: '50%',
      transform: 'translateY(-50%)',
      color: theme.palette.error.light,
      '&:hover': {
        color: theme.palette.error.dark,
      }
    }
  },
}));

const RealtimeTaggingPanel = ({ isReadOnly: globalIsReadOnly, isAudioPlaying }) => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useTranscription();
  const { token, user } = useContext(AuthContext);
  const {
    sessionId,
    recordingState,
    recordingTime,
    participants,
    markers: activeMarkers,
    availableMarkerTypes,
    loadedSessionId,
    classification: selectedClassification,
    caveatType,
    customCaveat,
    sendWebSocketMessage,
    playbackTime,
    isPlaying: isContextAudioPlaying,
  } = state;

  const [customMarkerLabel, setCustomMarkerLabel] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [markerError, setMarkerError] = useState(null);
  const [isAddingCustomMarker, setIsAddingCustomMarker] = useState(false);
  const [pendingMarkerId, setPendingMarkerId] = useState(null);
  
  const [taggingSpeaker, setTaggingSpeaker] = useState(false);
  const [speakerError, setSpeakerError] = useState(null);
  const [pendingSpeakerId, setPendingSpeakerId] = useState(null);

  const canAddMarkersDuringPlayback = loadedSessionId && isContextAudioPlaying;

  const canAddMarkers =
    (recordingState === RECORDING_STATES.RECORDING) || canAddMarkersDuringPlayback;

  const currentMarkerTime = canAddMarkersDuringPlayback ? playbackTime :
                            (recordingState === RECORDING_STATES.RECORDING ? recordingTime : playbackTime);

  // New function to update markers on the backend for a loaded session
  const updateMarkersOnBackend = async (markersToSave) => {
    if (!loadedSessionId || !token) return;

    setIsAddingMarker(true); // Reuse existing loading state or create a new one
    setMarkerError(null);

    const backendMarkers = markersToSave.map(marker => {
      const { id, ...restOfMarker } = marker;
      return {
        ...restOfMarker,
        marker_id: id, // Use frontend 'id' as 'marker_id'
        // Ensure 'added_at' is present, especially for new client-side markers
        added_at: marker.added_at || new Date().toISOString(), 
        // Ensure 'user_id' is present
        user_id: marker.user_id || (user?.username || 'unknown-user'),
      };
    });

    try {
      const response = await fetch(getGatewayUrl(`/api/transcription/sessions/${loadedSessionId}`), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ markers: backendMarkers }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error (${response.status}): ${errorData || response.statusText}`);
      }
      
      dispatch({ type: ACTIONS.MARK_SESSION_SAVED }); // This will update initialLoadedData and set isDirty to false
      setSnackbarMessage('Marker changes saved to server.');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating markers on backend:', error);
      setMarkerError(`Failed to save marker changes: ${error.message}`);
      // Optionally, dispatch an action to indicate sync error or revert UI changes
    } finally {
      setIsAddingMarker(false);
    }
  };

  const addMarker = async (markerType) => {
    if (!canAddMarkers) {
      setSnackbarMessage('Can only add markers during active recording or playback.');
      setSnackbarOpen(true);
      return;
    }
    
    // Determine if this is a live recording marker or a playback marker
    const isPlaybackMarker = loadedSessionId && canAddMarkersDuringPlayback;
    
    try {
      setIsAddingMarker(true);
      setMarkerError(null);
      setPendingMarkerId(markerType.id);
      
      const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
      const timestampForMarker = currentMarkerTime;

      const newMarkerPayload = {
        id: `marker-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
        marker_type: markerType.type,
        timestamp: timestampForMarker,
        description: `${markerType.label} at ${formatTime(timestampForMarker)}`,
        classification: fullClassification,
        user_id: user?.username || 'unknown-user',
        added_at: new Date().toISOString(), 
      };
      
      const optimisticNewMarkers = [...activeMarkers, newMarkerPayload];
      dispatch({ type: ACTIONS.ADD_MARKER, payload: newMarkerPayload });

      if (!loadedSessionId && sessionId && token) { // Live session, new marker via POST
        const apiMarkerPayload = {
          marker_type: markerType.type,
          timestamp: timestampForMarker,
          description: `${markerType.label} marker added at ${formatTime(timestampForMarker)}`,
          classification: fullClassification,
        };
        
        const markerEndpoint = getGatewayUrl(`/api/transcription/sessions/${sessionId}/markers`);
        const response = await fetch(markerEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(apiMarkerPayload)
        });
        
        if (!response.ok) {
          dispatch({ type: ACTIONS.REMOVE_MARKER, payload: newMarkerPayload.id });
          throw new Error(`API Error (${response.status}): ${response.statusText}`);
        }
        const responseData = await response.json();
        console.log('Marker added successfully via API (live session):', responseData);
        // For live sessions, we don't call updateMarkersOnBackend as it's a new marker to a live session not PUTting all markers.
      } else if (loadedSessionId && token) { // Loaded session, marker added during playback or review
        // This will be called for markers added via "Add Marker" buttons AND for new speaker tags during playback
        await updateMarkersOnBackend(optimisticNewMarkers);
      }

      setSnackbarMessage(`Added ${markerType.label} marker at ${formatTime(timestampForMarker)}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error adding marker:', error);
      setMarkerError(`Failed to add marker: ${error.message}`);
    } finally {
      setIsAddingMarker(false);
      setPendingMarkerId(null);
    }
  };

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
      
      const currentTime = currentMarkerTime; 
      
      if (sendWebSocketMessage) {
        const speakerTagPayload = {
          type: "speaker_tag",
          speaker_id: participant.id,
          speaker_name: participant.name, 
          speaker_role: participant.role,   
          timestamp: currentTime
        };
        
        const success = sendWebSocketMessage(speakerTagPayload);

        if (success) {
          // Optimistically add marker for live tagging
          const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);
          const optimisticLiveSpeakerMarker = {
            id: `speakertag-live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            marker_type: "speaker_tag_event",
            speaker_id: participant.id,
            speaker_name: participant.name,
            speaker_role: participant.role,
            timestamp: currentTime,
            description: `Speaker: ${participant.name} (${participant.role || 'N/A'}) at ${formatTime(currentTime)}`,
            classification: fullClassification, 
            user_id: user?.username || 'unknown-user',
            added_at: new Date().toISOString(),
          };
          dispatch({ type: ACTIONS.ADD_MARKER, payload: optimisticLiveSpeakerMarker });
          
          setSnackbarMessage(`Tagged speaker: ${participant.name} at ${formatTime(currentTime)}`);
          setSnackbarOpen(true);
        } else {
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
  
  const handleRemoveMarker = async (markerIdToRemove) => {
    if (globalIsReadOnly && !loadedSessionId) {
        setSnackbarMessage('Cannot remove markers in this state.');
        setSnackbarOpen(true);
        return;
    }
    const updatedMarkersAfterRemoval = activeMarkers.filter(m => m.id !== markerIdToRemove);
    dispatch({ type: ACTIONS.REMOVE_MARKER, payload: markerIdToRemove });

    if (loadedSessionId && token) {
      await updateMarkersOnBackend(updatedMarkersAfterRemoval);
    }
  };

  const markerButtonsDisabled = isAddingMarker || !canAddMarkers;
  const finalIsReadOnlyForCustomMarker = globalIsReadOnly || isAddingCustomMarker;

  // New handler for tagging speaker during playback
  const handlePlaybackSpeakerTagClick = async (participant) => {
    if (!loadedSessionId || !canAddMarkersDuringPlayback || !token) {
      setSnackbarMessage('Can only tag speakers during active playback of a loaded session.');
      setSnackbarOpen(true);
      return;
    }

    try {
      setTaggingSpeaker(true); // Reuse existing loading state or create a new one if distinct visual feedback is needed
      setSpeakerError(null);
      setPendingSpeakerId(participant.id); // For visual feedback on the button

      const timestampForMarker = playbackTime; // Use playbackTime
      const fullClassification = constructClassificationString(selectedClassification, caveatType, customCaveat);

      const newSpeakerTagMarker = {
        id: `speakertag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        marker_type: "speaker_tag_event",
        speaker_id: participant.id,
        speaker_name: participant.name,
        speaker_role: participant.role,
        timestamp: timestampForMarker,
        description: `Speaker: ${participant.name} (${participant.role || 'N/A'}) at ${formatTime(timestampForMarker)}`,
        classification: fullClassification, // Or decide if speaker tags need classification
        user_id: user?.username || 'unknown-user',
        added_at: new Date().toISOString(),
      };

      const optimisticNewMarkers = [...activeMarkers, newSpeakerTagMarker];
      dispatch({ type: ACTIONS.ADD_MARKER, payload: newSpeakerTagMarker });

      // Update all markers on the backend
      await updateMarkersOnBackend(optimisticNewMarkers);

      setSnackbarMessage(`Tagged speaker: ${participant.name} at ${formatTime(timestampForMarker)}`);
      setSnackbarOpen(true);

    } catch (error) {
      console.error('Error tagging speaker during playback:', error);
      setSpeakerError(`Failed to tag speaker: ${error.message}`);
      // Optionally revert optimistic update if backend fails
      // dispatch({ type: ACTIONS.REMOVE_MARKER, payload: newSpeakerTagMarker.id });
    } finally {
      setTaggingSpeaker(false);
      setPendingSpeakerId(null);
    }
  };

  return (
    <Box>
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
                    disabled={markerButtonsDisabled || pendingMarkerId === markerType.id || globalIsReadOnly}
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
            
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
            <TextField
                label="New Marker Label"
                variant="outlined"
                size="small"
                value={customMarkerLabel}
                onChange={(e) => setCustomMarkerLabel(e.target.value)}
                sx={{ flexGrow: 1 }}
                disabled={finalIsReadOnlyForCustomMarker || globalIsReadOnly}
            />
            <Button 
                variant="contained" 
                size="small" 
                onClick={handleAddCustomMarkerType} 
                disabled={finalIsReadOnlyForCustomMarker || globalIsReadOnly || !customMarkerLabel.trim()}
                startIcon={isAddingCustomMarker ? <CircularProgress size={20} /> : <AddIcon />}
            >
                Add Type
            </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            {Array.isArray(activeMarkers) && activeMarkers
              .filter(marker => marker.marker_type !== 'speaker_tag_event') // Exclude speaker tags
              .map((marker) => {
                const markerTypeDetails = availableMarkerTypes.find(mt => mt.type === marker.marker_type);
                // Default label for non-speaker tags
                const chipLabel = `${markerTypeDetails?.label || marker.marker_type} at ${formatTime(marker.timestamp)}`;
                
                return (
                    <Chip
                        key={marker.id}
                        label={chipLabel}
                        color="primary" 
                        size="small"
                        onDelete={(loadedSessionId && !globalIsReadOnly) ? () => handleRemoveMarker(marker.id) : undefined}
                        deleteIcon={(loadedSessionId && !globalIsReadOnly) ? <DeleteIcon /> : undefined}
                        className={classes.markerChip}
                        disabled={(!loadedSessionId && globalIsReadOnly) || (loadedSessionId && globalIsReadOnly)}
                    />
                );
            })}
            </Box>
        </Box>

        <Divider />

        {!loadedSessionId && (
            <Box sx={{ pt: 1.5 }} className={classes.speakerTagsSection}>
            <Typography variant="h6" className={classes.formTitle}>Tag Current Speaker (Live)</Typography>
            <Box className={classes.speakerTagsContainer} sx={{ mt: 0.5 }}>
                {participants.filter(p => p.name && p.name.trim() !== '').map((participant) => (
                <Chip
                    key={participant.id}
                    avatar={<Avatar style={{ backgroundColor: participant.color || theme.palette.primary.main, width: 24, height: 24, fontSize: '0.8rem' }}>{participant.name.charAt(0)}</Avatar>}
                    label={pendingSpeakerId === participant.id ? 'Tagging...' : participant.name}
                    onClick={() => handleSpeakerTagClick(participant)}
                    size="medium"
                    disabled={
                      globalIsReadOnly ||
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

        {/* New Section: Tag Speaker During Playback - Renamed to "Tag Speakers" */}
        {loadedSessionId && (
          <Box sx={{ pt: 1.5 }} className={classes.speakerTagsSection}>
            <Typography variant="h6" className={classes.formTitle}>Tag Speakers</Typography>
            <Box className={classes.speakerTagsContainer} sx={{ mt: 0.5 }}>
              {participants.filter(p => p.name && p.name.trim() !== '').map((participant) => (
                <Chip
                  key={`playback-${participant.id}`}
                  avatar={<Avatar style={{ backgroundColor: participant.color || theme.palette.primary.main, width: 24, height: 24, fontSize: '0.8rem' }}>{participant.name.charAt(0)}</Avatar>}
                  label={pendingSpeakerId === participant.id && taggingSpeaker ? 'Tagging...' : participant.name}
                  onClick={() => handlePlaybackSpeakerTagClick(participant)}
                  size="medium"
                  disabled={
                    globalIsReadOnly ||
                    !canAddMarkersDuringPlayback || // Only enabled if playing
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
            {speakerError && ( // Consider if a separate error state for playback tagging is needed
              <Typography variant="body2" className={classes.errorMessage}>
                {speakerError}
              </Typography>
            )}
          </Box>
        )}

        {/* New Display Section for Speaker Tag Markers */}
        <Box className={classes.formSection} sx={{ mt: 2 }}>
            <Typography variant="h6" className={classes.formTitle}>Tagged Speaker Events</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            {Array.isArray(activeMarkers) && activeMarkers
                .filter(marker => marker.marker_type === 'speaker_tag_event') // Only speaker tags
                .map((marker) => {
                // Custom label for speaker tags
                const chipLabel = `${marker.speaker_name || 'Speaker'} at ${formatTime(marker.timestamp)}`;
                return (
                    <Chip
                        key={marker.id}
                        label={chipLabel}
                        // Use participant's color if available, or a default for speaker tags
                        style={{ backgroundColor: participants.find(p=>p.id === marker.speaker_id)?.color || theme.palette.info.light }}
                        size="small"
                        onDelete={(loadedSessionId && !globalIsReadOnly) ? () => handleRemoveMarker(marker.id) : undefined}
                        deleteIcon={(loadedSessionId && !globalIsReadOnly) ? <DeleteIcon /> : undefined}
                        className={classes.markerChip} // Can reuse or define new style
                        disabled={(!loadedSessionId && globalIsReadOnly) || (loadedSessionId && globalIsReadOnly)}
                    />
                );
            })}
            </Box>
        </Box>

        <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            message={snackbarMessage}
        />
    </Box>
  );
};

export default RealtimeTaggingPanel; 