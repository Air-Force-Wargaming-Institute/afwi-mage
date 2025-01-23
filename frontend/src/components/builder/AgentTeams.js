import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Grid, Card, CardContent, CardActions, CardHeader, IconButton, 
  Tooltip, Snackbar, Select, MenuItem, FormControl, InputLabel
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import MuiAlert from '@material-ui/lab/Alert';
import robotIcon from '../../assets/robot-icon.png'; // Import the custom icon
import agentTeamIcon from '../../assets/agent-team.png';
import { getApiUrl } from '../../config';

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: '0.3s',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[4],
    },
    borderWidth: 2,  // Add this line
    borderStyle: 'solid',  // Add this line
    cursor: 'pointer',
  },
  cardHeader: {
    paddingBottom: 0,
    display: 'flex',
    alignItems: 'center',
  },
  cardContent: {
    flexGrow: 1,
  },
  colorSquare: {
    width: 48, // Increased from 36
    height: 48, // Increased from 36
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  teamIcon: {
    width: 42, // Slightly reduced to fit better in the larger square
    height: 42, // Slightly reduced to fit better in the larger square
    filter: 'invert(1)', // This line inverts the color of the icon
  },
  colorOption: {
    width: 24,  // Reduced from 30
    height: 24, // Reduced from 30
    margin: 2,
    cursor: 'pointer',
    border: '1px solid #ccc',
    '&:hover': {
      opacity: 0.8,
    },
  },
  selectedColor: {
    border: '2px solid #000',
  },
  colorGrid: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%', // Ensure color grid takes full width
    marginTop: theme.spacing(1),
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
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: 120,
    width: '100%',
  },
  dialogContent: {
    width: '100%',  // Changed from fixed width to 100%
    padding: theme.spacing(2, 3),
  },
  characterCount: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textAlign: 'right',
    marginTop: theme.spacing(0.5),
  },
  agentSelect: {
    marginBottom: theme.spacing(2),
    '& .MuiFormControl-root': {
      marginBottom: theme.spacing(2),
    },
  },
  agentSelectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(2),
    [theme.breakpoints.down('xs')]: {
      gridTemplateColumns: '1fr',
    },
  },
  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
  },
  teamInfoBlurb: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    '& ul': {
      paddingLeft: theme.spacing(2),
      marginBottom: 0,
      listStyleType: 'none', // Remove default bullet points
    },
    '& li': {
      display: 'flex',
      alignItems: 'center',
      marginBottom: theme.spacing(1),
    },
  },
  robotIcon: {
    width: 35,
    height: 40,
    marginRight: theme.spacing(1),
    filter: 'invert(.8)', // This line inverts the color of the icon
  },
  agentName: {
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  deleteIcon: {
    color: theme.palette.error.main, // This will make the delete icon red
  },
  duplicateIcon: {
    color: theme.palette.info.main, // This will make the duplicate icon blue
  },
  cardActions: {
    justifyContent: 'flex-end',
    padding: theme.spacing(1),
  },
  agentDescription: {
    marginTop: theme.spacing(1),
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
  },
}));

const colorOptions = [
  '#FF0000', '#DC143C', '#B22222', '#008000',
  '#32CD32', '#2E8B57', '#0000FF', '#4169E1',
  '#1E90FF', '#FFA500', '#FF8C00', '#FF7F50',
  '#FFFF00', '#FFD700', '#F0E68C', '#800080',
  '#BA55D3', '#4B0082', '#FFFFF0', '#808080'
];

