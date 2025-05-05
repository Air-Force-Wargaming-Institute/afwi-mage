import React from 'react';
import { 
  Paper, 
  Typography, 
  Button, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  makeStyles 
} from '@material-ui/core';
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    height: '100%', // Make it take full height of its container
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper, // Ensure background color
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(2), // Add space after divider
  },
  templateList: {
    flexGrow: 1, // Allow list to grow
    overflowY: 'auto', // Add scroll if needed
  },
  templateItem: {
    cursor: 'pointer',
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    marginBottom: theme.spacing(0.5), // Add space between items
  },
  button: {
    marginBottom: theme.spacing(2), // Add space below the button
  },
  divider: {
    margin: theme.spacing(2, 0), // Add vertical spacing around divider
  },
}));

const reportTemplates = [
  { id: 'exec_summary', name: 'Executive Summary', description: 'A concise overview for decision-makers.' },
  { id: 'bbp', name: 'Bullet Background Paper (BBP)', description: 'A concise background paper with bullet points.' },
  { id: 'bp', name: 'Background Paper (BP)', description: 'A comprehensive background paper.' },
  { id: 'tp', name: 'Talking Paper (TP)', description: 'A concise background paper with talking points.' },
  // Add more templates as needed
];

function NewReportOptions({ onCreateNew }) {
  const classes = useStyles();

  return (
    <Paper className={classes.root} elevation={3}>
      <GradientText variant="h6" component="h2" gutterBottom>
        Create New Report
      </GradientText>
      
      <Button 
        variant="contained" 
        color="primary" 
        fullWidth 
        onClick={() => onCreateNew()} // Call without template for custom
        className={classes.button}
      >
        Design Custom Report
      </Button>

      <Divider className={classes.divider} />

      <Typography variant="subtitle1" gutterBottom className={classes.subtitle} align="left">
        From Template:
      </Typography>
      <List className={classes.templateList} dense>
        {reportTemplates.map((template) => (
          <ListItem 
            key={template.id} 
            button 
            className={classes.templateItem} 
            onClick={() => onCreateNew(template)} // Pass template info
          >
            <ListItemText 
              primary={template.name} 
              secondary={template.description} 
              primaryTypographyProps={{ style: { fontWeight: 500 } }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default NewReportOptions; 