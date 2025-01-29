import React, { useEffect, useCallback } from 'react';
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
  Fade,
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
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem,
} from '@material-ui/core';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  Description as FileIcon,
  Folder as FolderIcon,
  CreateNewFolder as CreateFolderIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Reply as MoveUpIcon,
} from '@material-ui/icons';
import FilePreview from './FilePreview';
import axios from 'axios';
import { getApiUrl } from '../config';
import { useDocumentLibrary, ACTIONS } from '../contexts/DocumentLibraryContext';

const API_BASE_URL = 'http://localhost:8000/api';

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

function DocumentLibrary() {
  const { state, dispatch } = useDocumentLibrary();
  
  const {
    documents = [],
    selectedDocs = [],
    previewFile,
    dragOver,
    isLoading,
    isRefreshing,
    operationProgress,
    error,
    openConfirmDialog,
    currentPath,
    newFolderDialogOpen,
    newFolderName,
    breadcrumbs,
    renameDialogOpen,
    itemToRename,
    newName,
    draggedItem,
    dropTarget,
    deleteConfirmOpen,
    fileToDelete,
    deleteContents,
    bulkDeleteDialogOpen,
    bulkDeleteContents
  } = state;

  // Replace all setState calls with dispatch
  const setDocuments = (docs) => dispatch({ type: ACTIONS.SET_DOCUMENTS, payload: docs });
  const setSelectedDocs = (docs) => dispatch({ type: ACTIONS.SET_SELECTED_DOCS, payload: docs });
  const setPreviewFile = (file) => dispatch({ type: ACTIONS.SET_PREVIEW_FILE, payload: file });
  const setDragOver = (isDragOver) => dispatch({ type: ACTIONS.SET_DRAG_OVER, payload: isDragOver });
  const setIsLoading = (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  const setIsRefreshing = (refreshing) => dispatch({ type: ACTIONS.SET_IS_REFRESHING, payload: refreshing });
  const setOperationProgress = (progress) => {
    // Ensure progress has the correct structure
    const formattedProgress = typeof progress === 'string' 
      ? { status: progress, processed_items: undefined, total_items: undefined }
      : { ...progress };
      
    dispatch({ type: ACTIONS.SET_OPERATION_PROGRESS, payload: formattedProgress });
  };
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
  const setDeleteConfirmOpen = (open) => dispatch({ type: ACTIONS.SET_DELETE_CONFIRM_OPEN, payload: open });
  const setFileToDelete = (file) => dispatch({ type: ACTIONS.SET_FILE_TO_DELETE, payload: file });
  const setDeleteContents = (contents) => dispatch({ type: ACTIONS.SET_DELETE_CONTENTS, payload: contents });
  const setBulkDeleteDialogOpen = (open) => dispatch({ type: ACTIONS.SET_BULK_DELETE_DIALOG_OPEN, payload: open });
  const setBulkDeleteContents = (contents) => dispatch({ type: ACTIONS.SET_BULK_DELETE_CONTENTS, payload: contents });

  const fetchDocuments = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`${API_BASE_URL}/documents?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Update default classification
      const docsWithClassification = data.map(doc => ({
        ...doc,
        securityClassification: doc.securityClassification || 'SELECT A CLASSIFICATION'
      }));
      
      setDocuments(docsWithClassification);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents: ' + error.message);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // File Upload Drag and Drop Handlers
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
    formData.append('folder_path', currentPath);

    try {
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      console.log('Upload response:', results); // Debug log
      
      // Update documents list with new files
      const newFiles = results
        .filter(result => result.status === 'success' && result.file_info)
        .map(result => {
          // If this is a converted PDF, use its info
          if (result.converted_pdf) {
            return {
              ...result.file_info,
              isFolder: false,
              type: 'PDF',
              securityClassification: result.file_info.securityClassification || 'SELECT A CLASSIFICATION'
            };
          }
          // For non-converted files, use the original info
          return {
            ...result.file_info,
            isFolder: false,
            type: result.file_info.type || 'FILE',
            securityClassification: result.file_info.securityClassification || 'SELECT A CLASSIFICATION'
          };
        });
      
      if (newFiles.length > 0) {
        setDocuments(prevDocs => {
          // Create a new array with existing documents and new files
          const updatedDocs = [...prevDocs];
          
          // Add or update each new file
          newFiles.forEach(newFile => {
            const existingIndex = updatedDocs.findIndex(doc => doc.id === newFile.id);
            if (existingIndex >= 0) {
              updatedDocs[existingIndex] = newFile;
            } else {
              updatedDocs.push(newFile);
            }
          });
          
          return updatedDocs;
        });
      }
      
      // Log any errors
      const errors = results.filter(result => result.status === 'error');
      if (errors.length > 0) {
        console.error('Some files failed to upload:', errors);
        setError('Some files failed to upload: ' + errors.map(e => e.message).join(', '));
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files: ' + error.message);
    }
  };

  const handleDelete = async (item) => {
    try {
      setFileToDelete(item);
      if (item.type === 'folder') {
        // Fetch folder contents recursively
        const response = await axios.get(
          `${getApiUrl('UPLOAD', '/api/upload/files')}?folder=${encodeURIComponent(item.path)}&recursive=true`
        );
        setDeleteContents(response.data);
      } else {
        setDeleteContents([item]);
      }
      setDeleteConfirmOpen(true);
    } catch (error) {
      console.error('Error setting up delete:', error);
      setOperationProgress({
        status: `Error preparing delete: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    }
  };

  const confirmDelete = async () => {
    try {
      const isFolder = fileToDelete.type === 'folder';
      const endpoint = isFolder ? 
        `${getApiUrl('UPLOAD', '/api/upload/delete_folder')}/${encodeURIComponent(fileToDelete.path)}` : 
        `${getApiUrl('UPLOAD', '/api/upload/files')}/${encodeURIComponent(fileToDelete.path)}`;

      await axios.delete(endpoint);
      
      // Close dialog and refresh file list
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
      fetchDocuments();
      
      // Add success notification
      setOperationProgress({
        status: `Successfully deleted ${isFolder ? 'folder' : 'file'}: ${fileToDelete.name}`,
        processed_items: undefined,
        total_items: undefined
      });
    } catch (error) {
      console.error('Error deleting:', error);
      setOperationProgress({
        status: `Error deleting ${fileToDelete.type}: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    }
  };

  const handlePreview = (document) => {
    setPreviewFile(document);
  };

  const handleDownload = async (fileItem) => {
    try {
      // Properly encode the full path
      const encodedPath = fileItem.path.split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      
      const response = await fetch(`${API_BASE_URL}/documents/${encodedPath}/download`);
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
    // Refresh the document list after a file update
    fetchDocuments();
  };

  // Bulk Selection Handlers
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

  // Update the checkbox checked state with safety check
  const isSelected = (docId) => {
    const currentSelected = Array.isArray(selectedDocs) ? selectedDocs : [];
    return currentSelected.includes(docId);
  };

  // Bulk Action Handlers
  const handleBulkDelete = async () => {
    try {
      // Get full details of selected items
      const selectedItems = documents.filter(doc => selectedDocs.includes(doc.id));
      
      // Initialize array to hold all items to be deleted
      const allContents = [];
      
      // Process each selected item
      for (const item of selectedItems) {
        // Add the item itself first
        allContents.push(item);
        
        // If it's a folder, fetch and add its contents
        if (item.type === 'folder') {
          const response = await axios.get(
            `${getApiUrl('UPLOAD', '/api/upload/files')}?folder=${encodeURIComponent(item.path)}&recursive=true`
          );
          allContents.push(...response.data);
        }
      }
      
      setBulkDeleteContents(allContents);
      setBulkDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error preparing bulk delete:', error);
      setOperationProgress({
        status: `Error preparing bulk delete: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      // Get the paths of all items to be deleted
      const filePaths = bulkDeleteContents.map(item => item.path);
      
      // Remove duplicates in case there's overlap in paths
      const uniquePaths = [...new Set(filePaths)];
      
      // Perform the bulk delete
      await axios.post(`${getApiUrl('UPLOAD', '/api/upload/bulk-delete')}`, {
        filenames: uniquePaths
      });
      
      // Close dialog and refresh
      setBulkDeleteDialogOpen(false);
      setBulkDeleteContents([]);
      setSelectedDocs([]);
      fetchDocuments();
      
      // Show success message
      setOperationProgress({
        status: `Successfully deleted ${uniquePaths.length} items`,
        processed_items: undefined,
        total_items: undefined
      });
    } catch (error) {
      console.error('Error performing bulk delete:', error);
      setOperationProgress({
        status: `Error performing bulk delete: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedDocs.length) return;
    
    try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/documents/bulk-download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documentIds: selectedDocs,
                include_folders: true,
                preserve_structure: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the operation ID from the response header
        const operationId = response.headers.get('X-Operation-ID');
        if (operationId) {
            pollOperationStatus(operationId);
        }

        // Handle the ZIP file download
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

  const pollOperationStatus = async (operationId) => {
    let pollCount = 0;
    const maxPolls = 30; // Maximum number of polls (30 seconds)
    
    const pollInterval = setInterval(async () => {
        try {
            pollCount++;
            const response = await fetch(`${API_BASE_URL}/documents/bulk-operations/${operationId}/status`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const status = await response.json();
            setOperationProgress(status);
            
            if (status.status === 'Completed' || status.status === 'Failed' || pollCount >= maxPolls) {
                clearInterval(pollInterval);
                if (status.status === 'Completed') {
                    console.log('Operation completed, refreshing documents...');
                    await fetchDocuments();
                } else if (status.status === 'Failed') {
                    setError('Operation failed: ' + (status.errors?.join(', ') || 'Unknown error'));
                } else if (pollCount >= maxPolls) {
                    setError('Operation timed out. Please refresh the page to see the latest status.');
                }
                // Reset operation progress after a delay
                setTimeout(() => {
                    setOperationProgress({});
                    setError(null);
                }, 2000);
            }
        } catch (error) {
            console.error('Error polling operation status:', error);
            clearInterval(pollInterval);
            setError('Failed to check operation status. The operation may have completed in the background.');
            // Refresh documents anyway in case the operation succeeded
            await fetchDocuments();
        }
    }, 1000);

    // Clean up interval on component unmount
    return () => {
        clearInterval(pollInterval);
        setOperationProgress({});
        setError(null);
    };
  };

  const handleCreateFolder = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_path: currentPath
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments();
      setNewFolderDialogOpen(false);
      setNewFolderName("");
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder: ' + error.message);
    }
  };

  const handleFolderClick = (item) => {
    const folderPath = item.path;
    setCurrentPath(folderPath);
    updateBreadcrumbs(folderPath);
    // Clear selected files when navigating to a new folder
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
    // Clear selected files when navigating back
    setSelectedDocs([]);
  };

  const handleRename = async () => {
    try {
      const extension = itemToRename.isFolder ? '' : itemToRename.name.substring(itemToRename.name.lastIndexOf('.'));
      const fullNewName = itemToRename.isFolder ? newName : `${newName}${extension}`;

      const response = await fetch(`${API_BASE_URL}/documents/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_path: itemToRename.path,
          new_name: fullNewName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments();
      setRenameDialogOpen(false);
      setItemToRename(null);
      setNewName("");
    } catch (error) {
      console.error('Error renaming item:', error);
      setError('Failed to rename item: ' + error.message);
    }
  };

  const handleDragStart = (e, item) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';

    // If the dragged item is selected, drag all selected items
    // Otherwise, just drag the current item
    const itemsToDrag = selectedDocs.includes(item.id) ? 
      documents.filter(doc => selectedDocs.includes(doc.id)) : 
      [item];

    // Create drag image before setting draggedItem
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
    setTimeout(() => document.body.removeChild(dragImage), 0);

    // Set draggedItem after creating drag image
    setDraggedItem(itemsToDrag);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item?.isFolder && item.id !== draggedItem?.id) {
      setDropTarget(item);
      e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
    }
  };

  const handleDragLeave = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item?.isFolder) {
      setDropTarget(null);
      e.currentTarget.style.backgroundColor = '';
    }
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.backgroundColor = '';
    
    if (!draggedItem || !targetFolder?.isFolder || 
        (Array.isArray(draggedItem) ? draggedItem.some(item => item.id === targetFolder.id) : draggedItem.id === targetFolder.id)) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    try {
      const sourcePaths = Array.isArray(draggedItem) ? 
        draggedItem.map(item => item.path) : 
        [draggedItem.path];

      const response = await fetch(`${API_BASE_URL}/documents/move`, {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments();
      setOperationProgress({
        status: `Successfully moved ${sourcePaths.length} item(s) to ${targetFolder.name}`,
        processed_items: undefined,
        total_items: undefined
      });
    } catch (error) {
      console.error('Error moving items:', error);
      setOperationProgress({
        status: `Error moving items: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    } finally {
      setDraggedItem(null);
      setDropTarget(null);
    }
  };

  const handleMoveToParent = async () => {
    if (!selectedDocs.length || !currentPath) return;
    
    try {
      setIsLoading(true);
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      
      const response = await fetch(`${API_BASE_URL}/documents/move`, {
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

      await fetchDocuments();
      setSelectedDocs([]);
    } catch (error) {
      console.error('Error moving items:', error);
      setError('Failed to move items: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the breadcrumb click handler
  const handleBreadcrumbClick = (path) => {
    // If clicking "Root", reset everything to initial state
    if (path === "") {
      setCurrentPath("");
      setBreadcrumbs([{ name: "Root", path: "" }]);
    } else {
      setCurrentPath(path);
      updateBreadcrumbs(path);
    }
    // Clear selected files when navigating via breadcrumbs
    setSelectedDocs([]);
  };

  // Add these handlers for breadcrumb drag and drop
  const handleBreadcrumbDragOver = (e, crumb) => {
    e.preventDefault();
    e.stopPropagation();
    // Show visual feedback
    e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.08)';
  };

  const handleBreadcrumbDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Remove visual feedback
    e.currentTarget.style.backgroundColor = '';
  };

  const handleBreadcrumbDrop = async (e, crumb) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.backgroundColor = '';
    
    if (!draggedItem) return;
    
    try {
      const sourcePaths = Array.isArray(draggedItem) ? 
        draggedItem.map(item => item.path) : 
        [draggedItem.path];

      const response = await fetch(`${API_BASE_URL}/documents/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_paths: sourcePaths,
          target_folder: crumb.path
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchDocuments();
      setOperationProgress({
        status: `Successfully moved ${sourcePaths.length} item(s) to ${crumb.name}`,
        processed_items: undefined,
        total_items: undefined
      });
    } catch (error) {
      console.error('Error moving items:', error);
      setOperationProgress({
        status: `Error moving items: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    } finally {
      setDraggedItem(null);
    }
  };

  const handleClassificationChange = async (item, newClassification) => {
    try {
      const response = await axios.post(`${getApiUrl('UPLOAD', '/api/upload/update-security')}`, {
        filename: item.path,
        security_classification: newClassification
      });

      if (response.status === 200) {
        // Just update the UI to reflect the change without using state management
        const updatedDocuments = documents.map(doc => 
          doc.id === item.id 
            ? { ...doc, securityClassification: newClassification }
            : doc
        );
        
        // Update documents directly
        dispatch({ type: ACTIONS.SET_DOCUMENTS, payload: updatedDocuments });

        // Show success message
        setOperationProgress({
          status: `Successfully updated classification for ${item.name}`,
          processed_items: undefined,
          total_items: undefined
        });
      }
    } catch (error) {
      console.error('Error updating classification:', error);
      setOperationProgress({
        status: `Error updating classification: ${error.message}`,
        processed_items: undefined,
        total_items: undefined
      });
    }
  };

  return (
    <main style={{ 
      padding: '20px', 
      height: 'calc(100vh + 1000px)',  // Adjust for padding
      overflow: 'hidden' 
    }}>
      <Container maxWidth={false} style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Grid 
          container 
          spacing={3} 
          style={{ 
            height: '100%',
            flexWrap: 'nowrap'
          }}
        >
          {/* Left Column - Upload and Tips Sections */}
          <Grid 
            item 
            style={{ 
              width: '20%',
              minWidth: '250px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '100%',
              overflow: 'auto'
            }}
          >
            {/* Upload Section */}
            <Paper className="paper" style={{ height: 'auto', padding: '20px' }}>
              <div className="section">
                <Typography variant="h6" className="section-title">
                  Upload Documents
                </Typography>
                <Typography variant="subtitle2" className="text-secondary">
                  Add new PDF, DOCX, or TXT documents to the library
                </Typography>
              </div>

              <div
                className={`dropzone ${dragOver ? 'active' : ''}`}
                onDragOver={handleFileUploadDragOver}
                onDragLeave={handleFileUploadDragLeave}
                onDrop={handleFileUploadDrop}
                style={{ 
                  margin: '20px 0',
                  padding: '20px',
                  border: '2px dashed #ccc',
                  borderRadius: '4px',
                  textAlign: 'center'
                }}
              >
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
                    className="upload-button"
                    startIcon={<UploadIcon />}
                  >
                    Upload Files
                  </Button>
                </label>
                <Typography variant="body2" style={{ marginTop: '1rem' }}>
                  or drag and drop files here
                </Typography>
              </div>
            </Paper>

            {/* Document Preparation Tips */}
            <Paper className="paper" style={{ height: 'auto', padding: '20px' }}>
              <Typography variant="h6" className="section-title" style={{ marginBottom: '16px' }}>
                Document Preparation Tips
              </Typography>
              <Typography variant="body2" style={{ marginBottom: '12px' }}>
                For optimal data extraction and fine-tuning results:
              </Typography>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Remove headers, footers, and page numbers that don't contribute to the content
                  </Typography>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Clean up any OCR artifacts or scanning errors in the text
                  </Typography>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Ensure proper paragraph breaks and formatting consistency
                  </Typography>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Remove any irrelevant tables, figures, or references that might confuse the model
                  </Typography>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Break long documents into logical, topic-based sections
                  </Typography>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Standardize formatting of dates, numbers, and special characters
                  </Typography>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                  <Typography variant="body2">
                    Remove any sensitive or classified information not intended for training
                  </Typography>
                </li>
              </ul>
            </Paper>
          </Grid>

          {/* Right Column - File List and Preview */}
          <Grid 
            item 
            style={{ 
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            <Paper className="paper" style={{ 
              flex: '2 1 35%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <div className="section" style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '12px',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {currentPath && (
                      <IconButton onClick={handleNavigateBack} style={{ marginRight: '8px' }}>
                        <ArrowBackIcon />
                      </IconButton>
                    )}
                    <Breadcrumbs aria-label="breadcrumb">
                      {breadcrumbs.map((crumb, index) => (
                        <Link
                          key={index}
                          component="button"
                          onClick={() => handleBreadcrumbClick(crumb.path)}
                          style={{ 
                            cursor: 'pointer',
                            color: index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onDragOver={(e) => handleBreadcrumbDragOver(e, crumb)}
                          onDragLeave={handleBreadcrumbDragLeave}
                          onDrop={(e) => handleBreadcrumbDrop(e, crumb)}
                        >
                          {crumb.name}
                        </Link>
                      ))}
                    </Breadcrumbs>
                  </div>
                  <Button
                    variant="outlined"
                    startIcon={<CreateFolderIcon />}
                    onClick={() => setNewFolderDialogOpen(true)}
                    style={{ marginLeft: '16px' }}
                  >
                    Create New Folder
                  </Button>
                </div>
              </div>

              {/* Combined Tip and Bulk Actions Bar */}
              <Toolbar 
                style={{ 
                  backgroundColor: 'rgba(79, 195, 247, 0.08)',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  marginBottom: '16px',
                  minHeight: '48px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {/* Tip Section - Left Side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DragIcon style={{ color: 'var(--primary-color)' }} />
                  <Typography variant="body2" style={{ color: 'var(--text-color-dark)' }}>
                    Tip: Drag and drop files or folders to move them. Drop files onto folders in the list or on the breadcrumb menu above to move them.
                  </Typography>
                </div>

                {/* Bulk Actions Section - Right Side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Typography style={{ marginRight: '16px' }} color="inherit" variant="subtitle1">
                    {selectedDocs.length} {selectedDocs.length === 1 ? 'item' : 'items'} selected
                  </Typography>
                  {currentPath && (
                    <Tooltip title="Move to Parent Folder">
                      <span>
                        <IconButton 
                          onClick={handleMoveToParent}
                          disabled={selectedDocs.length === 0}
                          style={{ 
                            opacity: selectedDocs.length === 0 ? 0.5 : 1 
                          }}
                        >
                          <MoveUpIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip title="Download Selected">
                    <span>
                      <IconButton 
                        onClick={handleBulkDownload}
                        disabled={selectedDocs.length === 0}
                        style={{ 
                          opacity: selectedDocs.length === 0 ? 0.5 : 1 
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete Selected">
                    <span>
                      <IconButton 
                        onClick={handleBulkDelete}
                        disabled={selectedDocs.length === 0}
                        style={{ 
                          opacity: selectedDocs.length === 0 ? 0.5 : 1 
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              </Toolbar>

              <TableContainer 
                className="table-container" 
                style={{ 
                  margin: '0', 
                  position: 'relative',
                  maxHeight: 'calc(100% - 120px)',  // Subtract space for header and tip
                  overflow: 'auto'  // Enable scrolling
                }}
              >
                {(isLoading || isRefreshing) && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                  }}>
                    <Typography>Zipping your files for download...</Typography>
                  </div>
                )}
                
                <Table 
                  className="table" 
                  style={{ 
                    minWidth: 650,
                    tableLayout: 'fixed'
                  }} 
                  size="small"
                  stickyHeader
                >
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" style={{ width: '40px' }}>
                        <Checkbox
                          indeterminate={selectedDocs.length > 0 && selectedDocs.length < documents.length}
                          checked={documents.length > 0 && selectedDocs.length === documents.length}
                          onChange={handleSelectAllClick}
                        />
                      </TableCell>
                      <TableCell style={{ width: '50%' }}>Name</TableCell>
                      <TableCell style={{ width: '20%' }}>Classification</TableCell>
                      <TableCell style={{ width: '5%' }}>Type</TableCell>
                      <TableCell style={{ width: '10%' }}>Upload Date</TableCell>
                      <TableCell style={{ width: '15%' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((item) => (
                      <TableRow 
                        key={item.id}
                        hover
                        onClick={(e) => {
                          // Ignore clicks on checkbox cell, classification dropdown, and action buttons
                          if (e.target.closest('.checkbox-cell') || 
                              e.target.closest('.MuiSelect-root') || 
                              e.target.closest('.actions-cell')) {
                            return;
                          }
                          
                          // For folders, handle single click to select
                          if (item.isFolder) {
                            handleSelectDoc(item.id);
                          } else {
                            // For files, toggle the checkbox
                            handleSelectDoc(item.id);
                          }
                        }}
                        onDoubleClick={(e) => {
                          // Ignore double clicks on controls
                          if (e.target.closest('.checkbox-cell') || 
                              e.target.closest('.MuiSelect-root') || 
                              e.target.closest('.actions-cell')) {
                            return;
                          }
                          
                          // Navigate into folder on double click
                          if (item.isFolder) {
                            handleFolderClick(item);
                          }
                        }}
                        style={{ 
                          cursor: item.isFolder ? 'pointer' : 'default',
                          backgroundColor: dropTarget?.id === item.id 
                            ? 'rgba(25, 118, 210, 0.08)' 
                            : (!item.isFolder && item.securityClassification === 'SELECT A CLASSIFICATION')
                              ? 'rgba(244, 67, 54, 0.08)'
                              : undefined,
                          border: (!item.isFolder && item.securityClassification === 'SELECT A CLASSIFICATION')
                            ? '2px solid #f44336'
                            : undefined
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragOver={(e) => handleDragOver(e, item)}
                        onDragLeave={(e) => handleDragLeave(e, item)}
                        onDrop={(e) => handleDrop(e, item)}
                      >
                        <TableCell padding="checkbox" style={{ width: '60px' }} className="checkbox-cell">
                          <Checkbox
                            checked={isSelected(item.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectDoc(item.id);
                            }}
                          />
                        </TableCell>
                        <TableCell style={{ width: '40%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.isFolder ? (
                              <FolderIcon style={{ color: '#FFC107' }} />
                            ) : (
                              <FileIcon />
                            )}
                            {item.isFolder ? item.name : (item.name ? getFileNameWithoutExtension(item.name) : '')}
                          </div>
                        </TableCell>
                        <TableCell style={{ width: '20%' }}>
                          {!item.isFolder ? (
                            <Select
                              value={item.securityClassification || 'SELECT A CLASSIFICATION'}
                              onChange={(e) => handleClassificationChange(item, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                width: '100%',
                                backgroundColor: item.securityClassification === 'SELECT A CLASSIFICATION' 
                                  ? 'rgba(244, 67, 54, 0.08)'
                                  : undefined,
                                border: item.securityClassification === 'SELECT A CLASSIFICATION'
                                  ? '2px solid #f44336'
                                  : undefined,
                                borderRadius: '4px'
                              }}
                              size="small"
                            >
                              {SECURITY_CLASSIFICATIONS.map((classification) => (
                                <MenuItem key={classification} value={classification}>
                                  {classification}
                                </MenuItem>
                              ))}
                            </Select>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell style={{ width: '10%' }}>{item.type}</TableCell>
                        <TableCell style={{ width: '15%' }}>{new Date(item.uploadDate).toLocaleDateString()}</TableCell>
                        <TableCell style={{ width: '15%' }} className="actions-cell">
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {!item.isFolder && (
                              <>
                                <Tooltip title="Preview File">
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePreview(item);
                                    }}
                                    size="small"
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download File">
                                  <IconButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(item);
                                    }}
                                    size="small"
                                  >
                                    <DownloadIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title={`Rename ${item.isFolder ? 'Folder' : 'File'}`}>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToRename(item);
                                  setNewName(item.isFolder ? item.name : (item.name ? getFileNameWithoutExtension(item.name) : ''));
                                  setRenameDialogOpen(true);
                                }}
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={`Delete ${item.isFolder ? 'Folder' : 'File'}`}>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item);
                                }}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* File Preview Section */}
            <Paper className="paper" style={{ 
              flex: '1 1 65%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: '300px'  // Add minimum height
            }}>
              {previewFile ? (
                <FilePreview file={previewFile} onFileUpdate={handleFileUpdate} />
              ) : (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'rgba(0, 0, 0, 0.6)'
                }}>
                  <ViewIcon style={{ fontSize: 48, opacity: 0.5 }} />
                  <Typography variant="body1">
                    Click the preview <ViewIcon style={{ fontSize: 16, verticalAlign: 'middle' }}/> button next to a file to view its contents
                  </Typography>
                </div>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Create Folder Dialog */}
      <Dialog
        open={newFolderDialogOpen}
        onClose={() => setNewFolderDialogOpen(false)}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">Create New Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for the new folder
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Folder Name"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateFolder();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCreateFolder} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Bulk Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {selectedDocs.length} selected document{selectedDocs.length !== 1 ? 's' : ''}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleBulkDeleteConfirm} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          setRenameDialogOpen(false);
          setItemToRename(null);
          setNewName("");
        }}
        aria-labelledby="rename-dialog-title"
      >
        <DialogTitle id="rename-dialog-title">
          Rename {itemToRename?.isFolder ? 'Folder' : 'File'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a new name for {itemToRename?.isFolder ? 
              itemToRename?.name : 
              getFileNameWithoutExtension(itemToRename?.name)}
            {!itemToRename?.isFolder && (
              <span style={{ color: 'text.secondary' }}>
                {itemToRename?.name.substring(itemToRename?.name.lastIndexOf('.'))}
              </span>
            )}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="New Name"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRename();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRenameDialogOpen(false);
            setItemToRename(null);
            setNewName("");
          }} color="primary">
            Cancel
          </Button>
          <Button onClick={handleRename} color="primary">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Operation Progress */}
      {operationProgress?.status && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          padding: '16px',
          backgroundColor: '#fff',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          <Typography variant="body2">
            {operationProgress.status}
            {operationProgress.processed_items !== undefined && (
              ` (${operationProgress.processed_items}/${operationProgress.total_items})`
            )}
          </Typography>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {fileToDelete?.type === 'folder' ? 'folder' : 'file'} "{fileToDelete?.name}"?
            {fileToDelete?.type === 'folder' && " This will delete all contents of the folder."}
            This action cannot be undone.
          </DialogContentText>
          
          {deleteContents.length > 0 && (
            <>
              <Typography variant="subtitle1" style={{ marginTop: '16px', marginBottom: '8px' }}>
                The following items will be deleted:
              </Typography>
              <Paper style={{ maxHeight: 200, overflow: 'auto', padding: '8px' }}>
                <List dense>
                  {deleteContents.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {item.type === 'folder' ? <FolderIcon /> : <FileIcon />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.name}
                        secondary={item.type === 'folder' ? 'Folder' : item.type}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
              <Typography variant="caption" color="textSecondary" style={{ marginTop: '8px' }}>
                Total items to be deleted: {deleteContents.length}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteConfirmOpen(false);
            setDeleteContents([]);
          }} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        aria-labelledby="bulk-delete-dialog-title"
        aria-describedby="bulk-delete-dialog-description"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="bulk-delete-dialog-title">{"Confirm Bulk Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="bulk-delete-dialog-description">
            Are you sure you want to delete the selected items? This action cannot be undone.
          </DialogContentText>
          
          {bulkDeleteContents.length > 0 && (
            <>
              <Typography variant="subtitle1" style={{ marginTop: '16px', marginBottom: '8px' }}>
                The following items will be deleted:
              </Typography>
              <Paper style={{ maxHeight: 300, overflow: 'auto', padding: '8px' }}>
                <List dense>
                  {bulkDeleteContents.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {item.type === 'folder' ? <FolderIcon /> : <FileIcon />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.name}
                        secondary={
                          <>
                            <span>{item.type === 'folder' ? 'Folder' : item.type}</span>
                            <span style={{ marginLeft: '8px', color: 'text.secondary' }}>
                              {item.path}
                            </span>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
              <Typography variant="caption" color="textSecondary" style={{ marginTop: '8px' }}>
                Total items to be deleted: {bulkDeleteContents.length}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBulkDeleteDialogOpen(false);
            setBulkDeleteContents([]);
            setSelectedDocs([]);
          }} color="primary">
            Cancel
          </Button>
          <Button onClick={handleBulkDeleteConfirm} color="primary" autoFocus>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Display */}
      {error && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          padding: '16px',
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          <Typography variant="body2">
            {error}
          </Typography>
        </div>
      )}
    </main>
  );
}

export default DocumentLibrary; 