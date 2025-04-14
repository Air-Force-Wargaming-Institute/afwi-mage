import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { 
  Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Grid, Card, CardContent, CardActions, CardHeader, IconButton, 
  Tooltip, Snackbar, Select, MenuItem, FormControl, InputLabel,
  InputAdornment, Checkbox
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import SearchIcon from '@material-ui/icons/Search';
import MuiAlert from '@material-ui/lab/Alert';
import robotIcon from '../../assets/robot-icon.png'; // Import the custom icon
import agentTeamIcon from '../../assets/agent-team.png';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText
import { DeleteButton, DeleteIconButton } from '../../styles/ActionButtons';
import { 
  GradientText as GradientTextStyled, 
  SubtleGlowPaper, 
  GradientCornersPaper, 
  AnimatedGradientPaper 
} from '../../styles/StyledComponents'; // Import styled components for section distinction

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
  controlsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    gap: theme.spacing(2),
    flexWrap: 'wrap',
  },
  searchField: {
    flexGrow: 1,
    minWidth: '200px',
  },
  formControl: {
    minWidth: 150,
  },
  colorFilterItem: {
    display: 'flex',
    alignItems: 'center',
  },
  colorFilterSwatch: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    marginRight: theme.spacing(1),
    border: '1px solid #ccc',
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
    borderWidth: 2,
    borderStyle: 'solid',
    cursor: 'pointer',
  },
  cardHeader: {
    paddingBottom: 0,
    display: 'flex',
    alignItems: 'center',
  },
  cardContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  colorSquare: {
    width: 48,
    height: 48,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  teamIcon: {
    width: 42,
    height: 42,
    filter: 'invert(1)',
  },
  colorOption: {
    width: 24,
    height: 24,
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
    width: '100%',
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
  formControlDialog: {
    marginBottom: theme.spacing(2),
    minWidth: 120,
    width: '100%',
  },
  dialogContent: {
    width: '100%',
    padding: theme.spacing(2, 3),
    backgroundColor: theme.palette.background.paper,
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
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    display: 'flex',
    alignItems: 'center',
    '&::before, &::after': {
      content: '""',
      flex: 1,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '&::before': {
      marginRight: theme.spacing(1),
    },
    '&::after': {
      marginLeft: theme.spacing(1),
    },
  },
  teamInfoBlurb: {
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    '& ul': {
      paddingLeft: theme.spacing(2),
      marginBottom: 0,
      listStyleType: 'none',
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
    filter: 'brightness(0) invert(.8)',
  },
  agentName: {
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  teamName: {
    fontSize: '1.2rem',
    textDecoration: 'underline',
    fontWeight: 'bold',
    color: theme.palette.text.primary, 
  },
  deleteIcon: {
    color: theme.palette.error.main,
  },
  duplicateIcon: {
    color: theme.palette.info.main,
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
  agentListText: {
    marginTop: theme.spacing(1),
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
  agentListContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing(0, 1),
    paddingLeft: 0,
    listStyle: 'none',
    marginTop: theme.spacing(0.5), 
  },
  agentListItem: {
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    display: 'flex',
    alignItems: 'center',
    '&::before': {
      content: '"•"',
      marginRight: theme.spacing(0.5),
      color: theme.palette.text.secondary,
    },
  },
  sectionContainer: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    position: 'relative',
  },
  teamInfoSection: {
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    border: `1px solid ${theme.palette.divider}`,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '30%',
      height: '30%',
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, transparent 60%)`,
      borderTopLeftRadius: theme.shape.borderRadius,
      opacity: 0.2,
      zIndex: 0,
    },
  },
  resourcesSection: {
    backgroundColor: 'rgba(52, 168, 83, 0.08)',
    border: `1px solid ${theme.palette.divider}`,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      width: '30%',
      height: '30%',
      background: `linear-gradient(225deg, ${theme.palette.secondary.main} 0%, transparent 60%)`,
      borderTopRightRadius: theme.shape.borderRadius,
      opacity: 0.2,
      zIndex: 0,
    },
  },
  agentTeamSection: {
    backgroundColor: 'rgba(251, 188, 5, 0.08)',
    border: `1px solid ${theme.palette.divider}`,
    '&::before': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: '30%',
      height: '30%',
      background: `linear-gradient(315deg, ${theme.palette.warning.main} 0%, transparent 60%)`,
      borderBottomRightRadius: theme.shape.borderRadius,
      opacity: 0.2,
      zIndex: 0,
    },
  },
  sectionIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  headerRobotIcon: {
    width: 20,
    height: 24,
    marginRight: theme.spacing(1),
    filter: 'brightness(0) invert(.8)',
    verticalAlign: 'middle',
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
  const { user, token } = useContext(AuthContext);
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
    agents: Array(4).fill(''),
    team_instructions: '',
    vectorstore: [],
    database: ''
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
  const [nameError, setNameError] = useState(false);
  const [nameErrorMessage, setNameErrorMessage] = useState('');
  const [agentMapping, setAgentMapping] = useState({});
  const [vectorstores, setVectorstores] = useState([]);

  // --- State for Search, Filter, Sort ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColors, setFilterColors] = useState([]);
  const [sortOrder, setSortOrder] = useState('name_asc');

  useEffect(() => {
    fetchTeams();
    fetchAvailableAgents();
    fetchAgentDescriptions();
    fetchVectorstores();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(getGatewayUrl('/api/agent/list_teams/'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
      console.log("Teams received from backend:", response.data.teams);
      // Ensure createdAt and modifiedAt exist for sorting
      const teamsWithDates = response.data.teams.map(team => ({
        ...team,
        createdAt: team.createdAt || new Date(0).toISOString(), // Fallback
        modifiedAt: team.modifiedAt || team.createdAt || new Date(0).toISOString() // Fallback
      }));
      setTeams(teamsWithDates);
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
      const response = await axios.get(getGatewayUrl('/api/agent/list_agents/'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
      setAvailableAgents(response.data.agents);
      setAllAgents(response.data.agents);
      
      // Create a mapping of agent names to unique_ids
      const mapping = {};
      response.data.agents.forEach(agent => {
        mapping[agent.name] = agent.unique_id;
      });
      setAgentMapping(mapping);
    } catch (error) {
      console.error('Error fetching available agents:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching available agents. Please try again.',
        severity: 'error'
      });
    }
  };

  const fetchVectorstores = async () => {
    try {
      const response = await axios.get(getGatewayUrl('/api/agent/list_vs/'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
      console.log("Vectorstores received from backend:", response.data.vectorstores);
      setVectorstores(response.data.vectorstores);
    } catch (error) {
      console.error('Error fetching vectorstores:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching vectorstores. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleEditOpen = (team) => {
    // Create a copy of the team with all 4 agent slots
    const fullTeam = {
      ...team,
      agents: [...team.agents, ...Array(4 - team.agents.length).fill('')],
      // Ensure vectorstore is initialized as an array
      vectorstore: team.vectorstore || [],
      database: team.database || ''
    };
    console.log("Opening team for editing:", fullTeam);
    setEditingTeam(fullTeam);
    setEditOpen(true);
  };
  const handleEditClose = () => {
    setEditingTeam(null);
    setEditOpen(false);
  };

  const handleChange = (event, isEditing = false) => {
    const { name, value } = event.target;
    
    // Validate team name
    if (name === 'name') {
      if (!value.match(/^[a-zA-Z0-9\s_-]*$/)) {
        setNameError(true);
        setNameErrorMessage('Team name can only contain letters, numbers, spaces, underscores, and hyphens');
        // Still update the form state so user sees what they typed
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
        return;
      } else {
        setNameError(false);
        setNameErrorMessage('');
      }
    }

    // Validate description length
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
    if (nameError || descriptionError) {
      setSnackbar({
        open: true,
        message: 'Please fix all errors before submitting',
        severity: 'error'
      });
      return;
    }

    try {
      const compactAgents = newTeam.agents
        .filter(agentName => agentName !== '')
        .map(agentName => agentMapping[agentName])
        .filter(id => id !== undefined);

      const submissionData = {
        ...newTeam,
        agents: compactAgents,
        vectorstore: newTeam.vectorstore || []
      };

      const response = await axios.post(getGatewayUrl('/api/agent/create_team/'), submissionData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
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
        message: error.response?.data?.detail || 'Error creating team. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleEditSubmit = async () => {
    if (nameError || descriptionError) {
      setSnackbar({
        open: true,
        message: 'Please fix all errors before submitting',
        severity: 'error'
      });
      return;
    }

    try {
      const compactAgents = editingTeam.agents
        .filter(agentName => agentName !== '')
        .map(agentName => agentMapping[agentName])
        .filter(id => id !== undefined);

      const submissionData = {
        ...editingTeam,
        agents: compactAgents,
        vectorstore: editingTeam.vectorstore || [],
        database: editingTeam.database || ''
      };

      console.log("Submitting team update with data:", submissionData);
      await axios.put(getGatewayUrl(`/api/agent/update_team/${editingTeam.unique_id}`),
      submissionData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
        message: error.response?.data?.detail || 'Error updating team. Please try again.',
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

  // Update getAvailableAgentsForDropdown to work with agent names
  const getAvailableAgentsForDropdown = (index, team) => {
    // Ensure team.agents is an array
    const agentsList = Array.isArray(team.agents) 
      ? team.agents 
      : typeof team.agents === 'string' 
        ? [team.agents]
        : [];
        
    const selectedAgents = agentsList.filter((agent, i) => i !== index && agent !== '');
    return allAgents.filter(agent => !selectedAgents.includes(agent.name));
  };

  const handleDeleteClick = (team) => {
    setTeamToDelete(team);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Delete from agent and chat service TODO: do we need to delete from chat service?
      await axios.delete(getGatewayUrl(`/api/agent/delete_team/${teamToDelete.unique_id}`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
      //await axios.delete(getApiUrl('CHAT', `/delete_team/${teamToDelete.file_name}`));
      
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
    // Ensure team.agents is an array
    const agentsList = Array.isArray(team.agents) 
      ? team.agents 
      : typeof team.agents === 'string' 
        ? [team.agents]
        : [];

    // Create a copy of the team with all 4 agent slots
    const fullTeam = {
      ...team,
      agents: [
        ...agentsList,                            // First, include all existing agents
        ...Array(4 - agentsList.length).fill('')  // Then fill remaining slots with empty strings
      ]
    };
    setEditingTeam(fullTeam);
    setEditOpen(true);
  };

  const handleDuplicateClick = async (team) => {
    try {
      const agentIds = team.agents
        .filter(agentName => agentName !== '')
        .map(agentName => agentMapping[agentName])
        .filter(id => id !== undefined);

      const duplicateTeam = {
        name: `Copy of ${team.name}`,
        description: team.description,
        color: team.color,
        agents: agentIds,
        vectorstore: team.vectorstore || [],
        database: team.database || ''
      };

      const response = await axios.post(getGatewayUrl('/api/agent/create_team/'),
      duplicateTeam,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
      setSnackbar({
        open: true,
        message: 'Team duplicated successfully!',
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
      const response = await axios.get(getGatewayUrl('/api/agent/list_agents/'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
      const descriptions = {};
      response.data.agents.forEach(agent => {
        descriptions[agent.name] = agent.description;
      });
      setAgentDescriptions(descriptions);
    } catch (error) {
      console.error('Error fetching agent descriptions:', error);
    }
  };

  // --- Handlers for Search, Filter, Sort ---
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterColorsChange = (event) => {
    const { value } = event.target;
    // On autofill we get a stringified value.
    setFilterColors(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSortOrderChange = (event) => {
    setSortOrder(event.target.value);
  };

  // --- Memoized calculation for displayed teams ---
  const displayedTeams = useMemo(() => {
    let filteredTeams = [...teams];

    // 1. Search Filter (by name and description)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredTeams = filteredTeams.filter(team =>
        (team.name && team.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (team.description && team.description.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // 2. Color Filter (multi-select)
    if (filterColors.length > 0) {
      filteredTeams = filteredTeams.filter(team => filterColors.includes(team.color));
    }

    // 3. Sorting
    filteredTeams.sort((a, b) => {
        // Ensure dates are valid Date objects for comparison
        const dateA_created = new Date(a.createdAt);
        const dateB_created = new Date(b.createdAt);
        const dateA_modified = new Date(a.modifiedAt);
        const dateB_modified = new Date(b.modifiedAt);

      switch (sortOrder) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
         case 'created_asc':
           return (isNaN(dateA_created) || isNaN(dateB_created)) ? 0 : dateA_created - dateB_created;
         case 'created_desc':
           return (isNaN(dateA_created) || isNaN(dateB_created)) ? 0 : dateB_created - dateA_created;
         case 'modified_asc':
            return (isNaN(dateA_modified) || isNaN(dateB_modified)) ? 0 : dateA_modified - dateB_modified;
         case 'modified_desc':
            return (isNaN(dateA_modified) || isNaN(dateB_modified)) ? 0 : dateB_modified - dateA_modified;
        default:
           return (a.name || '').localeCompare(b.name || ''); // Fallback to name_asc
      }
    });

    return filteredTeams;
  }, [teams, searchTerm, filterColors, sortOrder]);

  // --- Get unique colors present in the current teams list ---
  const uniqueTeamColors = useMemo(() => {
    const colors = new Set(teams.map(team => team.color).filter(color => !!color));
    return Array.from(colors).sort();
  }, [teams]);

  // Add handler for database change
  const handleDatabaseChange = (event, isEditing = false) => {
    const { value } = event.target;
    if (isEditing) {
      setEditingTeam(prevState => ({
        ...prevState,
        database: value
      }));
    } else {
      setNewTeam(prevState => ({
        ...prevState,
        database: value
      }));
    }
  };

  return (
    <div className={classes.root}>
      <Box className={classes.header}>
        <GradientText component="div">
          <Typography variant="h2">Agent Teams</Typography>
        </GradientText>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Assemble New Multi-Agent Team
        </Button>
      </Box>

      {/* --- Search, Filter, Sort Controls --- */}
      <Box className={classes.controlsContainer}>
         <TextField
          label="Search Teams"
          variant="outlined"
          size="small"
          className={classes.searchField}
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        {/* Color Filter with Clear Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl variant="outlined" size="small" className={classes.formControl}>
            <InputLabel id="filter-color-label-teams">Filter by Color</InputLabel>
            <Select
              labelId="filter-color-label-teams"
              multiple
              value={filterColors}
              onChange={handleFilterColorsChange}
              label="Filter by Color"
              renderValue={(selected) => {
                if (selected.length === 0) {
                  return <em>All Colors</em>;
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                       <Box 
                         key={value} 
                         className={classes.colorFilterSwatch} 
                        />
                    ))}
                  </Box>
                );
              }}
              MenuProps={{
              }}
            >
              {uniqueTeamColors.map((color) => (
                <MenuItem key={color} value={color} className={classes.colorFilterItem}>
                   <Checkbox checked={filterColors.indexOf(color) > -1} size="small" />
                   <Box className={classes.colorFilterSwatch} style={{ backgroundColor: color }} />
                   {color}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Clear Filter Button - Rendered Conditionally */} 
          {filterColors.length > 0 && (
            <Button 
              variant="text" 
              size="small" 
              onClick={() => setFilterColors([])}
              sx={{ 
                padding: '4px 8px', // Smaller padding
                minWidth: 'auto', // Allow button to shrink
              }}
            >
              Clear
            </Button>
          )}
        </Box>
        <FormControl variant="outlined" size="small" className={classes.formControl}>
          <InputLabel id="sort-order-label-teams">Sort By</InputLabel>
          <Select
            labelId="sort-order-label-teams"
            value={sortOrder}
            onChange={handleSortOrderChange}
            label="Sort By"
          >
            <MenuItem value="name_asc">Name (A-Z)</MenuItem>
            <MenuItem value="name_desc">Name (Z-A)</MenuItem>
            <MenuItem value="created_desc">Date Created (Newest)</MenuItem>
            <MenuItem value="created_asc">Date Created (Oldest)</MenuItem>
            <MenuItem value="modified_desc">Date Modified (Newest)</MenuItem>
            <MenuItem value="modified_asc">Date Modified (Oldest)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Map over displayedTeams instead of teams */}
         {displayedTeams.length === 0 ? (
          <Grid item xs={12}>
             <Typography variant="subtitle1" align="center" color="textSecondary" style={{ marginTop: '20px' }}>
                {teams.length > 0 ? 'No teams found matching your criteria.' : 'No teams created yet.'}
             </Typography>
          </Grid>
         ) : (
           displayedTeams.map((team) => (
             <Grid item xs={12} sm={6} md={4} key={team.unique_id}>
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
                   title={<Typography className={classes.teamName}>{team.name || 'Unnamed Team'}</Typography>}
                 />
                 <CardContent className={classes.cardContent}>
                   <Typography variant="body2" color="textSecondary" component="p">
                     {team.description || ''}
                   </Typography>
                   {/* Display Agent List */}
                   {Array.isArray(team.agents) && team.agents.filter(agentName => agentName).length > 0 && (
                     <Box mt={1}> {/* Add some margin top */}
                       <Typography variant="caption" display="block" style={{ fontWeight: 'bold' , textDecoration: 'underline'}}>
                         Agents:
                       </Typography>
                       {/* Use Box as a grid container for the two-column list */}
                       <Box component="ul" className={classes.agentListContainer}>
                         {team.agents.filter(agentName => agentName).map((agentName, idx) => (
                           <Typography component="li" key={idx} className={classes.agentListItem}>
                             {agentName}
                           </Typography>
                         ))}
                       </Box>
                     </Box>
                   )}
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
           ))
         )}
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
          {/* Section 1: Team Information */}
          <Box className={`${classes.sectionContainer} ${classes.teamInfoSection}`}>
            <Typography variant="h6" gutterBottom>
              <span role="img" aria-label="info" className={classes.sectionIcon}>📝</span>
              Team Information
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Team Name"
              type="text"
              fullWidth
              value={newTeam.name}
              onChange={handleChange}
              className={classes.formControlDialog}
              required
              error={nameError}
              helperText={nameErrorMessage || ' '}
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
                className={classes.formControlDialog}
                required
                error={descriptionError}
                helperText={descriptionError ? "Description must be 140 characters or less" : " "}
              />
              <Typography className={classes.characterCount}>
                {(newTeam.description || '').length}/140 characters
              </Typography>
            </Box>
          </Box>

          {/* Section 2: Resources */}
          <Box className={`${classes.sectionContainer} ${classes.resourcesSection}`}>
            <Typography variant="h6" gutterBottom>
              <span role="img" aria-label="database" className={classes.sectionIcon}>🔗</span>
              Connect Team to Resources
            </Typography>
            <FormControl fullWidth className={classes.formControlDialog}>
              <InputLabel id="documents-select-label">Select Vectorstores Created from Library Documents</InputLabel>
              <Select
                labelId="documents-select-label"
                value={newTeam.vectorstore}
                onChange={(e) => {
                  setNewTeam(prev => ({
                    ...prev,
                    vectorstore: Array.isArray(e.target.value) ? e.target.value : [e.target.value]
                  }));
                }}
                multiple
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) {
                    return <em>Select vectorstores (optional)</em>;
                  }
                  return selected.map(id => 
                    vectorstores.find(vs => vs.unique_id === id)?.name || id
                  ).join(', ');
                }}
                MenuProps={{
                  getContentAnchorEl: null,
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  }
                }}
              >
                <MenuItem value={[]} style={{ fontStyle: 'italic' }}>
                  None
                </MenuItem>
                {vectorstores.map((vs) => (
                  <MenuItem key={vs.unique_id} value={vs.unique_id}>
                    {vs.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Placeholder Database Dropdown */}
            <FormControl fullWidth className={classes.formControlDialog}>
              <InputLabel id="database-select-label">Select Local System Database Connection</InputLabel>
              <Select
                labelId="database-select-label"
                value={newTeam.database}
                onChange={(e) => handleDatabaseChange(e, false)} // Use the new handler
                name="database" // Add name attribute
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {/* Add placeholder options here later if needed */}
                <MenuItem value="placeholder_db_1">Placeholder DB 1</MenuItem>
                <MenuItem value="placeholder_db_2">Placeholder DB 2</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Section 3: Agent Team */}
          <Box className={`${classes.sectionContainer} ${classes.agentTeamSection}`}>
            <Typography variant="h6" gutterBottom>
              <img src={robotIcon} alt="Robot" className={classes.headerRobotIcon} />
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
              {[...Array(4)].map((_, index) => (
                <FormControl key={index} className={classes.agentSelect}>
                  <InputLabel id={`agent-select-label-${index}`}>Agent {index + 1}</InputLabel>
                  <Select
                    labelId={`agent-select-label-${index}`}
                    value={newTeam.agents[index]}
                    onChange={(e) => handleAgentChange(index, e.target.value)}
                    fullWidth
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {getAvailableAgentsForDropdown(index, newTeam).map((agent) => (
                      <MenuItem key={agent.unique_id} value={agent.name}>
                        {agent.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {newTeam.agents[index] && (
                    <Typography className={classes.agentDescription}>
                      {allAgents.find(agent => agent.name === newTeam.agents[index])?.description || 'No description available.'}
                    </Typography>
                  )}
                </FormControl>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button 
             onClick={handleSubmit} 
             color="primary" 
             disabled={
                nameError || 
                descriptionError ||
                !newTeam.name || newTeam.name.length < 3 ||
                !newTeam.description || newTeam.description.length > 140
             }
           >
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
                  style={{ backgroundColor: color, cursor: 'pointer' }}
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
          {/* Section 1: Team Information */}
          <Box className={`${classes.sectionContainer} ${classes.teamInfoSection}`}>
            <Typography variant="h6" gutterBottom>
              <span role="img" aria-label="info" className={classes.sectionIcon}>📝</span>
              Team Information
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Team Name"
              type="text"
              fullWidth
              value={editingTeam ? editingTeam.name : ''}
              onChange={(e) => handleChange(e, true)}
              className={classes.formControlDialog}
              required
              error={nameError}
              helperText={nameErrorMessage || ' '}
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
                className={classes.formControlDialog}
                required
                error={descriptionError}
                helperText={descriptionError ? "Description must be 140 characters or less" : " "}
              />
              <Typography className={classes.characterCount}>
                {(editingTeam?.description || '').length}/140 characters
              </Typography>
            </Box>
          </Box>

          {/* Section 2: Resources */}
          <Box className={`${classes.sectionContainer} ${classes.resourcesSection}`}>
            <Typography variant="h6" gutterBottom>
              <span role="img" aria-label="database" className={classes.sectionIcon}>🔗</span>
              Connect Team to Resources
            </Typography>
            <FormControl fullWidth className={classes.formControlDialog}>
              <InputLabel id="edit-documents-select-label">Select Vectorstores Created from Library Documents</InputLabel>
              <Select
                labelId="edit-documents-select-label"
                value={editingTeam?.vectorstore || []}
                onChange={(e) => {
                  console.log("Selected vectorstore:", e.target.value);
                  setEditingTeam(prev => ({
                    ...prev,
                    vectorstore: Array.isArray(e.target.value) ? e.target.value : (e.target.value ? [e.target.value] : []) 
                  }));
                }}
                multiple
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) {
                    return <em>Select vectorstores (optional)</em>;
                  }
                  return selected.map(id => 
                    vectorstores.find(vs => vs.unique_id === id)?.name || id
                  ).join(', ');
                }}
                MenuProps={{
                  getContentAnchorEl: null,
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  }
                }}
              >
                <MenuItem value={[]} style={{ fontStyle: 'italic' }}>
                  None
                </MenuItem>
                {vectorstores.map((vs) => (
                  <MenuItem key={vs.unique_id} value={vs.unique_id}>
                    {vs.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Placeholder Database Dropdown */}
            <FormControl fullWidth className={classes.formControlDialog}>
              <InputLabel id="edit-database-select-label">Select Local System Database Connection</InputLabel>
              <Select
                labelId="edit-database-select-label"
                value={editingTeam?.database || ''}
                onChange={(e) => handleDatabaseChange(e, true)} // Use the new handler for editing
                name="database" // Add name attribute
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {/* Add placeholder options here later if needed */}
                <MenuItem value="placeholder_db_1">Placeholder DB 1</MenuItem>
                <MenuItem value="placeholder_db_2">Placeholder DB 2</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Section 3: Agent Team */}
          <Box className={`${classes.sectionContainer} ${classes.agentTeamSection}`}>
            <Typography variant="h6" gutterBottom>
              <img src={robotIcon} alt="Robot" className={classes.headerRobotIcon} />
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
              {editingTeam && editingTeam.agents.slice(0, 4).map((agentName, index) => (
                <FormControl key={index} className={classes.agentSelect}>
                  <InputLabel id={`edit-agent-select-label-${index}`}>Agent {index + 1}</InputLabel>
                  <Select
                    labelId={`edit-agent-select-label-${index}`}
                    value={agentName || ''}
                    onChange={(e) => handleAgentChange(index, e.target.value, true)}
                    fullWidth
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {getAvailableAgentsForDropdown(index, editingTeam).map((agent) => (
                      <MenuItem key={agent.unique_id} value={agent.name}>
                        {agent.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {agentName && (
                    <Typography className={classes.agentDescription}>
                      {allAgents.find(agent => agent.name === agentName)?.description || 'No description available.'}
                    </Typography>
                  )}
                </FormControl>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} color="primary">
            Cancel
          </Button>
          <Button 
             onClick={handleEditSubmit} 
             color="primary" 
             disabled={
                 nameError || 
                 descriptionError ||
                 !editingTeam?.name || editingTeam.name.length < 3 ||
                 !editingTeam?.description || editingTeam.description.length > 140
             }
           >
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
            Are you sure you want to delete the team "{teamToDelete?.name || 'this team'}"? This action cannot be undone.
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

      <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default AgentTeams;