import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Box, 
  makeStyles 
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import { GradientText } from '../../styles/StyledComponents';
import { mockReports } from './mockReports';

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
}));

function PriorReportsList({ onViewEdit }) {
  const classes = useStyles();
  const [reports, setReports] = useState(mockReports);

  useEffect(() => {
    const fetchReports = async () => {
      // setLoading(true); // If using loading state
      // setError(null); // If using error state
      try {
        const response = await fetch('/api/report_builder/reports');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setReports(data);
      } catch (e) {
        console.error("Failed to fetch reports:", e);
        // setError(e.message); // If using error state
        // setReports([]); // Clear reports or show an error message
      } finally {
        // setLoading(false); // If using loading state
      }
    };

    fetchReports();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleDelete = async (reportId) => {
    // For now, optimistic UI update.
    // For backend deletion, you would uncomment and implement the following:
    /*
    try {
      const response = await fetch(`/api/report_builder/reports/${reportId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete report from backend');
      }
      // If successful, then update UI. The local filter is one way.
      // Another way is to re-fetch the list: fetchReports();
      setReports(prev => prev.filter(report => report.id !== reportId));
    } catch (e) {
      console.error("Failed to delete report:", e);
      // Optionally revert UI change or show an error message to the user
      // alert(`Error deleting report: ${e.message}`);
    }
    */
    // Current behavior: Optimistic UI update only
    setReports(prev => prev.filter(report => report.id !== reportId));
  };

  return (
    <Paper className={classes.root} elevation={3}>
      <GradientText variant="h6" component="h2" gutterBottom>
        Prior Reports
      </GradientText>
      <Box className={classes.listContainer}>
        <List disablePadding>
          {reports && reports.length > 0 ? (
            reports.map((report) => (
              <ListItem 
                key={report.id} 
                button 
                className={classes.listItem} 
                onClick={() => onViewEdit(report)}
              >
                <ListItemText
                  primary={report.name}
                  secondary={report.description}
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
    </Paper>
  );
}

export default PriorReportsList; 