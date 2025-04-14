import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Typography, 
  Box, 
  Paper, 
  Divider,
  Grid,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { GradientText } from '../../../styles/StyledComponents';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import ExecutionChecklist from './ExecutionChecklist';

const useStyles = makeStyles((theme) => ({
  section: {
    marginBottom: theme.spacing(4),
  },
  simulationSection: {
    marginTop: theme.spacing(6), 
  },
  reportsPaper: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  dashboardPaper: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  reportsIcon: {
    fontSize: '3rem',
    marginBottom: theme.spacing(2),
    opacity: 0.6,
  },
  formLabel: {
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    fontSize: '1.4rem',
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(0.3),
    display: 'inline-block',
  },
  inputField: {
    marginBottom: theme.spacing(2),
  },
  parameterField: {
    width: '200px',
    marginBottom: theme.spacing(2),
  },
  addButton: {
    marginTop: theme.spacing(1),
  },
  objectivesList: {
    width: '100%',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  objectiveInput: {
    marginRight: theme.spacing(1),
    flexGrow: 1,
  },
  nameField: {
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: '100%',
  },
  titleEditContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  titleEdit: {
    marginRight: theme.spacing(1),
  },
  editIcon: {
    marginLeft: theme.spacing(1),
    cursor: 'pointer',
  },
  metadataContainer: {
    marginBottom: theme.spacing(3),
  },
  metadataItem: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: theme.spacing(1),
  },
  metadataLabel: {
    fontWeight: 500,
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
  metadataValue: {
    marginTop: theme.spacing(0.5),
  },
  dateValue: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
  },
  headerSection: {
    marginBottom: theme.spacing(4),
  },
  executionChecklistContainer: {
    height: '100%',
    maxHeight: '400px',
    overflow: 'auto',
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(66, 133, 244, 0.03)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(2),
  },
}));

