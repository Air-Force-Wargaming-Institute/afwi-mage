import React, { useState, useEffect } from 'react';
import '../App.css';
import { 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Container, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  LinearProgress,
  Box
} from '@material-ui/core';
import axios from 'axios';
import { getApiUrl } from '../config';

function FineTune() {
  const [selectedDataset, setSelectedDataset] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [selectedBaseModel, setSelectedBaseModel] = useState('');
  const [baseModels, setBaseModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDatasets();
    fetchBaseModels();
  }, []);

  const fetchDatasets = async () => {
    try {
      const response = await axios.get(getApiUrl('GENERATION', '/api/generate/training-datasets/'));
      setDatasets(response.data);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setMessage('Error fetching datasets. Please try again.');
    }
  };

  const fetchBaseModels = async () => {
    try {
      const response = await axios.get(getApiUrl('GENERATION', '/api/generate/available-models/'));
      setBaseModels(response.data);
    } catch (error) {
      console.error('Error fetching base models:', error);
      setMessage('Error fetching base models. Please try again.');
    }
  };

  const handleDatasetSelect = (event) => {
    setSelectedDataset(event.target.value);
  };

  const handleBaseModelSelect = (event) => {
    setSelectedBaseModel(event.target.value);
  };

  const handleSubmit = async () => {
    if (selectedDataset && selectedBaseModel) {
      setIsLoading(true);
      try {
        const response = await axios.post(getApiUrl('GENERATION', '/api/generate/fine-tune/'), {
          dataset: selectedDataset,
          base_model: selectedBaseModel
        });
        setMessage(response.data.message);
      } catch (error) {
        console.error('Error during fine-tuning:', error);
        setMessage('Error during fine-tuning. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setMessage('Please select both a dataset and a base model.');
    }
  };

  return (
    <Container maxWidth="xl" className="main-content">
      <Typography variant="h4" className="section-title" gutterBottom>
        Fine-Tune Model
      </Typography>
      
      <Grid container spacing={3}>
        {/* Step 1: Select Dataset */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 1: Select Fine-Tuning Dataset
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Choose the training dataset to use for fine-tuning your model.
            </Typography>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Select Dataset</InputLabel>
              <Select
                value={selectedDataset}
                onChange={handleDatasetSelect}
                label="Select Dataset"
              >
                {datasets.map((dataset) => (
                  <MenuItem key={dataset.name} value={dataset.name}>
                    {dataset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* Step 2: Select Base Model */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 2: Select Base Model
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Choose the foundation model that will be fine-tuned with your dataset.
            </Typography>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Select Base Model</InputLabel>
              <Select
                value={selectedBaseModel}
                onChange={handleBaseModelSelect}
                label="Select Base Model"
              >
                {baseModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* Step 3: Start Fine-Tuning */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 3: Start Fine-Tuning
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Begin the fine-tuning process with your selected dataset and base model.
            </Typography>
            <Button 
              variant="contained"
              color="primary"
              fullWidth
              className="app-button"
              onClick={handleSubmit}
              disabled={!selectedDataset || !selectedBaseModel || isLoading}
            >
              {isLoading ? 'Fine-Tuning...' : 'Start Fine-Tuning'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Fine-Tuning Process Display */}
      <Paper className="paper" elevation={3} sx={{ marginTop: 3 }}>
        <Typography variant="h6" className="section-subtitle" gutterBottom>
          Fine-Tuning Progress
        </Typography>
        
        {message && (
          <Box mb={2}>
            <Typography 
              variant="body2" 
              className={message.includes('Error') ? 'error-message' : 'success-message'}
            >
              {message}
            </Typography>
          </Box>
        )}

        {isLoading ? (
          <Box>
            <Typography variant="body2" className="text-secondary" paragraph>
              Fine-tuning in progress. This may take several minutes...
            </Typography>
            <Box mb={2}>
              <LinearProgress />
            </Box>
            <Typography variant="body2" className="text-secondary">
              Please do not close this window during the fine-tuning process.
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" className="text-secondary">
            Select a dataset and base model above, then start the fine-tuning process to see progress here.
          </Typography>
        )}
      </Paper>
    </Container>
  );
}

export default FineTune;
