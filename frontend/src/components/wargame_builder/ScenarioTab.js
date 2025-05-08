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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { GradientText } from '../../styles/StyledComponents';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import DoneIcon from '@material-ui/icons/Done';
import ExecutionChecklist from './ExecutionChecklist';
import TextEditorModal from './TextEditorModal';
import AutorenewIcon from '@material-ui/icons/Autorenew';

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
    marginRight: theme.spacing(2),
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
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(0.5),
  },
  titleEdit: {
    marginRight: theme.spacing(1),
  },
  editIcon: {
    marginLeft: theme.spacing(1),
    cursor: 'pointer',
  },
  compactTitle: {
    fontSize: '2rem',
    lineHeight: 1.2,
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
  expandButton: {
    position: 'absolute',
    right: theme.spacing(2),
    top: theme.spacing(1.5),
    zIndex: 1,
  },
  textFieldContainer: {
    position: 'relative',
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogContent: {
    padding: theme.spacing(2),
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  fullscreenTextField: {
    '& .MuiInputBase-root': {
      fontFamily: "'Roboto Mono', monospace",
    },
  },
  approveButton: {
    marginTop: theme.spacing(1),
  },
  approveButtonApproved: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  approveButtonNotApproved: {
    borderColor: theme.palette.success.main,
    color: theme.palette.success.main,
  },
  fieldHeaderContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  approvalStatus: {
    display: 'flex',
    alignItems: 'center',
  },
  approvalStatusText: {
    marginRight: theme.spacing(1),
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
}));

function ScenarioTab({ wargameData, onChange, showExecutionChecklist = true, moveRoadToWarToRight = false }) {
  const classes = useStyles();
  const [newObjective, setNewObjective] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [timeHorizonNumber, setTimeHorizonNumber] = useState(1);
  const [timeHorizonUnit, setTimeHorizonUnit] = useState('months');
  const [wargameStartDate, setWargameStartDate] = useState(() => {
    if (!wargameData?.wargameStartDate) return '';
    try {
      const date = new Date(wargameData.wargameStartDate);
      return isNaN(date.getTime()) ? '' : formatDateForInput(date);
    } catch (error) {
      console.error("Invalid date format:", error);
      return '';
    }
  });
  
  // State for text editor modal
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [textEditorConfig, setTextEditorConfig] = useState({
    title: '',
    value: '',
    fieldName: '', // to identify which field is being edited
    placeholder: ''
  });

  // Add new state variables for the knowledge source selections
  const [selectedVectorstore, setSelectedVectorstore] = useState(wargameData?.selectedVectorstore || '');
  const [selectedDatabase, setSelectedDatabase] = useState(wargameData?.selectedDatabase || '');

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

  // Update the useEffect that initializes approval fields to include wargameParameters
  useEffect(() => {
    if (!wargameData.approvedFields) {
      onChange({
        ...wargameData,
        approvedFields: wargameData.approvedFields || {
          roadToWar: false,
          description: false,
          researchObjectives: false,
          wargameParameters: false
        }
      });
    }
  }, []);

  // Event handlers for form fields
  const handleNameChange = (e) => {
    onChange({
      ...wargameData,
      name: e.target.value
    });
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

  // Add handler for description changes
  const handleDescriptionChange = (e) => {
    onChange({
      ...wargameData,
      description: e.target.value
    });
  };

  // Handler for toggling approval status
  const handleToggleApproval = (fieldName) => {
    const currentApproval = wargameData.approvedFields?.[fieldName] || false;
    
    onChange({
      ...wargameData,
      approvedFields: {
        ...(wargameData.approvedFields || {}),
        [fieldName]: !currentApproval
      }
    });
    
    // This would eventually trigger an API call to update the approved status
    console.log(`Field ${fieldName} approval status changed to: ${!currentApproval}`);
  };
  
  // Modified handler for road to war that also updates approval status
  const handleRoadToWarChange = (value) => {
    // If the content changes, set approval to false
    const isValueChanged = value !== wargameData.roadToWar;
    const newApprovalStatus = isValueChanged 
      ? false 
      : (wargameData.approvedFields?.roadToWar || false);
    
    onChange({
      ...wargameData,
      roadToWar: value,
      approvedFields: {
        ...(wargameData.approvedFields || {}),
        roadToWar: newApprovalStatus
      }
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

  // Update the formatDate function to display dates in the requested format
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Format as "dd MMMM yyyy" (e.g., "15 January 2023")
      return new Intl.DateTimeFormat('en-US', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Add helper function to format a date for the input
  const formatDateForInput = (date) => {
    if (!date) return '';
    try {
      // Format as YYYY-MM-DD for the date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return '';
    }
  };

  // Modify the handleStartDateChange to work with a string input
  const handleStartDateChange = (e) => {
    const dateString = e.target.value;
    setWargameStartDate(dateString);
    
    try {
      // Convert the input string to a Date object and then to ISO string
      const date = dateString ? new Date(dateString) : null;
      onChange({
        ...wargameData,
        wargameStartDate: date && !isNaN(date.getTime()) ? date.toISOString() : null
      });
    } catch (error) {
      console.error("Error handling date change:", error);
      onChange({
        ...wargameData,
        wargameStartDate: null
      });
    }
  };
  
  // Open text editor modal for a specific field
  const openTextEditor = (title, value, fieldName, placeholder, extraData = null) => {
    setTextEditorConfig({
      title,
      value,
      fieldName,
      placeholder,
      extraData
    });
    setTextEditorOpen(true);
  };

  // Handle save from text editor modal
  const handleTextEditorSave = (newValue) => {
    // Update the appropriate field based on fieldName
    switch (textEditorConfig.fieldName) {
      case 'roadToWar':
        handleRoadToWarChange(newValue);
        break;
      case 'description':
        onChange({
          ...wargameData,
          description: newValue
        });
        break;
      case 'researchObjective':
        setNewObjective(newValue);
        break;
      case 'editObjective':
        const objIndex = textEditorConfig.extraData?.index;
        if (objIndex !== undefined) {
          const updatedObjectives = [...wargameData.researchObjectives];
          updatedObjectives[objIndex] = newValue;
          onChange({
            ...wargameData,
            researchObjectives: updatedObjectives
          });
        }
        break;
      default:
        console.warn(`No handler for field: ${textEditorConfig.fieldName}`);
    }
    setTextEditorOpen(false);
  };

  // Add function to edit an existing objective
  const handleEditObjective = (index) => {
    const objective = wargameData.researchObjectives[index];
    openTextEditor(
      'Edit Research Objective',
      objective,
      'editObjective',
      'Define a specific research question or insight this wargame aims to address',
      { index }
    );
  };

  // Add handlers for the knowledge source selections
  const handleVectorstoreChange = (e) => {
    const value = e.target.value;
    setSelectedVectorstore(value);
    onChange({
      ...wargameData,
      selectedVectorstore: value
    });
  };

  const handleDatabaseChange = (e) => {
    const value = e.target.value;
    setSelectedDatabase(value);
    onChange({
      ...wargameData,
      selectedDatabase: value
    });
  };

  // Add a function to handle the MAGE Assist button click
  const handleMageAssist = () => {
    // Placeholder for future LLM assistance functionality
    console.log('MAGE Assist requested for Road to War content');
    // Future implementation will connect to the system LLM
  };

  // Add a handler function for the Generate Wargame button
  const handleGenerateWargame = () => {
    // Placeholder for future LLM generation functionality
    console.log('Generate Wargame requested - will use connected knowledge sources and approved content');
    // This will eventually trigger the MAGE LLM to generate the wargame build
  };

  return (
    <div>
      <Box className={classes.titleEditContainer}>
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          value={wargameData?.name || ''}
          onChange={handleNameChange}
          placeholder="Enter scenario name"
          inputProps={{
            style: { 
              fontSize: '1.25rem',
              padding: '6px 10px'
            }
          }}
        />
      </Box>

      {/* Main content in two-column layout */}
      <Grid container spacing={3} style={{ marginTop: '4px' }}>
        {/* Left Column - Basic Configuration */}
        <Grid item xs={12} md={6}>
          {/* Designer Field */}
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
          
          {/* Timeline Information */}
          <Box mt={2}>
            <Typography variant="subtitle2" className={classes.formLabel}>
              Timeline Information
            </Typography>
            <Box display="flex" flexDirection="row" justifyContent="space-between" mt={1}>
              <Box display="flex" alignItems="center">
                <Typography variant="body2" color="textSecondary" style={{ fontWeight: 'bold', marginRight: '4px' }}>
                  Created:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDate(wargameData?.createdAt)}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center">
                <Typography variant="body2" color="textSecondary" style={{ fontWeight: 'bold', marginRight: '4px' }}>
                  Modified:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDate(wargameData?.modifiedAt)}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center">
                <Typography variant="body2" color="textSecondary" style={{ fontWeight: 'bold', marginRight: '4px' }}>
                  Executed:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDate(wargameData?.lastExecuted)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Knowledge Sources Section */}
          <Box mt={3}>
            <Typography variant="subtitle2" className={classes.formLabel}>
              Connect to Knowledge Sources
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Link this wargame to knowledge sources for agent context and data retrieval.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Select Vectorstore
                </Typography>
                <FormControl variant="outlined" size="small" fullWidth>
                  <Select
                    value={selectedVectorstore}
                    onChange={handleVectorstoreChange}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>None Selected</em>
                    </MenuItem>
                    <MenuItem value="vectorstore_1">World Politics Collection</MenuItem>
                    <MenuItem value="vectorstore_2">Military Strategy Database</MenuItem>
                    <MenuItem value="vectorstore_3">Historical Conflicts Archive</MenuItem>
                    <MenuItem value="vectorstore_4">Global Economics Analysis</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Select Database
                </Typography>
                <FormControl variant="outlined" size="small" fullWidth>
                  <Select
                    value={selectedDatabase}
                    onChange={handleDatabaseChange}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>None Selected</em>
                    </MenuItem>
                    <MenuItem value="database_1">Intelligence Reports DB</MenuItem>
                    <MenuItem value="database_2">Strategic Assets Catalog</MenuItem>
                    <MenuItem value="database_3">Regional Capabilities Index</MenuItem>
                    <MenuItem value="database_4">Diplomatic Relations History</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Wargame Parameters */}
          <Box mt={3}>
            <Box className={classes.fieldHeaderContainer}>
              <Typography variant="subtitle2" className={classes.formLabel}>
                Wargame Parameters
              </Typography>
              <Button
                variant={wargameData.approvedFields?.wargameParameters ? "contained" : "outlined"}
                size="small"
                className={`${classes.approveButton} ${
                  wargameData.approvedFields?.wargameParameters
                    ? classes.approveButtonApproved
                    : classes.approveButtonNotApproved
                }`}
                onClick={() => handleToggleApproval('wargameParameters')}
                startIcon={wargameData.approvedFields?.wargameParameters ? <DoneIcon /> : null}
              >
                {wargameData.approvedFields?.wargameParameters ? "Approved" : "Approve & Commit"}
              </Button>
            </Box>
            
            <Grid container spacing={2} style={{ marginTop: '8px' }}>
              {/* Security Classification */}
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Security Classification
                </Typography>
                <FormControl variant="outlined" size="small" fullWidth>
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
              
              {/* Number of Game Permutations */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Number of Game Permutations (1-100)
                </Typography>
                <TextField
                  id="number-of-iterations"
                  variant="outlined"
                  type="number"
                  size="small"
                  inputProps={{ min: 1, max: 100 }}
                  placeholder="10"
                  fullWidth
                  value={wargameData?.numberOfIterations || ''}
                  onChange={handleNumberOfIterationsChange}
                />
              </Grid>
              
              {/* Number of Moves/Turns */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Number of Moves/Turns (1-24)
                </Typography>
                <TextField
                  id="number-of-moves"
                  variant="outlined"
                  type="number"
                  size="small"
                  inputProps={{ min: 1, max: 24 }}
                  placeholder="10"
                  fullWidth
                  value={wargameData?.numberOfMoves || ''}
                  onChange={handleNumberOfMovesChange}
                />
              </Grid>
              
              {/* Time Horizon */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Time Horizon
                </Typography>
                <Box display="flex" alignItems="center">
                  <TextField
                    id="time-horizon-number"
                    variant="outlined"
                    type="number"
                    size="small"
                    inputProps={{ min: 1, max: 365 }}
                    style={{ width: '40%', marginRight: '8px' }}
                    value={timeHorizonNumber}
                    onChange={handleTimeHorizonNumberChange}
                  />
                  <FormControl variant="outlined" size="small" style={{ width: '60%' }}>
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
              </Grid>
              
              {/* Wargame Start Date */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" gutterBottom>
                  Wargame Start Date
                </Typography>
                <Box mb={1}>
                  <TextField
                    id="wargame-start-date"
                    type="date"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={wargameStartDate}
                    onChange={handleStartDateChange}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Box>
                {/* Show the formatted date */}
                {wargameData?.wargameStartDate && (
                  <Typography variant="body2" color="textSecondary">
                    Selected: <b>{formatDate(wargameData.wargameStartDate)}</b>
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            {/* Simulation Parameters Preview */}
            <Box mt={2} p={2} bgcolor="rgba(66, 133, 244, 0.05)" borderRadius={4} border="1px solid rgba(66, 133, 244, 0.2)">
              <Typography variant="body2" style={{ fontStyle: 'italic', fontSize: '18px', textAlign: 'center' }}>
                MAGE will run {wargameData?.numberOfIterations || 0} permutation{wargameData?.numberOfIterations !== 1 ? 's' : ''} of the wargame, 
                splitting {wargameData?.numberOfMoves || 0} {wargameData?.numberOfMoves !== 1 ? 'moves' : 'move'} across {wargameData?.timeHorizon || '0 days'} 
                , with a notional start date of {wargameData?.wargameStartDate ? formatDate(wargameData.wargameStartDate) : 'not specified'}.
              </Typography>
            </Box>
          </Box>
          
          {/* Execution Readiness Checklist */}
          {showExecutionChecklist && (
            <Box mt={4}>
              <Typography variant="subtitle2" className={classes.formLabel}>
                Wargame Execution Readiness
              </Typography>
              <Box className={classes.executionChecklistContainer}>
                <ExecutionChecklist wargameData={wargameData} />
              </Box>
            </Box>
          )}
        </Grid>
        
        {/* Right Column - Research Objectives and Road to War */}
        <Grid item xs={12} md={6}>
          {/* Generate Wargame Button */}
          <Box 
            mb={4} 
            p={3} 
            border={1} 
            borderColor="primary.main" 
            borderRadius={1}
            bgcolor="rgba(66, 133, 244, 0.05)"
            textAlign="center"
          >
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              startIcon={<AutorenewIcon />}
              onClick={handleGenerateWargame}
              style={{ 
                padding: '12px 24px',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              Generate Wargame
            </Button>
            <Typography variant="body2" style={{ marginTop: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
              When ready, MAGE will pre-generate your wargame build utilizing the knowledge sources you've connected 
              and the information you've approved for the description, research objectives, and the road to war. 
              You can then review and approve the entire configuration that MAGE has built in the workflow tabs.
            </Typography>
            <Typography variant="body2" style={{ marginTop: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
              This includes: 
            </Typography>
            <ul style={{ 
              marginTop: 8, 
              marginLeft: 24, 
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'left',
              paddingLeft: 16
            }}>
              <li>Selecting the nations and organizations that will be modeled and their relationships</li>
              <li>Configuring the theater(s) of war</li>
              <li>Detailed modeling of key national and/or organizational DIME postures and capabilities</li>
            </ul>
          </Box>
          
          {/* Description field with TextEditorModal */}
          <Box className={classes.section}>
            <Box className={classes.fieldHeaderContainer}>
              <Typography variant="subtitle2" className={classes.formLabel}>
                Description
              </Typography>
              <Button
                variant={wargameData.approvedFields?.description ? "contained" : "outlined"}
                size="small"
                className={`${classes.approveButton} ${
                  wargameData.approvedFields?.description
                    ? classes.approveButtonApproved
                    : classes.approveButtonNotApproved
                }`}
                onClick={() => handleToggleApproval('description')}
                startIcon={wargameData.approvedFields?.description ? <DoneIcon /> : null}
              >
                {wargameData.approvedFields?.description ? "Approved" : "Approve & Commit"}
              </Button>
            </Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Enter a short description of the wargame scenario.
            </Typography>
            <Box className={classes.textFieldContainer}>
              <TextField
                id="wargame-description"
                variant="outlined"
                size="small"
                fullWidth
                multiline
                rows={2}
                placeholder="Enter a short description of the wargame scenario"
                value={wargameData?.description || ''}
                onChange={(e) => handleDescriptionChange(e)}
                className={classes.inputField}
              />
              <Tooltip title="Open fullscreen editor">
                <IconButton 
                  className={classes.expandButton}
                  onClick={() => openTextEditor(
                    'Wargame Description', 
                    wargameData?.description || '', 
                    'description',
                    'Enter a short description of the wargame scenario'
                  )}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Research Objectives */}
          <Box className={classes.section}>
            <Box className={classes.fieldHeaderContainer}>
              <Typography variant="h6" className={classes.formLabel}>
                Research Objectives
              </Typography>
              <Button
                variant={wargameData.approvedFields?.researchObjectives ? "contained" : "outlined"}
                size="small"
                className={`${classes.approveButton} ${
                  wargameData.approvedFields?.researchObjectives
                    ? classes.approveButtonApproved
                    : classes.approveButtonNotApproved
                }`}
                onClick={() => handleToggleApproval('researchObjectives')}
                startIcon={wargameData.approvedFields?.researchObjectives ? <DoneIcon /> : null}
              >
                {wargameData.approvedFields?.researchObjectives ? "Approved" : "Approve & Commit"}
              </Button>
            </Box>
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
                    <Tooltip title="Edit objective">
                      <IconButton edge="end" aria-label="edit" onClick={() => handleEditObjective(index)} style={{ marginRight: 8 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteObjective(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            <Grid container spacing={1} alignItems="center">
              <Grid item xs>
                <Box className={classes.textFieldContainer}>
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
                  <Tooltip title="Open fullscreen editor">
                    <IconButton 
                      className={classes.expandButton}
                      onClick={() => openTextEditor(
                        'New Research Objective', 
                        newObjective, 
                        'researchObjective',
                        'Define a specific research question or insight this wargame aims to address'
                      )}
                      size="small"
                    >
                      <FullscreenIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
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
          
          {/* Road to War */}
          <Box className={classes.section} mt={4}>
            <Box className={classes.fieldHeaderContainer}>
              <Typography variant="h6" className={classes.formLabel}>
                Road to War
              </Typography>
              <Button
                variant={wargameData.approvedFields?.roadToWar ? "contained" : "outlined"}
                size="small"
                className={`${classes.approveButton} ${
                  wargameData.approvedFields?.roadToWar 
                    ? classes.approveButtonApproved 
                    : classes.approveButtonNotApproved
                }`}
                onClick={() => handleToggleApproval('roadToWar')}
                startIcon={wargameData.approvedFields?.roadToWar ? <DoneIcon /> : null}
              >
                {wargameData.approvedFields?.roadToWar ? "Approved" : "Approve & Commit"}
              </Button>
            </Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Describe the narrative context and geopolitical situation leading up to the scenario.
            </Typography>
            <Box className={classes.textFieldContainer}>
              <TextField
                id="road-to-war"
                variant="outlined"
                multiline
                rows={10}
                fullWidth
                placeholder="E.g., Describe the events, tensions, and key factors that led to the current geopolitical situation... Use the MAGE Assist to get help in crafting a detailed and comprehensive road to war narrative. This section will be crucial to the build of a valuable wargame research effort."
                value={wargameData?.roadToWar || ''}
                onChange={(e) => handleRoadToWarChange(e.target.value)}
                className={classes.inputField}
              />
              <Tooltip title="Open fullscreen editor">
                <IconButton 
                  className={classes.expandButton}
                  onClick={() => openTextEditor(
                    'Road to War', 
                    wargameData?.roadToWar || '', 
                    'roadToWar',
                    'E.g., Describe the events, tensions, and key factors that led to the current geopolitical situation...'
                  )}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Keep the editor and assist buttons, but remove the approval button */}
            <Box display="flex" flexDirection="row" alignItems="center" mt={2}>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                startIcon={<FullscreenIcon />}
                onClick={() => openTextEditor(
                  'Road to War', 
                  wargameData?.roadToWar || '', 
                  'roadToWar',
                  'E.g., Describe the events, tensions, and key factors that led to the current geopolitical situation...'
                )}
              >
                Open Editor
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="primary"
                style={{ marginLeft: 8 }}
                startIcon={<AutorenewIcon />}
                onClick={handleMageAssist}
              >
                MAGE Assist
              </Button>
              {wargameData.approvedFields?.roadToWar && (
                <Typography variant="caption" color="textSecondary" style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
                  <DoneIcon fontSize="small" style={{ color: '#4caf50', marginRight: 4 }} />
                  Content approved for execution
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      {/* Text Editor Modal */}
      <TextEditorModal
        open={textEditorOpen}
        onClose={() => setTextEditorOpen(false)}
        title={textEditorConfig.title}
        value={textEditorConfig.value}
        onChange={handleTextEditorSave}
        placeholder={textEditorConfig.placeholder}
        isApproved={textEditorConfig.fieldName ? wargameData.approvedFields?.[textEditorConfig.fieldName] || false : false}
        onApprove={handleToggleApproval}
        fieldName={textEditorConfig.fieldName}
      />
    </div>
  );
}

export default ScenarioTab; 