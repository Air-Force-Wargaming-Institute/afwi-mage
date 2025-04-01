import React, { useState, useEffect, useContext, useCallback } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Chip,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * JobMonitor component for tracking and displaying status of long-running operations
 * 
 * @param {Object} props Component properties
 * @param {Function} props.onViewResults Callback when user clicks to view results
 * @param {boolean} props.showAll Whether to show all jobs or just the active one
 */
const JobMonitor = ({ onViewResults, showAll = false }) => {
  // Get job management functions from context
  const { 
    jobs, 
    activeJobId, 
    getJobStatus, 
    listJobs, 
    cancelJob, 
    setActiveJobId,
    isLoading,
    apiBaseUrl,
    setActiveView,
    fetchSpreadsheets
  } = useContext(WorkbenchContext);
  
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // Function to format relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const jobTime = new Date(timestamp);
    const diffSeconds = Math.floor((now - jobTime) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    return `${Math.floor(diffSeconds / 86400)} days ago`;
  };
  
  // Toggle job details expansion
  const toggleJobExpansion = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };
  
  // Poll for job updates
  const pollJobStatus = useCallback(async () => {
    if (!activeJobId) return;
    
    const activeJob = jobs.find(job => job.id === activeJobId);
    if (!activeJob) return;
    
    // Only poll for jobs that are not in a terminal state
    if (['completed', 'failed', 'cancelled'].includes(activeJob.status)) {
      // Clear polling interval for completed jobs
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      // Refresh spreadsheet list when a job completes
      if (activeJob.status === 'completed' && activeJob.result && activeJob.result.spreadsheet_id) {
        console.log('Job completed with spreadsheet ID, refreshing list:', activeJob.result.spreadsheet_id);
        fetchSpreadsheets();
      }
      return;
    }
    
    try {
      await getJobStatus(activeJobId);
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  }, [activeJobId, jobs, getJobStatus, pollingInterval, fetchSpreadsheets]);
  
  // Set up polling when activeJobId changes
  useEffect(() => {
    if (activeJobId) {
      // Poll immediately
      pollJobStatus();
      
      // Set up interval for polling
      if (!pollingInterval) {
        const interval = setInterval(pollJobStatus, 3000); // Poll every 3 seconds
        setPollingInterval(interval);
      }
    }
    
    // Cleanup function to clear interval
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [activeJobId, pollJobStatus, pollingInterval]);
  
  // Initial load of jobs
  useEffect(() => {
    listJobs();
    
    // Cleanup function
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [listJobs]);
  
  // Handle job cancellation
  const handleCancelJob = async (jobId) => {
    try {
      await cancelJob(jobId);
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };
  
  // Helper to get color based on job status
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      case 'running': return 'primary';
      default: return 'default';
    }
  };
  
  // Helper to get icon based on job status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'cancelled': return <CancelIcon color="warning" />;
      case 'running': return <PlayArrowIcon color="primary" />;
      case 'paused': return <PauseIcon color="info" />;
      default: return <CircularProgress size={20} />;
    }
  };
  
  // Filter jobs to show
  const jobsToShow = showAll ? jobs : jobs.filter(job => job.id === activeJobId);
  
  // Render no jobs message
  if (jobsToShow.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body1" align="center" color="textSecondary">
          No active jobs to display.
        </Typography>
        <Box display="flex" justifyContent="center" mt={1}>
          <Button 
            startIcon={<RefreshIcon />}
            onClick={() => listJobs()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 1.5 }}>
        <Typography variant="h6">
          {showAll ? 'All Jobs' : 'Active Job'}
        </Typography>
      </Box>
      
      <List disablePadding>
        {jobsToShow.map(job => (
          <React.Fragment key={job.id}>
            <ListItem
              button
              onClick={() => toggleJobExpansion(job.id)}
              selected={job.id === activeJobId}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center">
                    {getStatusIcon(job.status)}
                    <Typography variant="body1" sx={{ ml: 1 }}>
                      {job.type === 'column_transformation' ? 'Column Transformation' : job.type}
                    </Typography>
                    <Chip 
                      label={job.status} 
                      size="small" 
                      color={getStatusColor(job.status)} 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                secondary={formatRelativeTime(job.created_at)}
              />
              <ListItemSecondaryAction>
                {job.status === 'running' && (
                  <IconButton
                    edge="end"
                    aria-label="cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelJob(job.id);
                    }}
                  >
                    <CancelIcon />
                  </IconButton>
                )}
                {expandedJobId === job.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Collapse in={expandedJobId === job.id} timeout="auto" unmountOnExit>
              <Box p={2} bgcolor="background.level1">
                {/* Progress indicator */}
                {['running', 'submitted'].includes(job.status) && (
                  <Box mb={2}>
                    <Typography variant="body2" gutterBottom>
                      Progress: {job.progress || 0}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={job.progress || 0} 
                      color="primary"
                    />
                  </Box>
                )}
                
                {/* Job details */}
                <Typography variant="subtitle2" gutterBottom>
                  Job Details:
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2">
                    ID: {job.id}
                  </Typography>
                  <Typography variant="body2">
                    Created: {new Date(job.created_at).toLocaleString()}
                  </Typography>
                  {job.completed_at && (
                    <Typography variant="body2">
                      Completed: {new Date(job.completed_at).toLocaleString()}
                    </Typography>
                  )}
                  {job.message && (
                    <Alert severity={job.status === 'failed' ? 'error' : 'info'} sx={{ mt: 1 }}>
                      {job.message}
                    </Alert>
                  )}
                </Box>
                
                {/* Actions based on job status */}
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  {job.status === 'completed' && job.result && job.result.spreadsheet_id && (
                    <Tooltip title="Download results">
                      <Button
                        startIcon={<DownloadIcon />}
                        onClick={() => {
                          // Build download URL from spreadsheet_id
                          const baseUrl = apiBaseUrl.endsWith('/') 
                            ? `${apiBaseUrl}api/workbench/spreadsheets` 
                            : `${apiBaseUrl}/api/workbench/spreadsheets`;
                          window.open(`${baseUrl}/${job.result.spreadsheet_id}/download`, '_blank');
                        }}
                      >
                        Download
                      </Button>
                    </Tooltip>
                  )}
                  
                  {job.status === 'completed' && onViewResults && (
                    <Button
                      onClick={() => onViewResults(job)}
                      color="primary"
                      variant="contained"
                      sx={{ ml: 1 }}
                    >
                      View Results
                    </Button>
                  )}

                  {/* Add a button to show the transformed spreadsheet in the library */}
                  {job.status === 'completed' && job.result && job.result.spreadsheet_id && (
                    <Button
                      onClick={() => {
                        // Navigate to library view and refresh
                        setActiveView('library');
                        fetchSpreadsheets();
                      }}
                      color="secondary"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    >
                      Show in Library
                    </Button>
                  )}
                </Box>
              </Box>
            </Collapse>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default JobMonitor; 