import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Checkbox,
  Toolbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Snackbar,
  useTheme
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  CloudUpload as UploadIcon,
  Visibility as ViewIcon,
  Description as FileIcon,
  Folder as FolderIcon,
  CreateNewFolder as CreateFolderIcon,
  ArrowBack as ArrowBackIcon,
  DragIndicator as DragIcon,
  Reply as MoveUpIcon,
} from '@material-ui/icons';
import FilePreview from './FilePreview';
import axios from 'axios';
import { getApiUrl } from '../config';
import { useDocumentLibrary, ACTIONS } from '../contexts/DocumentLibraryContext';
import { StyledContainer, GradientBorderPaper, useContainerStyles, GradientText } from '../styles/StyledComponents';
import { DeleteButton, DownloadButton, EditButton, ViewButton } from '../styles/ActionButtons';

const SECURITY_CLASSIFICATIONS = [
  "SELECT A CLASSIFICATION",
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

const getFileNameWithoutExtension = (fileName) => {
  if (!fileName) return '';
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex === -1 ? fileName : fileName.substring(0, lastDotIndex);
};

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    overflow: 'visible',
  },
  gridContainer: {
    flexWrap: 'nowrap',
  },
  leftColumn: {
    width: '25%',
    minWidth: '300px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    overflowY: 'auto',
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible',
    gap: theme.spacing(2),
  },
  paperSection: {
    padding: theme.spacing(2.5),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 'bold',
    color: theme.custom.gradients.gradient1,
    fontSize: '2rem',
  },
  tipsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  tipItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
  },
  tipBullet: {
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    marginTop: theme.spacing(0.5),
  },
  fileListPaper: {
    flex: '1 1 35%',
    minHeight: 800,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fileListHeader: {
    padding: theme.spacing(2, 2.5),
  },
  breadcrumbsContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    justifyContent: 'space-between',
  },
  breadcrumbLink: {
    cursor: 'pointer',
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create('background-color'),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  dragTipToolbar: {
    backgroundColor: theme.palette.info.main + '14',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1, 2),
    marginBottom: theme.spacing(2),
    minHeight: '48px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dragTipTextContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  bulkActionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  tableContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    position: 'relative',
  },
  table: {
    minWidth: 650,
    tableLayout: 'fixed',
  },
  tableHeadCell: {
     backgroundColor: theme.palette.primary.main,
     color: theme.palette.primary.contrastText,
     fontWeight: 'bold',
  },
  tableRowHighlight: {
    backgroundColor: `${theme.palette.error.main}33 !important`,
    border: `2px solid ${theme.palette.error.main} !important`,
  },
  tableRowDropTarget: {
     backgroundColor: theme.palette.action.selected,
  },
  classificationSelect: {
    width: '100%',
    borderRadius: theme.shape.borderRadius,
  },
  actionCell: {
     display: 'flex',
     gap: theme.spacing(0.5),
  },
  filePreviewPaper: {
    flex: '1 1 65%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  emptyPreview: {
    padding: theme.spacing(4),
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1.5),
    color: theme.palette.text.secondary,
    flexGrow: 1,
  },
  emptyPreviewIcon: {
     fontSize: 48,
     opacity: 0.5,
  },
  errorBoundary: {
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: theme.palette.error.light + '33',
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(3),
    border: `1px solid ${theme.palette.error.main}`,
  },
  errorBoundaryButton: {
    marginTop: theme.spacing(2),
  },
}));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DocumentLibrary Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'rgba(234, 67, 53, 0.1)',
          borderRadius: 1,
          m: 3,
          border: '1px solid',
          borderColor: 'error.main'
        }}>
          <Typography variant="h5" color="error" gutterBottom>Something went wrong.</Typography>
          <Typography variant="body1" color="textSecondary" paragraph>{this.state.error?.message}</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

