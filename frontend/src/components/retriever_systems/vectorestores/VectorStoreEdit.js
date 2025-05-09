import React, { useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Divider,
  makeStyles
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';

const useStyles = makeStyles((theme) => ({
  form: {
    marginTop: theme.spacing(1),
  },
  submitButton: {
    marginLeft: theme.spacing(1),
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  helperText: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
  }
}));

const VectorStoreEdit = ({ vectorStore, onClose, onSave }) => {
  const classes = useStyles();
  const [formData, setFormData] = useState({
    name: vectorStore.name || '',
    description: vectorStore.description || '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Create updated store object with all original properties plus updated ones
      const updatedStore = {
        ...vectorStore,
        name: formData.name.trim(),
        description: formData.description.trim(),
      };
      
      await onSave(updatedStore);
      
    } catch (error) {
      console.error('Error updating vector store:', error);
      setErrorMessage(error.response?.data?.detail || 'Error updating vector store. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogTitle>Edit Vector Store</DialogTitle>
      <DialogContent>
        <Typography variant="body2" className={classes.helperText}>
          Update the name and description of your vector store. Other properties cannot be modified after creation.
        </Typography>
        
        {errorMessage && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {errorMessage}
          </Alert>
        )}
        
        <form className={classes.form} noValidate>
          <TextField
            name="name"
            label="Vector Store Name"
            variant="outlined"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name || ''}
            disabled={isSubmitting}
            required
          />
          
          <TextField
            name="description"
            label="Description"
            variant="outlined"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={formData.description}
            onChange={handleChange}
            error={!!errors.description}
            helperText={errors.description || 'Provide a clear description of what documents this vector store contains'}
            disabled={isSubmitting}
            required
          />
          
          <Divider className={classes.divider} />
          
          <Typography variant="subtitle2" gutterBottom>
            Vector Store Properties (Read Only)
          </Typography>
          
          <TextField
            label="Embedding Model"
            variant="outlined"
            fullWidth
            margin="normal"
            value={vectorStore.embeddingModel || 'Unknown'}
            InputProps={{ readOnly: true }}
            disabled
            size="small"
          />
          
          <TextField
            label="Chunking Method"
            variant="outlined"
            fullWidth
            margin="normal"
            value={vectorStore.useParagraphChunking ? 'Paragraph-Based' : 'Fixed Size'}
            InputProps={{ readOnly: true }}
            disabled
            size="small"
          />
          
          <TextField
            label="Document Count"
            variant="outlined"
            fullWidth
            margin="normal"
            value={vectorStore.documentCount || 0}
            InputProps={{ readOnly: true }}
            disabled
            size="small"
          />
        </form>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={isSubmitting}
          className={classes.submitButton}
          startIcon={isSubmitting && <CircularProgress size={20} />}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </>
  );
};

export default VectorStoreEdit; 