function AgentTeams() {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: colorOptions[0],
    agents: Array(8).fill(''),
  });
  const [editingTeam, setEditingTeam] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [descriptionError, setDescriptionError] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [agentDescriptions, setAgentDescriptions] = useState({});

  useEffect(() => {
    fetchTeams();
    fetchAvailableAgents();
    fetchAgentDescriptions();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(getApiUrl('AGENT', '/api/agents/list_teams/'));
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching teams. Please try again.',
        severity: 'error'
      });
    }
  };

  const fetchAvailableAgents = async () => {
    try {
      const response = await axios.get(getApiUrl('AGENT', '/api/agents/list_agents/'));
      setAvailableAgents(response.data.agents);
      setAllAgents(response.data.agents);
    } catch (error) {
      console.error('Error fetching available agents:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching available agents. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleEditOpen = (team) => {
    // Create a copy of the team with all 8 agent slots
    const fullTeam = {
      ...team,
      agents: [...team.agents, ...Array(8 - team.agents.length).fill('')]
    };
    setEditingTeam(fullTeam);
    setEditOpen(true);
  };
  const handleEditClose = () => {
    setEditingTeam(null);
    setEditOpen(false);
  };

  const handleChange = (event, isEditing = false) => {
    const { name, value } = event.target;
    if (name === 'description' && value.length > 140) {
      setDescriptionError(true);
    } else {
      setDescriptionError(false);
      if (isEditing) {
        setEditingTeam(prevState => ({
          ...prevState,
          [name]: value
        }));
      } else {
        setNewTeam(prevState => ({
          ...prevState,
          [name]: value
        }));
      }
    }
  };

  const handleAgentChange = (index, value, isEditing = false) => {
    if (isEditing) {
      setEditingTeam(prevState => {
        const newAgents = [...prevState.agents];
        newAgents[index] = value;
        return { ...prevState, agents: newAgents };
      });
    } else {
      setNewTeam(prevState => {
        const newAgents = [...prevState.agents];
        newAgents[index] = value;
        return { ...prevState, agents: newAgents };
      });
    }
  };

  const handleColorChange = (color, isEditing = false) => {
    if (isEditing) {
      setEditingTeam(prevState => ({
        ...prevState,
        color: color
      }));
    } else {
      setNewTeam(prevState => ({
        ...prevState,
        color: color
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Filter out empty agent slots and create a compact list
      const compactAgents = newTeam.agents.filter(agent => agent !== '');
      const submissionData = {
        ...newTeam,
        agents: compactAgents
      };

      const response = await axios.post(getApiUrl('AGENT', '/api/agents/create_team/'), submissionData);
      setTeams([...teams, response.data]);
      setOpen(false);
      setSnackbar({
        open: true,
        message: 'Team created successfully!',
        severity: 'success'
      });
      fetchTeams(); // Refresh the list of teams
    } catch (error) {
      console.error('Error creating team:', error);
      setSnackbar({
        open: true,
        message: 'Error creating team. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleEditSubmit = async () => {
    try {
      // Filter out empty agent slots and create a compact list
      const compactAgents = editingTeam.agents.filter(agent => agent !== '');
      const submissionData = {
        ...editingTeam,
        agents: compactAgents
      };

      await axios.put(getApiUrl('AGENT', `/api/agents/update_team/${editingTeam.file_name}`), submissionData);
      setEditOpen(false);
      setSnackbar({
        open: true,
        message: 'Team updated successfully!',
        severity: 'success'
      });
      fetchTeams(); // Refresh the list of teams
    } catch (error) {
      console.error('Error updating team:', error);
      setSnackbar({
        open: true,
        message: 'Error updating team. Please try again.',
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

  // Modify this function to work for both new and editing teams
  const getAvailableAgentsForDropdown = (index, team) => {
    const selectedAgents = team.agents.filter((agent, i) => i !== index && agent !== '');
    return allAgents.filter(agent => !selectedAgents.includes(agent.file_name.replace('_expert', '')));
  };

  const handleDeleteClick = (team) => {
    setTeamToDelete(team);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(getApiUrl('AGENT', `/api/agents/delete_team/${teamToDelete.file_name}`));
      setDeleteConfirmOpen(false);
      setSnackbar({
        open: true,
        message: 'Team deleted successfully!',
        severity: 'success'
      });
      fetchTeams(); // Refresh the list of teams
    } catch (error) {
      console.error('Error deleting team:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting team. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleEditClick = (team) => {
    setEditingTeam({
      ...team,
      agents: [...team.agents, ...Array(8 - team.agents.length).fill('')]
    });
    setEditOpen(true);
  };

  const handleDuplicateClick = async (team) => {
    try {
      const response = await axios.post(getApiUrl('AGENT', `/api/agents/duplicate_team/${team.file_name}`));
      setSnackbar({
        open: true,
        message: `Team "${response.data.message}" duplicated successfully`,
        severity: 'success'
      });
      fetchTeams(); // Refresh the list of teams
    } catch (error) {
      console.error('Error duplicating team:', error);
      setSnackbar({
        open: true,
        message: 'Error duplicating team. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleCardClick = (event, team) => {
    // Check if the click is on the duplicate or delete button
    if (!event.target.closest('.action-button')) {
      handleEditClick(team);
    }
  };

  // Add this new function to fetch agent descriptions
  const fetchAgentDescriptions = async () => {
    try {
      const response = await axios.get(getApiUrl('AGENT', '/api/agents/list_agents/'));
      const descriptions = {};
      response.data.agents.forEach(agent => {
        descriptions[agent.name] = agent.description;
      });
      setAgentDescriptions(descriptions);
    } catch (error) {
      console.error('Error fetching agent descriptions:', error);
    }
  };

  return (
    <div className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h4">Agent Teams</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Assemble New Multi-Agent Team
        </Button>
      </Box>

      <Grid container spacing={3}>
        {teams.map((team, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              className={classes.card} 
              style={{ borderColor: team.color }}
              onClick={(event) => handleCardClick(event, team)}
            >
              <CardHeader
                className={classes.cardHeader}
                avatar={
                  <Box display="flex" alignItems="center">
                    <div className={classes.colorSquare} style={{ backgroundColor: team.color }}>
                      <img src={agentTeamIcon} alt="Team" className={classes.teamIcon} />
                    </div>
                  </Box>
                }
                title={team.name}
              />
              <CardContent className={classes.cardContent}>
                <Typography variant="body2" color="textSecondary" component="p">
                  {team.description}
                </Typography>
              </CardContent>
              <CardActions className={classes.cardActions}>
                <Tooltip title="Duplicate Team">
                  <IconButton 
                    aria-label="duplicate" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateClick(team);
                    }}
                    className={`${classes.duplicateIcon} action-button`}
                  >
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Team">
                  <IconButton 
                    aria-label="delete" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(team);
                    }}
                    className={`${classes.deleteIcon} action-button`}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
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
          <Typography variant="h6">Create New Multi-Agent Team</Typography>
          <Box className={classes.colorGrid}>
            {colorOptions.map((color) => (
              <Tooltip title={color} key={color}>
                <Box
                  className={`${classes.colorOption} ${newTeam.color === color ? classes.selectedColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography className={classes.colorLabel}>
            (Assign this Team a Color)
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Team Name"
            type="text"
            fullWidth
            value={newTeam.name}
            onChange={handleChange}
            className={classes.formControl}
          />
          <Box display="flex" flexDirection="column">
            <TextField
              margin="dense"
              name="description"
              label="Team Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={newTeam.description}
              onChange={handleChange}
              className={classes.formControl}
              error={descriptionError}
              helperText={descriptionError ? "Description must be 140 characters or less" : ""}
            />
            <Typography className={classes.characterCount}>
              {newTeam.description.length}/140 characters
            </Typography>
          </Box>
          <Typography className={classes.sectionTitle}>
            Assemble Agent Team
          </Typography>
          <Typography variant="body2" className={classes.teamInfoBlurb}>
            All multi-agent teams come with the following system agents:
            <ul>
              <li>
                <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                <span><span className={classes.agentName}>Agent Moderator</span> - Identifies which agents are needed and creates tailored guidance to help agents think more deeply to address the user's query</span>
              </li>
              <li>
                <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                <span><span className={classes.agentName}>The Librarian</span> - Runs advanced database information retrieval at the request of agents to help find the most relevant information to address the user's query</span>
              </li>
              <li>
                <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                <span><span className={classes.agentName}>Synthesis Agent</span> - Consolidates agent collaborations, reports, and research results for final output to the user</span>
              </li>
            </ul>
          </Typography>
          <Box className={classes.agentSelectGrid}>
            {[...Array(8)].map((_, index) => (
              <FormControl key={index} className={classes.agentSelect}>
                <InputLabel id={`agent-select-label-${index}`}>Agent {index + 1}</InputLabel>
                <Select
                  labelId={`agent-select-label-${index}`}
                  value={newTeam.agents[index]}
                  onChange={(e) => handleAgentChange(index, e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {getAvailableAgentsForDropdown(index, newTeam).map((agent) => (
                    <MenuItem key={agent.file_name} value={agent.file_name}>
                      {agent.name}
                    </MenuItem>
                  ))}
                </Select>
                {newTeam.agents[index] && (
                  <Typography className={classes.agentDescription}>
                    {allAgents.find(agent => agent.file_name === newTeam.agents[index])?.description}
                  </Typography>
                )}
              </FormControl>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" disabled={descriptionError}>
            Create Team
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={editOpen} 
        onClose={handleEditClose} 
        aria-labelledby="edit-form-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="edit-form-dialog-title" className={classes.dialogTitle}>
          <Typography variant="h6">Edit Team</Typography>
          <Box className={classes.colorGrid}>
            {colorOptions.map((color) => (
              <Tooltip title={color} key={color}>
                <Box
                  className={`${classes.colorOption} ${editingTeam && editingTeam.color === color ? classes.selectedColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color, true)}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography className={classes.colorLabel}>
            (Assign this Team a Color)
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Team Name"
            type="text"
            fullWidth
            value={editingTeam ? editingTeam.name : ''}
            onChange={(e) => handleChange(e, true)}
            className={classes.formControl}
          />
          <Box display="flex" flexDirection="column">
            <TextField
              margin="dense"
              name="description"
              label="Team Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={editingTeam ? editingTeam.description : ''}
              onChange={(e) => handleChange(e, true)}
              className={classes.formControl}
              error={descriptionError}
              helperText={descriptionError ? "Description must be 140 characters or less" : ""}
            />
            <Typography className={classes.characterCount}>
              {editingTeam ? editingTeam.description.length : 0}/140 characters
            </Typography>
          </Box>
          <Typography className={classes.sectionTitle}>
            Build Your Multi-Agent Team
          </Typography>
          <Typography variant="body2" className={classes.teamInfoBlurb}>
            All multi-agent teams come with the following system agents:
            <ul>
              <li>
                <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                <span><span className={classes.agentName}>Agent Moderator</span> - Identifies which agents are needed and creates tailored guidance to help agents think more deeply to address the user's query</span>
              </li>
              <li>
                <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                <span><span className={classes.agentName}>The Librarian</span> - Runs advanced database information retrieval at the request of agents to help find the most relevant information to address the user's query</span>
              </li>
              <li>
                <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
                <span><span className={classes.agentName}>Synthesis Agent</span> - Consolidates agent collaborations, reports, and research results for final output to the user</span>
              </li>
            </ul>
          </Typography>
          <Box className={classes.agentSelectGrid}>
            {editingTeam && editingTeam.agents.map((agentFileName, index) => (
              <FormControl key={index} className={classes.agentSelect}>
                <InputLabel id={`edit-agent-select-label-${index}`}>Agent {index + 1}</InputLabel>
                <Select
                  labelId={`edit-agent-select-label-${index}`}
                  value={agentFileName}
                  onChange={(e) => handleAgentChange(index, e.target.value, true)}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {getAvailableAgentsForDropdown(index, editingTeam).map((agent) => (
                    <MenuItem key={agent.file_name} value={agent.file_name}>
                      {agent.name}
                    </MenuItem>
                  ))}
                </Select>
                {agentFileName && (
                  <Typography className={classes.agentDescription}>
                    {allAgents.find(agent => agent.file_name === agentFileName)?.description}
                  </Typography>
                )}
              </FormControl>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleEditSubmit} color="primary" disabled={descriptionError}>
            Save Changes
          </Button>
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
            Are you sure you want to delete the team "{teamToDelete?.name}"? This action cannot be undone.
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

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default AgentTeams;