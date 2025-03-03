import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  makeStyles,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Chip,
  Tooltip,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper,
  Divider,
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Dialog,
  useTheme
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import InfoIcon from '@material-ui/icons/Info';
import AddIcon from '@material-ui/icons/Add';
import CloseIcon from '@material-ui/icons/Close';
import QueryTester from './QueryTester';
import DocumentSelector from './DocumentSelector';
import SearchIcon from '@material-ui/icons/Search';

import { 
  getJobStatus,
  batchUpdateVectorStore
} from '../../services/vectorStoreService';

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: theme.spacing(2),
    paddingTop: 0, // Remove top padding as tabs will be sticky
  },
  tabPanel: {
    marginTop: theme.spacing(2),
    minHeight: '500px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  documentList: {
    maxHeight: '450px',
    overflow: 'auto',
  },
  compactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    minHeight: '48px',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  storeName: {
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.1rem',
  },
  storeNamePrefix: {
    marginRight: theme.spacing(0.5),
    fontWeight: 400,
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
  },
  stickyTabs: {
    backgroundColor: theme.palette.background.paper,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 1, 0, 1),
    borderRadius: '4px 4px 0 0',
    '& .MuiTabs-flexContainer': {
      gap: theme.spacing(1),
    },
  },
  modernTab: {
    minHeight: 56,
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '1.1rem',
    borderRadius: '8px 8px 0 0',
    marginRight: theme.spacing(0.5),
    transition: 'all 0.2s ease',
    padding: theme.spacing(1.5, 2),
    '&.Mui-selected': {
      color: theme.palette.primary.main,
      fontWeight: 700,
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      fontSize: '1.5rem',
    },
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      color: theme.palette.primary.main,
    },
    '& .MuiTab-wrapper': {
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing(1.5),
    },
  },
  tabIcon: {
    marginBottom: '0 !important',
    marginRight: theme.spacing(1),
    fontSize: '1.4rem',
  },
  overviewSplitPanel: {
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(3),
  },
  overviewDetailsPanel: {
    flex: '0 0 30%',
    minWidth: '250px',
  },
  overviewDocumentsPanel: {
    flex: '1 1 70%',
    borderLeft: `1px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    '& svg': {
      marginRight: theme.spacing(1),
      color: theme.palette.primary.main,
    },
  },
  sectionHeader: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
    display: 'flex',
    alignItems: 'center',
  },
  sectionHeaderIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  documentOperationsContainer: {
    height: '100%',
  },
  detailsPaper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  configPaper: {
    padding: theme.spacing(2),
  },
  '@keyframes moveGradient': {
    '0%': {
      backgroundPosition: '0% 50%',
    },
    '100%': {
      backgroundPosition: '200% 50%',
    },
  },
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.2)',
    },
    '70%': {
      boxShadow: '0 0 0 8px rgba(25, 118, 210, 0)',
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
    },
  },
  progressContainer: {
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    animation: '$pulse 2s infinite',
    border: '1px solid rgba(25, 118, 210, 0.2)',
    backgroundColor: 'rgba(240, 247, 255, 0.7)',
  },
}));

// VectorStoreDetails component for the Details Dialog
const VectorStoreDetails = ({ vectorStore, onClose, onSave, onDelete, onRefresh }) => {
  const classes = useStyles();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingDocs, setIsAddingDocs] = useState(false);
  const [addDocsProgress, setAddDocsProgress] = useState(null);
  const [addDocsError, setAddDocsError] = useState(null);
  const [addDocsSuccess, setAddDocsSuccess] = useState(false);

  // Memory cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clear any large state objects
      setAddDocsProgress(null);
    };
  }, []);
  
  // Clear unnecessary state when tab changes
  useEffect(() => {
    // When switching away from the Query Test tab, clean up memory
    if (tabValue !== 1) {
      // QueryTester component will handle its own cleanup
    }
  }, [tabValue]);

  // Initialize edit form when entering edit mode
  const handleStartEditing = useCallback(() => {
    setEditedName(vectorStore.name);
    setEditedDescription(vectorStore.description || '');
    setIsEditing(true);
  }, [vectorStore.name, vectorStore.description]);

  // Cancel editing and return to view mode
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Save changes and return to view mode
  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...vectorStore,
        name: editedName,
        description: editedDescription
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving changes:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, vectorStore, editedName, editedDescription]);
  
  // Handle document selection from DocumentSelector
  const handleDocumentsSelected = useCallback(async (selected) => {
    if ((!selected.documentsToAdd || selected.documentsToAdd.length === 0) && 
        (!selected.documentsToRemove || selected.documentsToRemove.length === 0)) {
      return;
    }
    
    console.log("Documents to remove:", selected.documentsToRemove);
    
    setIsAddingDocs(true);
    setAddDocsProgress({
      processed: 0, 
      total: (selected.documentsToAdd?.length || 0) + (selected.documentsToRemove?.length || 0),
      status: "Starting operations",
      currentFile: null,
      currentOperation: "initializing"
    });
    setAddDocsError(null);
    
    try {
      // Create operations object for batch update
      const operations = {
        add: selected.documentsToAdd?.map(doc => doc.path) || null,
        remove: selected.documentsToRemove || null
      };
      
      console.log("Batch update operations:", operations);
      
      // Call the batch update API
      const result = await batchUpdateVectorStore(vectorStore.id, operations);
      
      console.log("Batch update result:", result);
      
      if (result && result.job_id) {
        // Start polling for job status
        pollJobStatus(result.job_id);
      } else {
        // If we don't have a job ID, assume the operation completed immediately
        setAddDocsSuccess(true);
        setIsAddingDocs(false);
        setAddDocsProgress({ 
          processed: (selected.documentsToAdd?.length || 0) + (selected.documentsToRemove?.length || 0),
          total: (selected.documentsToAdd?.length || 0) + (selected.documentsToRemove?.length || 0),
          status: 'completed'
        });
      }
    } catch (error) {
      console.error("Error updating vector store documents:", error);
      setAddDocsError(error.response?.data?.detail || error.message || "Failed to update documents");
      setIsAddingDocs(false);
    }
  }, [vectorStore.id]);
  
  // Poll for job status
  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const checkStatus = async () => {
        try {
          const status = await getJobStatus(jobId);
          
          // Update progress
          if (status) {
            setAddDocsProgress({
              processed: status.processed_items || 0,
              total: status.total_items || 1,
              status: status.status,
              currentFile: status.details?.current_progress?.current_file || null,
              currentOperation: status.details?.current_progress?.current_operation || null
            });
            
            // Check if complete
            if (status.status === 'completed') {
              setAddDocsSuccess(true);
              setIsAddingDocs(false);
            } else if (status.status === 'failed') {
              setAddDocsError(status.error || "Job failed");
              setIsAddingDocs(false);
            } else {
              // Continue polling
              setTimeout(checkStatus, 2000);
            }
          } else {
            // If no status, assume it failed
            setAddDocsError("Could not retrieve job status");
            setIsAddingDocs(false);
          }
        } catch (error) {
          console.error("Error polling job status:", error);
          setAddDocsError("Error checking progress: " + (error.message || "Unknown error"));
          setIsAddingDocs(false);
        }
      };
      
      // Start polling
      checkStatus();
    } catch (error) {
      console.error("Error importing job status service:", error);
      setAddDocsError("Error setting up progress tracking");
      setIsAddingDocs(false);
    }
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, []);

  // Map API data to component's expected structure with proper defaults
  const mappedData = React.useMemo(() => ({
    ...vectorStore,
    documents: vectorStore.files || [],
    documentCount: vectorStore.files?.length || 0,
    created: vectorStore.created_at || vectorStore.created,
    lastUpdated: vectorStore.updated_at || vectorStore.lastUpdated,
    embeddingModel: vectorStore.embedding_model || vectorStore.embeddingModel,
    // Handle chunking method with defaults based on available data
    useParagraphChunking: vectorStore.chunking_method ? 
                          vectorStore.chunking_method === 'paragraph' : 
                          false, // Default to fixed size if not specified
    // Handle paragraph chunking parameters with defaults
    maxParagraphLength: vectorStore.max_paragraph_length || 1500,
    minParagraphLength: vectorStore.min_paragraph_length || 50,
    // These should be available from the backend
    chunkSize: vectorStore.chunk_size || 1000,
    chunkOverlap: vectorStore.chunk_overlap || 100
  }), [vectorStore]);

  // Handle delete with correct document count
  const handleDelete = useCallback(() => {
    // Pass the store with the correct document count
    onDelete({
      ...vectorStore,
      documentCount: mappedData.documentCount,
      file_count: mappedData.documentCount
    });
  }, [onDelete, vectorStore, mappedData.documentCount]);

  // Calculate add documents progress percentage
  const getAddDocsProgressPercentage = useCallback(() => {
    if (!addDocsProgress) return 0;
    return Math.round((addDocsProgress.processed / addDocsProgress.total) * 100);
  }, [addDocsProgress]);

  console.log("Vector store data received:", vectorStore);
  console.log("Mapped data for display:", mappedData);

  return (
    <>
      <DialogTitle className={classes.compactHeader} disableTypography>
        <Typography variant="subtitle1" className={classes.storeName}>
          <span className={classes.storeNamePrefix}>Vectorstore:</span>
          {isEditing ? (
            <TextField
              label="Name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              required
              style={{ marginLeft: 8, width: 'auto', minWidth: 300 }}
            />
          ) : (
            vectorStore.name
          )}
        </Typography>
        <IconButton aria-label="close" onClick={onClose} size="small">
          <Tooltip title="Close">
            <CloseIcon fontSize="small" />
          </Tooltip>
        </IconButton>
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          className={classes.stickyTabs}
          TabIndicatorProps={{
            style: {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab 
            icon={<InfoIcon className={classes.tabIcon} />}
            label="Overview & Document Management" 
            className={classes.modernTab}
            style={{
              backgroundColor: tabValue === 0 ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            }}
          />
          <Tab 
            icon={<SearchIcon className={classes.tabIcon} />}
            label="Query Test" 
            className={classes.modernTab}
            style={{
              backgroundColor: tabValue === 1 ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            }}
          />
        </Tabs>

        {/* Overview Tab */}
        <div role="tabpanel" className={classes.tabPanel} hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <>
              <Typography variant="body2" color="textSecondary" paragraph>
                View information about your vectorstore and manage the documents it contains. Documents added or removed will be automatically processed and embedded.
              </Typography>
              
              <div className={classes.overviewSplitPanel}>
                {/* Left column - Vectorstore details */}
                <div className={classes.overviewDetailsPanel}>
                  <Paper className={classes.sectionHeader}>
                    <InfoIcon className={classes.sectionHeaderIcon} />
                    <Typography variant="subtitle1" style={{ fontWeight: 500 }}>
                      Vectorstore Details
                    </Typography>
                  </Paper>
                  
                  {!isEditing && (
                    <Typography variant="body2" color="textSecondary" paragraph style={{ marginBottom: 16 }}>
                      View information about your vectorstore configuration and settings. Use the Edit button to modify the name and description.
                    </Typography>
                  )}
                  
                  <Paper elevation={0} variant="outlined" className={classes.detailsPaper}>
                    <Typography variant="subtitle2" gutterBottom>Description</Typography>
                    {isEditing ? (
                      <TextField
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                        multiline
                        rows={3}
                        placeholder="Enter vector store description"
                        style={{ marginBottom: 16 }}
                      />
                    ) : (
                      <Typography variant="body2" paragraph>{mappedData.description || "No description provided"}</Typography>
                    )}
                    
                    <div className={classes.detailItem}>
                      <Typography variant="body2">Total Documents</Typography>
                      <Typography variant="body2"><strong>{mappedData.documentCount}</strong></Typography>
                    </div>
                    
                    <div className={classes.detailItem}>
                      <Typography variant="body2">Created On</Typography>
                      <Typography variant="body2">
                        <strong>{mappedData.created ? new Date(mappedData.created).toLocaleString() : 'Unknown'}</strong>
                      </Typography>
                    </div>
                    
                    <div className={classes.detailItem}>
                      <Typography variant="body2">Last Updated</Typography>
                      <Typography variant="body2">
                        <strong>{mappedData.lastUpdated ? new Date(mappedData.lastUpdated).toLocaleString() : 'Not updated'}</strong>
                      </Typography>
                    </div>
                    
                    <div className={classes.detailItem}>
                      <Typography variant="body2">Embedding Model</Typography>
                      <Typography variant="body2">
                        <strong>{mappedData.embeddingModel || 'Unknown'}</strong>
                      </Typography>
                    </div>
                  </Paper>

                  <Typography variant="subtitle2" gutterBottom>Chunking Configuration</Typography>
                  <Paper elevation={0} variant="outlined" className={classes.configPaper}>
                    <div className={classes.detailItem}>
                      <Typography variant="body2">Chunking Method</Typography>
                      <Typography variant="body2">
                        <strong>{mappedData.useParagraphChunking ? 'Paragraph-based' : 'Fixed-size'}</strong>
                      </Typography>
                    </div>
                    
                    {mappedData.useParagraphChunking ? (
                      <>
                        <div className={classes.detailItem}>
                          <Typography variant="body2">Max Paragraph Character Length</Typography>
                          <Typography variant="body2"><strong>{mappedData.maxParagraphLength}</strong></Typography>
                        </div>
                        <div className={classes.detailItem}>
                          <Typography variant="body2">Min Paragraph Character Length</Typography>
                          <Typography variant="body2"><strong>{mappedData.minParagraphLength}</strong></Typography>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={classes.detailItem}>
                          <Typography variant="body2">Chunk Size</Typography>
                          <Typography variant="body2"><strong>{mappedData.chunkSize}</strong></Typography>
                        </div>
                        <div className={classes.detailItem}>
                          <Typography variant="body2">Chunk Overlap</Typography>
                          <Typography variant="body2"><strong>{mappedData.chunkOverlap}</strong></Typography>
                        </div>
                      </>
                    )}
                  </Paper>

                  {/* Edit and Delete actions */}
                  {!isEditing && (
                    <Box mt={3} display="flex" justifyContent="space-between">
                      <Button 
                        onClick={handleStartEditing}
                        color="primary"
                        startIcon={<EditIcon />}
                        size="small"
                      >
                        Edit Details
                      </Button>
                      <Button 
                        onClick={handleDelete}
                        color="secondary"
                        startIcon={<DeleteIcon />}
                        size="small"
                      >
                        Delete
                      </Button>
                    </Box>
                  )}
                  
                  {/* Save/Cancel buttons for edit mode */}
                  {isEditing && (
                    <Box mt={3} display="flex" justifyContent="flex-end">
                      <Button 
                        onClick={handleCancelEdit} 
                        color="default"
                        size="small"
                        style={{ marginRight: 8 }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveChanges} 
                        color="primary" 
                        variant="contained"
                        disabled={isSaving || !editedName.trim()}
                        startIcon={isSaving && <CircularProgress size={20} />}
                        size="small"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  )}
                </div>
                
                {/* Right column - Document management */}
                <div className={classes.overviewDocumentsPanel}>
                  <Paper className={classes.sectionHeader}>
                    <AddIcon className={classes.sectionHeaderIcon} />
                    <Typography variant="subtitle1" style={{ fontWeight: 500 }}>
                      Manage Documents
                    </Typography>
                  </Paper>
                  
                  {!isAddingDocs && !addDocsError && !addDocsSuccess && (
                    <Typography variant="body2" color="textSecondary" paragraph style={{ marginBottom: 16 }}>
                      Add new documents to your vectorstore or remove existing ones. Documents are automatically processed and embedded into vectors for semantic search.
                    </Typography>
                  )}

                  <div className={classes.documentOperationsContainer}>
                    {isAddingDocs ? (
                      <Box className={classes.progressContainer}>
                        <Typography variant="h6" gutterBottom style={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={20} style={{ marginRight: 12 }} /> 
                          Updating Vector Store...
                        </Typography>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Box width="100%" mr={1}>
                            <LinearProgress 
                              variant={getAddDocsProgressPercentage() === 0 ? "indeterminate" : "determinate"} 
                              value={getAddDocsProgressPercentage()} 
                            />
                          </Box>
                          <Box minWidth={35}>
                            <Typography variant="body2" color="textSecondary">
                              {getAddDocsProgressPercentage()}%
                            </Typography>
                          </Box>
                        </Box>
                        <Paper 
                          variant="outlined" 
                          style={{ 
                            padding: '12px 16px', 
                            marginTop: 12, 
                            backgroundColor: 'rgba(240, 247, 255, 0.5)',
                            border: '1px solid rgba(25, 118, 210, 0.12)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Animated background for visual activity indicator */}
                          <Box
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                              backgroundSize: '200% 100%',
                              animation: 'moveGradient 1.5s linear infinite',
                              opacity: 0.5,
                            }}
                          />
                          <Typography variant="body2" color="textSecondary">
                            Processing {addDocsProgress?.processed || 0} of {addDocsProgress?.total || 0} operations
                          </Typography>
                          {addDocsProgress?.status && (
                            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontWeight: 500, marginRight: 4 }}>Status:</span> {addDocsProgress.status}
                            </Typography>
                          )}
                          {addDocsProgress?.currentOperation && (
                            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontWeight: 500, marginRight: 4 }}>Operation:</span> {addDocsProgress.currentOperation}
                              <CircularProgress size={12} style={{ marginLeft: 8, opacity: 0.6 }} />
                            </Typography>
                          )}
                          {addDocsProgress?.currentFile && (
                            <Typography variant="body2" color="textSecondary" style={{ 
                              marginTop: 4, 
                              fontFamily: 'monospace', 
                              fontSize: '0.8rem', 
                              backgroundColor: 'rgba(0, 0, 0, 0.03)', 
                              padding: '4px 8px', 
                              borderRadius: 4,
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {addDocsProgress.currentFile}
                            </Typography>
                          )}
                        </Paper>
                      </Box>
                    ) : addDocsError ? (
                      <Box p={3}>
                        <Alert severity="error" style={{ marginBottom: 16 }}>
                          {addDocsError}
                        </Alert>
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            setAddDocsError(null);
                          }}
                        >
                          Try Again
                        </Button>
                      </Box>
                    ) : addDocsSuccess ? (
                      <Box textAlign="center" p={3}>
                        <Alert severity="success" style={{ marginBottom: 16 }}>
                          <Typography variant="body1">
                            Document changes have been successfully applied to the vector store.
                          </Typography>
                        </Alert>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setAddDocsSuccess(false);
                            if (onRefresh) {
                              onRefresh();
                            }
                          }}
                        >
                          Continue Managing Documents
                        </Button>
                      </Box>
                    ) : (
                      <DocumentSelector 
                        vectorStore={vectorStore}
                        existingDocuments={mappedData.documents}
                        onDocumentsSelected={handleDocumentsSelected}
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Query Test Tab */}
        <div role="tabpanel" className={classes.tabPanel} hidden={tabValue !== 1}>
          {tabValue === 1 ? (
            <QueryTester vectorStore={vectorStore} />
          ) : null}
        </div>
      </DialogContent>
      <DialogActions>
        {isEditing ? (
          <>
            <Button onClick={handleCancelEdit} color="default">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges} 
              color="primary" 
              variant="contained"
              disabled={isSaving || !editedName.trim()}
              startIcon={isSaving && <CircularProgress size={20} />}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} color="default">
              Close
            </Button>
          </>
        )}
      </DialogActions>

      {/* Note: The separate Add Documents Dialog has been removed as its functionality 
       * is now integrated directly into the Overview tab */}
    </>
  );
};

export default VectorStoreDetails; 