import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import StorageIcon from '@material-ui/icons/Storage';
import DescriptionIcon from '@material-ui/icons/Description';
import CreateIcon from '@material-ui/icons/Create';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import InfoIcon from '@material-ui/icons/Info';
import FolderIcon from '@material-ui/icons/Folder';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FileList from './FileList';
import axios from 'axios';
import { getApiUrl } from '../config';
import '../App.css'; // Import the App.css styles

// Keep minimal component-specific styles that aren't in App.css
const useStyles = makeStyles((theme) => ({
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  fileCounter: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(2),
  },
  clearButton: {
    marginLeft: theme.spacing(1),
  },
  infoAccordion: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    boxShadow: 'none',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    '&:before': {
      display: 'none',
    },
  },
  accordionSummary: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  accordionDetails: {
    display: 'block',
    padding: theme.spacing(1, 2, 2),
  },
  methodComparisonTable: {
    '& th': {
      fontWeight: 'bold',
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  infoBox: {
    padding: theme.spacing(2),
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    borderLeft: '4px solid #2196F3',
    borderRadius: '4px',
    marginBottom: theme.spacing(2),
  },
  tipItem: {
    marginBottom: theme.spacing(1),
  },
}));

function BuildRetrievalDatabases() {
  const classes = useStyles();
  
  // State for file selection and management
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for vector store creation
  const [vectorStoreName, setVectorStoreName] = useState('');
  const [vectorStoreDescription, setVectorStoreDescription] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('nomic-embed-text');
  
  // Add state for paragraph-based chunking toggle
  const [useParagraphChunking, setUseParagraphChunking] = useState(true);
  
  // Parameters for paragraph chunking
  const [maxParagraphLength, setMaxParagraphLength] = useState(1500);
  const [minParagraphLength, setMinParagraphLength] = useState(50);
  
  // Parameters for fixed-size chunking
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Available embedding models
  const [embeddingModels, setEmbeddingModels] = useState([
    { id: 'nomic-embed-text', name: 'Nomic Embed Text' },
  ]);

  // Load embedding models from the backend
  useEffect(() => {
    fetchEmbeddingModels();
  }, []);

  // Load files from the document library
  useEffect(() => {
    fetchFiles(currentFolder);
  }, [currentFolder]);

  const fetchEmbeddingModels = async () => {
    try {
      const response = await axios.get(getApiUrl('EMBEDDING', '/api/embedding/models'));
      if (Array.isArray(response.data)) {
        setEmbeddingModels(response.data);
      } else {
        console.error('Unexpected response format for embedding models:', response.data);
      }
    } catch (error) {
      console.error('Error fetching embedding models:', error);
      // Keep using the default models if fetch fails
    }
  };

  const fetchFiles = async (folder) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the EXTRACTION service to fetch files from the document library (consistent with ExtractComponent)
      const response = await axios.get(getApiUrl('EXTRACTION', `/api/extraction/files/?folder=${folder || ''}`));
      
      if (Array.isArray(response.data)) {
        setFiles(response.data);
        if (response.data.length === 0) {
          setError('No files found in the document library.');
        }
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Error: Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.response?.data?.detail || 'Error loading files from document library. Please try again.');
      setMessage('Error fetching files. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
    setCurrentFolder(newPath);
  };

  const handleNavigateUp = () => {
    const pathParts = currentFolder.split('/');
    pathParts.pop();
    setCurrentFolder(pathParts.join('/'));
  };

  const handleRemoveFile = (filePath) => {
    setSelectedFiles(selectedFiles.filter(f => f !== filePath));
  };

  const handleCreateVectorStore = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Please select at least one file to include in the vector store');
      setSuccess(false);
      return;
    }

    if (!vectorStoreName.trim()) {
      setMessage('Please provide a name for the vector store');
      setSuccess(false);
      return;
    }

    if (!vectorStoreDescription.trim()) {
      setMessage('Please provide a description for the vector store');
      setSuccess(false);
      return;
    }

    // Connect to the backend embedding service
    setIsCreating(true);
    setMessage('Creating vector store...');
    setSuccess(false);

    try {
      // Make the API call to create the vector store using the new endpoint
      const response = await axios.post(getApiUrl('EMBEDDING', '/api/embedding/vectorstores'), {
        name: vectorStoreName,
        description: vectorStoreDescription,
        files: selectedFiles,
        embedding_model: embeddingModel,
        use_paragraph_chunking: useParagraphChunking,
        max_paragraph_length: parseInt(maxParagraphLength),
        min_paragraph_length: parseInt(minParagraphLength),
        chunk_size: parseInt(chunkSize),
        chunk_overlap: parseInt(chunkOverlap),
      });
      
      setIsCreating(false);
      setMessage(response.data.message || `Vector store "${vectorStoreName}" successfully created!`);
      setSuccess(true);
      
      // Reset form after successful creation
      if (response.data.success) {
        // Optionally reset the form fields
        // setVectorStoreName('');
        // setVectorStoreDescription('');
        // setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error creating vector store:', error);
      setIsCreating(false);
      setMessage(error.response?.data?.detail || 'Error creating vector store. Please try again.');
      setSuccess(false);
    }
  };

  // These handlers are for the FileList component
  const handleDeleteFile = async (filename) => {
    try {
      await axios.delete(getApiUrl('UPLOAD', `/api/upload/files/${filename}`));
      fetchFiles(currentFolder);
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error deleting file. Please try again.');
    }
  };

  const handlePreviewFile = (file) => {
    // You could implement file preview functionality here
    console.log(`Would preview file: ${file.name}`);
  };

  const handleRenameFile = async (file) => {
    // This function would be properly implemented for the FileList component
    console.log(`Would rename file: ${file.name}`);
  };

  const handleRenameFolder = async (oldName, newName) => {
    // This function would be properly implemented for the FileList component
    console.log(`Would rename folder from ${oldName} to ${newName}`);
  };

  const handleDeleteFolder = async (folderName) => {
    // This function would be properly implemented for the FileList component
    console.log(`Would delete folder: ${folderName}`);
  };

  const handleMoveFile = async (file, target) => {
    // This function would be properly implemented for the FileList component
    console.log(`Would move file ${file.name} to ${target.name}`);
  };

  const handleUpdateSecurity = async (fileName, security) => {
    // This function would be properly implemented for the FileList component
    console.log(`Would update security for ${fileName} to ${security}`);
  };

  const handleBulkDelete = async () => {
    // This function would be properly implemented for the FileList component
    console.log(`Would bulk delete selected files`);
  };

  const handleBulkDownload = async () => {
    // This function would be properly implemented for the FileList component
    console.log(`Would bulk download selected files`);
  };

  const handleCreateFolder = async () => {
    // This function would be properly implemented for the FileList component
    console.log(`Would create a new folder`);
  };

  // Add a new function to handle checkbox selection
  const handleFileSelection = (filePath) => {
    if (selectedFiles.includes(filePath)) {
      setSelectedFiles(selectedFiles.filter(f => f !== filePath));
    } else {
      setSelectedFiles([...selectedFiles, filePath]);
    }
  };

  const isSelected = (filePath) => selectedFiles.includes(filePath);

  // Format date using the same format as ExtractComponent
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Sort files to ensure folders are always at the top
  const sortedFiles = React.useMemo(() => {
    // First, separate folders and files
    const folders = files.filter(f => f.type === 'folder');
    const nonFolders = files.filter(f => f.type !== 'folder');

    // Sort folders by name
    folders.sort((a, b) => a.name.localeCompare(b.name));

    // Sort non-folder files by name
    nonFolders.sort((a, b) => a.name.localeCompare(b.name));

    // Combine folders and files, with folders always at the top
    return [...folders, ...nonFolders];
  }, [files]);

  return (
    <Container maxWidth="xl" className="main-content">
      <Typography variant="h4" className="section-title" gutterBottom>
        Build Retrieval Database
      </Typography>
      
      <Grid container spacing={3}>
        {/* Step 1: Select Files */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 1: Select Documents
              <Tooltip title="Select documents from your library to include in the vector store">
                <InfoIcon className="info-icon" />
              </Tooltip>
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Choose documents from your library to include in the vector store.
        </Typography>
            
            {/* Root navigation button */}
            <Button 
              variant="outlined" 
              onClick={() => setCurrentFolder('')}
              style={{ 
                marginBottom: '16px', 
                borderColor: '#e0e0e0',
                backgroundColor: '#f5f5f5',
                padding: '4px 16px'
              }}
            >
              Root
            </Button>
            
            {currentFolder && (
              <Typography variant="body2" color="textSecondary" paragraph>
                Current Path: {currentFolder}
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={handleNavigateUp}
                  style={{ marginLeft: '8px' }}
                >
                  Go Up
                </Button>
              </Typography>
            )}
            
            <Box className="table-container" style={{ height: '500px', overflow: 'auto' }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={2}>
                  <Typography color="error" align="center">
                    {error}
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} style={{ boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow style={{ backgroundColor: 'var(--primary-color)' }}>
                        <TableCell padding="checkbox" style={{ color: 'white' }}>
                          <Checkbox 
                            indeterminate={selectedFiles.length > 0 && selectedFiles.length < files.filter(f => f.type !== 'folder').length}
                            checked={files.filter(f => f.type !== 'folder').length > 0 && 
                                    selectedFiles.length === files.filter(f => f.type !== 'folder').length}
                            onChange={() => {
                              if (selectedFiles.length === files.filter(f => f.type !== 'folder').length) {
                                setSelectedFiles([]);
                              } else {
                                const allFilePaths = files
                                  .filter(f => f.type !== 'folder')
                                  .map(f => currentFolder ? `${currentFolder}/${f.name}` : f.name);
                                setSelectedFiles(allFilePaths);
                              }
                            }}
                            style={{ color: 'white' }}
                            disabled={files.filter(f => f.type !== 'folder').length === 0}
                          />
                        </TableCell>
                        <TableCell style={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell style={{ color: 'white', fontWeight: 'bold' }}>Upload Date</TableCell>
                        <TableCell style={{ color: 'white', fontWeight: 'bold' }}>Classification</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedFiles.map((file, index) => {
                        const isFolder = file.type === 'folder';
                        const filePath = currentFolder 
                          ? `${currentFolder}/${file.name}`
                          : file.name;
                        
                        return (
                          <React.Fragment key={file.name}>
                            {index > 0 && 
                             sortedFiles[index].type !== 'folder' && 
                             sortedFiles[index - 1].type === 'folder' && (
                              <TableRow>
                                <TableCell colSpan={4} style={{ padding: '4px 0', backgroundColor: '#f5f5f5' }} />
                              </TableRow>
                            )}
                            <TableRow 
                              hover
                            >
                              <TableCell padding="checkbox">
                                {!isFolder && (
                                  <Checkbox
                                    checked={isSelected(filePath)}
                                    onChange={() => handleFileSelection(filePath)}
                                    disabled={isFolder}
                                  />
                                )}
                              </TableCell>
                              <TableCell 
                                style={{ cursor: isFolder ? 'pointer' : 'default' }}
                                onClick={isFolder ? () => handleFolderClick(file.name) : undefined}
                              >
                                {isFolder ? (
                                  <Box display="flex" alignItems="center">
                                    <FolderIcon style={{ color: '#FFC107', marginRight: '8px' }} fontSize="small" />
                                    {file.name}
                                  </Box>
                                ) : (
                                  <Box display="flex" alignItems="center">
                                    <InsertDriveFileIcon style={{ color: '#2196F3', marginRight: '8px' }} fontSize="small" />
                                    {file.name}
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell>
                                {file.type !== 'folder' && file.uploadDate ? formatDate(file.uploadDate) : ''}
                              </TableCell>
                              <TableCell 
                                style={{ 
                                  color: file.classification === 'UNCLASSIFIED' ? 'green' : 
                                        file.classification ? 'red' : 'inherit'
                                }}
                              >
                                {file.type !== 'folder' && file.classification}
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Step 2: Review Selected Files */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 2: Review Selected Documents
              <Tooltip title="Review the documents you've selected for your vector store">
                <InfoIcon className="info-icon" />
              </Tooltip>
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Review the documents you've selected for your vector store.
            </Typography>
            <Box className="info-box" style={{ height: '500px', overflow: 'auto' }}>
              {selectedFiles.length > 0 ? (
                <List>
                  {selectedFiles.map((filePath, index) => (
                    <ListItem key={filePath} className="list-item">
              <ListItemText 
                        primary={filePath.split('/').pop()} 
                        secondary={`Selected for embedding`} 
                        className="list-item-text"
              />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(filePath)} className="action-button">
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="body1" className="text-secondary">
                    No documents selected.<br />Please select documents from Step 1.
                  </Typography>
                </Box>
              )}
            </Box>
            <Box className={classes.fileCounter} style={{ marginTop: '16px' }}>
              <Chip
                icon={<DescriptionIcon />}
                label={`${selectedFiles.length} document${selectedFiles.length !== 1 ? 's' : ''} selected`}
                color={selectedFiles.length > 0 ? "primary" : "default"}
                variant="outlined"
              />
              {selectedFiles.length > 0 && (
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  size="small"
                  onClick={() => setSelectedFiles([])}
                  className="action-button"
                  startIcon={<DeleteIcon />}
                >
                  Clear All
                </Button>
              )}
            </Box>
      </Paper>
        </Grid>

        {/* Step 3: Configure and Create Vector Store */}
        <Grid item xs={12} md={4}>
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Step 3: Create Vector Store
              <Tooltip title="Configure and create your vector store for retrieval-augmented generation">
                <InfoIcon className="info-icon" />
              </Tooltip>
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Configure and create your vector store for retrieval-augmented generation.
            </Typography>
            
            <form noValidate className="section">
              <TextField
                label="Vector Store Name"
                variant="outlined"
                fullWidth
                margin="normal"
                value={vectorStoreName}
                onChange={(e) => setVectorStoreName(e.target.value)}
                required
                size="small"
                placeholder="Enter a name for your vector store"
              />
              
              <TextField
                label="Description"
                variant="outlined"
                fullWidth
                margin="normal"
                value={vectorStoreDescription}
                onChange={(e) => setVectorStoreDescription(e.target.value)}
                multiline
                rows={3}
                size="small"
                required
                placeholder="Enter a description of this vector store"
              />

              <Divider className="divider" style={{ margin: '16px 0 8px 0' }} />
              <Typography variant="subtitle1" className="bold" style={{ marginBottom: '8px' }}>
                Embedding Configuration
              </Typography>

              <FormControl fullWidth margin="normal" variant="outlined" size="small">
                <InputLabel id="embedding-model-label">Embedding Model</InputLabel>
                <Select
                  labelId="embedding-model-label"
                  id="embedding-model"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  label="Embedding Model"
                >
                  {embeddingModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider className="divider" style={{ margin: '16px 0 8px 0' }} />
              <Typography variant="subtitle1" className="bold" gutterBottom>
                Text Chunking Method
              </Typography>
              
              <FormControl component="fieldset" style={{ marginBottom: '16px' }}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Typography variant="body2">Fixed Size</Typography>
                  </Grid>
                  <Grid item>
                    <Switch
                      checked={useParagraphChunking}
                      onChange={(e) => setUseParagraphChunking(e.target.checked)}
                      color="primary"
                      name="chunking-toggle"
                    />
                  </Grid>
                  <Grid item>
                    <Typography variant="body2">Paragraph-Based</Typography>
                  </Grid>
                </Grid>
              </FormControl>
              
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: '8px' }}>
                {useParagraphChunking ? 
                  "Paragraph-based chunking splits text by natural paragraphs, preserving context and coherence." : 
                  "Fixed size chunking splits text into equal-sized chunks with specified overlap."
                }
              </Typography>

              {/* New Chunking Method Information Accordion */}
              <Accordion className={classes.infoAccordion}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  className={classes.accordionSummary}
                >
                  <Typography variant="body2">
                    <InfoIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Chunking Methods Explained
                  </Typography>
                </AccordionSummary>
                <AccordionDetails className={classes.accordionDetails}>
                  <TableContainer component={Paper} style={{ marginBottom: '16px' }} className={classes.methodComparisonTable}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell>Paragraph-Based</TableCell>
                          <TableCell>Fixed-Size</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell component="th" scope="row">Best For</TableCell>
                          <TableCell>
                            • Well-structured documents<br />
                            • Articles, reports, books<br />
                            • Documents with logical sections
                          </TableCell>
                          <TableCell>
                            • Code or technical content<br />
                            • Dense text without clear paragraphs<br />
                            • OCR'd documents with poor structure
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Advantages</TableCell>
                          <TableCell>
                            • Preserves natural context<br />
                            • Better for Q&A on specific topics<br />
                            • More coherent retrieval results
                          </TableCell>
                          <TableCell>
                            • Consistent chunk sizes<br />
                            • More predictable token usage<br />
                            • Works with any document type
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell component="th" scope="row">Considerations</TableCell>
                          <TableCell>
                            • Variable chunk sizes<br />
                            • May struggle with poorly formatted text<br />
                            • Requires good paragraph detection
                          </TableCell>
                          <TableCell>
                            • May split mid-paragraph<br />
                            • Can break contextual understanding<br />
                            • Requires tuning overlap carefully
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="subtitle2" gutterBottom>Parameter Recommendations</Typography>
                  
                  {/* Paragraph Chunking Tips */}
                  <Box className={classes.infoBox} style={{ display: useParagraphChunking ? 'block' : 'none' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Paragraph Chunking Parameters
                    </Typography>
                    
                    <Typography variant="body2" className={classes.tipItem}>
                      <strong>Max Paragraph Length (1500 default):</strong> Maximum characters in a single chunk.
                    </Typography>
                    <ul>
                      <li><Typography variant="body2">Lower values (800-1200): Use for dense technical content or when you need more specific retrievals.</Typography></li>
                      <li><Typography variant="body2">Higher values (1500-3000): Better for narrative content where more context improves understanding.</Typography></li>
                      <li><Typography variant="body2">Recommendation: Start with 1500 and adjust based on retrieval quality.</Typography></li>
                    </ul>
                    
                    <Typography variant="body2" className={classes.tipItem}>
                      <strong>Min Paragraph Length (50 default):</strong> Minimum characters before paragraphs are merged.
                    </Typography>
                    <ul>
                      <li><Typography variant="body2">Lower values (20-50): Preserves short paragraphs like bullet points and section headers.</Typography></li>
                      <li><Typography variant="body2">Higher values (100-200): Combines short paragraphs for more substantial chunks.</Typography></li>
                      <li><Typography variant="body2">Recommendation: 50 works well for most documents with normal formatting.</Typography></li>
                    </ul>
                  </Box>
                  
                  {/* Fixed Chunking Tips */}
                  <Box className={classes.infoBox} style={{ display: useParagraphChunking ? 'none' : 'block' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Fixed Size Chunking Parameters
                    </Typography>
                    
                    <Typography variant="body2" className={classes.tipItem}>
                      <strong>Chunk Size (1000 default):</strong> Number of characters per chunk.
                    </Typography>
                    <ul>
                      <li><Typography variant="body2">Lower values (500-800): Creates more chunks, better for precise retrieval of specific facts.</Typography></li>
                      <li><Typography variant="body2">Higher values (1200-2000): Better for understanding broader contexts and concepts.</Typography></li>
                      <li><Typography variant="body2">Recommendation: 1000 is a good starting point for general purpose use.</Typography></li>
                    </ul>
                    
                    <Typography variant="body2" className={classes.tipItem}>
                      <strong>Chunk Overlap (100 default):</strong> Number of characters that overlap between chunks.
                    </Typography>
                    <ul>
                      <li><Typography variant="body2">Lower values (50-100): Reduces storage requirements and processing time.</Typography></li>
                      <li><Typography variant="body2">Higher values (150-300): Improves context preservation across chunk boundaries.</Typography></li>
                      <li><Typography variant="body2">Recommendation: Use 10-20% of your chunk size (e.g., 100-200 for a 1000 chunk size).</Typography></li>
                    </ul>
                  </Box>
                  
                  <Typography variant="body2" style={{ marginTop: '16px', fontStyle: 'italic' }}>
                    Note: For both methods, you can start with the defaults and adjust based on the quality of responses
                    you get when querying your vectorstore.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {useParagraphChunking ? (
                // Paragraph chunking parameters
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Max Paragraph Length"
                      variant="outlined"
                      fullWidth
                      type="number"
                      value={maxParagraphLength}
                      onChange={(e) => setMaxParagraphLength(Number(e.target.value))}
                      size="small"
                      InputProps={{ inputProps: { min: 100, max: 5000 } }}
                      helperText="Maximum characters per paragraph"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Min Paragraph Length"
                      variant="outlined"
                      fullWidth
                      type="number"
                      value={minParagraphLength}
                      onChange={(e) => setMinParagraphLength(Number(e.target.value))}
                      size="small"
                      InputProps={{ inputProps: { min: 10, max: 500 } }}
                      helperText="Minimum characters before merging"
                    />
                  </Grid>
                </Grid>
              ) : (
                // Fixed size chunking parameters
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Chunk Size"
                      variant="outlined"
                      fullWidth
                      type="number"
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      size="small"
                      InputProps={{ inputProps: { min: 100, max: 4000 } }}
                      helperText="Characters per chunk"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Chunk Overlap"
                      variant="outlined"
                      fullWidth
                      type="number"
                      value={chunkOverlap}
                      onChange={(e) => setChunkOverlap(Number(e.target.value))}
                      size="small"
                      InputProps={{ inputProps: { min: 0, max: 1000 } }}
                      helperText="Overlap between chunks"
                    />
                  </Grid>
                </Grid>
              )}

              <Divider className="divider" style={{ margin: '16px 0 8px 0' }} />
              <Typography variant="body2" color="textSecondary" style={{ marginTop: '16px' }}>
                Selected File Types:
              </Typography>
              <Box className={classes.chipsContainer}>
                {selectedFiles.length > 0 ? (
                  [...new Set(selectedFiles.map(f => f.split('.').pop().toUpperCase()))].map(fileType => (
                    <Chip 
                      key={fileType} 
                      label={fileType} 
                      className={classes.chip} 
                      size="small" 
                      color="primary"
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No files selected
                  </Typography>
                )}
              </Box>
              
              <Divider className="divider" />
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <CreateIcon />}
                onClick={handleCreateVectorStore}
                disabled={isCreating || selectedFiles.length === 0 || !vectorStoreName.trim() || !vectorStoreDescription.trim()}
                className="upload-button"
                style={{ marginTop: '16px' }}
              >
                {isCreating ? 'Creating Vector Store...' : 'Create Vector Store'}
              </Button>
              
              {message && (
                <Box className={`info-box ${success ? 'success-message' : 'warning-text'}`} style={{ marginTop: '16px', padding: '12px' }}>
                  <Typography 
                    variant="body2" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: success ? 'var(--primary-color)' : '#f44336' 
                    }}
                  >
                    {success && <CheckCircleIcon fontSize="small" style={{ marginRight: 8 }} />}
                    {message}
                  </Typography>
                </Box>
              )}
            </form>
      </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default BuildRetrievalDatabases;