function ScenarioTab({ wargameData, onChange }) {
  const classes = useStyles();
  const [newObjective, setNewObjective] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [timeHorizonNumber, setTimeHorizonNumber] = useState(1);
  const [timeHorizonUnit, setTimeHorizonUnit] = useState('months');

  // Initialize research objectives as array if it doesn't exist
  if (!wargameData.researchObjectives || !Array.isArray(wargameData.researchObjectives)) {
    if (typeof wargameData.researchObjectives === 'string' && wargameData.researchObjectives.trim()) {
      // Convert existing string to array
      wargameData.researchObjectives = [wargameData.researchObjectives];
    } else {
      // Initialize empty array
      wargameData.researchObjectives = [];
    }
  }

  // Initialize values from wargameData if they exist
  useEffect(() => {
    if (wargameData?.timeHorizon) {
      // Parse existing timeHorizon string if it exists
      const timeHorizonMatch = wargameData.timeHorizon.match(/^(\d+)\s+(.+)$/);
      if (timeHorizonMatch) {
        setTimeHorizonNumber(parseInt(timeHorizonMatch[1], 10));
        const unit = timeHorizonMatch[2].toLowerCase();
        if (unit.includes('day')) {
          setTimeHorizonUnit('days');
        } else if (unit.includes('week')) {
          setTimeHorizonUnit('weeks');
        } else if (unit.includes('month')) {
          setTimeHorizonUnit('months');
        }
      }
    }
  }, [wargameData?.timeHorizon]);

  // Event handlers for form fields
  const handleNameChange = (e) => {
    setEditedTitle(e.target.value);
  };

  const startEditingTitle = () => {
    setEditedTitle(wargameData?.name || '');
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (editedTitle.trim()) {
      onChange({
        ...wargameData,
        name: editedTitle.trim()
      });
    }
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
  };

  const handleSecurityClassificationChange = (e) => {
    onChange({
      ...wargameData,
      securityClassification: e.target.value
    });
  };

  const handleDesignerChange = (e) => {
    onChange({
      ...wargameData,
      designer: e.target.value
    });
  };

  const handleRoadToWarChange = (e) => {
    onChange({
      ...wargameData,
      roadToWar: e.target.value
    });
  };

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      const updatedObjectives = [...(wargameData.researchObjectives || []), newObjective.trim()];
      onChange({
        ...wargameData,
        researchObjectives: updatedObjectives
      });
      setNewObjective('');
    }
  };

  const handleDeleteObjective = (index) => {
    const updatedObjectives = [...wargameData.researchObjectives];
    updatedObjectives.splice(index, 1);
    onChange({
      ...wargameData,
      researchObjectives: updatedObjectives
    });
  };

  const handleNumberOfIterationsChange = (e) => {
    // Parse the input to ensure it's a valid number
    const value = parseInt(e.target.value, 10);
    
    // Only update if it's a valid number and at least 1
    if (!isNaN(value) && value >= 1) {
      onChange({
        ...wargameData,
        numberOfIterations: value
      });
    }
  };

  const handleNumberOfMovesChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      onChange({
        ...wargameData,
        numberOfMoves: value
      });
    }
  };

  const handleTimeHorizonChange = () => {
    const formattedTimeHorizon = `${timeHorizonNumber} ${timeHorizonUnit}`;
    onChange({
      ...wargameData,
      timeHorizon: formattedTimeHorizon
    });
  };

  // Add handlers for the new input fields
  const handleTimeHorizonNumberChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setTimeHorizonNumber(value);
      // Update the timeHorizon in wargameData whenever either value changes
      const formattedTimeHorizon = `${value} ${timeHorizonUnit}`;
      onChange({
        ...wargameData,
        timeHorizon: formattedTimeHorizon
      });
    }
  };

  const handleTimeHorizonUnitChange = (e) => {
    setTimeHorizonUnit(e.target.value);
    // Update the timeHorizon in wargameData whenever either value changes
    const formattedTimeHorizon = `${timeHorizonNumber} ${e.target.value}`;
    onChange({
      ...wargameData,
      timeHorizon: formattedTimeHorizon
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div>
      <Box className={classes.titleEditContainer}>
        {isEditingTitle ? (
          <>
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              value={editedTitle}
              onChange={handleNameChange}
              className={classes.titleEdit}
              placeholder="Enter scenario name"
              autoFocus
            />
            <IconButton size="small" onClick={saveTitle} color="primary">
              <CheckIcon />
            </IconButton>
            <IconButton size="small" onClick={cancelEditTitle}>
              <CloseIcon />
            </IconButton>
          </>
        ) : (
          <>
            <GradientText variant="h4" component="h1">
              {wargameData?.name || 'Untitled Scenario'}
            </GradientText>
            <Tooltip title="Edit scenario name">
              <IconButton size="small" className={classes.editIcon} onClick={startEditingTitle}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Main header section with designer and execution readiness */}
      <Grid container spacing={3} className={classes.headerSection}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" className={classes.formLabel}>
            Wargame Designer
          </Typography>
          <TextField
            id="wargame-designer"
            variant="outlined"
            size="small"
            fullWidth
            placeholder="Enter designer name"
            value={wargameData?.designer || ''}
            onChange={handleDesignerChange}
          />
          
          {/* Date metadata moved underneath designer */}
          <Box className={classes.metadataItem}>
            <Typography variant="subtitle2" className={classes.metadataLabel}>
              Created on:
            </Typography>
            <Typography variant="body2" className={classes.dateValue}>
              {formatDate(wargameData?.createdAt)}
            </Typography>
          </Box>
          
          <Box className={classes.metadataItem}>
            <Typography variant="subtitle2" className={classes.metadataLabel}>
              Modified on:
            </Typography>
            <Typography variant="body2" className={classes.dateValue}>
              {formatDate(wargameData?.modifiedAt)}
            </Typography>
          </Box>
          
          <Box className={classes.metadataItem}>
            <Typography variant="subtitle2" className={classes.metadataLabel}>
              Last Executed:
            </Typography>
            <Typography variant="body2" className={classes.dateValue}>
              {formatDate(wargameData?.lastExecuted)}
            </Typography>
          </Box>
        </Grid>
        
        {/* Execution Readiness Checklist */}
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" className={classes.formLabel}>
            Wargame Execution Readiness
          </Typography>
          <Box className={classes.executionChecklistContainer}>
            <ExecutionChecklist wargameData={wargameData} />
          </Box>
        </Grid>
      </Grid>

      <Divider style={{ marginTop: '16px', marginBottom: '32px' }} />

      <GradientText variant="h5" component="h2" className={classes.sectionTitle}>
        Scenario Setup & Research Objectives
      </GradientText>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.formLabel}>
              Road to War
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Describe the narrative context and geopolitical situation leading up to the scenario.
            </Typography>
            <TextField
              id="road-to-war"
              variant="outlined"
              multiline
              rows={6}
              fullWidth
              placeholder="E.g., Describe the events, tensions, and key factors that led to the current geopolitical situation..."
              value={wargameData?.roadToWar || ''}
              onChange={handleRoadToWarChange}
              className={classes.inputField}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.formLabel}>
              Research Objectives
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Define the primary questions and insights this wargame simulation aims to address.
            </Typography>
            
            <List className={classes.objectivesList}>
              {wargameData.researchObjectives && wargameData.researchObjectives.map((objective, index) => (
                <ListItem key={index} dense>
                  <ListItemText 
                    primary={`${index + 1}. ${objective}`} 
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteObjective(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            <Grid container spacing={1} alignItems="center">
              <Grid item xs>
                <TextField
                  placeholder="Enter a research objective or question..."
                  variant="outlined"
                  fullWidth
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddObjective();
                      e.preventDefault();
                    }
                  }}
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleAddObjective}
                  className={classes.addButton}
                  disabled={!newObjective.trim()}
                >
                  Add Objective
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
      
      <Divider />
      
      <Box className={classes.section} mt={4}>
        <Typography variant="h6" className={classes.formLabel}>
          Wargame Parameters
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Configure simulation parameters to define the scope and complexity of your wargame.
        </Typography>
        
        <Grid container spacing={4}>
          {/* Security Classification moved to parameters section */}
          <Grid item>
            <Typography variant="subtitle2" gutterBottom>
              Security Classification
            </Typography>
            <FormControl variant="outlined" size="small" style={{ width: '200px' }}>
              <Select
                id="security-classification"
                value={wargameData?.securityClassification || ''}
                onChange={handleSecurityClassificationChange}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select Classification</em>
                </MenuItem>
                <MenuItem value="UNCLASSIFIED">UNCLASSIFIED</MenuItem>
                <MenuItem value="CONFIDENTIAL">CONFIDENTIAL</MenuItem>
                <MenuItem value="SECRET">SECRET</MenuItem>
                <MenuItem value="TOP SECRET">TOP SECRET</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item>
            <Typography variant="subtitle2" gutterBottom>
              Number of Permutations
            </Typography>
            <TextField
              id="number-of-iterations"
              variant="outlined"
              type="number"
              inputProps={{ min: 1, max: 100 }}
              placeholder="5"
              className={classes.parameterField}
              value={wargameData?.numberOfIterations || ''}
              onChange={handleNumberOfIterationsChange}
            />
            <Typography variant="caption" color="textSecondary" display="block">
              How many simulation runs to perform
            </Typography>
          </Grid>
          
          <Grid item>
            <Typography variant="subtitle2" gutterBottom>
              Number of Moves/Turns
            </Typography>
            <TextField
              id="number-of-moves"
              variant="outlined"
              type="number"
              inputProps={{ min: 1, max: 50 }}
              placeholder="10"
              className={classes.parameterField}
              value={wargameData?.numberOfMoves || ''}
              onChange={handleNumberOfMovesChange}
            />
            <Typography variant="caption" color="textSecondary" display="block">
              Maximum moves per simulation
            </Typography>
          </Grid>
          
          <Grid item>
            <Typography variant="subtitle2" gutterBottom>
              Time Horizon
            </Typography>
            <Box display="flex" alignItems="center">
              <TextField
                id="time-horizon-number"
                variant="outlined"
                type="number"
                inputProps={{ min: 1, max: 100 }}
                style={{ width: '80px', marginRight: '8px' }}
                value={timeHorizonNumber}
                onChange={handleTimeHorizonNumberChange}
              />
              <FormControl variant="outlined" style={{ width: '120px' }}>
                <Select
                  id="time-horizon-unit"
                  value={timeHorizonUnit}
                  onChange={handleTimeHorizonUnitChange}
                >
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="weeks">Weeks</MenuItem>
                  <MenuItem value="months">Months</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Typography variant="caption" color="textSecondary" display="block">
              Timespan represented by simulation
            </Typography>
          </Grid>
        </Grid>
      </Box>
      
      <Divider />
      
      <Box className={classes.simulationSection}>
        <GradientText variant="h5" component="h2">
          Wargame Analysis & Reports
        </GradientText>
        
        <Grid container spacing={3} style={{ marginTop: '16px' }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Reports</Typography>
            <Paper className={classes.reportsPaper} elevation={2}>
              <Box textAlign="center" display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
                <Typography 
                  variant="body1" 
                  className={classes.reportsIcon}
                >
                  📄
                </Typography>
                <Typography variant="h6" gutterBottom>
                  No Simulation Reports Available
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Detailed reports will appear here after wargames complete.
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Dashboard</Typography>
            <Paper className={classes.dashboardPaper} elevation={2}>
              <Typography 
                variant="body1" 
                className={classes.reportsIcon}
              >
                📊
              </Typography>
              <Typography variant="h6" gutterBottom>
                No Dashboard Data Available
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Interactive visualizations and metrics will appear here
                after simulation runs are complete.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
}

export default ScenarioTab; 