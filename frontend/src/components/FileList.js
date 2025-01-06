import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, IconButton, TextField, Typography, Select, MenuItem, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, List, ListItem, ListItemIcon, ListItemText, Tooltip, Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import FolderIcon from '@material-ui/icons/Folder';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import VisibilityIcon from '@material-ui/icons/Visibility'; // New import for preview icon
import GetAppIcon from '@material-ui/icons/GetApp'; // Add this line
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder'; // Add this line
import InfoIcon from '@material-ui/icons/Info';
import SecurityIcon from '@material-ui/icons/Security';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import axios from 'axios';
import '../App.css';
import { getApiUrl } from '../config';

const securityClassifications = [
  "Unclassified",
  "Unclassified//REL TO USA, UK",
  "Unclassified//REL TO USA, FVEY",
  "For Official Use Only (FOUO)",
  "Controlled Unclassified Information (CUI)",
  "Confidential",
  "Confidential//REL TO USA, UK",
  "Confidential//REL TO USA, FVEY",
  "Secret",
  "Secret//NOFORN",
  "Secret//REL TO USA, UK",
  "Secret//REL TO USA, AUS, CAN, NZ (FVEY)",
  "Top Secret",
  "Top Secret//NOFORN",
  "Top Secret//REL TO USA, UK",
  "Top Secret//REL TO USA, FVEY",
  "Top Secret//Sensitive Compartmented Information (TS//SCI)",
  "Top Secret//SCI//NOFORN",
  "Top Secret//SCI//REL TO USA, UK",
  "Top Secret//SCI//REL TO USA, FVEY",
  "Top Secret//Special Access Program (TS//SAP)",
  "Top Secret//SAP//NOFORN",
  "Top Secret//SAP//REL TO USA, UK",
  "Top Secret//SAP//REL TO USA, FVEY",
  "Top Secret//SI (Special Intelligence)",
  "Top Secret//SI//NOFORN",
  "Top Secret//SI//REL TO USA, UK",
  "Top Secret//TK (Talent Keyhole)",
  "Top Secret//TK//NOFORN",
  "Top Secret//TK//REL TO USA, UK",
  "Top Secret//HCS (Human Intelligence Control System)",
  "Top Secret//HCS//NOFORN",
  "Top Secret//HCS//REL TO USA, UK",
  "Top Secret//ORCON (Originator Controlled)",
  "NATO Secret",
  "NATO Secret//REL TO USA, UK",
  "NATO Secret//REL TO USA, FVEY"
];


