import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, Select, MenuItem, FormControl, InputLabel, TextField, Button } from '@material-ui/core';
import axios from 'axios';
import '../App.css';
import CSVPreview from './CSVPreview';
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
      fetchTrainingDatasets();
    } catch (error) {
      console.error('Error creating dataset:', error);
    }
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        height: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        borderRadius: '12px',
        overflow: 'hidden',
        '& .extract-section': {
          padding: '16px',
          height: '100%',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          '& h3': {
            margin: '0 0 16px 0',
            color: '#1976d2',
            fontSize: '1.2rem',
            fontWeight: 500
          }
        }
      }}
    >
      <h2 style={{ 
        margin: '0 0 16px 0',
        color: '#1976d2',
        fontSize: '1.5rem',
        fontWeight: 500,
        flexShrink: 0
      }}>Generate Training Dataset</h2>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Grid item xs={12} md={4} sx={{ height: '100%', overflow: 'hidden' }}>
          <Paper className="extract-section" elevation={3}>
            <h3>Step 1: Select Source CSV File</h3>
            <div style={{ marginBottom: '20px' }}>
              <Typography variant="body2" sx={{ color: '#666', marginBottom: '16px' }}>
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
            </div>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper className="extract-section" elevation={3}>
            <h3>Step 2: Name Your Dataset</h3>
            <div style={{ marginBottom: '20px' }}>
              <Typography variant="body2" sx={{ color: '#666', marginBottom: '16px' }}>
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
                  sx={{ 
                    marginTop: '8px',
                    color: '#666',
                    fontSize: '0.875rem',
                    fontStyle: 'italic'
                  }}
                >
                  Final name: {finalDatasetName}
                </Typography>
              )}
            </div>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper className="extract-section" elevation={3}>
            <h3>Step 3: Create Dataset</h3>
            <div style={{ marginBottom: '20px' }}>
              <Typography variant="body2" sx={{ color: '#666', marginBottom: '16px' }}>
                Click the button below to create your training dataset from the selected CSV file.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={!selectedCsv || !datasetName}
                onClick={handleCreateDataset}
                sx={{ marginTop: '16px' }}
              >
                Create Dataset
              </Button>
            </div>
          </Paper>
        </Grid>
      </Grid>

      <Paper 
        elevation={3}
        sx={{ 
          marginTop: '24px',
          padding: '20px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          '& h3': {
            margin: '0 0 16px 0',
            color: '#1976d2',
            fontSize: '1.2rem',
            fontWeight: 500
          }
        }}
      >
        <h3>Review Training Datasets</h3>
        <div style={{ marginBottom: '20px' }}>
          <Typography variant="body2" sx={{ color: '#666', marginBottom: '16px' }}>
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
        </div>

        {selectedFile && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <CSVPreview filename={selectedFile} />
          </div>
        )}
      </Paper>
    </Container>
  );
}

export default GenerateDataset;