function DocumentLibrary() {
  const { state, dispatch } = useDocumentLibrary();
  const classes = useStyles();
  const theme = useTheme();
  const containerClasses = useContainerStyles();
  const [audioDragOver, setAudioDragOver] = useState(false);

  const draggedItem = state?.draggedItem;
  const dropTarget = state?.dropTarget;

  const tableContainerRef = useRef(null);
  
  const documents = state?.documents || [];
  const selectedDocs = state?.selectedDocs || [];
  const previewFile = state?.previewFile;
  const dragOver = state?.dragOver;
  const isLoading = state?.isLoading;
  const isRefreshing = state?.isRefreshing;
  const operationProgress = state?.operationProgress;
  const error = state?.error;
  const openConfirmDialog = state?.openConfirmDialog;
  const currentPath = state?.currentPath;
  const newFolderDialogOpen = state?.newFolderDialogOpen;
  const newFolderName = state?.newFolderName;
  const breadcrumbs = state?.breadcrumbs;
  const renameDialogOpen = state?.renameDialogOpen;
  const itemToRename = state?.itemToRename;
  const newName = state?.newName;

  const lastDragProcessTimeRef = useRef(0);
  const currentDragHandlerRef = useRef(null);
  const draggedItemRef = useRef(null);

  const cleanupDragOperationRef = useRef(null);

  const fetchDocuments = useCallback(async (path) => {
    if (state?.isRefreshing) {
      return;
    }

    try {
      dispatch({ type: ACTIONS.SET_IS_REFRESHING, payload: true });
      const response = await fetch(getApiUrl('UPLOAD', `/api/upload/files/?folder=${encodeURIComponent(path || '')}`));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Received non-array data:', data);
        throw new Error('Invalid response format: expected an array');
      }
      
      const processedDocuments = data.map(doc => ({
        ...doc,
        isFolder: doc.type === 'folder',
        id: doc.path,
        securityClassification: doc.security_classification || doc.securityClassification || 'SELECT A CLASSIFICATION'
      }));
      
      const sortedDocuments = processedDocuments.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        
        return a.name.localeCompare(b.name);
      });
      
      dispatch({ 
        type: ACTIONS.SET_DOCUMENTS, 
        payload: sortedDocuments
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to fetch documents: ' + error.message });
      dispatch({ type: ACTIONS.SET_DOCUMENTS, payload: [] });
    } finally {
      dispatch({ type: ACTIONS.SET_IS_REFRESHING, payload: false });
    }
  }, [state?.isRefreshing, dispatch]);

  useEffect(() => {
    if (state?.currentPath !== undefined) {
      fetchDocuments(state.currentPath);
    }
  }, [state?.currentPath]);

  const setSelectedDocs = (docs) => dispatch({ type: ACTIONS.SET_SELECTED_DOCS, payload: docs });
  const setPreviewFile = (file) => dispatch({ type: ACTIONS.SET_PREVIEW_FILE, payload: file });
  const setDragOver = (isDragOver) => dispatch({ type: ACTIONS.SET_DRAG_OVER, payload: isDragOver });
  const setIsLoading = (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  const setError = (err) => dispatch({ type: ACTIONS.SET_ERROR, payload: err });
  const setOpenConfirmDialog = (open) => dispatch({ type: ACTIONS.SET_OPEN_CONFIRM_DIALOG, payload: open });
  const setCurrentPath = (path) => dispatch({ type: ACTIONS.SET_CURRENT_PATH, payload: path });
  const setNewFolderDialogOpen = (open) => dispatch({ type: ACTIONS.SET_CREATE_FOLDER_DIALOG_OPEN, payload: open });
  const setNewFolderName = (name) => dispatch({ type: ACTIONS.SET_NEW_FOLDER_NAME, payload: name });
  const setBreadcrumbs = (crumbs) => dispatch({ type: ACTIONS.SET_BREADCRUMBS, payload: crumbs });
  const setRenameDialogOpen = (open) => dispatch({ type: ACTIONS.SET_RENAME_DIALOG_OPEN, payload: open });
  const setItemToRename = (item) => dispatch({ type: ACTIONS.SET_ITEM_TO_RENAME, payload: item });
  const setNewName = (name) => dispatch({ type: ACTIONS.SET_NEW_NAME, payload: name });
  const setDraggedItem = (item) => dispatch({ type: ACTIONS.SET_DRAGGED_ITEM, payload: item });
  const setDropTarget = (target) => dispatch({ type: ACTIONS.SET_DROP_TARGET, payload: target });
  const setOperationProgress = (progress) => {
    const formattedProgress = typeof progress === 'string' 
      ? { status: progress, processed_items: undefined, total_items: undefined }
      : progress;
      
    dispatch({ type: ACTIONS.SET_OPERATION_PROGRESS, payload: formattedProgress });
  };

  const handleFileUploadDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleFileUploadDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileUploadDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const uploadFiles = async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('folder', currentPath);

    try {
      setOperationProgress({
        status: `Uploading ${files.length} file(s)...`,
        processed_items: 0,
        total_items: files.length
      });

      const response = await fetch(getApiUrl('UPLOAD', '/api/upload/upload/'), {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      console.log('Upload response:', results);
      
      if (results.status === 'error') {
        console.error('Failed to upload:', results.message);
        setError('Failed to upload: ' + results.message);
        return;
      }

      let statusMessage;
      if (results.status === 'success') {
        statusMessage = `Successfully uploaded ${results.total_uploaded} file(s)`;
      } else if (results.status === 'partial') {
        statusMessage = `Partially successful: Uploaded ${results.total_uploaded} file(s), but ${results.total_failed} failed. Check console for details.`;
        console.log('Failed uploads:', results.errors);
      }

      setOperationProgress({
        status: statusMessage,
        processed_items: results.total_uploaded,
        total_items: results.total_uploaded + (results.total_failed || 0)
      });

      await fetchDocuments(currentPath);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files: ' + error.message);
    }
  };

  const handleAudioDragOver = (e) => {
    e.preventDefault();
    setAudioDragOver(true);
  };

  const handleAudioDragLeave = (e) => {
    e.preventDefault();
    setAudioDragOver(false);
  };

  const handleAudioDrop = async (e) => {
    e.preventDefault();
    setAudioDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await handleAudioFiles(files);
  };

  const handleAudioSelect = async (e) => {
    const files = Array.from(e.target.files);
    await handleAudioFiles(files);
  };

  const handleAudioFiles = async (files) => {
    console.log('Audio files for transcription:', files);
    // TODO: Implement transcription API call here
  };

  const handleDelete = async (item) => {
    try {
      const isFolder = item.type === 'folder';
      
      const confirmMessage = isFolder 
        ? `Are you sure you want to delete the folder "${item.name}" and all its contents? This action cannot be undone.`
        : `Are you sure you want to delete the file "${item.name}"? This action cannot be undone.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const endpoint = isFolder 
        ? getApiUrl('UPLOAD', `/api/upload/delete_folder/${encodeURIComponent(item.path)}`)
        : getApiUrl('UPLOAD', `/api/upload/files/${encodeURIComponent(item.path)}`);

      await axios.delete(endpoint);
      
      fetchDocuments(currentPath);
      
      setOperationProgress(`Successfully deleted ${isFolder ? 'folder' : 'file'}: ${item.name}`);
    } catch (error) {
      console.error('Error deleting:', error);
      setError(`Error deleting ${item.type}: ${error.message}`);
    }
  };

  const handlePreview = (document) => {
    setPreviewFile(document);
  };

  const handleDownload = async (fileItem) => {
    try {
      const encodedPath = fileItem.path.split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      
      const response = await fetch(getApiUrl('UPLOAD', `/api/upload/files/${encodedPath}`));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleFileUpdate = (filePath) => {
    fetchDocuments(filePath);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      setSelectedDocs(documents.map(doc => doc.id));
    } else {
      setSelectedDocs([]);
    }
  };

  const handleSelectDoc = (docId) => {
    const currentSelected = Array.isArray(selectedDocs) ? selectedDocs : [];
    if (currentSelected.includes(docId)) {
      setSelectedDocs(currentSelected.filter(id => id !== docId));
    } else {
      setSelectedDocs([...currentSelected, docId]);
    }
  };

  const isSelected = (docId) => {
    const currentSelected = Array.isArray(selectedDocs) ? selectedDocs : [];
    return currentSelected.includes(docId);
  };

  const handleBulkDelete = async () => {
    try {
      const selectedItems = documents.filter(doc => selectedDocs.includes(doc.id));
      
      if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items? This action cannot be undone.`)) {
        return;
      }
      
      const filePaths = [...new Set(selectedItems.map(item => item.path))];
      
      await axios.post(getApiUrl('UPLOAD', '/api/upload/bulk-delete/'), {
        filenames: filePaths
      });
      
      setSelectedDocs([]);
      fetchDocuments(currentPath);
      
      setOperationProgress(`Successfully deleted ${filePaths.length} items`);
    } catch (error) {
      console.error('Error performing bulk delete:', error);
      setError(`Error performing bulk delete: ${error.message}`);
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedDocs.length) return;
    
    try {
        setIsLoading(true);
        const response = await fetch(getApiUrl('UPLOAD', '/api/upload/bulk-download/'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filenames: selectedDocs,
                current_folder: currentPath
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents_${new Date().toISOString()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Error in bulk download:', error);
        setError('Failed to download documents: ' + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    try {
      const response = await fetch(getApiUrl('UPLOAD', '/api/upload/create_folder/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_folder: currentPath
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments(currentPath);
      setNewFolderDialogOpen(false);
      setNewFolderName("");
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder: ' + error.message);
    }
  };

  const handleFolderClick = (item) => {
    if (!item.isFolder) return;
    
    const folderPath = item.path;
    console.log('Navigating to folder:', folderPath);
    setCurrentPath(folderPath);
    updateBreadcrumbs(folderPath);
    setSelectedDocs([]);
  };

  const updateBreadcrumbs = (folderPath) => {
    const pathParts = folderPath ? folderPath.split('/').filter(Boolean) : [];
    const newBreadcrumbs = [{ name: "Root", path: "" }];
    let currentPath = "";

    pathParts.forEach(part => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      newBreadcrumbs.push({
        name: part,
        path: currentPath
      });
    });

    setBreadcrumbs(newBreadcrumbs);
  };

  const handleNavigateBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/');
    setCurrentPath(newPath);
    updateBreadcrumbs(newPath);
    setSelectedDocs([]);
  };

  const handleRename = async () => {
    try {
      const extension = itemToRename.isFolder ? '' : itemToRename.name.substring(itemToRename.name.lastIndexOf('.'));
      const fullNewName = itemToRename.isFolder ? newName : `${newName}${extension}`;

      const endpoint = itemToRename.isFolder ? '/api/upload/rename_folder/' : '/api/upload/rename_file/';
      const response = await fetch(getApiUrl('UPLOAD', endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_name: itemToRename.name,
          new_name: fullNewName,
          folder: currentPath,
          update_metadata: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments(currentPath);
      setRenameDialogOpen(false);
      setItemToRename(null);
      setNewName("");

      setOperationProgress(`Successfully renamed ${itemToRename.isFolder ? 'folder' : 'file'} to ${fullNewName}`);
    } catch (error) {
      console.error('Error renaming item:', error);
      setError('Failed to rename item: ' + error.message);
    }
  };

  const cleanupDragOperation = useCallback(() => {
      document.removeEventListener('dragend', cleanupDragHandler, { once: true });
      document.body.removeEventListener('dragend', cleanupDragHandler, { once: true });
      document.body.removeEventListener('drop', cleanupDragHandler, { once: true });

      setDraggedItem(null);
      draggedItemRef.current = null;
      setDropTarget(null);
  }, [setDraggedItem, setDropTarget]);

  cleanupDragOperationRef.current = cleanupDragOperation;

  const cleanupDragHandler = () => {
      if (cleanupDragOperationRef.current) {
          cleanupDragOperationRef.current();
      }
  };

  const handleDragStart = (e, item) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';

    document.removeEventListener('dragend', cleanupDragHandler);
    document.body.removeEventListener('dragend', cleanupDragHandler);
    document.body.removeEventListener('drop', cleanupDragHandler);

    const itemsToDrag = selectedDocs.includes(item.id) ?
      documents.filter(doc => selectedDocs.includes(doc.id)) :
      [item];

    draggedItemRef.current = itemsToDrag;
    setDraggedItem(itemsToDrag);

    const dragImage = document.createElement('div');
    dragImage.className = 'drag-image';
    const dragText = itemsToDrag.length > 1 ? 
      `Moving ${itemsToDrag.length} items` : 
      item.name;
    
    dragImage.innerHTML = `
      <div style="
        padding: 8px 16px;
        background: white;
        border: 2px solid #1976d2;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #1976d2;
        font-size: 14px;
        white-space: nowrap;
      ">
        ${itemsToDrag.length > 1 ? '<span>📦</span>' : item.isFolder ? '<span>📁</span>' : '<span>📄</span>'}
        ${dragText}
      </div>
    `;

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 10, 10);
    setTimeout(() => {
        if (document.body.contains(dragImage)) {
             document.body.removeChild(dragImage);
        }
    }, 0);

    document.addEventListener('dragend', cleanupDragHandler, { once: true });
    document.body.addEventListener('dragend', cleanupDragHandler, { once: true });
    document.body.addEventListener('drop', cleanupDragHandler, { once: true });

    setTimeout(() => {
      if (state?.draggedItem || draggedItemRef.current) {
        if (cleanupDragOperationRef.current) {
            cleanupDragOperationRef.current();
        }
      }
    }, 30000);
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDraggedItem = draggedItemRef.current;
    cleanupDragOperationRef.current();

    if (!currentDraggedItem || !targetFolder?.isFolder ||
        (Array.isArray(currentDraggedItem) ? currentDraggedItem.some(item => item.id === targetFolder.id) : currentDraggedItem.id === targetFolder.id)) {
      return;
    }

    try {
      const sourcePaths = Array.isArray(currentDraggedItem) ?
        currentDraggedItem.map(item => item.path) :
        [currentDraggedItem.path];

      const response = await fetch(getApiUrl('UPLOAD', '/api/upload/move-file/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_paths: sourcePaths,
          target_folder: targetFolder.path
        })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.detail.message || 
            errorData.detail || 
            `HTTP error! status: ${response.status}`
          );
        } catch (jsonError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();
      await fetchDocuments(currentPath);
      
      if (result.results && result.results.failed && result.results.failed.length > 0) {
        const failedCount = result.results.failed.length;
        const successCount = result.results.successful.length;
        setOperationProgress({
          status: `Partially successful: Moved ${successCount} item(s), but ${failedCount} failed. Check console for details.`,
          processed_items: undefined,
          total_items: undefined
        });
        console.log('Failed moves:', result.results.failed);
      } else {
        setOperationProgress(`Successfully moved ${sourcePaths.length} item(s) to ${targetFolder.name}`);
      }
    } catch (error) {
      console.error('Error moving items:', error);
      setError(`Error moving items: ${error.message}`);
    }
  };

  const handleBreadcrumbDrop = async (e, crumb) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDraggedItem = draggedItemRef.current;
    cleanupDragOperationRef.current();

    if (!currentDraggedItem) return;

    try {
      const sourcePaths = Array.isArray(currentDraggedItem) ?
        currentDraggedItem.map(item => item.path) :
        [currentDraggedItem.path];

      const response = await fetch(getApiUrl('UPLOAD', '/api/upload/move-file/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_paths: sourcePaths,
          target_folder: crumb.path
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await fetchDocuments(currentPath);
      setOperationProgress(`Successfully moved ${sourcePaths.length} item(s) to ${crumb.name}`);
    } catch (error) {
      console.error('Error moving items:', error);
      setError(`Error moving items: ${error.message}`);
    }
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDraggedItem = draggedItemRef.current;

    if (item?.isFolder && currentDraggedItem) {
      const isDifferentItem = Array.isArray(currentDraggedItem) ?
        !currentDraggedItem.some(drag => drag.id === item.id) :
        currentDraggedItem.id !== item.id;

      if (isDifferentItem) {
        setDropTarget(item);
      }
    }
  };

  const handleDragLeave = (e, item) => {
    const relatedTarget = e.relatedTarget;
    if (!e.currentTarget.contains(relatedTarget)) {
        if (dropTarget?.id === item?.id) {
            setDropTarget(null);
        }
    }
  };

  const handleMoveToParent = async () => {
    if (!selectedDocs.length || !currentPath) return;
    
    try {
      setIsLoading(true);
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      
      const response = await fetch(getApiUrl('UPLOAD', '/api/upload/move-file/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_paths: selectedDocs,
          target_folder: parentPath
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments(parentPath);
      await updateBreadcrumbs(parentPath);
      await setCurrentPath(parentPath);
      setSelectedDocs([]);
    } catch (error) {
      console.error('Error moving items:', error);
      setError('Failed to move items: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreadcrumbClick = (path) => {
    if (path === "") {
      setCurrentPath("");
      setBreadcrumbs([{ name: "Root", path: "" }]);
    } else {
      setCurrentPath(path);
      updateBreadcrumbs(path);
    }
    setSelectedDocs([]);
  };

  const handleBreadcrumbDragOver = (e, crumb) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleBreadcrumbDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClassificationChange = async (item, newClassification) => {
    try {
      const response = await axios.post(getApiUrl('UPLOAD', '/api/upload/update-security/'), {
        filename: item.path,
        security_classification: newClassification
      });

      if (response.status === 200) {
        await fetchDocuments(currentPath);
        
        setOperationProgress({
          status: `Successfully updated classification for ${item.name}`,
          processed_items: undefined,
          total_items: undefined
        });
      }
    } catch (error) {
      console.error('Error updating classification:', error);
      setError(`Error updating classification: ${error.message}`);
    }
  };

  useEffect(() => {
    return () => {
      if (cleanupDragOperationRef.current) {
         cleanupDragOperationRef.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <StyledContainer maxWidth={false} className={classes.root}>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item className={classes.leftColumn}>
            <GradientText sx={{ mt: 3, mb: 2, display: 'block', textAlign: 'center' }}>
              <Typography variant="h1" fontWeight="600" fontSize={'5rem'} gutterBottom sx={{ mb: 0 }}>
                Document Library
              </Typography>
            </GradientText>

            <GradientBorderPaper elevation={2} className={classes.paperSection}>
            <GradientText sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Upload Documents
              </Typography>
              </GradientText>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Add new PDF, DOCX, or TXT documents to the library
              </Typography>

              <Box className={`${containerClasses.dropzone} ${dragOver ? 'active' : ''}`} onDragOver={handleFileUploadDragOver} onDragLeave={handleFileUploadDragLeave} onDrop={handleFileUploadDrop} sx={{ my: 2.5, p: 2.5 }}>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload">
                  <Button
                    component="span"
                    variant="contained"
                    color="primary"
                    startIcon={<UploadIcon />}
                  >
                    Upload Files
                  </Button>
                </label>
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  or drag and drop PDF, DOCX, or TXT files here
                </Typography>
              </Box>
            </GradientBorderPaper>

            <GradientBorderPaper elevation={2} className={classes.paperSection}>
              <GradientText sx={{ mt: 1, display: 'block', textAlign: 'center'}}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  Audio Transciption
                </Typography>
              </GradientText>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Upload audio files for transcription. Supported formats: m4a, mp3, webm, mp4, mpga, wav, mpeg.
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
                When processing is complete, a PDF transcription of your audio file will appear in the document library.
              </Typography>
              <Box className={`${containerClasses.dropzone} ${audioDragOver ? 'active' : ''}`}
                   onDragOver={handleAudioDragOver}
                   onDragLeave={handleAudioDragLeave}
                   onDrop={handleAudioDrop}
                   sx={{ my: 2.5, p: 2.5 }}>
                <input
                  type="file"
                  id="audio-upload"
                  multiple
                  accept=".m4a,.mp3,.webm,.mp4,.mpga,.wav,.mpeg"
                  style={{ display: 'none' }}
                  onChange={handleAudioSelect}
                />
                <label htmlFor="audio-upload">
                  <Button component="span" variant="contained" color="primary" startIcon={<UploadIcon />}>
                    Upload Audio
                  </Button>
                </label>
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  or drag and drop m4a, mp3, webm, mp4, mpga, wav, mpeg audio files here
                </Typography>
              </Box>
            </GradientBorderPaper>

            <GradientBorderPaper elevation={2} className={classes.paperSection}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Document Preparation Tips
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                For optimal data extraction and fine-tuning results:
              </Typography>
              <ul className={classes.tipsList}>
                {[
                  "Remove headers, footers, and page numbers that don't contribute to the content",
                  "Clean up any OCR artifacts or scanning errors in the text",
                  "Ensure proper paragraph breaks and formatting consistency",
                  "Remove any irrelevant tables, figures, or references that might confuse the model",
                  "Break long documents into logical, topic-based sections",
                  "Standardize formatting of dates, numbers, and special characters",
                  "Remove any sensitive or classified information not intended for training",
                ].map((tip, index) => (
                  <li key={index} className={classes.tipItem}>
                    <span className={classes.tipBullet}>•</span>
                    <Typography variant="body2">{tip}</Typography>
                  </li>
                ))}
              </ul>
            </GradientBorderPaper>
          </Grid>

          <Grid item className={classes.rightColumn}>
            <GradientBorderPaper elevation={3} className={classes.fileListPaper}>
              <Box className={classes.fileListHeader}>
                <Box className={classes.breadcrumbsContainer}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {currentPath && (
                      <Tooltip title="Go to Parent Folder">
                        <IconButton onClick={handleNavigateBack} size="small" sx={{ mr: 1 }}>
                          <ArrowBackIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Breadcrumbs aria-label="breadcrumb">
                      {breadcrumbs.map((crumb, index) => (
                        <Link
                          key={index}
                          component="button"
                          onClick={() => handleBreadcrumbClick(crumb.path)}
                          underline="hover"
                          color={index === breadcrumbs.length - 1 ? 'textPrimary' : 'inherit'}
                          onDragOver={(e) => handleBreadcrumbDragOver(e, crumb)}
                          onDragLeave={handleBreadcrumbDragLeave}
                          onDrop={(e) => handleBreadcrumbDrop(e, crumb)}
                          className={classes.breadcrumbLink}
                        >
                          {crumb.name || "Root"}
                        </Link>
                      ))}
                    </Breadcrumbs>
                  </Box>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<CreateFolderIcon />}
                    onClick={() => setNewFolderDialogOpen(true)}
                  >
                    Create Folder
                  </Button>
                </Box>
              </Box>

              <Toolbar className={classes.dragTipToolbar}>
                <Box className={classes.dragTipTextContainer}>
                  <DragIcon color="primary" />
                  <Typography variant="body2" color="textPrimary">
                    Tip: Drag and drop items to move them into folders or use breadcrumbs.
                  </Typography>
                </Box>

                <Box className={classes.bulkActionsContainer}>
                  <Typography color="textSecondary" variant="subtitle2" sx={{ mr: 1 }}>
                    {selectedDocs.length || 0} selected
                  </Typography>
                  {currentPath && (
                    <Tooltip title="Move Selected to Parent Folder">
                      <span>
                        <IconButton
                          onClick={handleMoveToParent}
                          disabled={!selectedDocs.length}
                          size="small"
                        >
                          <MoveUpIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <DownloadButton
                     onClick={handleBulkDownload}
                     tooltip="Download Selected"
                     disabled={!selectedDocs.length}
                     size="small"
                   />
                   <DeleteButton
                     onClick={handleBulkDelete}
                     tooltip="Delete Selected"
                     disabled={!selectedDocs.length}
                     size="small"
                   />
                </Box>
              </Toolbar>

              <TableContainer ref={tableContainerRef} className={classes.tableContainer}>
                {(isLoading) && (
                  <Box sx={{ }}>
                    <CircularProgress />
                     <Typography sx={{ mt: 1 }}>Zipping files...</Typography>
                  </Box>
                )}
                 {isRefreshing && !isLoading && (
                    <Box sx={{ }}>
                        <CircularProgress size={24} />
                        <Typography sx={{ ml: 1 }}>Loading...</Typography>
                    </Box>
                 )}

                <Table className={classes.table} size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ width: '60px', ...classes.tableHeadCell }}>
                        <Checkbox
                          indeterminate={selectedDocs.length > 0 && selectedDocs.length < documents.length}
                          checked={documents.length > 0 && selectedDocs.length === documents.length}
                          onChange={handleSelectAllClick}
                          color="primary"
                          sx={{ color: theme.palette.primary.contrastText }}
                        />
                      </TableCell>
                      <TableCell sx={{ width: '40%', ...classes.tableHeadCell }}>Name</TableCell>
                      <TableCell sx={{ width: '25%', ...classes.tableHeadCell }}>Classification</TableCell>
                      <TableCell sx={{ width: '10%', ...classes.tableHeadCell }}>Type</TableCell>
                      <TableCell sx={{ width: '10%', ...classes.tableHeadCell }}>Date</TableCell>
                      <TableCell sx={{ width: '15%', ...classes.tableHeadCell }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(documents) && documents.map((item) => {
                       const isItemSelected = isSelected(item.id);
                       const needsClassification = !item.isFolder && item.securityClassification === 'SELECT A CLASSIFICATION';
                       const isDropTarget = dropTarget?.id === item.id;

                       return (
                          <TableRow
                            key={item.id}
                            hover
                            selected={isItemSelected}
                            onClick={(e) => {
                              if (e.target.closest('.checkbox-cell') || 
                                  e.target.closest('.MuiSelect-root') || 
                                  e.target.closest('.actions-cell')) {
                                return;
                              }
                              
                              if (item.isFolder) {
                                handleSelectDoc(item.id);
                              } else {
                                handleSelectDoc(item.id);
                              }
                            }}
                            onDoubleClick={(e) => {
                              if (e.target.closest('.checkbox-cell') || 
                                  e.target.closest('.MuiSelect-root') || 
                                  e.target.closest('.actions-cell')) {
                                return;
                              }
                              
                              if (item.isFolder) {
                                handleFolderClick(item);
                              }
                            }}
                            className={needsClassification ? classes.tableRowHighlight : ''}
                            sx={{
                              cursor: item.isFolder ? 'pointer' : 'default',
                              ...(isDropTarget && classes.tableRowDropTarget),
                              '&.Mui-selected': {
                                 backgroundColor: theme.palette.action.selected + ' !important',
                              },
                              '&.Mui-selected:hover': {
                                 backgroundColor: theme.palette.action.hover + ' !important',
                              }
                            }}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragOver={(e) => handleDragOver(e, item)}
                            onDragLeave={(e) => handleDragLeave(e, item)}
                            onDrop={(e) => handleDrop(e, item)}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isItemSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSelectDoc(item.id);
                                }}
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {item.isFolder ? (
                                  <FolderIcon sx={{ color: '#FFC107' }} />
                                ) : (
                                  <FileIcon />
                                )}
                                <Typography variant="body2" noWrap>
                                   {item.isFolder ? item.name : (item.name ? getFileNameWithoutExtension(item.name) : '')}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                               {!item.isFolder ? (
                                 <Select
                                   value={item.securityClassification || 'SELECT A CLASSIFICATION'}
                                   onChange={(e) => handleClassificationChange(item, e.target.value)}
                                   onClick={(e) => e.stopPropagation()}
                                   variant="outlined"
                                   size="small"
                                   className={classes.classificationSelect}
                                   sx={{
                                     borderColor: needsClassification ? 'error.main' : undefined,
                                     '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: needsClassification ? `${theme.palette.error.main} !important` : undefined,
                                        borderWidth: needsClassification ? '2px !important' : undefined,
                                     },
                                     '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: needsClassification ? `${theme.palette.error.main} !important` : theme.palette.primary.main,
                                        borderWidth: needsClassification ? '2px !important' : undefined,
                                     },
                                     '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: needsClassification ? `${theme.palette.error.main} !important` : undefined,
                                        borderWidth: needsClassification ? '2px !important' : undefined,
                                     }
                                   }}
                                 >
                                   {SECURITY_CLASSIFICATIONS.map((classification) => (
                                     <MenuItem key={classification} value={classification}>
                                       {classification}
                                     </MenuItem>
                                   ))}
                                 </Select>
                               ) : (
                                 <Typography variant="body2" color="textSecondary">N/A</Typography>
                               )}
                            </TableCell>
                            <TableCell>
                               <Typography variant="body2">{item.type}</Typography>
                            </TableCell>
                            <TableCell>
                               <Typography variant="body2">{new Date(item.uploadDate).toLocaleDateString()}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box className={classes.actionCell}>
                                {!item.isFolder && (
                                  <>
                                    <ViewButton
                                      onClick={(e) => { e.stopPropagation(); handlePreview(item); }}
                                      tooltip="Preview File"
                                      size="small"
                                    />
                                    <DownloadButton
                                      onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                      tooltip="Download File"
                                      size="small"
                                    />
                                  </>
                                )}
                                <EditButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToRename(item);
                                    setNewName(item.isFolder ? item.name : (item.name ? getFileNameWithoutExtension(item.name) : ''));
                                    setRenameDialogOpen(true);
                                  }}
                                  tooltip={`Rename ${item.isFolder ? 'Folder' : 'File'}`}
                                  size="small"
                                />
                                <DeleteButton
                                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                  tooltip={`Delete ${item.isFolder ? 'Folder' : 'File'}`}
                                  size="small"
                                />
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                     })}

                    {(!Array.isArray(documents) || documents.length === 0) && !isLoading && !isRefreshing && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body1" color="textSecondary" sx={{ p: 3 }}>
                            No documents or folders found in this location.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </GradientBorderPaper>

            <GradientBorderPaper elevation={1} className={classes.filePreviewPaper}>
              {previewFile ? (
                <FilePreview file={previewFile} onFileUpdate={handleFileUpdate} />
              ) : (
                <Box className={classes.emptyPreview}>
                  <ViewIcon className={classes.emptyPreviewIcon}/>
                  <Typography variant="body1">
                    Select a file and click the <ViewIcon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mx: 0.5 }}/> preview button to view its contents.
                  </Typography>
                </Box>
              )}
            </GradientBorderPaper>
          </Grid>
        </Grid>
      </StyledContainer>

      <Dialog
        open={newFolderDialogOpen}
        onClose={() => setNewFolderDialogOpen(false)}
        aria-labelledby="create-folder-dialog-title"
      >
        <DialogTitle id="create-folder-dialog-title">Create New Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for the new folder in the current directory ({currentPath || 'Root'}).
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="new-folder-name"
            label="Folder Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateFolder(); } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderDialogOpen(false)} color="primary">Cancel</Button>
          <Button onClick={handleCreateFolder} color="primary" variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          setRenameDialogOpen(false);
          setItemToRename(null);
          setNewName("");
        }}
        aria-labelledby="rename-dialog-title"
      >
        <DialogTitle id="rename-dialog-title">Rename {itemToRename?.isFolder ? 'Folder' : 'File'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
             Enter a new name for "{itemToRename?.isFolder ? itemToRename?.name : getFileNameWithoutExtension(itemToRename?.name)}"
             {!itemToRename?.isFolder && (
               <Typography component="span" color="textSecondary">
                 {itemToRename?.name.substring(itemToRename?.name.lastIndexOf('.'))}
               </Typography>
             )}
           </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="rename-name"
            label="New Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRename(); } }}
          />
        </DialogContent>
        <DialogActions>
           <Button onClick={() => {
             setRenameDialogOpen(false);
             setItemToRename(null);
             setNewName("");
           }} color="primary">Cancel</Button>
           <Button onClick={handleRename} color="primary" variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!operationProgress}
        autoHideDuration={4000}
        onClose={() => setOperationProgress(null)}
        message={typeof operationProgress === 'string' ? operationProgress : operationProgress?.status}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
          <Paper sx={{ bgcolor: 'error.main', color: 'error.contrastText', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">{error}</Typography>
          </Paper>
      </Snackbar>

    </ErrorBoundary>
  );
}

export default DocumentLibrary; 