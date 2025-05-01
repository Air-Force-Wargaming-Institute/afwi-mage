import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  useTheme
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useTranscription, ACTIONS } from '../../contexts/TranscriptionContext'; // Assuming path is correct

const useStyles = makeStyles((theme) => ({
  formSection: {
    marginBottom: theme.spacing(1.5),
  },
  formTitle: {
    marginBottom: theme.spacing(0.5),
    fontWeight: 'bold', // Make title stand out
  },
  inputFields: {
    display: 'flex',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(0.5),
  },
  fileNameInput: {
    flex: 1,
  },
  metadataSection: {
    marginBottom: theme.spacing(1.5),
  },
}));

// Helper function to construct full classification string (can be moved to a utils file later)
const constructClassificationString = (baseClassification, caveatType, customCaveat) => {
  if (!baseClassification || baseClassification === 'SELECT A SECURITY CLASSIFICATION') {
    return '';
  }
  if (caveatType === 'custom' && customCaveat && customCaveat.trim() !== '') {
    return `${baseClassification}//${customCaveat.trim().toUpperCase()}`;
  }
  return baseClassification;
};

const SessionMetadataForm = ({ isReadOnly }) => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useTranscription();
  const {
    audioFilename,
    classification: selectedClassification,
    caveatType,
    customCaveat,
    eventMetadata,
    loadedSessionId // Needed to adjust required fields
  } = state;

  return (
    <Box>
      {/* Session Name Form */}
      <Box className={classes.formSection}>
        <Typography variant="h6" className={classes.formTitle}>Session Name</Typography>
        <Box className={classes.inputFields}>
          <TextField
            label="Session Name"
            variant="outlined"
            fullWidth
            size="small" // Consistent sizing
            value={audioFilename}
            onChange={(e) => dispatch({ type: ACTIONS.SET_AUDIO_FILENAME, payload: e.target.value })}
            placeholder="Enter a name for this session"
            className={classes.fileNameInput}
            disabled={isReadOnly}
            helperText={loadedSessionId ? "" : "Used for output audio/transcript files."}
            required={!loadedSessionId}
          />
        </Box>
      </Box>

      {/* Classification Form */}
      <Box className={classes.formSection}>
        <Typography variant="h6" className={classes.formTitle}>Classification</Typography>
        <FormControl variant="outlined" fullWidth required={!loadedSessionId} margin="dense" size="small">
          <InputLabel id="security-classification-label">Security Classification</InputLabel>
          <Select
            labelId="security-classification-label"
            value={selectedClassification}
            onChange={(e) => dispatch({ type: ACTIONS.SET_CLASSIFICATION, payload: e.target.value })}
            label="Security Classification"
            disabled={isReadOnly}
            error={!loadedSessionId && selectedClassification === 'SELECT A SECURITY CLASSIFICATION'}
          >
            <MenuItem value="SELECT A SECURITY CLASSIFICATION" disabled style={{ fontStyle: 'italic', color: theme.palette.text.disabled }}>Select...</MenuItem>
            <MenuItem value="Unclassified">Unclassified</MenuItem>
            <MenuItem value="Secret">Secret</MenuItem>
            <MenuItem value="Top Secret">Top Secret</MenuItem>
          </Select>
        </FormControl>
        {/* Caveat Selection */}
        {selectedClassification !== 'SELECT A SECURITY CLASSIFICATION' && (
          <FormControl component="fieldset" margin="dense" fullWidth disabled={isReadOnly}>
            <RadioGroup 
              row 
              aria-label="caveats" 
              name="caveat-selection" 
              value={caveatType} 
              onChange={(e) => dispatch({ type: ACTIONS.SET_CAVEAT_TYPE, payload: e.target.value })}
            >
              <FormControlLabel value="none" control={<Radio size="small" />} label="No Caveats" />
              <FormControlLabel value="custom" control={<Radio size="small" />} label="Caveats" />
            </RadioGroup>
          </FormControl>
        )}
        {/* Custom Caveat Input */}
        {selectedClassification !== 'SELECT A SECURITY CLASSIFICATION' && caveatType === 'custom' && (
          <TextField
            label="Enter Caveats (e.g., REL TO USA, FVEY)"
            variant="outlined"
            fullWidth
            margin="dense"
            size="small"
            value={customCaveat}
            onChange={(e) => dispatch({ type: ACTIONS.SET_CUSTOM_CAVEAT, payload: e.target.value })}
            disabled={isReadOnly}
            required={!loadedSessionId && caveatType === 'custom'}
            helperText="Separate multiple caveats with commas."
           />
        )}
      </Box>

      {/* Event Metadata Form */}
      <Box className={classes.metadataSection}>
        <Typography variant="h6" className={classes.formTitle}>Event Information</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField label="Wargame Name" variant="outlined" fullWidth size="small" value={eventMetadata.wargame_name || ''} onChange={(e) => dispatch({ type: ACTIONS.SET_EVENT_METADATA, payload: {...eventMetadata, wargame_name: e.target.value}})} disabled={isReadOnly} required={!loadedSessionId} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Scenario" variant="outlined" fullWidth size="small" value={eventMetadata.scenario || ''} onChange={(e) => dispatch({ type: ACTIONS.SET_EVENT_METADATA, payload: {...eventMetadata, scenario: e.target.value}})} disabled={isReadOnly} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Phase" variant="outlined" fullWidth size="small" value={eventMetadata.phase || ''} onChange={(e) => dispatch({ type: ACTIONS.SET_EVENT_METADATA, payload: {...eventMetadata, phase: e.target.value}})} disabled={isReadOnly} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Location" variant="outlined" fullWidth size="small" value={eventMetadata.location || ''} onChange={(e) => dispatch({ type: ACTIONS.SET_EVENT_METADATA, payload: {...eventMetadata, location: e.target.value}})} disabled={isReadOnly} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Organization" variant="outlined" fullWidth size="small" value={eventMetadata.organization || ''} onChange={(e) => dispatch({ type: ACTIONS.SET_EVENT_METADATA, payload: {...eventMetadata, organization: e.target.value}})} disabled={isReadOnly} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default SessionMetadataForm; 