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
  InputLabel
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <GradientText variant="h6" component="h2" gutterBottom>
          Prior Reports
        </GradientText>
        <FormControl variant="outlined" size="small" style={{ minWidth: 150 }}>
          <InputLabel id="sort-reports-label">Sort By</InputLabel>
          <Select
            labelId="sort-reports-label"
            id="sort-reports"
            value={sortOption}
            onChange={handleSortChange}
            label="Sort By"
          >
            <MenuItem value="updatedDesc">Most Recently Updated</MenuItem>
            <MenuItem value="updatedAsc">Least Recently Updated</MenuItem>
            <MenuItem value="nameAsc">Name (A-Z)</MenuItem>
            <MenuItem value="nameDesc">Name (Z-A)</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box className={classes.listContainer}>
        <List disablePadding>
          {reports && reports.length > 0 ? (
            getSortedReports().map((report) => (
              <ListItem 
                key={report.id} 
                button 
                className={classes.listItem} 
                onClick={() => onViewEdit(report)}
              >
                <ListItemText
                  primary={report.name}
                  secondary={
                    <>
                      {report.description}
                      <Typography variant="caption" display="block" style={{ marginTop: 4 }}>
                        <span style={{ fontWeight: 500 }}>Status:</span> {report.status.charAt(0).toUpperCase() + report.status.slice(1)} 
                        {' | '}
                        <span style={{ fontWeight: 500 }}>Updated:</span> {new Date(report.updatedAt).toLocaleString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: false
                        })}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{ style: { fontWeight: 500 } }}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="edit" onClick={(e) => { e.stopPropagation(); onViewEdit(report); }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="No prior reports found." />
            </ListItem>
          )}
        </List>
      </Box>
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