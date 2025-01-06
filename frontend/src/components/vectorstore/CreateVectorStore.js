import React, { useState } from 'react';
import {
  Typography,
  makeStyles,
  Stepper,
  Step,
  StepLabel,
  Button,
  Box,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@material-ui/core';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DeleteIcon from '@material-ui/icons/Delete';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  stepper: {
    marginBottom: theme.spacing(4),
  },
  stepContent: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  uploadSection: {
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    marginBottom: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  input: {
    display: 'none',
  },
  fileList: {
    maxHeight: '300px',
    overflow: 'auto',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(4),
  },
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: '100%',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
  },
}));

function CreateVectorStore() {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    embeddingModel: '',
    chunkSize: '',
    chunkOverlap: '',
    similarityMetric: '',
  });
  const [vectorStore, setVectorStore] = useState({
    name: '',
    description: '',
  });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFileUpload = (event) => {
    const newFiles = Array.from(event.target.files);
    setFiles([...files, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleMetadataChange = (event) => {
    const { name, value } = event.target;
    setMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVectorStoreChange = (event) => {
    const { name, value } = event.target;
    setVectorStore(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    // Handle vector store creation
    console.log('Creating vector store:', { files, metadata, vectorStore });
  };

  const steps = ['Upload Documents', 'Configure Vector Store', 'Create Vector Store'];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <div className={classes.stepContent}>
            <input
              accept=".pdf,.doc,.docx,.txt"
              className={classes.input}
              id="file-upload"
              multiple
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <div className={classes.uploadSection}>
                <CloudUploadIcon className={classes.uploadIcon} />
                <Typography variant="h6" gutterBottom>
                  Drag and drop files here or click to upload
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Supported formats: PDF, DOC, DOCX, TXT
                </Typography>
              </div>
            </label>

            <List className={classes.fileList}>
              {files.map((file, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleRemoveFile(index)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </div>
        );

      case 1:
        return (
          <div className={classes.stepContent}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl className={classes.formControl}>
                  <InputLabel>Embedding Model</InputLabel>
                  <Select
                    name="embeddingModel"
                    value={metadata.embeddingModel}
                    onChange={handleMetadataChange}
                  >
                    <MenuItem value="openai">OpenAI Ada</MenuItem>
                    <MenuItem value="huggingface">HuggingFace</MenuItem>
                    <MenuItem value="sentence-transformers">Sentence Transformers</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl className={classes.formControl}>
                  <InputLabel>Similarity Metric</InputLabel>
                  <Select
                    name="similarityMetric"
                    value={metadata.similarityMetric}
                    onChange={handleMetadataChange}
                  >
                    <MenuItem value="cosine">Cosine Similarity</MenuItem>
                    <MenuItem value="euclidean">Euclidean Distance</MenuItem>
                    <MenuItem value="dot">Dot Product</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Chunk Size"
                  name="chunkSize"
                  type="number"
                  value={metadata.chunkSize}
                  onChange={handleMetadataChange}
                  className={classes.formControl}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Chunk Overlap"
                  name="chunkOverlap"
                  type="number"
                  value={metadata.chunkOverlap}
                  onChange={handleMetadataChange}
                  className={classes.formControl}
                />
              </Grid>
            </Grid>
          </div>
        );

      case 2:
        return (
          <div className={classes.stepContent}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Vector Store Name"
                  name="name"
                  value={vectorStore.name}
                  onChange={handleVectorStoreChange}
                  className={classes.formControl}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  multiline
                  rows={4}
                  value={vectorStore.description}
                  onChange={handleVectorStoreChange}
                  className={classes.formControl}
                />
              </Grid>
            </Grid>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={classes.root}>
      <Typography variant="h4" color="primary" gutterBottom>
        Build Retrieval Database
      </Typography>

      <Stepper activeStep={activeStep} className={classes.stepper}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <div className={classes.buttonContainer}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
        >
          {activeStep === steps.length - 1 ? 'Create Vector Store' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

export default CreateVectorStore;