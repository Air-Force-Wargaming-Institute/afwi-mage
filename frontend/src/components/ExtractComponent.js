import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';
import { getApiUrl } from '../config';
import { Box, Grid, Paper, Button, TextField, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress, Typography, List, ListItem, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoIcon from '@mui/icons-material/Info';
import { DataGrid } from '@mui/x-data-grid';

function ExtractComponent() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [currentFolder, setCurrentFolder] = useState('');
  const [csvFilename, setCsvFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedCsvFile, setSelectedCsvFile] = useState('');
  const [newlyCreatedCsvFile, setNewlyCreatedCsvFile] = useState('');
  const [editingCsvFile, setEditingCsvFile] = useState(null);
  const [newCsvFileName, setNewCsvFileName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [metadataContent, setMetadataContent] = useState(null);

  useEffect(() => {
    fetchFiles(currentFolder);
    fetchCsvFiles();
  }, [currentFolder]);

  const fetchFiles = (folder) => {
    setIsLoading(true);
    setError(null);
    
    axios.get(getApiUrl('EXTRACTION', `/api/extraction/files/?folder=${folder}`))
      .then(response => {
        console.log('Files response:', response.data);  // Debug log
        if (Array.isArray(response.data)) {
          setFiles(response.data);
          if (response.data.length === 0) {
            setError('No PDF files found in the document library.');
          }
        } else {
          console.error('Unexpected response format:', response.data);
          setError('Error: Unexpected response format from server');
        }
      })
      .catch(error => {
        console.error('Error fetching files:', error);
        console.error('Error details:', error.response?.data);  // Debug log
        setError(error.response?.data?.detail || 'Error loading files from document library. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchCsvFiles = async () => {
    try {
      const response = await axios.get(getApiUrl('EXTRACTION', '/api/extraction/csv-files/'));
      setCsvFiles(response.data);
    } catch (error) {
      console.error('Error fetching CSV files:', error);
    }
  };

  const handleFileSelection = (event, filePath) => {
    const fullPath = currentFolder ? `${currentFolder}/${filePath}` : filePath;
    if (event.target.checked) {
      setSelectedFiles(prev => [...prev, fullPath]);
    } else {
      setSelectedFiles(prev => prev.filter(path => path !== fullPath));
    }
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
        const response = await axios.post(getApiUrl('EXTRACTION', '/api/extraction/extract/'), {
            filenames: selectedFiles,
            csv_filename: csvFilename.trim()
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

  useEffect(() => {
    if (newlyCreatedCsvFile) {
      setSelectedCsvFile(newlyCreatedCsvFile);
    }
  }, [newlyCreatedCsvFile]);

  useEffect(() => {
    if (csvFiles.length > 0 && newlyCreatedCsvFile) {
      setSelectedCsvFile(newlyCreatedCsvFile);
      setNewlyCreatedCsvFile(''); // Reset after selection
    }
  }, [csvFiles, newlyCreatedCsvFile]);

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
      await axios.post(getApiUrl('EXTRACTION', '/api/extraction/rename-csv/'), { 
        old_name: oldName, 
        new_name: newNameWithExtension 
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
    setFileToDelete(filename);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(getApiUrl('EXTRACTION', `/api/extraction/delete-csv/${fileToDelete}`));
      setMessage(`CSV file '${fileToDelete}' deleted successfully`);
      fetchCsvFiles();
      if (selectedCsvFile === fileToDelete) {
        setSelectedCsvFile('');
      }
    } catch (error) {
      console.error('Error deleting CSV file:', error);
      setMessage('Error deleting CSV file. Please try again.');
    }
    setDeleteConfirmOpen(false);
    setFileToDelete(null);
  };

  const handlePreviewClick = async (filename) => {
    try {
      setSelectedCsvFile(filename);
      const response = await axios.get(getApiUrl('EXTRACTION', `/api/extraction/csv-preview/${filename}`));
      setPreviewData(response.data);
      setPreviewOpen(true);
    } catch (error) {
      setError(`Error loading preview: ${error.message}`);
    }
  };

  const handleMetadataClick = async (filename) => {
    try {
      const csvFiles = await axios.get(getApiUrl('EXTRACTION', '/api/extraction/csv-files/'));
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
            
            {/* Folder Navigation with flexShrink: 0 */}
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
                              {/* Add a visual separator between folders and non-folders */}
                              {index > 0 && 
                               sortedFiles[index].type !== 'folder' && 
                               sortedFiles[index - 1].type === 'folder' && (
                                <TableRow>
                                  <TableCell colSpan={4} style={{ padding: '4px 0', backgroundColor: '#f5f5f5' }} />
                                </TableRow>
                              )}
                              <TableRow 
                                hover
                                selected={selectedFiles.includes(currentFolder ? `${currentFolder}/${file.name}` : file.name)}
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
                                      checked={selectedFiles.includes(currentFolder ? `${currentFolder}/${file.name}` : file.name)}
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
            
            {/* Input and button section with flexShrink: 0 */}
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
              <Button 
                onClick={handleExtract}
                disabled={isExtracting || selectedFiles.length === 0 || !csvFilename.trim()}
                variant="contained"
                color="primary"
                style={{ marginTop: '20px', marginBottom: '30px' }}
              >
                {isExtracting ? 'Extracting...' : 'Start Extraction'}
                {isExtracting && (
                  <CircularProgress 
                    size={24} 
                    style={{ marginLeft: '10px', color: 'white' }} 
                  />
                )}
              </Button>
            </div>

            {/* CSV Files section with flex: 1 and overflow */}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the CSV file "{fileToDelete}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="secondary">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
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
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                },
                { 
                  field: 'type', 
                  headerName: 'Type', 
                  flex: 1,
                  renderCell: (params) => (
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.5' }}>
                      {params.value}
                    </div>
                  )
                }
              ]}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              getRowHeight={() => 'auto'}
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

      {/* Metadata Dialog */}
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