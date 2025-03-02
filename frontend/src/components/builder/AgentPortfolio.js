import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Snackbar,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  IconButton,
  Tooltip,
  Link
} from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import robotIcon from '../../assets/robot-icon.png'; // Import the robot icon
import { getApiUrl } from '../../config';

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(2),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: '0.3s',
    backgroundColor: '#f8f8f8',
    position: 'relative',
    borderWidth: 2,
    borderStyle: 'solid',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[4],
    },
    // Reduce padding to make cards more compact
    padding: theme.spacing(1),
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0.5, 1), // Reduce bottom padding
  },
  colorSquare: {
    width: 48, // Increased size
    height: 48, // Increased size
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  robotIcon: {
    width: 35, // Adjust size as needed
    height: 45, // Adjust size as needed
  },
  agentName: {
    fontWeight: 'bold',
    fontSize: '0.8rem', // Change from 0.9rem to 0.8rem
  },
  cardContent: {
    flexGrow: 1,
    paddingTop: 0, // Remove top padding
    paddingBottom: theme.spacing(1),
    maxHeight: '3em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    '-webkit-line-clamp': 2,
    '-webkit-box-orient': 'vertical',
  },
  cardActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1), // Reduce padding
  },
  createButton: {
    marginBottom: theme.spacing(2),
  },
  deleteIcon: {
    color: theme.palette.error.main,
  },
  duplicateIcon: {
    color: theme.palette.info.main,
  },
  actionIcon: {
    padding: theme.spacing(0.5),
  },
  colorOption: {
    width: 24,
    height: 24,
    margin: 2,
    cursor: 'pointer',
    border: '2px solid #fff',
    '&:hover': {
      border: '2px solid #000',
    },
  },
  selectedColor: {
    border: '2px solid #000',
  },
  colorGrid: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  colorLabel: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  dialogTitle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: 0,
  },
  dateInfo: {
    fontSize: '0.5rem', // Reduce font size
    color: theme.palette.text.secondary,
    textAlign: 'left',
    lineHeight: 1,
  },
  dateLabel: {
    fontWeight: 'bold',
    marginRight: theme.spacing(1),
  },
  actionButtons: {
    display: 'flex',
    '& > *': {
      cursor: 'default', // This ensures the cursor doesn't change over action buttons
    },
  },
  dialogContent: {
    width: '950px',
    maxWidth: '90vw',
  },
  largeTextField: {
    '& .MuiInputBase-root': {
      minHeight: '125px',
    },
  },
  helpIcon: {
    marginLeft: theme.spacing(1),
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    cursor: 'pointer',
  },
  tooltipContent: {
    fontSize: '0.875rem',
  },
  infoDialog: {
    padding: theme.spacing(2),
  },
  infoDialogTitle: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  infoDialogContent: {
    paddingTop: theme.spacing(2),
  },
  agentDescription: {
    fontSize: '0.5rem', // Change from 0.4rem to 0.5rem
  },
  characterCount: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textAlign: 'right',
    marginTop: theme.spacing(0.5),
  },
}));

const colorOptions = [
'#FF0000', '#DC143C', '#B22222', '#008000',
'#32CD32', '#2E8B57', '#0000FF', '#4169E1',
'#1E90FF', '#FFA500', '#FF8C00', '#FF7F50',
'#FFFF00', '#FFD700', '#F0E68C', '#800080',
'#BA55D3', '#4B0082', '#FFFFF0', '#808080'
];

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  return date.toLocaleDateString(undefined, options);
};

const sanitizeInput = (input) => {
  // Remove any HTML tags and limit special characters
  return input.replace(/<[^>]*>/gm, '')
              .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
              //.replace(/'/gm, "\\'")     // Escape single quotes
              //.replace(/"/gm, '\\"')     // Escape double quotes
              //.replace(/[^\w\s.,!?()\-'"\\]/gm, ''); // Remove special chars except quotes and backslashes
};

const validateInput = (input, field) => {
  const sanitized = sanitizeInput(input);
  
  switch (field) {
    case 'name':
      // Name should be 3-50 characters, alphanumeric with spaces
      if (sanitized.length < 3 || sanitized.length > 50) {
        return { isValid: false, message: 'Name must be between 3 and 50 characters' };
      }
      break;
    case 'description':
      // Description should be 10-140 characters
      if (sanitized.length < 10 || sanitized.length > 140) {
        return { isValid: false, message: 'Description must be between 10 and 140 characters' };
      }
      break;
    case 'instructions':
      // Instructions should be at least 10 characters
      if (sanitized.length < 10) {
        return { isValid: false, message: 'Instructions must be at least 10 characters' };
      }
      break;
  }
  return { isValid: true, sanitized };
};

