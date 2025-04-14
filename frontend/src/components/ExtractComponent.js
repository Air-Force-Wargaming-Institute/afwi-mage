import React, {useContext} from 'react';
import axios from 'axios';
import '../App.css';
import { Box, Grid, Paper, Button, TextField, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress, Typography, List, ListItem, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoIcon from '@mui/icons-material/Info';
import { DataGrid } from '@mui/x-data-grid';
import { keyframes } from '@emotion/react';
import { styled } from '@mui/material/styles';
import { useExtraction, ACTIONS } from '../contexts/ExtractionContext';
import { getApiUrl, getGatewayUrl } from '../config';
import { AuthContext } from '../contexts/AuthContext';

// Add the pulsing animation keyframes
const pulseAnimation = keyframes`
  0% {
    background-color: #1976d2;
  }
  50% {
    background-color: #2196f3;
  }
  100% {
    background-color: #1976d2;
  }
`;

// Create a styled button component with the animation
const PulsingButton = styled(Button)(({ theme, isextracting }) => ({
  ...(isextracting === 'true' && {
    animation: `${pulseAnimation} 2s infinite ease-in-out`,
    color: '#ffffff !important',
    '& .MuiCircularProgress-root': {
      color: '#ffffff !important',
    },
    '&:hover': {
      animation: 'none',
      backgroundColor: theme.palette.primary.dark,
      color: '#ffffff',
    },
  }),
}));

function ExtractComponent() {
  const { state, dispatch } = useExtraction();
  const { user, token } = useContext(AuthContext);

  const {
    files,
    selectedFiles = [], // Add default empty array
    message,
    currentFolder,
    csvFilename,
    isLoading,
    isExtracting,
    csvFiles,
    selectedCsvFile,
    newlyCreatedCsvFile,
    editingCsvFile,
    newCsvFileName,
    error,
    previewOpen,
    previewData,
    metadataOpen,
    metadataContent
  } = state;

  // Keep only the dispatch functions that are actually used
  const setSelectedFiles = (files) => dispatch({ type: ACTIONS.SET_SELECTED_FILES, payload: files });
  const setMessage = (msg) => dispatch({ type: ACTIONS.SET_MESSAGE, payload: msg });
  const setCurrentFolder = (folder) => dispatch({ type: ACTIONS.SET_CURRENT_FOLDER, payload: folder });
  const setCsvFilename = (filename) => dispatch({ type: ACTIONS.SET_CSV_FILENAME, payload: filename });
  const setIsExtracting = (extracting) => dispatch({ type: ACTIONS.SET_EXTRACTING, payload: extracting });
  const setSelectedCsvFile = (file) => dispatch({ type: ACTIONS.SET_SELECTED_CSV_FILE, payload: file });
  const setNewlyCreatedCsvFile = (file) => dispatch({ type: ACTIONS.SET_NEWLY_CREATED_CSV_FILE, payload: file });
  const setEditingCsvFile = (file) => dispatch({ type: ACTIONS.SET_EDITING_CSV_FILE, payload: file });
  const setNewCsvFileName = (filename) => dispatch({ type: ACTIONS.SET_NEW_CSV_FILENAME, payload: filename });
  const setError = (err) => dispatch({ type: ACTIONS.SET_ERROR, payload: err });
  const setPreviewOpen = (open) => dispatch({ type: ACTIONS.SET_PREVIEW_OPEN, payload: open });
  const setPreviewData = (data) => dispatch({ type: ACTIONS.SET_PREVIEW_DATA, payload: data });
  const setMetadataOpen = (open) => dispatch({ type: ACTIONS.SET_METADATA_OPEN, payload: open });
  const setMetadataContent = (content) => dispatch({ type: ACTIONS.SET_METADATA_CONTENT, payload: content });

  const fetchFiles = React.useCallback((folder) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    
    axios.get(getGatewayUrl(`/api/extraction/files/?folder=${folder}`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
      .then(response => {
        if (Array.isArray(response.data)) {
          dispatch({ type: ACTIONS.SET_FILES, payload: response.data });
          if (response.data.length === 0) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: 'No PDF files found in the document library.' });
          }
        } else {
          console.error('Unexpected response format:', response.data);
          dispatch({ type: ACTIONS.SET_ERROR, payload: 'Error: Unexpected response format from server' });
        }
      })
      .catch(error => {
        console.error('Error fetching files:', error);
        dispatch({ type: ACTIONS.SET_ERROR, payload: error.response?.data?.detail || 'Error loading files from document library. Please try again.' });
      })
      .finally(() => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      });
  }, [dispatch]);

  const fetchCsvFiles = React.useCallback(async () => {
    try {
      const response = await axios.get(getGatewayUrl('/api/extraction/csv-files/'),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      dispatch({ type: ACTIONS.SET_CSV_FILES, payload: response.data });
    } catch (error) {
      console.error('Error fetching CSV files:', error);
    }
  }, [dispatch]);

  React.useEffect(() => {
    fetchFiles(currentFolder);
    fetchCsvFiles();
  }, [currentFolder, fetchFiles, fetchCsvFiles]);

  React.useEffect(() => {
    if (newlyCreatedCsvFile) {
      dispatch({ type: ACTIONS.SET_SELECTED_CSV_FILE, payload: newlyCreatedCsvFile });
    }
  }, [newlyCreatedCsvFile, dispatch]);

  React.useEffect(() => {
    if (csvFiles.length > 0 && newlyCreatedCsvFile) {
      dispatch({ type: ACTIONS.SET_SELECTED_CSV_FILE, payload: newlyCreatedCsvFile });
      dispatch({ type: ACTIONS.SET_NEWLY_CREATED_CSV_FILE, payload: '' }); // Reset after selection
    }
  }, [csvFiles, newlyCreatedCsvFile, dispatch]);

  const handleFileSelection = (event, filePath) => {
    const fullPath = currentFolder ? `${currentFolder}/${filePath}` : filePath;
    const currentSelected = Array.isArray(selectedFiles) ? selectedFiles : [];
    
    if (event.target.checked) {
      setSelectedFiles([...currentSelected, fullPath]);
    } else {
      setSelectedFiles(currentSelected.filter(path => path !== fullPath));
    }
  };

  const isFileSelected = (filePath) => {
    const currentSelected = Array.isArray(selectedFiles) ? selectedFiles : [];
    return currentSelected.includes(currentFolder ? `${currentFolder}/${filePath}` : filePath);
  };

  const handleExtract = async () => {
    if (selectedFiles.length === 0) {
        setMessage('Please select at least one file');
        return;
    }

    if (!csvFilename.trim()) {
        setMessage('Please provide a name for the CSV file');
        return;
    }

    setIsExtracting(true);
    setMessage('');
    setError(null);

    try {
        const response = await axios.post(getGatewayUrl('/api/extraction/extract/'), {
            filenames: selectedFiles,
            csv_filename: csvFilename.trim()
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data.status === "Extraction process completed") {
            setMessage(`Extraction completed successfully!\nCSV file: ${response.data.csv_file}`);
            setNewlyCreatedCsvFile(response.data.csv_file);
            
            // Show detailed results
            const results = response.data.results
                .map(result => `${result.filename}: ${result.status}`)
                .join('\n');
            setMessage(prev => `${prev}\n\nResults:\n${results}`);
            
            // Refresh CSV file list
            fetchCsvFiles();
            
            // Clear selection after successful extraction
            setSelectedFiles([]);
            setCsvFilename('');
        } else {
            setMessage('Extraction completed with some issues. Please check the results.');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.detail || 'Error during extraction process';
        setError(`Error: ${errorMessage}`);
        setMessage('');
        console.error('Extraction error:', error);
    } finally {
        setIsExtracting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

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

  const getFileNameWithoutExtension = (fileName) => {
    return fileName.replace(/\.csv$/, '');
  };

  const handleRenameCsvFile = async (oldName, newName) => {
    try {
      // Ensure the new name has .csv extension
      const newNameWithExtension = newName.endsWith('.csv') ? newName : `${newName}.csv`;
      await axios.post(getGatewayUrl('/api/extraction/rename-csv/'), { 
        old_name: oldName, 
        new_name: newNameWithExtension 
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessage(`CSV file '${oldName}' renamed to '${newNameWithExtension}' successfully`);
      fetchCsvFiles();
      setEditingCsvFile(null);
    } catch (error) {
      console.error('Error renaming CSV file:', error);
      setMessage('Error renaming CSV file. Please try again.');
    }
  };

  const handleDeleteCsvFile = async (filename) => {
    setError(null);
    setSelectedCsvFile(null);
    setNewlyCreatedCsvFile(null);
    setEditingCsvFile(null);
    setNewCsvFileName('');
    setPreviewData([]);
    setPreviewOpen(false);
    setMetadataOpen(false);
    setMetadataContent(null);
    try {
      await axios.delete(getGatewayUrl(`/api/extraction/delete-csv/${filename}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setMessage(`CSV file '${filename}' deleted successfully`);
      fetchCsvFiles();
    } catch (error) {
      console.error('Error deleting CSV file:', error);
      setError('Error deleting CSV file. Please try again.');
    }
  };

  const handlePreviewClick = async (filename) => {
    try {
      setSelectedCsvFile(filename);
      const response = await axios.get(getGatewayUrl(`/api/extraction/csv-preview/${filename}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setPreviewData(response.data);
      setPreviewOpen(true);
    } catch (error) {
      setError(`Error loading preview: ${error.message}`);
    }
  };

  const handleMetadataClick = async (filename) => {
    try {
      const csvFiles = await axios.get(getGatewayUrl('/api/extraction/csv-files/'),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const fileMetadata = csvFiles.data.find(file => file.name === filename);
      setMetadataContent(fileMetadata);
      setMetadataOpen(true);
    } catch (error) {
      setError(`Error loading metadata: ${error.message}`);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewData([]);
    setSelectedCsvFile(null);
  };

  const handleCloseMetadata = () => {
    setMetadataOpen(false);
    setMetadataContent(null);
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        height: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        backgroundColor: '#f5f5f5',
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
      }}>Extract Content</h2>
      
      {error && (
        <Paper 
          elevation={3}
          sx={{ 
            padding: '16px', 
            marginBottom: '20px', 
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            color: '#d32f2f',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          <IconButton
            size="small"
            onClick={() => setError(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#d32f2f'
            }}
          >
            <CancelIcon fontSize="small" />
          </IconButton>
          {error}
        </Paper>
      )}
      
      {message && (
        <Paper 
          elevation={3}
          sx={{ 
            padding: '16px', 
            marginBottom: '20px', 
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            color: '#2e7d32',
            flexShrink: 0,
            position: 'relative'
          }}
        >
          <IconButton
            size="small"
            onClick={() => setMessage('')}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#2e7d32'
            }}
          >
            <CancelIcon fontSize="small" />
          </IconButton>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', paddingRight: '24px' }}>{message}</pre>
        </Paper>
      )}
      
      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Grid item xs={12} md={4} sx={{ height: '100%', overflow: 'hidden' }}>
          <Paper className="extract-section" elevation={3}>
            <h3>Step 1: Select Files for Extraction</h3>
            
            <div style={{ 
              marginBottom: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flexShrink: 0 
            }}>
              <Button 
                variant="outlined" 
                onClick={() => setCurrentFolder('')}
                size="small"
                style={{ textTransform: 'none' }}
              >
                Root
              </Button>
              {currentFolder && (
                <>
                  <span>/</span>
                  {currentFolder.split('/').map((folder, index, array) => (
                    <React.Fragment key={index}>
                      <Button
                        variant="outlined"
                        size="small"
                        style={{ textTransform: 'none' }}
                        onClick={() => setCurrentFolder(array.slice(0, index + 1).join('/'))}
                      >
                        {folder}
                      </Button>
                      {index < array.length - 1 && <span>/</span>}
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <CircularProgress />
                <p>Loading files...</p>
              </div>
            ) : (
              <>
                <div style={{ 
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto'
                }}>
                  {files.length > 0 ? (
                    <TableContainer>
                      <Table 
                        stickyHeader 
                        size="small" 
                        style={{ 
                          '& .MuiTableCell-root': {
                            padding: '6px 8px',
                          }
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" style={{ width: '48px', padding: '0 8px' }}>
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFiles(files
                                      .filter(f => f.type === 'pdf')
                                      .map(f => currentFolder ? `${currentFolder}/${f.name}` : f.name)
                                    );
                                  } else {
                                    setSelectedFiles([]);
                                  }
                                }}
                                checked={
                                  selectedFiles.length === files.filter(f => f.type === 'pdf').length && 
                                  files.filter(f => f.type === 'pdf').length > 0
                                }
                                indeterminate={
                                  selectedFiles.length > 0 && 
                                  selectedFiles.length < files.filter(f => f.type === 'pdf').length
                                }
                                style={{ padding: 0 }}
                              />
                            </TableCell>
                            <TableCell style={{ padding: '6px 8px', width: '200px' }}>Name</TableCell>
                            <TableCell style={{ padding: '6px 8px', width: '120px' }}>Upload Date</TableCell>
                            <TableCell style={{ padding: '6px 8px', width: '150px' }}>Classification</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedFiles.map((file, index) => (
                            <React.Fragment key={file.path}>
                              {index > 0 && 
                               sortedFiles[index].type !== 'folder' && 
                               sortedFiles[index - 1].type === 'folder' && (
                                <TableRow>
                                  <TableCell colSpan={4} style={{ padding: '4px 0', backgroundColor: '#f5f5f5' }} />
                                </TableRow>
                              )}
                              <TableRow 
                                hover
                                selected={isFileSelected(file.name)}
                                style={{ 
                                  height: '36px', 
                                  cursor: file.type === 'folder' ? 'pointer' : 'default',
                                  backgroundColor: file.type === 'folder' ? '#fafafa' : 'inherit'
                                }}
                                onClick={() => {
                                  if (file.type === 'folder') {
                                    const newFolder = currentFolder ? `${currentFolder}/${file.name}` : file.name;
                                    setCurrentFolder(newFolder);
                                  }
                                }}
                              >
                                <TableCell padding="checkbox" style={{ padding: '0 8px' }}>
                                  {file.type !== 'folder' && (
                                    <input
                                      type="checkbox"
                                      checked={isFileSelected(file.name)}
                                      onChange={(e) => handleFileSelection(e, file.name)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ padding: 0 }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell style={{ 
                                  padding: '6px 8px',
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'normal',
                                  wordWrap: 'break-word'
                                }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '0.875rem',
                                    fontWeight: file.type === 'folder' ? 500 : 400
                                  }}>
                                    {file.type === 'folder' ? '📁 ' : '📄 '}
                                    {file.name}
                                  </div>
                                </TableCell>
                                <TableCell style={{ padding: '6px 8px', fontSize: '0.875rem' }}>
                                  {file.type !== 'folder' && formatDate(file.uploadDate)}
                                </TableCell>
                                <TableCell 
                                  style={{ 
                                    padding: '6px 8px', 
                                    fontSize: '0.875rem',
                                    color: file.classification === 'UNCLASSIFIED' ? 'green' : 'red'
                                  }}
                                >
                                  {file.type !== 'folder' && file.classification}
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      No files available in this folder
                    </div>
                  )}
                </div>
                
                <div style={{ 
                  marginTop: '20px', 
                  padding: '10px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px',
                  flexShrink: 0
                }}>
                  <strong>Selected:</strong> {selectedFiles.length} file(s)
                </div>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper className="extract-section" elevation={3}>
            <h3>Step 2: Review Selected Files</h3>
            <div style={{ 
              flex: 1,
              minHeight: 0,
              overflowY: 'auto'
            }}>
              {selectedFiles.length > 0 ? (
                <div className="selected-files" style={{ textAlign: 'left' }}>
                  <div style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={file}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f5f5f5',
                          fontSize: '0.875rem',
                          borderBottom: '1px solid #e0e0e0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                  <div style={{ 
                    marginTop: '10px', 
                    color: '#666',
                    fontSize: '0.875rem' 
                  }}>
                    Total selected: {selectedFiles.length} file(s)
                  </div>
                </div>
              ) : (
                <p style={{ 
                  textAlign: 'left', 
                  color: '#666',
                  padding: '20px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  margin: '10px 0'
                }}>
                  No files selected
                </p>
              )}
            </div>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper className="extract-section" elevation={3}>
            <h3>Step 3: Start Extraction</h3>
            
            <div style={{ flexShrink: 0 }}>
              <TextField
                fullWidth
                label="CSV Filename"
                value={csvFilename}
                onChange={(e) => setCsvFilename(e.target.value)}
                disabled={isExtracting}
                margin="normal"
                helperText="Enter a name for the output CSV file"
              />
              <PulsingButton 
                onClick={handleExtract}
                disabled={isExtracting || selectedFiles.length === 0 || !csvFilename.trim()}
                variant="contained"
                color="primary"
                isextracting={isExtracting.toString()}
                style={{ marginTop: '20px', marginBottom: '30px' }}
              >
                {isExtracting ? 'Extracting...' : 'Start Extraction'}
                {isExtracting && (
                  <CircularProgress 
                    size={24} 
                    style={{ marginLeft: '10px', color: 'white' }} 
                  />
                )}
              </PulsingButton>
            </div>

            <div style={{ 
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              borderTop: '1px solid #e0e0e0',
              paddingTop: '20px'
            }}>
              <h3>Extracted CSV Files</h3>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>Filename</TableCell>
                      <TableCell sx={{ py: 1, width: '120px' }}>Created At</TableCell>
                      <TableCell align="right" sx={{ py: 1, width: '100px' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvFiles.map((file) => (
                      <TableRow key={file.name} sx={{ '& > *': { py: 0.5 } }}>
                        <TableCell>
                          {editingCsvFile === file.name ? (
                            <TextField
                              value={getFileNameWithoutExtension(newCsvFileName)}
                              onChange={(e) => setNewCsvFileName(e.target.value)}
                              fullWidth
                              size="small"
                              helperText="File extension (.csv) will be added automatically"
                            />
                          ) : (
                            file.name
                          )}
                        </TableCell>
                        <TableCell>{formatDate(file.created_at)}</TableCell>
                        <TableCell align="right" sx={{ pr: 0.5 }}>
                          <Box sx={{ 
                            display: 'inline-flex', 
                            gap: 0
                          }}>
                            <IconButton
                              color="primary"
                              onClick={() => handlePreviewClick(file.name)}
                              title="Preview"
                              size="small"
                              sx={{ p: 0.3 }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            {editingCsvFile === file.name ? (
                              <>
                                <IconButton
                                  onClick={() => handleRenameCsvFile(file.name, newCsvFileName)}
                                  disabled={!newCsvFileName.trim() || newCsvFileName === file.name}
                                  size="small"
                                  sx={{ p: 0.3 }}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  onClick={() => {
                                    setEditingCsvFile(null);
                                    setNewCsvFileName('');
                                  }}
                                  size="small"
                                  sx={{ p: 0.3 }}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </>
                            ) : (
                              <>
                                <IconButton 
                                  onClick={() => {
                                    setEditingCsvFile(file.name);
                                    setNewCsvFileName(file.name);
                                  }}
                                  size="small"
                                  sx={{ p: 0.3 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  onClick={() => handleDeleteCsvFile(file.name)}
                                  size="small"
                                  sx={{ p: 0.3 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {csvFiles.length === 0 && (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#666',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  marginTop: '10px'
                }}>
                  No CSV files available
                </div>
              )}
            </div>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: '90vw',
            maxHeight: '90vh',
            borderRadius: '12px',
            '& .MuiDialogTitle-root': {
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px'
            },
            '& .MuiDataGrid-root': {
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f5f5',
                borderBottom: '1px solid #e0e0e0'
              }
            }
          }
        }}
      >
        <DialogTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Preview: {selectedCsvFile}</span>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleMetadataClick(selectedCsvFile)}
              startIcon={<InfoIcon />}
            >
              See Details
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={async () => {
                try {
                  console.log('Saving changes to CSV file:', selectedCsvFile);
                  console.log('Preview data to save:', previewData);
                  
                  // Ensure all rows have the correct field names
                  const formattedData = previewData.map(row => ({
                    question: row.question || '',
                    answer: row.answer || '',
                    source: row.source || '',
                    'file security classification': row['file security classification'] || '',
                    'content security classification': row['content security classification'] || '',
                    type: row.type || ''
                  }));

                  console.log('Formatted data:', formattedData);

                  await axios.post(getGatewayUrl(`/api/extraction/update-csv/${selectedCsvFile}`), {
                    data: formattedData
                  }, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  setMessage('CSV file updated successfully');
                  
                  // Refresh the preview data
                  const response = await axios.get(getGatewayUrl(`/api/extraction/csv-preview/${selectedCsvFile}`),
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    }
                  );
                  setPreviewData(response.data);
                } catch (error) {
                  console.error('Error saving changes:', error);
                  setError(`Error updating CSV file: ${error.message}`);
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ height: '70vh', width: '100%' }}>
            <DataGrid
              rows={previewData.map((row, index) => ({
                id: index,
                ...row
              }))}
              columns={[
                { 
                  field: 'question', 
                  headerName: 'Question', 
                  flex: 1,
                  editable: true,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                { 
                  field: 'answer', 
                  headerName: 'Answer', 
                  flex: 2,
                  editable: true,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                { 
                  field: 'source', 
                  headerName: 'Source', 
                  flex: 1,
                  editable: true,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                {
                  field: 'file security classification',
                  headerName: 'File Security Classification',
                  flex: 1,
                  editable: true,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                {
                  field: 'content security classification',
                  headerName: 'Content Security Classification',
                  flex: 1,
                  editable: true,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                {
                  field: 'type',
                  headerName: 'Type',
                  flex: 0.5,
                  editable: true,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                {
                  field: 'actions',
                  headerName: 'Actions',
                  flex: 0.5,
                  sortable: false,
                  renderCell: (params) => (
                    <IconButton
                      onClick={() => {
                        const newData = previewData.filter((_, index) => index !== params.row.id);
                        setPreviewData(newData);
                      }}
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )
                }
              ]}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              getRowHeight={() => 'auto'}
              onCellEditCommit={(params) => {
                const updatedData = previewData.map((row, index) => {
                  if (index === params.id) {
                    // Create a new object with the updated field
                    const updatedRow = { ...row };
                    updatedRow[params.field] = params.value;
                    return updatedRow;
                  }
                  return row;
                });
                setPreviewData(updatedData);
              }}
              sx={{
                '& .MuiDataGrid-cell': {
                  padding: '12px 8px',
                  maxHeight: 'none !important'
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f5f5f5',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={metadataOpen}
        onClose={handleCloseMetadata}
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minWidth: '500px',
            maxHeight: '80vh'  // Limit height to enable scrolling
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#f5f5f5', 
          borderBottom: '1px solid #e0e0e0'
        }}>
          File Details
        </DialogTitle>
        <DialogContent sx={{ 
          padding: '24px',
          overflowY: 'auto'  // Enable vertical scrolling
        }}>
          {metadataContent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Current Filename:</strong> {metadataContent.name}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Original Filename:</strong> {metadataContent.original_name || metadataContent.name}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Created At:</strong> {formatDate(metadataContent.created_at)}
                </Typography>
              </Paper>

              {metadataContent.source_files && (
                <Paper sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Source Files ({metadataContent.source_files.length}):</strong>
                  </Typography>
                  <List dense sx={{ 
                    maxHeight: '300px', 
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0'
                  }}>
                    {metadataContent.source_files.map((source, index) => (
                      <ListItem 
                        key={index}
                        divider={index < metadataContent.source_files.length - 1}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: '#f5f5f5' 
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2">
                              <strong>File {index + 1}:</strong> {source.filename}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              Classification: {source.security_classification}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', padding: '16px' }}>
          <Button onClick={handleCloseMetadata} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ExtractComponent;