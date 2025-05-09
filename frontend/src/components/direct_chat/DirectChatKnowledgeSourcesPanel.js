// DirectChatKnowledgeSourcesPanel.js contains the knowledge sources panel for the direct chat.

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Box,
  Typography,
  Link,
  Divider,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button
} from '@material-ui/core';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DeleteIcon from '@material-ui/icons/Delete';
import VisibilityIcon from '@material-ui/icons/Visibility';
import { useDropzone } from 'react-dropzone';
import { GradientText } from '../../styles/StyledComponents';
import { AuthContext } from '../../contexts/AuthContext'; // Needed if token is used directly, otherwise pass as prop
import {
  uploadDocument,
  getDocumentStates,
  getDocumentStatus,
  deleteDocument,
  toggleDocumentState,
  updateDocumentClassification
} from '../../services/directChatService';
import { getVectorStoreById } from '../../services/vectorStoreService';
import { Alert } from '@material-ui/lab';
import DescriptionIcon from '@material-ui/icons/Description';
import SettingsIcon from '@material-ui/icons/Settings';

// Import the modal component
import ManageVectorstoreModal from './ManageVectorstoreModal';

const useStyles = makeStyles((theme) => ({
  uploadPane: { // Root style for this panel
    width: '20%',
    height: '100%',
    paddingTop: '10px',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    transition: 'opacity 0.3s ease',
    position: 'relative',
    border: `${theme.custom.borderWidth.regular}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    '&.disabled': {
      opacity: 0.5,
      pointerEvents: 'none',
      filter: 'grayscale(50%)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient2,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.regular,
      left: theme.custom.borderWidth.regular,
      right: theme.custom.borderWidth.regular,
      bottom: theme.custom.borderWidth.regular,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.regular / 2,
      background: theme.palette.background.paper,
      zIndex: -1,
    },
    '& > *': {
      position: 'relative',
      zIndex: 1
    }
  },
  knowledgeSourcesContent: { // Specific content wrapper for this panel
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  vectorstoreSection: {
    marginBottom: theme.spacing(2),
    width: '100%',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: '1.2rem', // Adjusted from 0.8rem for better visibility
    fontWeight: 500,
    marginBottom: theme.spacing(1), // Increased margin
    color: 'rgba(255, 255, 255, 0.7)'
  },
  nativeSelect: {
    width: '100%',
    padding: '8px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.9rem',
    color: theme.palette.text.primary,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    boxSizing: 'border-box',
    '&:focus': {
      outline: 'none',
      border: `1px solid ${theme.palette.primary.main}`,
    },
    '&:disabled': {
      opacity: 0.7,
      backgroundColor: theme.palette.action.disabledBackground,
    }
  },
  buildDatabasesLink: {
    fontSize: '0.8rem',
    color: theme.palette.primary.main,
    textDecoration: 'none',
    display: 'block',
    marginTop: theme.spacing(0.5),
    width: '100%',
    textAlign: 'left',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  docUploadHeader: {
    fontSize: '1.5rem', // Matched from DirectChat.js
    fontWeight: '600', // Matched from DirectChat.js for GradientText
    marginBottom: theme.spacing(1),
  },
  dropzone: {
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    transition: theme.custom.transition,
    width: '100%',
    boxSizing: 'border-box',
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
  },
  uploadIcon: {
    fontSize: '2rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  uploadText: {
    marginBottom: theme.spacing(0.5),
  },
  fileListContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: '100px', // Ensure it has some height
  },
  fileList: {
    marginTop: theme.spacing(2),
    width: '100%',
    overflowY: 'auto',
    paddingRight: theme.spacing(1),
    height: '100%',
    paddingBottom: theme.spacing(3),
    position: 'relative',
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[500],
      borderRadius: '4px',
    },
  },
  fileItem: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    transition: theme.custom.transition,
    width: '100%',
    boxSizing: 'border-box',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateY(-1px)',
      boxShadow: theme.custom.boxShadow,
    },
    '&:last-child': {
      marginBottom: theme.spacing(4),
    },
  },
  fileItemRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
    width: '100%',
    overflow: 'hidden',
  },
  classificationSelect: {
    marginTop: theme.spacing(0.5),
    width: '100%',
    '& .MuiOutlinedInput-input': {
      padding: theme.spacing(1),
    },
    '& .MuiSelect-select': {
      padding: theme.spacing(0.75, 1),
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.shape.borderRadius,
    },
  },
  errorText: {
    color: theme.palette.error.main,
    fontSize: '0.875rem',
    marginTop: theme.spacing(1),
    textAlign: 'center',
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  documentListContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    minHeight: '100px',
    paddingRight: theme.spacing(1),
    marginBottom: theme.spacing(2),
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[500],
      borderRadius: '4px',
    },
  },
  documentList: {
    paddingTop: 0,
  },
  documentListItem: {
    padding: theme.spacing(0.5, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  documentListItemIcon: {
    minWidth: 'auto',
    marginRight: theme.spacing(1.5),
    color: theme.palette.text.secondary,
    '& .MuiIconButton-root': {
      padding: theme.spacing(0.5),
    },
  },
  documentListItemText: {
    fontSize: '0.875rem',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  errorAlert: {
    marginTop: theme.spacing(1),
  },
  sectionTitleDocs: {
    fontSize: '1.1rem',
    fontWeight: 500,
    marginBottom: theme.spacing(1),
    color: 'rgba(255, 255, 255, 0.8)'
  },
  noDocsText: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
    padding: theme.spacing(2),
    fontStyle: 'italic',
  },
  manageButton: {
    marginTop: theme.spacing(1),
    width: '100%',
    flexShrink: 0,
    marginBottom: theme.spacing(2),
  },
  vsErrorAlert: { // Style for the vector store error alert
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}));

const CLASSIFICATION_LEVELS = {
  SELECT: "SELECT CLASSIFICATION",
  UNCLASSIFIED: "Unclassified",
  SECRET: "Secret",
  TOP_SECRET: "Top Secret"
};

const DirectChatKnowledgeSourcesPanel = ({
  currentSessionId,
  token, // Pass token as prop
  vectorstores = [],
  selectedVectorstore = '',
  isLoadingVectorstores = false,
  onVectorstoreChange,
  vectorstoreError // Add the new prop here
}) => {
  const classes = useStyles();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [pollingIds, setPollingIds] = useState(new Set());
  const { user } = useContext(AuthContext); // Get user from context if needed
  const [currentVectorstoreDocuments, setCurrentVectorstoreDocuments] = useState([]);
  const [isLoadingVsDocs, setIsLoadingVsDocs] = useState(false);
  const [vsDocsLoadingError, setVsDocsLoadingError] = useState(null);

  // State for the Manage Documents Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Function to manually trigger document refresh
  const [refreshCounter, setRefreshCounter] = useState(0);
  const handleRefreshDocuments = useCallback(() => {
    setRefreshCounter(prev => prev + 1); // Increment counter to re-trigger fetch
  }, []);

  useEffect(() => {
    const fetchDocumentStates = async () => {
      if (!currentSessionId) {
        setUploadedFiles([]);
        return;
      }
      try {
        setUploadError(null);
        const states = await getDocumentStates(currentSessionId, token);
        const files = Object.entries(states).map(([docId, state]) => ({
          id: docId,
          name: state.originalName,
          size: state.markdownSize,
          status: state.status || 'pending', // Ensure status has a default
          isChecked: state.isChecked || false,
          classification: state.classification || CLASSIFICATION_LEVELS.SELECT
        }));
        setUploadedFiles(files);
        const pendingFiles = files.filter(file => file.status === 'pending' || file.status === 'processing');
        if (pendingFiles.length > 0) {
          setPollingIds(new Set(pendingFiles.map(file => file.id)));
        }
      } catch (error) {
        console.error('Error fetching document states:', error);
        setUploadError('Failed to load documents. Please try refreshing or selecting a session.');
      }
    };
    fetchDocumentStates();
  }, [currentSessionId, token]);

  useEffect(() => {
    if (!currentSessionId || pollingIds.size === 0) return undefined;

    const intervalId = setInterval(async () => {
      let activePolling = false;
      const updatedPollingIds = new Set();

      for (const docId of pollingIds) {
        try {
          const statusResult = await getDocumentStatus(currentSessionId, docId, token);
          if (statusResult.status !== 'pending' && statusResult.status !== 'processing') {
            setUploadedFiles(prev => prev.map(file =>
              file.id === docId ? { ...file, status: statusResult.status, error: statusResult.error } : file
            ));
          } else {
            updatedPollingIds.add(docId); // Keep polling for this doc
            activePolling = true;
          }
        } catch (error) {
          console.error(`Error polling document status for ${docId}:`, error);
          // Optionally, stop polling for this doc on error or mark it as failed
          setUploadedFiles(prev => prev.map(file => 
            file.id === docId ? { ...file, status: 'error', error: 'Polling failed' } : file
          ));
        }
      }
      setPollingIds(updatedPollingIds);
      if (!activePolling) {
        clearInterval(intervalId);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [currentSessionId, pollingIds, token]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!currentSessionId) {
      setUploadError('Please select a chat session before uploading documents.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    let anyUploadFailed = false;

    for (const file of acceptedFiles) {
      try {
        const result = await uploadDocument(currentSessionId, file, token);
        setUploadedFiles(prev => [...prev, {
          id: result.docId,
          name: result.metadata?.originalName || file.name, // Use name from metadata if available
          size: result.metadata?.markdownSize || file.size,
          status: result.metadata?.status || 'pending',
          isChecked: result.state?.isChecked || false,
          classification: result.state?.classification || CLASSIFICATION_LEVELS.SELECT
        }]);
        if ((result.metadata?.status === 'pending' || result.metadata?.status === 'processing') && result.docId) {
            setPollingIds(prev => new Set([...prev, result.docId]));
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadError(`Failed to upload ${file.name}. ${error.response?.data?.detail || error.message}`);
        anyUploadFailed = true;
      }
    }
    setIsUploading(false);
    if (anyUploadFailed) {
        // Optionally trigger a re-fetch of document states if uploads are problematic
        // getDocumentStates(currentSessionId, token).then(...)
    }
  }, [currentSessionId, token]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !currentSessionId || isUploading
  });

  const handleRemoveFile = async (docId) => {
    if (!currentSessionId) return;
    try {
      await deleteDocument(currentSessionId, docId, token);
      setUploadedFiles(prev => prev.filter(file => file.id !== docId));
      setPollingIds(prev => {
        const updated = new Set(prev);
        updated.delete(docId);
        return updated;
      });
    } catch (error) {
      console.error('Error removing file:', error);
      setUploadError('Failed to remove file.');
    }
  };

  const handleCheckboxChange = async (docId) => {
    if (!currentSessionId) return;
    try {
      await toggleDocumentState(currentSessionId, docId, token);
      setUploadedFiles(prev => prev.map(file =>
        file.id === docId ? { ...file, isChecked: !file.isChecked } : file
      ));
    } catch (error) {
      console.error('Error toggling document state:', error);
      setUploadError('Failed to update document selection.');
    }
  };

  const handleClassificationChange = async (docId, newClassification) => {
    if (!currentSessionId) return;
    try {
      await updateDocumentClassification(currentSessionId, docId, newClassification, token);
      setUploadedFiles(prev => prev.map(file =>
        file.id === docId ? { ...file, classification: newClassification } : file
      ));
    } catch (error) {
      console.error('Error updating classification:', error);
      setUploadError('Failed to update classification.');
    }
  };

  // Fetch vector store documents when selection or refreshCounter changes
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!selectedVectorstore) {
        setCurrentVectorstoreDocuments([]);
        setIsLoadingVsDocs(false);
        setVsDocsLoadingError(null);
        return;
      }

      setIsLoadingVsDocs(true);
      setVsDocsLoadingError(null);
      setCurrentVectorstoreDocuments([]);

      try {
        const storeDetails = await getVectorStoreById(selectedVectorstore, token);
        console.log("Fetched store details:", storeDetails);
        setCurrentVectorstoreDocuments(storeDetails?.files || []);
      } catch (error) {
        console.error('Error fetching vector store documents:', error);
        setVsDocsLoadingError('Failed to load documents for this database.');
      } finally {
        setIsLoadingVsDocs(false);
      }
    };

    fetchDocuments();
  }, [selectedVectorstore, token, refreshCounter]); // Add refreshCounter dependency

  // Modal handlers
  const handleOpenManageModal = () => {
    setIsManageModalOpen(true);
  };

  const handleCloseManageModal = () => {
    setIsManageModalOpen(false);
  };

  return (
    <div className={`${classes.uploadPane} ${!currentSessionId ? 'disabled' : ''}`}>
      <div className={classes.knowledgeSourcesContent}>
        <Box mb={3} flexShrink={0}>
          <GradientText variant="h1" fontWeight="600" fontSize={'2rem'} gutterBottom>
            Knowledge Sources
          </GradientText>
        </Box>

        <div className={classes.vectorstoreSection}>
          <Typography variant="subtitle2" className={classes.sectionLabel}>
            MAGE Retrieval Databases
          </Typography>
          {vectorstoreError && (
            <Alert severity="warning" className={classes.vsErrorAlert}>
              {vectorstoreError}
            </Alert>
          )}
          <select
            value={selectedVectorstore || ""}
            onChange={onVectorstoreChange}
            disabled={!currentSessionId || isLoadingVectorstores}
            className={classes.nativeSelect}
          >
            <option value="">{isLoadingVectorstores ? "Loading..." : "Select Vectorstore"}</option>
            {vectorstores && vectorstores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name || store.id}
              </option>
            ))}
          </select>
          <Link
            href="/retrieval/build-databases"
            className={classes.buildDatabasesLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Click here to Build/Manage Retrieval Databases
          </Link>
        </div>

        <Divider className={classes.divider}/>

        {/* Manage Documents Button - MOVED HERE */}
        <Button
          variant="contained"
          color="primary"
          disabled={!selectedVectorstore || isLoadingVsDocs || !!vectorstoreError}
          className={classes.manageButton}
          onClick={handleOpenManageModal}
          startIcon={<SettingsIcon />}
        >
          Manage Documents
        </Button>

        <Typography variant="h6" className={classes.sectionTitleDocs}>
          Documents in Selected Database
        </Typography>
        <div className={classes.documentListContainer}>
          {isLoadingVsDocs ? (
            <div className={classes.loadingContainer}>
              <CircularProgress size={24} />
              <Typography style={{ marginLeft: 8 }} color="textSecondary">Loading documents...</Typography>
            </div>
          ) : vsDocsLoadingError ? (
            <Alert severity="error" className={classes.errorAlert}>{vsDocsLoadingError}</Alert>
          ) : !selectedVectorstore ? (
             <Typography className={classes.noDocsText}>
              Please select a Retrieval Database above to view its documents.
            </Typography>
          ) : currentVectorstoreDocuments.length === 0 ? (
            <Typography className={classes.noDocsText}>
              No documents found in this Retrieval Database.
            </Typography>
          ) : (
            <List dense className={classes.documentList}>
              {currentVectorstoreDocuments.map((doc, index) => {
                let previewFileType = doc.file_type?.replace('.', '').toUpperCase();
                if (previewFileType === 'TXT' || previewFileType === 'PDF' || previewFileType === 'DOCX') {
                  // Valid for preview
                } else {
                  const ext = doc.filename?.split('.').pop()?.toUpperCase();
                  if (ext === 'TXT' || ext === 'PDF' || ext === 'DOCX') {
                    previewFileType = ext;
                  } else {
                    previewFileType = null; // Cannot determine a previewable type
                  }
                }

                const handlePreviewClick = () => {
                  if (!previewFileType || !doc.original_path || !token) {
                    console.warn('Cannot preview document. Missing type, path, or token.', doc);
                    return;
                  }
                  const previewUrl = `/view-document?filePath=${encodeURIComponent(doc.original_path)}&fileName=${encodeURIComponent(doc.filename)}&fileType=${encodeURIComponent(previewFileType)}&token=${encodeURIComponent(token)}`;
                  window.open(previewUrl, `DocumentPreview_${doc.document_id || index}`, 'width=1024,height=768,resizable,scrollbars');
                };

                return (
                  <ListItem key={doc.document_id || doc.filename || index} className={classes.documentListItem}>
                    <ListItemIcon className={classes.documentListItemIcon}>
                      <DescriptionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" className={classes.documentListItemText}>
                          {doc.filename || 'Unknown Filename'}
                        </Typography>
                      }
                    />
                    {previewFileType && (
                      <ListItemIcon className={classes.documentListItemIcon} style={{ justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={handlePreviewClick}
                          title={`Preview ${doc.filename}`}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </ListItemIcon>
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </div>

      </div>

      {/* Render the Manage Documents Modal */}
      {selectedVectorstore && (
         <ManageVectorstoreModal
            open={isManageModalOpen}
            onClose={handleCloseManageModal}
            vectorStoreId={selectedVectorstore}
            token={token}
            onDocumentsUpdated={handleRefreshDocuments} // Pass the refresh handler
        />
      )}
    </div>
  );
};

export default React.memo(DirectChatKnowledgeSourcesPanel);
