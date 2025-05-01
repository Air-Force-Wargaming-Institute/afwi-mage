import React from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  useTheme
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Add as AddIcon, Person as PersonIcon } from '@material-ui/icons';
import { useTranscription, ACTIONS } from '../../contexts/TranscriptionContext'; // Assuming path is correct
import { DeleteButton } from '../../styles/ActionButtons'; // Assuming path is correct

const useStyles = makeStyles((theme) => ({
  formSection: {
    marginBottom: theme.spacing(1.5),
  },
  formTitle: {
    fontWeight: 'bold', // Make title stand out
  },
  participantsList: {
    maxHeight: '250px', // Consider making this dynamic or larger
    overflow: 'auto',
    marginBottom: theme.spacing(1.5),
  },
  participantListItem: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    alignItems: 'flex-start',
    disableGutters: true,
  },
  participantFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    flexGrow: 1,
    marginLeft: 0,
  },
  participantFieldRow: {
    display: 'flex',
    gap: theme.spacing(1),
  },
}));

// Helper to generate a random color (could be moved to utils)
const getRandomColor = () => {
  const colors = ['#4285f4', '#ea4335', '#34a853', '#fbbc05', '#9c27b0', '#00bcd4', '#ff5722', '#3f51b5'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const ParticipantManager = ({ isReadOnly }) => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useTranscription();
  const { participants, loadedSessionId } = state;

  // Add a new participant placeholder
  const addNewParticipantPlaceholder = () => {
    const newPlaceholder = {
      id: `participant-${Date.now()}`,
      name: '', role: '', rank: '', organization: '', color: getRandomColor(),
    };
    dispatch({ type: ACTIONS.SET_PARTICIPANTS, payload: [...participants, newPlaceholder] });
  };

  // Handle changes in the inline participant fields
  const handleParticipantChange = (id, field, value) => {
    const updatedParticipants = participants.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    dispatch({ type: ACTIONS.SET_PARTICIPANTS, payload: updatedParticipants });
    // TODO: If loadedSessionId, mark state as dirty for Save Changes button (handled in parent?)
  };

  // Remove participant function
  const removeParticipant = (id) => {
    const updatedParticipants = participants.filter(p => p.id !== id);
    dispatch({ type: ACTIONS.SET_PARTICIPANTS, payload: updatedParticipants });
    // TODO: If loadedSessionId, mark state as dirty for Save Changes button (handled in parent?)
  };

  return (
    <Box className={classes.formSection}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" className={classes.formTitle}>Key Participants</Typography>
        <Button startIcon={<AddIcon />} onClick={addNewParticipantPlaceholder} disabled={isReadOnly} size="small">Add</Button>
      </Box>
      <Box className={classes.participantsList}>
        {participants.length > 0 ? (
          <List dense disablePadding>
            {participants.map((participant) => (
              <ListItem key={participant.id} className={classes.participantListItem}>
                <ListItemAvatar sx={{ mt: 1.5, minWidth: 'auto', mr: 1.5 }}>
                  <Avatar style={{ backgroundColor: participant.color || theme.palette.primary.main, width: 32, height: 32 }}>
                    {participant.name ? participant.name.charAt(0) : <PersonIcon fontSize="small"/>}
                  </Avatar>
                </ListItemAvatar>
                <Box className={classes.participantFields}>
                  <TextField label="Name" variant="outlined" size="small" fullWidth value={participant.name || ''} onChange={(e) => handleParticipantChange(participant.id, 'name', e.target.value)} disabled={isReadOnly} required={!loadedSessionId && (!participant.name || participant.name.trim() === '')} />
                  <Box className={classes.participantFieldRow}>
                    <TextField label="Role" variant="outlined" size="small" fullWidth value={participant.role || ''} onChange={(e) => handleParticipantChange(participant.id, 'role', e.target.value)} disabled={isReadOnly} />
                    <TextField label="Rank" variant="outlined" size="small" fullWidth value={participant.rank || ''} onChange={(e) => handleParticipantChange(participant.id, 'rank', e.target.value)} disabled={isReadOnly} />
                  </Box>
                  <TextField label="Organization" variant="outlined" size="small" fullWidth value={participant.organization || ''} onChange={(e) => handleParticipantChange(participant.id, 'organization', e.target.value)} disabled={isReadOnly} />
                </Box>
                <IconButton edge="end" size="small" onClick={() => removeParticipant(participant.id)} disabled={isReadOnly || participants.length <= 1} sx={{ ml: 1, alignSelf: 'center' }}>
                  <DeleteButton size="small" />
                </IconButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary" align="center" sx={{mt: 2}}>
            {loadedSessionId ? 'No participants found for this session.' : 'Click "Add". (At least one participant required.)'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ParticipantManager; 