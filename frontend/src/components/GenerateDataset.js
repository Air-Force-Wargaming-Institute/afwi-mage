import React from 'react';
import { Container, Typography, Grid, Paper, Select, MenuItem, FormControl, InputLabel, TextField, Button } from '@material-ui/core';
import axios from 'axios';
import '../App.css';
import CSVPreview from './CSVPreview';
import { getApiUrl } from '../config';
import { useGeneration, ACTIONS } from '../contexts/GenerationContext';

function GenerateDataset() {
  const { state, dispatch } = useGeneration();
  
  const {
    csvFiles,
    selectedCsv,
    datasetName,
    finalDatasetName,
    trainingDatasets,
    selectedTrainingDataset,
    selectedFile
  } = state;

  const setSelectedCsv = (csv) => dispatch({ type: ACTIONS.SET_SELECTED_CSV, payload: csv });
  const setDatasetName = (name) => dispatch({ type: ACTIONS.SET_DATASET_NAME, payload: name });
  const setSelectedTrainingDataset = (dataset) => dispatch({ type: ACTIONS.SET_SELECTED_TRAINING_DATASET, payload: dataset });
  const setSelectedFile = (file) => dispatch({ type: ACTIONS.SET_SELECTED_FILE, payload: file });

  const fetchCsvFiles = React.useCallback(async () => {
    try {
      const response = await axios.get(getApiUrl('EXTRACTION', '/api/extraction/csv-files/'));
      dispatch({ type: ACTIONS.SET_CSV_FILES, payload: response.data });
    } catch (error) {
      console.error('Error fetching CSV files:', error);
    }
  }, [dispatch]);

  const fetchTrainingDatasets = React.useCallback(async () => {
    try {
      const response = await axios.get(getApiUrl('GENERATION', '/api/generate/training-datasets/'));
      console.log('Training datasets:', response.data); 
      dispatch({ type: ACTIONS.SET_TRAINING_DATASETS, payload: response.data });
    } catch (error) {
      console.error('Error fetching training datasets:', error);
    }
  }, [dispatch]);

  React.useEffect(() => {
    fetchCsvFiles();
    fetchTrainingDatasets();
  }, [fetchCsvFiles, fetchTrainingDatasets]);

  React.useEffect(() => {
    if (datasetName) {
      const currentDate = new Date().toISOString().split('T')[0];
      dispatch({ type: ACTIONS.SET_FINAL_DATASET_NAME, payload: `TrainingData_${datasetName}_${currentDate}` });
    } else {
      dispatch({ type: ACTIONS.SET_FINAL_DATASET_NAME, payload: '' });
    }
  }, [datasetName, dispatch]);

  const handleCsvSelect = (event) => {
    setSelectedCsv(event.target.value);
  };

  const handleDatasetNameChange = (event) => {
    setDatasetName(event.target.value);
  };

  const handleTrainingDatasetSelect = (event) => {
    const selected = event.target.value;
    setSelectedTrainingDataset(selected);
    if (selected) {
      setSelectedFile(selected);
    } else {
      setSelectedFile(null);
    }
  };

  const handleCreateDataset = async () => {
    try {
      const response = await axios.post(getApiUrl('GENERATION', '/api/generate/dataset/'), {
        sourceFile: selectedCsv,
        datasetName: finalDatasetName
      });
      console.log(response.data);
      fetchTrainingDatasets();
    } catch (error) {
      console.error('Error creating dataset:', error);
    }
  };

  return (
    <Container maxWidth="xl" className="main-content">
      <Typography variant="h4" className="section-title" gutterBottom>
        Generate Training Dataset
      </Typography>

      <Grid container spacing={3}>
        {/* Step 1: Select Source CSV */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 1: Select Source CSV
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Choose the CSV file containing extracted data to use for creating the training dataset.
            </Typography>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Select CSV File</InputLabel>
              <Select
                value={selectedCsv}
                onChange={handleCsvSelect}
                label="Select CSV File"
              >
                {csvFiles.map((file) => (
                  <MenuItem key={file.name} value={file.name}>
                    {file.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        {/* Step 2: Name Dataset */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 2: Name Your Dataset
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Provide a name for your training dataset. The date will be automatically appended.
            </Typography>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              label="Dataset Name"
              value={datasetName}
              onChange={handleDatasetNameChange}
            />
            {finalDatasetName && (
              <Typography 
                variant="body2" 
                className="text-secondary"
                sx={{ marginTop: 1, fontStyle: 'italic' }}
              >
                Final name: {finalDatasetName}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Step 3: Create Dataset */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 3: Create Dataset
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Click the button below to create your training dataset from the selected CSV file.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!selectedCsv || !datasetName}
              onClick={handleCreateDataset}
              className="app-button"
            >
              Create Dataset
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Training Datasets Review Section */}
      <Paper className="paper" elevation={3} sx={{ marginTop: 3 }}>
        <Typography variant="h6" className="section-subtitle" gutterBottom>
          Review Training Datasets
        </Typography>
        <Typography variant="body2" className="text-secondary" paragraph>
          Select a training dataset to review its contents.
        </Typography>
        <FormControl fullWidth variant="outlined" size="small">
          <InputLabel>Select Training Dataset</InputLabel>
          <Select
            value={selectedTrainingDataset}
            onChange={handleTrainingDatasetSelect}
            label="Select Training Dataset"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {trainingDatasets.map((dataset) => (
              <MenuItem key={dataset.name} value={dataset.name}>
                {dataset.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedFile && (
          <div className="preview-container">
            <CSVPreview filename={selectedFile} />
          </div>
        )}
      </Paper>
    </Container>
  );
}

export default GenerateDataset;
