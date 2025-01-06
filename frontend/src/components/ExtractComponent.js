import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';
import CSVPreview from './CSVPreview';
import { getApiUrl } from '../config';
import { Grid, Paper, Button, TextField, Select, MenuItem, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import SaveIcon from '@material-ui/icons/Save';
import CancelIcon from '@material-ui/icons/Cancel';

function ExtractComponent() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [currentFolder, setCurrentFolder] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [csvFilename, setCsvFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedCsvFile, setSelectedCsvFile] = useState('');
  const [newlyCreatedCsvFile, setNewlyCreatedCsvFile] = useState('');
  const [editingCsvFile, setEditingCsvFile] = useState(null);
  const [newCsvFileName, setNewCsvFileName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  useEffect(() => {
    fetchFiles(currentFolder);
    fetchCsvFiles();
  }, [currentFolder]);

  const fetchFiles = (folder) => {
    axios.get(getApiUrl('EXTRACTION', `/api/files/?folder=${folder}`))
      .then(response => {
        setFiles(response.data);
      })
      .catch(error => console.error('Error fetching files:', error));
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

  const handleFolderClick = (folderPath) => {
    setCurrentFolder(prevFolder => {
      const newFolder = prevFolder ? `${prevFolder}/${folderPath}` : folderPath;
      return newFolder;
    });
  };

  const handleBackClick = () => {
    setCurrentFolder(prevFolder => {
      const parentFolder = prevFolder.split('/').slice(0, -1).join('/');
      return parentFolder;
    });
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

    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post(getApiUrl('EXTRACTION', '/api/extraction/extract/'), {
        filenames: selectedFiles,
        csv_filename: csvFilename.trim()
      });
      setMessage(`Extraction process completed.\nCSV file created: ${response.data.csv_file}`);
      response.data.results.forEach(result => {
        setMessage(prev => prev + `\n${result.filename}: ${result.status}`);
      });
      
      setNewlyCreatedCsvFile(response.data.csv_file);
      fetchCsvFiles();
    } catch (error) {
      setMessage('Error extracting content');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
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
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const sortedFiles = React.useMemo(() => {
    let sortableFiles = [...files];
    if (sortConfig.key !== null) {
      sortableFiles.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableFiles;
  }, [files, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleRenameCsvFile = async (oldName, newName) => {
    try {
      await axios.post(getApiUrl('EXTRACTION', '/api/extraction/rename-csv/'), { old_name: oldName, new_name: newName });
      setMessage(`CSV file '${oldName}' renamed to '${newName}' successfully`);
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

  return (
    <Container maxWidth="xl" className="container">
      <h2>Extract Content</h2>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper className="extract-section">
            <h3>Step 1: Select Files for Extraction</h3>
            <p>Current folder: {currentFolder || 'Root'}</p>
            {currentFolder && (
              <Button onClick={handleBackClick} variant="outlined">Back to Parent Folder</Button>
            )}
            
            <div className="file-list">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Upload Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map(file => (
                    <tr key={file.path} className="file-item">
                      <td>
                        {file.type !== 'folder' && (
                          <input
                            type="checkbox"
                            id={file.path}
                            checked={selectedFiles.includes(currentFolder ? `${currentFolder}/${file.path}` : file.path)}
                            onChange={(e) => handleFileSelection(e, file.path)}
                          />
                        )}
                      </td>
                      <td>
                        {file.type === 'folder' ? (
                          <span className="folder" onClick={() => handleFolderClick(file.path)}>{file.name}</span>
                        ) : (
                          <label htmlFor={file.path}>{file.name}</label>
                        )}
                      </td>
                      <td>{file.type}</td>
                      <td>
                        {file.type !== 'folder' && <span className="file-date">{formatDate(file.uploadDate)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="extract-section">
            <h3>Step 2: Review Selected Files</h3>
            {selectedFiles.length > 0 ? (
              <div className="selected-files">
                <ul>
                  {selectedFiles.map(file => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No files selected</p>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper className="extract-section">
            <h3>Step 3: Extract Content</h3>
            <TextField
              fullWidth
              label="Name your Fine-Tuning Dataset"
              helperText="Date will be auto-appended"
              value={csvFilename}
              onChange={(e) => setCsvFilename(e.target.value)}
              variant="outlined"
              className="csv-filename-input"
            />
            <Button 
              className="button"
              variant="contained" 
              onClick={handleExtract} 
              disabled={selectedFiles.length === 0 || !csvFilename.trim() || isLoading}
            >
              {isLoading ? 'Extracting...' : `Extract Selected Files (${selectedFiles.length})`}
            </Button>

            {isLoading && <div className="loading-indicator">Extracting content, please wait...</div>}
            {message && <pre className="message">{message}</pre>}
          </Paper>
        </Grid>
      </Grid>

      {/* CSV Preview section */}
      <Container maxWidth="xl" className="csv-preview-container">
        <Paper className="extract-section">
          <h3>Preview Extracted Content</h3>
          <Select
            value={selectedCsvFile}
            onChange={(e) => setSelectedCsvFile(e.target.value)}
            fullWidth
            variant="outlined"
          >
            <MenuItem value="">Select a CSV file</MenuItem>
            {csvFiles.map(file => (
              <MenuItem key={file.name} value={file.name}>{file.name}</MenuItem>
            ))}
          </Select>
          {selectedCsvFile && <CSVPreview filename={selectedCsvFile} />}
        </Paper>
      </Container>

      {/* Horizontal line */}
      <hr className="section-divider" />

      {/* New section for managing CSV files */}
      <h2>Manage CSV Files</h2>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Actions</TableCell>
              <TableCell>File Name</TableCell>
              <TableCell>Date Created</TableCell>
              <TableCell align="right">Delete</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {csvFiles.map((file) => (
              <TableRow key={file.name}>
                <TableCell>
                  {editingCsvFile === file.name ? (
                    <>
                      <IconButton onClick={() => handleRenameCsvFile(file.name, newCsvFileName)}>
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={() => setEditingCsvFile(null)}>
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton onClick={() => {
                      setEditingCsvFile(file.name);
                      setNewCsvFileName(file.name);
                    }}>
                      <EditIcon />
                    </IconButton>
                  )}
                </TableCell>
                <TableCell component="th" scope="row">
                  {editingCsvFile === file.name ? (
                    <TextField
                      value={newCsvFileName}
                      onChange={(e) => setNewCsvFileName(e.target.value)}
                      fullWidth
                      helperText="File extension will remain .csv"
                    />
                  ) : (
                    file.name
                  )}
                </TableCell>
                <TableCell>{formatDate(file.created_at)}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleDeleteCsvFile(file.name)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the CSV file "{fileToDelete}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ExtractComponent;