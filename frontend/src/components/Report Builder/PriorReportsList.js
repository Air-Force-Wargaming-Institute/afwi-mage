import React from 'react';
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
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    height: '100%', // Make it take full height
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper, // Ensure background color
  },
  listContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2), // Add space after title
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

// Mock data for prior reports
const mockReports = [
  { id: '1', name: 'Q1 Threat Assessment', description: 'Analysis of regional threats for Q1.', vectorStore: 'Intel Feed Store', type: 'Custom' },
  { id: '2', name: 'Operation Neptune Spear Debrief', description: 'Executive Summary of the operation.', vectorStore: 'Historical Ops DB', type: 'Executive Summary' },
  { id: '3', name: 'Blue Force Defense Plan', description: 'Detailed BBP for defensive posture.', vectorStore: 'Current Ops Data', type: 'BBP' },
];

function PriorReportsList({ onViewEdit }) {
  const classes = useStyles();
  // In a real implementation, fetch reports from an API
  const [reports, setReports] = React.useState(mockReports);

  const handleDelete = (reportId) => {
    // Logic to delete the report (e.g., API call)
    console.log("Deleting report:", reportId);
    setReports(reports.filter(report => report.id !== reportId));
  };

  return (
    <Paper className={classes.root} elevation={3}>
      <GradientText variant="h6" component="h2" gutterBottom>
        Prior Reports
      </GradientText>
      <Box className={classes.listContainer}>
        <List disablePadding>
          {reports.map((report) => (
            <ListItem 
              key={report.id} 
              button 
              className={classes.listItem} 
              onClick={() => onViewEdit(report)} // Pass the report data to the handler
            >
              <ListItemText
                primary={report.name}
                secondary={`Type: ${report.type} | Vector Store: ${report.vectorStore}`}
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
          ))}
          {reports.length === 0 && (
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