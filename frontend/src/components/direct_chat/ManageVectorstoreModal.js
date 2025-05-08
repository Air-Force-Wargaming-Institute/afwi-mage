// ManageVectorstoreModal.js contains the modal for managing vectorstores associated with a chat session.

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
  Typography,
  LinearProgress,
  makeStyles
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import CheckIcon from '@material-ui/icons/Check';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import DocumentSelector from '../retriever_systems/vectorestores/DocumentSelector'; // Adjust path if needed
import { getVectorStoreById, batchUpdateVectorStore, getJobStatus } from '../../services/vectorStoreService'; // Adjust path if needed
import { AuthContext } from '../../contexts/AuthContext'; // Adjust path if needed

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    padding: theme.spacing(2),
    minHeight: '70vh', // Ensure minimum height
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  documentSelectorContainer: {
    flexGrow: 1, // Allow DocumentSelector to take up space
    overflow: 'hidden', // Prevent internal overflow issues if any
    display: 'flex',
    flexDirection: 'column',
  },
  progressContainer: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
  },
  progressText: {
    marginBottom: theme.spacing(1),
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.success.main,
  }
}));

const ManageVectorstoreModal = ({ open, onClose, vectorStoreId, token, onDocumentsUpdated }) => {
  const classes = useStyles();
  const [loadingStore, setLoadingStore] = useState(false);
  const [storeDetails, setStoreDetails] = useState(null);
  const [storeError, setStoreError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null); // { processed, total, status, currentFile, currentOperation }
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState({ documentsToAdd: [], documentsToRemove: [] });

  // Fetch vector store details when modal opens
  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!vectorStoreId) {
        setStoreDetails(null);
        setStoreError("No Vector Store ID provided.");
        return;
      }
      setLoadingStore(true);
      setStoreError(null);
      setStoreDetails(null); // Clear previous details
      setUpdateSuccess(false); // Reset success state
      setUpdateError(null);
      setUpdateProgress(null);
      setIsUpdating(false);

      try {
        const details = await getVectorStoreById(vectorStoreId, token);
        setStoreDetails(details);
      } catch (err) {
        console.error("Error fetching store details:", err);
        setStoreError(err.response?.data?.detail || "Failed to load vector store details.");
      } finally {
        setLoadingStore(false);
      }
    };

    if (open) {
      fetchStoreDetails();
    }
  }, [open, vectorStoreId, token]);

  // Poll for job status (adapted from VectorStoreDetails)
  const pollJobStatus = useCallback(async (jobId) => {
    const checkStatus = async () => {
      try {
        const status = await getJobStatus(jobId, token);
        if (status) {
          setUpdateProgress({
            processed: status.processed_items || 0,
            total: status.total_items || 1,
            status: status.status,
            currentFile: status.details?.current_file || status.details?.current_progress?.current_file || null,
            currentOperation: status.details?.current_operation || status.details?.current_progress?.current_operation || null
          });

          if (status.status === 'completed') {
            setIsUpdating(false);
            setUpdateSuccess(true);
            if (onDocumentsUpdated) onDocumentsUpdated(); // Trigger refresh in parent
            // Keep modal open on success to show message
          } else if (status.status === 'failed') {
            setIsUpdating(false);
            setUpdateError(status.error || "Document update job failed");
          } else {
            setTimeout(checkStatus, 2000); // Continue polling
          }
        } else {
          // Handle case where job finishes very quickly or status is missing
          console.warn("Job status returned empty, assuming success.");
          setIsUpdating(false);
          setUpdateSuccess(true);
          if (onDocumentsUpdated) onDocumentsUpdated();
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // Job finished and removed from queue
          console.log("Job status 404, assuming success.");
          setIsUpdating(false);
          setUpdateSuccess(true);
          if (onDocumentsUpdated) onDocumentsUpdated();
        } else {
          console.error("Error polling job status:", error);
          setUpdateError("Error checking update progress: " + (error.message || "Unknown error"));
          setIsUpdating(false);
        }
      }
    };
    checkStatus();
  }, [token, onDocumentsUpdated]);

  // Handle document selection changes from DocumentSelector
  const handleDocumentsSelected = (selected) => {
    // Store the selections to be used when the user confirms
    setSelectedChanges(selected);
  };

  // Handle the actual update confirmation
  const handleConfirmUpdate = async () => {
    const { documentsToAdd, documentsToRemove } = selectedChanges;

    if ((!documentsToAdd || documentsToAdd.length === 0) && (!documentsToRemove || documentsToRemove.length === 0)) {
      setUpdateError("No documents selected for addition or removal.");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    setUpdateProgress({ processed: 0, total: (documentsToAdd?.length || 0) + (documentsToRemove?.length || 0), status: "Starting update...", currentFile: null, currentOperation: "initializing" });

    try {
      const operations = {
        add: documentsToAdd?.map(doc => doc.path) || null,
        remove: documentsToRemove || null // Pass the array of document IDs
      };

      console.log("Submitting batch update:", operations);
      const result = await batchUpdateVectorStore(vectorStoreId, operations, token);
      console.log("Batch update response:", result);

      if (result && result.job_id) {
        pollJobStatus(result.job_id);
      } else {
        // Assume immediate success if no job ID
        setIsUpdating(false);
        setUpdateSuccess(true);
        if (onDocumentsUpdated) onDocumentsUpdated();
      }
    } catch (error) {
      console.error("Error updating vector store documents:", error);
      setUpdateError(error.response?.data?.detail || error.message || "Failed to start document update job.");
      setIsUpdating(false);
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!updateProgress || !updateProgress.total) return 0;
    return Math.round((updateProgress.processed / updateProgress.total) * 100);
  };

  // Determine if confirm button should be disabled
  const isConfirmDisabled = isUpdating || loadingStore || !storeDetails || (!selectedChanges.documentsToAdd?.length && !selectedChanges.documentsToRemove?.length);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Manage Documents in Vector Store: {storeDetails?.name || 'Loading...'}</DialogTitle>
      <DialogContent className={classes.dialogContent} dividers>
        {loadingStore && (
          <div className={classes.loadingContainer}>
            <CircularProgress />
            <Typography style={{ marginLeft: 16 }}>Loading vector store details...</Typography>
          </div>
        )}
        {storeError && !loadingStore && (
          <Alert severity="error">Error loading details: {storeError}</Alert>
        )}
        {!loadingStore && !storeError && storeDetails && (
          <div className={classes.documentSelectorContainer}>
            <DocumentSelector
              vectorStore={storeDetails}
              // Ensure we pass the correct structure for existing documents
              existingDocuments={storeDetails.files || []}
              onDocumentsSelected={handleDocumentsSelected} // Pass the handler
            />
          </div>
        )}

        {/* Update Progress/Status Display */}
        {(isUpdating || updateError || updateSuccess) && (
          <Box className={classes.progressContainer}>
            {isUpdating && updateProgress && (
              <>
                <Typography variant="h6" className={classes.progressText}>
                  Updating Documents... ({updateProgress.processed}/{updateProgress.total})
                </Typography>
                <LinearProgress variant="determinate" value={getProgressPercentage()} style={{ width: '100%', marginBottom: 8 }} />
                {updateProgress.currentOperation && (
                  <Typography variant="body2" color="textSecondary">
                    Operation: {updateProgress.currentOperation}
                  </Typography>
                )}
                 {updateProgress.currentFile && (
                  <Typography variant="body2" color="textSecondary" style={{ wordBreak: 'break-all' }}>
                    File: {updateProgress.currentFile}
                  </Typography>
                )}
                 <Typography variant="body2" color="textSecondary">
                    Status: {updateProgress.status}
                  </Typography>
              </>
            )}
            {updateError && !isUpdating && (
              <Alert severity="error" icon={<ErrorIcon fontSize="inherit" />}>
                Update Failed: {updateError}
              </Alert>
            )}
            {updateSuccess && !isUpdating && (
               <Alert severity="success" icon={<CheckIcon fontSize="inherit" />} className={classes.successMessage}>
                  Documents updated successfully!
               </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isUpdating}>
          {updateSuccess ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleConfirmUpdate}
          color="primary"
          variant="contained"
          disabled={isConfirmDisabled}
          startIcon={isUpdating && <CircularProgress size={20} />}
        >
          {isUpdating ? 'Updating...' : 'Apply Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageVectorstoreModal;