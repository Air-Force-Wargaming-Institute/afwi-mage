import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography
} from '@material-ui/core';
import { GradientText } from '../../styles/StyledComponents';

function CreateWargameModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Reset fields when modal opens
    if (open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const handleCreate = () => {
    if (name.trim()) { // Ensure name is not just whitespace
      onCreate({ name: name.trim(), description: description.trim() });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="create-wargame-dialog-title" maxWidth="sm" fullWidth>
      <DialogTitle id="create-wargame-dialog-title">
        <GradientText variant="h6">
          Create New Wargame Build
        </GradientText>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" gutterBottom color="textSecondary">
          Enter a unique name and an optional description for your new wargame build.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          id="wargame-name"
          label="Wargame Name"
          type="text"
          fullWidth
          variant="outlined"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!name.trim() && name.length > 0} // Show error if only whitespace
          helperText={!name.trim() && name.length > 0 ? "Name cannot be empty" : ""}
        />
        <TextField
          margin="dense"
          id="wargame-description"
          label="Description (Optional)"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button 
          onClick={handleCreate} 
          color="primary" 
          variant="contained" 
          disabled={!name.trim()} // Disable if name is empty or only whitespace
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateWargameModal; 