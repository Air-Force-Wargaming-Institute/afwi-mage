import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import axios from 'axios';
import { getApiUrl } from '../../config';

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
  promptList: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  },
  promptContent: {
    marginTop: theme.spacing(2),
  },
  editor: {
    width: '100%',
    marginTop: theme.spacing(2),
  },
  variableList: {
    marginTop: theme.spacing(2),
    display: 'flex',
    flexWrap: 'wrap',
  },
  variableChip: {
    margin: theme.spacing(0.5),
  },
  variableInput: {
    marginRight: theme.spacing(1),
  },
  addVariableButton: {
    marginTop: theme.spacing(1),
  },
  llmSelect: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  }
}));

function SystemPrompts() {
  const classes = useStyles();
  const [prompts, setPrompts] = useState({});
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedTemplateType, setSelectedTemplateType] = useState('system');
  const [availableVariables, setAvailableVariables] = useState([]);
  const [newVariable, setNewVariable] = useState('');
  const [availableLLMs, setAvailableLLMs] = useState([]);
  
  // Add delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState(null);
  const [promptNameToDelete, setPromptNameToDelete] = useState('');

  const templateTypes = [
    { value: 'system', label: 'System Prompt' },
    { value: 'agent', label: 'Agent Prompt' },
    { value: 'planning', label: 'Planning Prompt' },
    { value: 'synthesis', label: 'Synthesis Prompt' }
  ];

  useEffect(() => {
    fetchPrompts();
    fetchAvailableLLMs();
    if (editingPrompt?.id) {
      fetchAvailableVariables(editingPrompt.id);
    }
  }, [selectedTemplateType, editingPrompt?.id]);

  const fetchPrompts = async () => {
    try {
      const response = await axios.get(getApiUrl('CHAT', '/api/prompts/list'));
      setPrompts(response.data);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setSnackbar({
        open: true,
        message: 'Error loading prompts',
        severity: 'error'
      });
    }
  };

  const fetchAvailableVariables = async (promptId) => {
    if (!promptId) return;
    try {
      const response = await axios.get(getApiUrl('CHAT', `/api/prompts/${promptId}/variables`));
      setAvailableVariables(response.data);
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  const fetchAvailableLLMs = async () => {
    try {
      const response = await axios.get(getApiUrl('CHAT', '/models/ollama'));
      const llms = response.data.models.map(model => ({
        id: model.name,  // Use model name as ID
        name: model.name,
        provider: 'Ollama'
      }));
      setAvailableLLMs(llms);
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      setSnackbar({
        open: true,
        message: 'Error loading available language models',
        severity: 'error'
      });
      setAvailableLLMs([]); // Reset to empty array on error
    }
  };

  const handleEditPrompt = (promptId) => {
    if (promptId) {
      setEditingPrompt({
        id: promptId,
        ...prompts[promptId],
        llm_id: prompts[promptId].llm || '' // Map llm to llm_id for the form
      });
    } else {
      // Initialize a new prompt with default llm_id
      setEditingPrompt({
        name: '',
        description: '',
        content: '',
        variables: [],
        template_type: selectedTemplateType,
        llm_id: availableLLMs.length > 0 ? availableLLMs[0].id : ''
      });
    }
    setDialogOpen(true);
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt?.name?.trim()) {
      setSnackbar({
        open: true,
        message: 'Name is required',
        severity: 'error'
      });
      return;
    }

    if (!editingPrompt?.content?.trim()) {
      setSnackbar({
        open: true,
        message: 'Content is required',
        severity: 'error'
      });
      return;
    }

    try {
      const promptData = {
        name: editingPrompt.name.trim(),
        description: editingPrompt.description || '',
        content: editingPrompt.content.trim(),
        template_type: selectedTemplateType,
        variables: availableVariables,
        llm: editingPrompt.llm_id || ''
      };

      let response;
      if (editingPrompt.id && editingPrompt.id.trim()) {
        response = await axios.put(
          getApiUrl('CHAT', `/api/prompts/${editingPrompt.id}`),
          promptData
        );
      } else {
        response = await axios.post(
          getApiUrl('CHAT', '/api/prompts'),
          promptData
        );
      }

      setSnackbar({
        open: true,
        message: `Prompt ${editingPrompt.id ? 'updated' : 'created'} successfully`,
        severity: 'success'
      });
      setDialogOpen(false);
      fetchPrompts(); // Refresh the list
    } catch (error) {
      console.error('Error saving prompt:', error);
      setSnackbar({
        open: true,
        message: `Error ${editingPrompt.id ? 'updating' : 'creating'} prompt: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    }
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      await axios.delete(getApiUrl('CHAT', `/api/prompts/${promptId}`));
      setSnackbar({
        open: true,
        message: 'Prompt deleted successfully',
        severity: 'success'
      });
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting prompt',
        severity: 'error'
      });
    } finally {
      // Close delete dialog and reset state
      setDeleteDialogOpen(false);
      setPromptToDelete(null);
      setPromptNameToDelete('');
    }
  };

  // Add confirmation handler
  const handleDeleteConfirmation = (promptId) => {
    const promptData = prompts[promptId];
    if (promptData) {
      setPromptToDelete(promptId);
      setPromptNameToDelete(promptData.name);
      setDeleteDialogOpen(true);
    }
  };

  const handleAddVariable = async () => {
    if (!newVariable.trim() || !editingPrompt?.id) return;
    
    try {
      await axios.post(
        getApiUrl('CHAT', `/api/prompts/${editingPrompt.id}/variables`),
        {},
        { 
          params: { 
            variable_name: newVariable.trim() 
          } 
        }
      );
      
      setSnackbar({
        open: true,
        message: 'Variable added successfully',
        severity: 'success'
      });
      
      fetchAvailableVariables(editingPrompt.id);
      setNewVariable('');
    } catch (error) {
      console.error('Error adding variable:', error);
      setSnackbar({
        open: true,
        message: 'Error adding variable',
        severity: 'error'
      });
    }
  };

  const handleRemoveVariable = async (variable) => {
    if (!editingPrompt?.id) return;
    
    try {
      await axios.delete(
        getApiUrl('CHAT', `/api/prompts/${editingPrompt.id}/variables/${variable}`)
      );
      
      setSnackbar({
        open: true,
        message: 'Variable removed successfully',
        severity: 'success'
      });
      
      fetchAvailableVariables(editingPrompt.id);
    } catch (error) {
      console.error('Error removing variable:', error);
      setSnackbar({
        open: true,
        message: 'Error removing variable',
        severity: 'error'
      });
    }
  };

  return (
    <div className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h4">System Prompts</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleEditPrompt(null)}
        >
          Add New Prompt
        </Button>
      </Box>

      <List className={classes.promptList}>
        {Object.entries(prompts).map(([id, prompt]) => (
          <ListItem key={id}>
            <ListItemText
              primary={prompt.name}
              secondary={
                <React.Fragment>
                  <Typography variant="body2" color="textSecondary">
                    {prompt.description}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    ID for interpolation: {id}
                  </Typography>
                  {prompt.llm && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      LLM: {availableLLMs.find(llm => llm.id === prompt.llm)?.name || prompt.llm}
                    </Typography>
                  )}
                </React.Fragment>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleEditPrompt(id)}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDeleteConfirmation(id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPrompt?.id ? 'Edit Prompt' : 'New Prompt'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="textSecondary" gutterBottom>
            Note: The prompt name will be converted to an ID (lowercase with underscores) 
            that can be used as a variable in other prompts.
          </Typography>
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Template Type</InputLabel>
            <Select
              value={selectedTemplateType}
              onChange={(e) => setSelectedTemplateType(e.target.value)}
            >
              {templateTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth className={classes.llmSelect}>
            <InputLabel>Language Model</InputLabel>
            <Select
              value={editingPrompt?.llm_id || ''}
              onChange={(e) => setEditingPrompt({
                ...editingPrompt,
                llm_id: e.target.value
              })}
            >
              {availableLLMs.map(llm => (
                <MenuItem key={llm.id} value={llm.id}>
                  {llm.name} {/* Remove provider since all are from Ollama */}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Typography variant="subtitle2" style={{ marginTop: 16 }}>
            Available Variables:
          </Typography>
          <div className={classes.variableList}>
            {availableVariables.map(variable => (
              <Chip
                key={variable}
                label={variable}
                onDelete={() => handleRemoveVariable(variable)}
                onClick={() => {
                  const textField = document.getElementById('prompt-content');
                  const cursorPosition = textField.selectionStart;
                  const content = editingPrompt.content;
                  const newContent = 
                    content.substring(0, cursorPosition) +
                    `{${variable}}` +
                    content.substring(cursorPosition);
                  setEditingPrompt({...editingPrompt, content: newContent});
                }}
                className={classes.variableChip}
              />
            ))}
          </div>

          <Box display="flex" alignItems="center" mt={2}>
            <TextField
              label="New Variable"
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              size="small"
              className={classes.variableInput}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddVariable}
              disabled={!newVariable.trim()}
              className={classes.addVariableButton}
            >
              Add Variable
            </Button>
          </Box>

          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={editingPrompt?.name || ''}
            onChange={(e) => {
              const name = e.target.value;
              setEditingPrompt({
                ...editingPrompt, 
                name: name
              });
            }}
            helperText={`This will create the ID: ${editingPrompt?.name?.toLowerCase().replace(/ /g, '_') || ''}`}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            value={editingPrompt?.description || ''}
            onChange={(e) => setEditingPrompt({...editingPrompt, description: e.target.value})}
          />
          <TextField
            className={classes.editor}
            label="Prompt Content"
            multiline
            rows={10}
            fullWidth
            value={editingPrompt?.content || ''}
            onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSavePrompt} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPromptToDelete(null);
          setPromptNameToDelete('');
        }}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the prompt "{promptNameToDelete}"?
          </Typography>
          <Typography variant="body2" color="error" style={{ marginTop: '12px' }}>
            This action cannot be undone. Any references to this prompt in other templates may become invalid.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setPromptToDelete(null);
              setPromptNameToDelete('');
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeletePrompt(promptToDelete)}
            color="secondary"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default SystemPrompts; 