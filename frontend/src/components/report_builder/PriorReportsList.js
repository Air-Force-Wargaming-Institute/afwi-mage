import React, { useState, useEffect, useContext } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Box,
  CircularProgress,
  Snackbar,
  makeStyles,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { GradientText } from '../../styles/StyledComponents';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import { getGatewayUrl } from '../../config';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(1.5),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${theme.palette.divider}`,
    borderBottomLeftRadius: theme.shape.borderRadius * 2,
    borderBottomRightRadius: theme.shape.borderRadius * 2,
    overflow: 'hidden',
  },
  listContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
    position: 'relative',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.background.default,
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.action.hover,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.selected,
      },
    },
    '&::-webkit-scrollbar-corner': {
      background: 'transparent',
    },
  },
  listItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '& .report-name-clickable': {
      cursor: 'pointer',
      display: 'inline-block',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  errorMessage: {
    color: theme.palette.error.main,
    padding: theme.spacing(2),
    textAlign: 'center',
  },
}));

function PriorReportsList({ onViewEdit }) {
  const classes = useStyles();
  const { token } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [sortOption, setSortOption] = useState('updatedDesc');
  const [editingReportId, setEditingReportId] = useState(null);
  const [editingReportName, setEditingReportName] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use axios instead of fetch with proper headers
      const response = await axios.get(getGatewayUrl('/api/report_builder/reports'), {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
      
      setReports(response.data || []);
    } catch (e) {
      console.error("Failed to fetch reports:", e);
      let errorMessage = "Unknown error occurred";
      
      if (e.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", e.response.data);
        console.error("Error response status:", e.response.status);
        errorMessage = `Server error: ${e.response.status}`;
        
        if (e.response.status === 401 || e.response.status === 403) {
          errorMessage = "Authentication error. Please log in again.";
        }
      } else if (e.request) {
        // The request was made but no response was received
        errorMessage = "No response from server";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = e.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReports();
    } else {
      setError("Authentication required");
      setLoading(false);
    }
  }, [token]);

  // Apply sorting to the reports
  const getSortedReports = () => {
    if (!reports || reports.length === 0) return [];
    
    const sortedReports = [...reports];
    
    switch (sortOption) {
      case 'nameAsc':
        return sortedReports.sort((a, b) => a.name.localeCompare(b.name));
      case 'nameDesc':
        return sortedReports.sort((a, b) => b.name.localeCompare(a.name));
      case 'updatedAsc':
        return sortedReports.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      case 'updatedDesc':
      default:
        return sortedReports.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
  };

  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  const startEditReportName = (event, report) => {
    event.stopPropagation(); // Prevent ListItem's main onClick (onViewEdit)
    setEditingReportId(report.id);
    setEditingReportName(report.name);
  };

  const cancelEditReportName = () => {
    setEditingReportId(null);
    setEditingReportName('');
  };

  const handleEditingNameChange = (event) => {
    setEditingReportName(event.target.value);
  };

  const handleSaveOrCancelEdit = (event) => {
    if (event.relatedTarget && event.relatedTarget.tagName !== 'INPUT') {
      handleSaveReportName();
    } else if (!event.relatedTarget) {
      handleSaveReportName();
    }
  };

  const handleEditingKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveReportName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditReportName();
    }
  };

  const handleSaveReportName = async () => {
    if (!editingReportId || !editingReportName.trim()) {
      setEditingReportId(null);
      setEditingReportName('');
      // If name was cleared, refresh to show original name or handle as desired
      if (editingReportId) fetchReports(); 
      return;
    }

    const originalReport = reports.find(r => r.id === editingReportId);
    if (originalReport && originalReport.name === editingReportName.trim()) {
      setEditingReportId(null);
      setEditingReportName('');
      return; // Name hasn't changed
    }

    try {
      await axios.put(
        getGatewayUrl(`/api/report_builder/reports/${editingReportId}`),
        { name: editingReportName.trim() }, // API expects an object with the name
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSnackbarMessage('Report name updated successfully');
      setSnackbarOpen(true);
      fetchReports(); // Refresh the list
    } catch (e) {
      console.error("Failed to update report name:", e);
      setSnackbarMessage(`Error updating report name: ${e.response?.data?.detail || e.message}`);
      setSnackbarOpen(true);
    } finally {
      setEditingReportId(null);
      setEditingReportName('');
    }
  };

  const handleDelete = async (reportId) => {
    try {
      const response = await axios.delete(getGatewayUrl(`/api/report_builder/reports/${reportId}`), {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update UI after successful deletion
      setReports(prev => prev.filter(report => report.id !== reportId));
      setSnackbarMessage('Report deleted successfully');
      setSnackbarOpen(true);
    } catch (e) {
      console.error("Failed to delete report:", e);
      setSnackbarMessage(`Error deleting report: ${e.response?.status || e.message}`);
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Paper className={classes.root} elevation={3}>
        <GradientText variant="h6" component="h2" gutterBottom>
          Prior Reports
        </GradientText>
        <Box className={classes.loadingContainer}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className={classes.root} elevation={3}>
        <GradientText variant="h6" component="h2" gutterBottom>
          Prior Reports
        </GradientText>
        <Typography className={classes.errorMessage}>
          Error loading reports: {error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper className={classes.root} elevation={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <GradientText variant="h5" component="h2">
          Prior Reports
        </GradientText>
        <FormControl variant="outlined" size="small" style={{ minWidth: 150 }}>
          <InputLabel id="sort-reports-label">Sort By</InputLabel>
          <Select
            labelId="sort-reports-label"
            value={sortOption}
            onChange={handleSortChange}
            label="Sort By"
          >
            <MenuItem value="updatedDesc">Last Updated (Newest)</MenuItem>
            <MenuItem value="updatedAsc">Last Updated (Oldest)</MenuItem>
            <MenuItem value="nameAsc">Name (A-Z)</MenuItem>
            <MenuItem value="nameDesc">Name (Z-A)</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {loading && (
        <div className={classes.loadingContainer}>
          <CircularProgress />
          <Typography style={{ marginLeft: '10px' }}>Loading reports...</Typography>
        </div>
      )}
      {error && <Typography className={classes.errorMessage}>{error}</Typography>}
      {!loading && !error && reports.length === 0 && (
        <Typography style={{ textAlign: 'center', padding: '20px' }}>No prior reports found.</Typography>
      )}
      {!loading && !error && reports.length > 0 && (
        <Box className={classes.listContainer}>
          <List disablePadding>
            {getSortedReports().map((report) => (
              <ListItem 
                key={report.id} 
                divider 
                className={classes.listItem}
                onClick={editingReportId !== report.id ? () => onViewEdit(report) : undefined}
                button={editingReportId !== report.id}
              >
                {editingReportId === report.id ? (
                  <TextField
                    fullWidth
                    value={editingReportName}
                    onChange={handleEditingNameChange}
                    onKeyDown={handleEditingKeyDown}
                    onBlur={handleSaveOrCancelEdit}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    variant="outlined"
                    size="small"
                    style={{ margin: '5px 0'}}
                  />
                ) : (
                  <ListItemText
                    primary={
                      <span 
                        className="report-name-clickable"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditReportName(e, report);
                        }}
                      >
                        {report.name}
                      </span>
                    }
                    secondary={`Last updated: ${new Date(report.updatedAt).toLocaleDateString()}`}
                  />
                )}
                {editingReportId !== report.id && (
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(report.id);
                      }}
                      title="Delete Report"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Paper>
  );
}

export default PriorReportsList; 