import React, { useState, useEffect } from 'react';
import { Typography, Grid, Paper, Select, MenuItem, FormControl, InputLabel, TextField, Button } from '@material-ui/core';
import axios from 'axios';
import '../App.css';
import CSVPreview from './CSVPreview'; // Import the CSVPreview component
import { getApiUrl } from '../config';

function GenerateDataset() {
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedCsv, setSelectedCsv] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [finalDatasetName, setFinalDatasetName] = useState('');
  const [trainingDatasets, setTrainingDatasets] = useState([]);
  const [selectedTrainingDataset, setSelectedTrainingDataset] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchCsvFiles();
    fetchTrainingDatasets();
  }, []);

  useEffect(() => {
    if (datasetName) {
      const currentDate = new Date().toISOString().split('T')[0];
      setFinalDatasetName(`TrainingData_${datasetName}_${currentDate}`);
    } else {
      setFinalDatasetName('');
    }
  }, [datasetName]);

  const fetchCsvFiles = async () => {
    try {
      const response = await axios.get(getApiUrl('EXTRACTION', '/api/extraction/csv-files/'));
      setCsvFiles(response.data);
    } catch (error) {
      console.error('Error fetching CSV files:', error);
    }
  };

  const fetchTrainingDatasets = async () => {
    try {
      const response = await axios.get(getApiUrl('GENERATION', '/api/generate/training-datasets/'));
      console.log('Training datasets:', response.data); 
      setTrainingDatasets(response.data);
    } catch (error) {
      console.error('Error fetching training datasets:', error);
    }
  };

  const handleCsvSelect = (event) => {
    setSelectedCsv(event.target.value);
  };

  const handleDatasetNameChange = (event) => {
    setDatasetName(event.target.value);
  };

  const handleTrainingDatasetSelect = (event) => {
    const selected = event.target.value;
    console.log('Selected training dataset:', selected);
    setSelectedTrainingDataset(selected);
    if (selected) {
      setSelectedFile(selected);
      console.log("Selected file:", selected);
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
      // Refresh the list of training datasets
      fetchTrainingDatasets();
      // You can add some user feedback here, like a success message
    } catch (error) {
      console.error('Error creating dataset:', error);
      // You can add some error feedback for the user here
    }
  };

  return (
    <div className="container">
      <h2>Generate Dataset</h2>
      <Grid container spacing={3} className="generate-dataset-grid">
        <Grid item xs={12} md={4}>
          <Paper className="generate-dataset-step">
            <Typography variant="h6" component="h3">
              Step 1: Select CSV File of Extracted Data
            </Typography>
            <Typography variant="body2" className="step-instruction">
              Choose the CSV file containing the extracted data that you want the system to use for creating training data for an LLM.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="csv-select-label">Select CSV File</InputLabel>
              <Select
                labelId="csv-select-label"
                id="csv-select"
                value={selectedCsv}
                onChange={handleCsvSelect}
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
        <Grid item xs={12} md={4}>
          <Paper className="generate-dataset-step">
            <Typography variant="h6" component="h3">
              Step 2: Name Your Training Dataset
            </Typography>
            <Typography variant="body2" className="step-instruction">
              Provide a name for your training dataset. This name will be used to identify your dataset in future steps.
            </Typography>
            <TextField
              fullWidth
              label="Dataset Name"
              variant="outlined"
              value={datasetName}
              onChange={handleDatasetNameChange}
            />
            {finalDatasetName && (
              <Typography variant="body2" className="dataset-name-preview">
                File name preview: {finalDatasetName}
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper className="generate-dataset-step">
            <Typography variant="h6" component="h3">
              Step 3: Initiate Dataset Creation
            </Typography>
            <Typography variant="body2" className="step-instruction">
              Once you've selected a CSV file and named your dataset, click the button below to create your training dataset. This process may take a while depending on the size of your data.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              disabled={!selectedCsv || !datasetName}
              onClick={handleCreateDataset}
            >
              Create Dataset
            </Button>
          </Paper>
        </Grid>
      </Grid>
      <Paper className="review-datasets-section">
        <Typography variant="h6" component="h3">
          Review Training Datasets
        </Typography>
        <Typography variant="body2" className="step-instruction">
          Select a training dataset to review its contents.
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="training-dataset-select-label">Select Training Dataset</InputLabel>
          <Select
            labelId="training-dataset-select-label"
            id="training-dataset-select"
            value={selectedTrainingDataset}
            onChange={handleTrainingDatasetSelect}
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
          <div className="csv-preview-container">
            <CSVPreview filename={selectedFile} />
          </div>
        )}
      </Paper>
    </div>
  );
}

export default GenerateDataset;