const useStyles = makeStyles((theme) => ({
  tableContainer: {
    maxHeight: '490px',
    overflow: 'auto',
    backgroundColor: '#f5f5f5',
  },
  stickyHeader: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#e0e0e0',
    zIndex: 1,
    color: '#000000',
    fontWeight: 'bold',
  },
  tableRow: {
    '&:nth-of-type(odd)': {
      backgroundColor: '#ffffff',
    },
    '&:nth-of-type(even)': {
      backgroundColor: '#f0f0f0',
    },
    '&:hover': {
      backgroundColor: '#e8e8e8',
    },
    height: '40px', // Reduce the height of the row
  },
  tableCell: {
    color: '#000000 !important', // Darker text color
    '& *': { color: '#000000 !important' }, // Ensure all child elements have the same color
    padding: '4px 8px', // Reduce padding to make cells more compact
    fontSize: '0.875rem', // Slightly reduce font size
  },
  iconButton: {
    color: '#000000',
    padding: '4px', // Reduce padding for icon buttons
  },
  securitySelect: {
    minWidth: 200,
    color: '#000000',
    maxWidth: 200,
    '& .MuiSelect-select': {
      padding: '4px 8px', // Reduce padding for the select input
    },
  },
  folderIcon: {
    color: '#FFA500 !important',
  },
  fileIcon: {
    color: '#000000 !important',
  },
  folderName: {
    color: '#0000FF !important',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  fileName: {
    color: '#000000 !important',
  },
  securityCell: {
    maxWidth: 200, // Add this style for the security classification cell
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  checkboxCell: {
    width: '40px',
    padding: '0 4px', // Further reduce padding for checkbox cell
  },
  titleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
    backgroundColor: '#f5f5f5',
  },
  titleAndInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#000000',
    fontSize: '1.2rem',
    marginRight: theme.spacing(1), // Add some space between title and info icon
  },
  infoIcon: {
    cursor: 'pointer',
    color: theme.palette.primary.main, // Make the icon more visible
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
  },
  currentFolder: {
    color: '#000000',
    marginLeft: '16px',
  },
  dialogTitle: {
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
  },
  dialogContent: {
    padding: theme.spacing(3),
  },
  listItem: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  listItemIcon: {
    minWidth: 36,
  },
  listItemText: {
    margin: 0,
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  instructionIcon: {
    marginRight: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  instructionText: {
    display: 'flex',
    alignItems: 'center',
  },
}));

const UPLOAD_SERVICE_URL = `${process.env.REACT_APP_API_BASE_URL}:${process.env.REACT_APP_UPLOAD_SERVICE_PORT}`;

function FileList({ 
  files, 
  setFiles,
  onDelete, 
  selectedFiles, 
  setSelectedFiles, 
  onFolderClick, 
  onRenameFolder, 
  onDeleteFolder, 
  onRenameFile, 
  onMoveFile, 
  currentFolder, 
  onNavigateUp, 
  onUpdateSecurity, 
  onPreviewFile, 
  onBulkDelete, 
  onBulkDownload, 
  onCreateFolder 
}) {
  const [localFiles, setLocalFiles] = useState([]);
  const classes = useStyles();
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [sortedFiles, setSortedFiles] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'descending' });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedFolder, setLastClickedFolder] = useState(null);
  const clickTimeoutRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [folderContents, setFolderContents] = useState([]);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);

  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  useEffect(() => {
    let sortableFiles = [...localFiles];
    sortableFiles.sort((a, b) => {
      // First, sort by type (folders first)
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      // If both are folders or both are files, sort by the current sort config
      if (sortConfig.key) {
        if (sortConfig.key === 'securityClassification') {
          const securityOrder = securityClassifications.indexOf(a[sortConfig.key]) - securityClassifications.indexOf(b[sortConfig.key]);
          return sortConfig.direction === 'ascending' ? securityOrder : -securityOrder;
        }
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
      }
      return 0;
    });
    setSortedFiles(sortableFiles);
  }, [localFiles, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedFiles(localFiles.map(file => file.name));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelect = (event, name, type) => {
    event.stopPropagation();
    const selectedIndex = selectedFiles.indexOf(name);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedFiles, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedFiles.slice(1));
    } else if (selectedIndex === selectedFiles.length - 1) {
      newSelected = newSelected.concat(selectedFiles.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedFiles.slice(0, selectedIndex),
        selectedFiles.slice(selectedIndex + 1),
      );
    }

    setSelectedFiles(newSelected);
  };

  const isSelected = (name) => selectedFiles.indexOf(name) !== -1;

  const handleFinishRename = () => {
    if (editingItem && newItemName) {
      if (editingItem.type === 'folder') {
        onRenameFolder(editingItem.name, newItemName);
      } else {
        onRenameFile(editingItem.name, newItemName);
      }
    }
    setEditingItem(null);
    setNewItemName('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'folder':
        return <FolderIcon fontSize="small" className={`${classes.fileIcon} ${classes.folderIcon}`} />;
      case 'pdf':
        return <InsertDriveFileIcon fontSize="small" className={classes.fileIcon} style={{ color: '#FF0000' }} />;
      case 'docx':
        return <InsertDriveFileIcon fontSize="small" className={classes.fileIcon} style={{ color: '#0000FF' }} />;
      case 'txt':
        return <InsertDriveFileIcon fontSize="small" className={classes.fileIcon} style={{ color: '#008000' }} />;
      default:
        return <InsertDriveFileIcon fontSize="small" className={classes.fileIcon} />;
    }
  };

  const getSortIcon = (name) => {
    if (sortConfig.key === name) {
      return sortConfig.direction === 'ascending' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
    }
    return null;
  };

  const handleDragStart = (e, file) => {
    console.log('Drag started', file);
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify(file));
  };

  const handleDragOver = (e) => {
    console.log('Drag over');
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, targetFolder) => {
    console.log('Drop', targetFolder);
    e.preventDefault();
    e.stopPropagation();
    try {
      const droppedFile = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('Dropped file:', droppedFile);
      if (droppedFile.type !== 'folder' && droppedFile.name !== targetFolder.name) {
        onMoveFile(droppedFile, targetFolder);
      }
    } catch (error) {
      console.error('Error parsing dropped file:', error);
    }
  };

  const handleDropToParent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const droppedFile = JSON.parse(e.dataTransfer.getData('application/json'));
      console.log('Dropped file to parent:', droppedFile);
      if (droppedFile && droppedFile.type !== 'folder') {
        onMoveFile(droppedFile, { name: '..', type: 'folder', path: currentFolder.split('/').slice(0, -1).join('/') });
      }
    } catch (error) {
      console.error('Error parsing dropped file for parent:', error);
    }
  };

  const handleSecurityChange = (event, file) => {
    const newSecurity = event.target.value;
    onUpdateSecurity(file.name, newSecurity);
  };

  const handleRowClick = (event, file) => {
    event.stopPropagation();
    const currentTime = new Date().getTime();
    const timeSinceLastClick = currentTime - lastClickTime;

    if (file.type === 'folder') {
      if (file.name === lastClickedFolder && timeSinceLastClick < 300) {
        // Double click on folder
        clearTimeout(clickTimeoutRef.current);
        onFolderClick(file.name);
      } else {
        // Single click on folder
        clickTimeoutRef.current = setTimeout(() => {
          handleSelect(event, file.name, file.type);
        }, 300);
      }
      setLastClickTime(currentTime);
      setLastClickedFolder(file.name);
    } else {
      // For non-folder items, select immediately
      handleSelect(event, file.name, file.type);
    }
  };

  const handleCheckboxClick = (event, file) => {
    event.stopPropagation();
    handleSelect(event, file.name, file.type);
  };

  const handleDeleteClick = async (event, item) => {
    event.stopPropagation();
    setItemToDelete(item);
    if (item.type === 'folder') {
      try {
        const response = await axios.get(`${UPLOAD_SERVICE_URL}/api/upload/files/?folder=${currentFolder ? `${currentFolder}/` : ''}${item.name}`);
        setFolderContents(response.data);
      } catch (error) {
        console.error('Error fetching folder contents:', error);
        setFolderContents([]);
      }
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'folder') {
        onDeleteFolder(itemToDelete.name);
      } else {
        onDelete(itemToDelete.name);
      }
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handlePreviewClick = (event, file) => {
    event.stopPropagation();
    onPreviewFile(file);
  };

  const handleOpenInfoDialog = () => {
    setOpenInfoDialog(true);
  };

  const handleCloseInfoDialog = () => {
    setOpenInfoDialog(false);
  };

  const fileManagementInstructions = [
    { icon: <CreateNewFolderIcon />, text: "Click the 'Create Folder' button to create a new folder in the current directory." },
    { icon: <EditIcon />, text: "Use the rename icon to change the name of a file or folder." },
    { icon: <DeleteIcon />, text: "The delete icon allows you to remove files or folders (use with caution)." },
    { icon: <VisibilityIcon />, text: "Click the preview icon to view the contents of a file." },
    { icon: <DragIndicatorIcon />, text: "Drag and drop files or folders to move them between directories." },
    { icon: <SecurityIcon />, text: "Use the security classification dropdown to set the security level of a file." },
    { icon: <ArrowUpwardIcon />, text: "The 'Parent Folder' option allows you to navigate up one level in the directory structure." },
    { icon: <GetAppIcon />, text: "Use bulk actions for deleting or downloading multiple selected files at once." },
  ];

  const fetchFiles = (folder) => {
    axios.get(getApiUrl('UPLOAD', `/api/upload/files/?folder=${folder}`))
      .then(response => {
        setFiles(response.data);  // Use setFiles from props
      })
      .catch(error => console.error('Error fetching files:', error));
  };

  const handleDeleteFile = async (filename) => {
    try {
      await axios.delete(getApiUrl('UPLOAD', `/api/upload/files/${filename}`));
      // ... (rest of the function)
    } catch (error) {
      // ... (error handling)
    }
  };

  return (
    <Paper>
      <div className={classes.titleContainer}>
        <div className={classes.titleAndInfo}>
          <Typography variant="h6" className={classes.title}>
            File Manager
          </Typography>
          <Tooltip title="File Management Instructions">
            <IconButton className={classes.infoIcon} onClick={handleOpenInfoDialog}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </div>
        <Typography variant="subtitle2" className={classes.currentFolder}>
          Current Folder: {currentFolder || "Root"}
        </Typography>
        <div className={classes.actionButtons}>
          <Tooltip title="Delete Selected">
            <span>
              <IconButton
                onClick={onBulkDelete}
                disabled={selectedFiles.length === 0}
              >
                <DeleteIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download Selected">
            <span>
              <IconButton
                onClick={onBulkDownload}
                disabled={selectedFiles.length === 0}
              >
                <GetAppIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Create Folder">
            <IconButton onClick={onCreateFolder}>
              <CreateNewFolderIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell} ${classes.checkboxCell}`}>
                <Checkbox
                  indeterminate={selectedFiles.length > 0 && selectedFiles.length < localFiles.length}
                  checked={localFiles.length > 0 && selectedFiles.length === localFiles.length}
                  onChange={handleSelectAll}
                  size="small" // Make checkbox smaller
                />
              </TableCell>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell}`}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => requestSort('name')}>
                  Name {getSortIcon('name')}
                </div>
              </TableCell>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell}`}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => requestSort('type')}>
                  Type {getSortIcon('type')}
                </div>
              </TableCell>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell}`}>Size</TableCell>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell}`}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => requestSort('uploadDate')}>
                  Upload Date {getSortIcon('uploadDate')}
                </div>
              </TableCell>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell}`}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => requestSort('securityClassification')}>
                  Security Classification {getSortIcon('securityClassification')}
                </div>
              </TableCell>
              <TableCell className={`${classes.stickyHeader} ${classes.tableCell}`}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentFolder && (
              <TableRow
                className={classes.tableRow}
                onDragOver={handleDragOver}
                onDrop={handleDropToParent}
              >
                <TableCell colSpan={7} className={classes.tableCell}>
                  <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={onNavigateUp}>
                    <ArrowUpwardIcon fontSize="small" className={classes.iconButton} />
                    <span style={{ marginLeft: '5px' }} className={classes.folderName}>Parent Folder</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {sortedFiles.map((file) => {
              const isItemSelected = isSelected(file.name);
              return (
                <TableRow
                  key={file.name}
                  selected={isItemSelected}
                  onClick={(event) => handleRowClick(event, file)}
                  draggable={file.type !== 'folder'}
                  onDragStart={(e) => handleDragStart(e, file)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => file.type === 'folder' && handleDrop(e, file)}
                  className={classes.tableRow}
                >
                  <TableCell padding="checkbox" onClick={(event) => handleCheckboxClick(event, file)} className={`${classes.tableCell} ${classes.checkboxCell}`}>
                    <Checkbox 
                      checked={isItemSelected}
                      onChange={(event) => handleCheckboxClick(event, file)}
                      size="small" // Make checkbox smaller
                    />
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {getFileIcon(file.type)}
                      <span className={file.type === 'folder' ? classes.folderName : classes.fileName}>
                        {file.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={classes.tableCell}>{file.type === 'folder' ? 'Folder' : file.type.toUpperCase()}</TableCell>
                  <TableCell className={classes.tableCell}>{file.type === 'folder' ? '-' : formatFileSize(file.size)}</TableCell>
                  <TableCell className={classes.tableCell}>{file.type === 'folder' ? '-' : formatDate(file.uploadDate)}</TableCell>
                  <TableCell className={classes.tableCell}>
                    {file.type !== 'folder' && (
                      <Tooltip title={file.securityClassification || 'Unclassified'}>
                        <div className={classes.securityCell}>
                          <Select
                            value={file.securityClassification || 'Unclassified'}
                            onChange={(e) => handleSecurityChange(e, file)}
                            className={classes.securitySelect}
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                          >
                            {securityClassifications.map((classification) => (
                              <MenuItem key={classification} value={classification}>
                                <Typography noWrap>
                                  {classification}
                                </Typography>
                              </MenuItem>
                            ))}
                          </Select>
                        </div>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {editingItem && editingItem.name === file.name ? (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          style={{ marginRight: '5px' }}
                        />
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleFinishRename(); }} className={classes.iconButton}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingItem(null); }} className={classes.iconButton}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={(event) => { event.stopPropagation(); onRenameFile(file); }} size="small" className={classes.iconButton}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={(event) => handleDeleteClick(event, file)}
                          className={classes.iconButton}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={(event) => handlePreviewClick(event, file)}
                          className={classes.iconButton}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {itemToDelete && itemToDelete.type === 'folder'
              ? <span>
                  Are you sure you want to delete the folder "{itemToDelete.name}" and all its contents?
                  <br />
                  <strong style={{ color: 'red' }}>Warning: This action cannot be undone and will permanently delete all files and subfolders within this folder.</strong>
                </span>
              : <span>
                  Are you sure you want to delete the file "{itemToDelete?.name}"?
                  <br />
                  <strong style={{ color: 'red' }}>Warning: This action cannot be undone.</strong>
                </span>
            }
          </DialogContentText>
          {itemToDelete && itemToDelete.type === 'folder' && folderContents.length > 0 && (
            <List>
              <Typography variant="subtitle1">Folder contents:</Typography>
              {folderContents.map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {item.type === 'folder' ? <FolderIcon /> : <InsertDriveFileIcon />}
                  </ListItemIcon>
                  <ListItemText primary={item.name} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="secondary" autoFocus>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openInfoDialog} onClose={handleCloseInfoDialog} maxWidth="md" fullWidth>
        <DialogTitle className={classes.dialogTitle}>
          <Typography variant="h6" style={{ color: '#ffffff' }}>
            File Management Instructions
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <Typography variant="body1" paragraph>
            Here are some instructions on how to manage your files and folders:
          </Typography>
          <List>
            {fileManagementInstructions.map((instruction, index) => (
              <React.Fragment key={index}>
                <ListItem className={classes.listItem}>
                  <ListItemIcon className={classes.listItemIcon}>
                    {React.cloneElement(instruction.icon, { className: classes.instructionIcon })}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <span className={classes.instructionText}>
                        {instruction.text}
                      </span>
                    } 
                    className={classes.listItemText} 
                  />
                </ListItem>
                {index < fileManagementInstructions.length - 1 && <Divider component="li" className={classes.divider} />}
              </React.Fragment>
            ))}
          </List>
          <Divider className={classes.divider} />
          <Typography variant="body1" paragraph>
            These instructions will help you effectively manage your files and folders within the application.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileList;