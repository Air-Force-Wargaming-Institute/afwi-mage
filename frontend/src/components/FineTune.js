import React, { useState, useEffect } from 'react';
import '../App.css';
import { Typography, Button, Paper, Grid, Container, FormControl, InputLabel, Select, MenuItem } from '@material-ui/core';
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
    <Container maxWidth="xl" className="container">
      <h2>Fine-Tune Model</h2>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper className="fine-tune-section">
            <h3>Step 1: Select Fine-Tuning Dataset</h3>
            <FormControl fullWidth>
              <InputLabel id="dataset-select-label">Select Dataset</InputLabel>
              <Select
                labelId="dataset-select-label"
                id="dataset-select"
                value={selectedDataset}
                onChange={handleDatasetSelect}
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

        <Grid item xs={12} md={4}>
          <Paper className="fine-tune-section">
            <h3>Step 2: Select LLM Base-Model for Fine-Tuning</h3>
            <FormControl fullWidth>
              <InputLabel id="base-model-select-label">Select Base Model</InputLabel>
              <Select
                labelId="base-model-select-label"
                id="base-model-select"
                value={selectedBaseModel}
                onChange={handleBaseModelSelect}
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

        <Grid item xs={12} md={4}>
          <Paper className="fine-tune-section">
            <h3>Step 3: Start Fine-Tuning</h3>
            <Button 
              className="app-button"
              onClick={handleSubmit}
              disabled={!selectedDataset || !selectedBaseModel || isLoading}
            >
              {isLoading ? 'Fine-Tuning...' : 'Start Fine-Tuning'}
            </Button>
            {message && <div className="message">{message}</div>}
          </Paper>
        </Grid>
      </Grid>

      {/* Fine-Tuning Process Display */}
      <Container maxWidth="xl" className="fine-tuning-process-container">
        <Paper className="fine-tune-section">
          <h3>Fine-Tuning Process</h3>
          {isLoading ? (
            <div className="fine-tuning-process">
              <Typography>Fine-tuning in progress...</Typography>
              <div className="progress-bar">
                <div className="progress" style={{ width: '50%' }}></div>
              </div>
            </div>
          ) : (
            <Typography>
              Select a dataset and base model, then start the fine-tuning process to see progress here.
            </Typography>
          )}
        </Paper>
      </Container>
    </Container>
  );
}

export default FineTune;