const unescapeString = (str) => {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
};

function AgentPortfolio() {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    llm_model: 'hermes3:8b',
    agent_instructions: '',
    color: colorOptions[0]  // Default to the first color
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatedAgent, setDuplicatedAgent] = useState(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogContent, setInfoDialogContent] = useState({ title: '', content: '' });
  const [descriptionError, setDescriptionError] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});
  const [availableModels, setAvailableModels] = useState([]);

  useEffect(() => {
    fetchAgents();
    const fetchModels = async () => {
      try {
        const response = await axios.get(getApiUrl('CHAT', '/models/ollama'));
        const modelNames = response.data.models.map(model => model.name);
        setAvailableModels(modelNames);
      } catch (error) {
        console.error('Error fetching Ollama models:', error);
        setAvailableModels([]);
      }
    };

    fetchModels();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(getApiUrl('AGENT', '/api/agents/list_agents/'));
      setAgents(response.data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching agents. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    
    // Add name validation
    if (name === 'name') {
      if (!value.match(/^[a-zA-Z0-9\s_-]*$/)) {
        setFormErrors({
          ...formErrors,
          name: 'Agent name can only contain letters, numbers, spaces, underscores, and hyphens'
        });
      } else {
        setFormErrors({
          ...formErrors,
          name: ''
        });
      }
    }
    
    setNewAgent(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const validateForm = (data) => {
    const errors = {};
    
    // Validate name
    if (!data.name || data.name.length < 3 || data.name.length > 50) {
      errors.name = 'Name must be between 3 and 50 characters';
    }
    
    // Validate description
    if (!data.description || data.description.length < 10 || data.description.length > 140) {
      errors.description = 'Description must be between 10 and 140 characters';
    }
    
    // Validate instructions
    if (!data.agent_instructions || data.agent_instructions.length < 10) {
      errors.agent_instructions = 'Instructions must be at least 10 characters';
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setFormErrors({});
    
    // Validate form
    const errors = validateForm(newAgent);
    
    // If there are errors, show them and stop submission
    if (Object.keys(errors).length > 0 || formErrors.name) {  // Add check for name validation error
      setFormErrors(errors);
      setSnackbar({
        open: true,
        message: 'Please fix the errors before submitting',
        severity: 'error'
      });
      return;
    }

    // Proceed with submission if no errors
    try {
      const sanitizedAgent = {
        ...newAgent,
        name: sanitizeInput(newAgent.name),
        description: sanitizeInput(newAgent.description),
        agent_instructions: sanitizeInput(newAgent.agent_instructions)
      };

      const response = await axios.post(getApiUrl('AGENT', '/api/agents/create_agent/'), sanitizedAgent);
      setAgents([...agents, response.data]);
      setOpen(false);
      setSnackbar({
        open: true,
        message: 'Agent created successfully!',
        severity: 'success'
      });
      fetchAgents(); // Refresh the list of agents
    } catch (error) {
      console.error('Error creating agent:', error);
      setSnackbar({
        open: true,
        message: 'Error creating agent. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleViewDetails = (agent) => {
    setSelectedAgent({
      ...agent,
      description: unescapeString(agent.description),
      agent_instructions: unescapeString(agent.agent_instructions)
    });
    setDetailsOpen(true);
    setIsEditing(false);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAgent(null);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleAgentChange = (event) => {
    const { name, value } = event.target;
    
    // Add name validation for editing
    if (name === 'name') {
      if (!value.match(/^[a-zA-Z0-9\s_-]*$/)) {
        setEditFormErrors({
          ...editFormErrors,
          name: 'Agent name can only contain letters, numbers, spaces, underscores, and hyphens'
        });
      } else {
        setEditFormErrors({
          ...editFormErrors,
          name: ''
        });
      }
    }

    setSelectedAgent(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleAgentColorChange = (color) => {
    setSelectedAgent(prevState => ({
      ...prevState,
      color: color
    }));
  };

  const handleSaveChanges = async () => {
    // Clear previous errors
    setEditFormErrors({});
    
    // Validate form
    const errors = validateForm(selectedAgent);
    
    // If there are errors, show them and stop submission
    if (Object.keys(errors).length > 0 || editFormErrors.name) {  // Add check for name validation error
      setEditFormErrors(errors);
      setSnackbar({
        open: true,
        message: 'Please fix the errors before saving',
        severity: 'error'
      });
      return;
    }

    try {
      const sanitizedAgent = {
        ...selectedAgent,
        name: sanitizeInput(selectedAgent.name),
        description: sanitizeInput(selectedAgent.description),
        agent_instructions: sanitizeInput(selectedAgent.agent_instructions),
        llm_model: selectedAgent.llm_model
      };

      await axios.put(getApiUrl('AGENT', `/api/agents/update_agent/${selectedAgent.unique_id}`), sanitizedAgent);
      setSnackbar({
        open: true,
        message: 'Agent updated successfully!',
        severity: 'success'
      });
      fetchAgents();
      handleCloseDetails();
    } catch (error) {
      console.error('Error updating agent:', error);
      setSnackbar({
        open: true,
        message: 'Error updating agent. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(getApiUrl('AGENT', `/api/agents/delete_agent/${agentToDelete.unique_id}`));
      setSnackbar({
        open: true,
        message: 'Agent deleted successfully!',
        severity: 'success'
      });
      fetchAgents(); // Refresh the list of agents
    } catch (error) {
      console.error('Error deleting agent:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting agent. Please try again.',
        severity: 'error'
      });
    }
    setDeleteConfirmOpen(false);
    setAgentToDelete(null);
  };

  const handleDuplicateClick = (agent) => {
    const duplicatedAgent = {
      ...agent,
      name: `Copy of ${agent.name}`,
      description: unescapeString(agent.description),
      agent_instructions: unescapeString(agent.agent_instructions),
      color: agent.color
    };
    setDuplicatedAgent(duplicatedAgent);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateSubmit = async () => {
    try {
      const agentData = {
        ...duplicatedAgent
      };
      await axios.post(getApiUrl('AGENT', '/api/agents/create_agent/'), agentData);
      setSnackbar({
        open: true,
        message: `Agent ${duplicatedAgent.name} created successfully`,
        severity: 'success'
      });
      setDuplicateDialogOpen(false);
      fetchAgents();
    } catch (error) {
      console.error('Error duplicating agent:', error);
      setSnackbar({
        open: true,
        message: 'Error duplicating agent. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleDuplicateChange = (event) => {
    const { name, value } = event.target;
    if (name === 'description' && value.length > 140) {
      setDescriptionError(true);
    } else {
      setDescriptionError(false);
    }
    setDuplicatedAgent(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleDuplicateColorChange = (color) => {
    setDuplicatedAgent(prevState => ({
      ...prevState,
      color: color
    }));
  };

  const handleColorChange = (color) => {
    setNewAgent(prevState => ({
      ...prevState,
      color: color
    }));
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    };
    return date.toLocaleString(undefined, options);
  };

  const handleTileClick = (agent, event) => {
    // Prevent opening the edit form if the click was on the action buttons
    if (!event.target.closest('.action-buttons')) {
      handleViewDetails(agent);
    }
  };

  const handleInfoClick = (title, content) => {
    setInfoDialogContent({ title, content });
    setInfoDialogOpen(true);
  };

  const renderTooltip = (title, content) => (
    <IconButton
      className={classes.helpIcon}
      onClick={() => handleInfoClick(title, content)}
    >
      <HelpOutlineIcon />
    </IconButton>
  );

  return (
    <div className={classes.root}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Agent Portfolio</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpen} 
          className={classes.createButton}
        >
          Create New Agent
        </Button>
      </Box>

      <Grid container spacing={2}> {/* Reduce spacing */}
        {agents.map((agent, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}> {/* Change md to 3 for 4 cards per row */}
            <Card 
              className={classes.card} 
              style={{ borderColor: agent.color }}
              onClick={(event) => handleTileClick(agent, event)}
            >
              <CardHeader
                className={classes.cardHeader}
                avatar={
                  <div className={classes.colorSquare} style={{ backgroundColor: agent.color }}>
                    <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                  </div>
                }
                title={<Typography className={classes.agentName}>{agent.name}</Typography>}
              />
              <CardContent className={classes.cardContent}>
                <Typography 
                  variant="body2" 
                  color="textSecondary" 
                  component="p"
                  className={classes.agentDescription} // Add this line
                >
                  {agent.description}
                </Typography>
              </CardContent>
              <CardActions className={classes.cardActions}>
                <div className={classes.dateInfo}>
                  Created: {formatDate(agent.createdAt)}<br />
                  Modified: {formatDate(agent.modifiedAt)}
                </div>
                <div className={`${classes.actionButtons} action-buttons`}>
                  <Tooltip title="Duplicate Agent">
                    <IconButton 
                      aria-label="duplicate" 
                      className={`${classes.duplicateIcon} ${classes.actionIcon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateClick(agent);
                      }}
                    >
                      <FileCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Agent">
                    <IconButton 
                      aria-label="delete" 
                      className={`${classes.deleteIcon} ${classes.actionIcon}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(agent);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        aria-labelledby="form-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
          <Typography variant="h6">Create New Agent</Typography>
          <Box className={classes.colorGrid}>
            {colorOptions.map((color) => (
              <Tooltip title={color} key={color}>
                <Box
                  className={`${classes.colorOption} ${newAgent.color === color ? classes.selectedColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography className={classes.colorLabel}>
            (Assign this Agent a Color)
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <Box display="flex" alignItems="center">
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Agent Name"
              type="text"
              fullWidth
              value={newAgent.name}
              onChange={handleChange}
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
            {renderTooltip(
              "Agent Name",
              "Enter a unique name for your agent. This name will be used to identify and interact with the agent in the system."
            )}
          </Box>
          <Box display="flex" flexDirection="column">
            <TextField
              margin="dense"
              name="description"
              label="Agent Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={newAgent.description}
              onChange={handleChange}
              required
              error={!!formErrors.description}
              helperText={formErrors.description}
            />
            <Typography className={classes.characterCount}>
              {newAgent.description.length}/140 characters
            </Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <TextField
              margin="dense"
              name="agent_instructions"
              label="Agent Instructions"
              type="text"
              fullWidth
              multiline
              rows={8}
              value={newAgent.agent_instructions}
              onChange={handleChange}
              required
              className={classes.largeTextField}
              error={!!formErrors.agent_instructions}
              helperText={formErrors.agent_instructions}
            />
            {renderTooltip(
              "Agent Instructions",
              "Specify detailed instructions for the agent. These instructions guide the agent's behavior and responses when interacting with users or other agents."
            )}
          </Box>
          <Box display="flex" alignItems="center">
            <FormControl fullWidth margin="dense">
              <InputLabel id="llm-model-label">LLM Model</InputLabel>
              <Select
                labelId="llm-model-label"
                name="llm_model"
                value={newAgent.llm_model}
                onChange={handleChange}
                required
              >
                {availableModels.map((modelName) => (
                  <MenuItem key={modelName} value={modelName}>
                    {modelName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {renderTooltip(
              "LLM Model",
              "Choose the Language Model for your agent. Different models have varying capabilities and performance characteristics."
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" disabled={descriptionError}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails} 
        aria-labelledby="agent-details-title"
        maxWidth="md" // Changed from default to 'md' for a wider dialog
        fullWidth // This ensures the dialog takes the full width specified by maxWidth
      >
        <DialogTitle id="agent-details-title" className={classes.dialogTitle}>
          <Typography variant="h6">
            {isEditing ? 'Edit Agent' : 'Agent Details'}
          </Typography>
          <Box className={classes.colorGrid}>
            {colorOptions.map((color) => (
              <Tooltip title={color} key={color}>
                <Box
                  className={`${classes.colorOption} ${selectedAgent && selectedAgent.color === color ? classes.selectedColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => isEditing && handleAgentColorChange(color)}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography className={classes.colorLabel}>
            (Assign this Agent a Color)
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          {selectedAgent && (
            <>
              <Box display="flex" alignItems="center">
                <TextField
                  margin="dense"
                  name="name"
                  label="Agent Name"
                  type="text"
                  fullWidth
                  value={selectedAgent.name}
                  onChange={handleAgentChange}
                  disabled={!isEditing}
                  error={!!editFormErrors.name}
                  helperText={editFormErrors.name}
                />
                {renderTooltip(
                  "Agent Name",
                  "Enter a unique name for your agent. This name will be used to identify and interact with the agent in the system."
                )}
              </Box>
              <Box display="flex" flexDirection="column">
                <TextField
                  margin="dense"
                  name="description"
                  label="Agent Description"
                  type="text"
                  fullWidth
                  multiline
                  rows={3}
                  value={selectedAgent.description}
                  onChange={handleAgentChange}
                  disabled={!isEditing}
                  error={descriptionError}
                  helperText={descriptionError ? "Description must be 140 characters or less" : ""}
                />
                <Typography className={classes.characterCount}>
                  {selectedAgent.description.length}/140 characters
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <TextField
                  margin="dense"
                  name="agent_instructions"
                  label="Agent Instructions"
                  type="text"
                  fullWidth
                  multiline
                  rows={8}
                  value={selectedAgent.agent_instructions}
                  onChange={handleAgentChange}
                  disabled={!isEditing}
                  className={classes.largeTextField}
                />
                {renderTooltip(
                  "Agent Instructions",
                  "Specify detailed instructions for the agent. These instructions guide the agent's behavior and responses when interacting with users or other agents."
                )}
              </Box>
              <Box display="flex" alignItems="center">
                <FormControl fullWidth margin="dense">
                  <InputLabel id="llm-model-label">LLM Model</InputLabel>
                  <Select
                    labelId="llm-model-label"
                    name="llm_model"
                    value={selectedAgent.llm_model}
                    onChange={handleAgentChange}
                    disabled={!isEditing}
                  >
                    {availableModels.map((modelName) => (
                      <MenuItem key={modelName} value={modelName}>
                        {modelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {renderTooltip(
                  "LLM Model",
                  "Choose the Language Model for your agent. Different models have varying capabilities and performance characteristics."
                )}
              </Box>
              <div className={classes.dateInfo}>
                <div>
                  <span className={classes.dateLabel}>Created:</span>
                  {formatDateTime(selectedAgent.createdAt)}
                </div>
                <div>
                  <span className={classes.dateLabel}>Modified:</span>
                  {formatDateTime(selectedAgent.modifiedAt)}
                </div>
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} color="secondary">
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} color="primary" disabled={descriptionError}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCloseDetails} color="secondary">
                Close
              </Button>
              <Button onClick={handleEdit} color="primary">
                Edit
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-description"
      >
        <DialogTitle id="delete-confirm-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography id="delete-confirm-description">
            Are you sure you want to delete the agent "{agentToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="secondary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={duplicateDialogOpen} 
        onClose={() => setDuplicateDialogOpen(false)} 
        aria-labelledby="duplicate-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="duplicate-dialog-title" className={classes.dialogTitle}>
          <Typography variant="h6">Duplicate Agent</Typography>
          <Box className={classes.colorGrid}>
            {colorOptions.map((color) => (
              <Tooltip title={color} key={color}>
                <Box
                  className={`${classes.colorOption} ${duplicatedAgent && duplicatedAgent.color === color ? classes.selectedColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleDuplicateColorChange(color)}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography className={classes.colorLabel}>
            (Assign this Agent a Color)
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          {duplicatedAgent && (
            <>
              <Box display="flex" alignItems="center">
                <TextField
                  autoFocus
                  margin="dense"
                  name="name"
                  label="Agent Name"
                  type="text"
                  fullWidth
                  value={duplicatedAgent.name}
                  onChange={handleDuplicateChange}
                />
                {renderTooltip(
                  "Agent Name",
                  "Enter a unique name for your agent. This name will be used to identify and interact with the agent in the system."
                )}
              </Box>
              <Box display="flex" flexDirection="column">
                <TextField
                  margin="dense"
                  name="description"
                  label="Agent Description"
                  type="text"
                  fullWidth
                  multiline
                  rows={3}
                  value={duplicatedAgent.description}
                  onChange={handleDuplicateChange}
                  error={descriptionError}
                  helperText={descriptionError ? "Description must be 140 characters or less" : ""}
                />
                <Typography className={classes.characterCount}>
                  {duplicatedAgent.description.length}/140 characters
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <TextField
                  margin="dense"
                  name="agent_instructions"
                  label="Agent Instructions"
                  type="text"
                  fullWidth
                  multiline
                  rows={8}
                  value={duplicatedAgent.agent_instructions}
                  onChange={handleDuplicateChange}
                  className={classes.largeTextField}
                />
                {renderTooltip(
                  "Agent Instructions",
                  "Specify detailed instructions for the agent. These instructions guide the agent's behavior and responses when interacting with users or other agents."
                )}
              </Box>
              <Box display="flex" alignItems="center">
                <FormControl fullWidth margin="dense">
                  <InputLabel id="llm-model-label">LLM Model</InputLabel>
                  <Select
                    labelId="llm-model-label"
                    name="llm_model"
                    value={duplicatedAgent.llm_model}
                    onChange={handleDuplicateChange}
                  >
                    {availableModels.map((modelName) => (
                      <MenuItem key={modelName} value={modelName}>
                        {modelName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {renderTooltip(
                  "LLM Model",
                  "Choose the Language Model for your agent. Different models have varying capabilities and performance characteristics."
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDuplicateSubmit} color="primary" disabled={descriptionError}>
            Create Duplicate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        aria-labelledby="info-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="info-dialog-title" className={classes.infoDialogTitle}>
          {infoDialogContent.title}
        </DialogTitle>
        <DialogContent className={classes.infoDialogContent}>
          <Typography variant="body1">{infoDialogContent.content}</Typography>
          <Box mt={2}>
            <Link href="http://localhost:3000/multi-agent/builder/user-guide" target="_blank" color="primary">
              Learn more in the Multi-Agent Portal User Guide
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default AgentPortfolio;