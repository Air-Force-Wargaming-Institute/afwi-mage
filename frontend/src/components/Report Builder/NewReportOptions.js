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
  makeStyles,
  CircularProgress
} from '@material-ui/core';
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(1.5),
    height: '100%', // Make it take full height of its container
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper, // Ensure background color
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${theme.palette.divider}`,
    borderBottomLeftRadius: theme.shape.borderRadius * 2,
    borderBottomRightRadius: theme.shape.borderRadius * 2,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    fontWeight: 500,
  },
  templateList: {
    flexGrow: 1,
    overflowY: 'auto',
    overflowX: 'hidden', // Prevent horizontal scrolling
    marginBottom: theme.spacing(2),
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
  templateItem: {
    cursor: 'pointer',
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(0.5),
    transition: 'all 0.2s ease-in-out',
    whiteSpace: 'nowrap', // Prevent text wrapping
    overflow: 'hidden', // Hide overflow
    textOverflow: 'ellipsis', // Show ellipsis for overflow text
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateX(4px)',
    },
    '&:last-child': {
      marginBottom: 0,
    },
  },
  button: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1.5),
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
  },
  divider: {
    margin: theme.spacing(1, 0),
    backgroundColor: theme.palette.divider,
  },
  listItemText: {
    '& .MuiListItemText-primary': {
      fontWeight: 500,
      color: theme.palette.text.primary,
    },
    '& .MuiListItemText-secondary': {
      color: theme.palette.text.secondary,
      fontSize: '0.875rem',
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
    flexGrow: 1,
  },
}));

function NewReportOptions({ onCreateNew, onCreateTemplate, templates = [] }) {
  const classes = useStyles();

  const handleSelectTemplate = (template) => {
    onCreateNew({ type: 'template', data: template });
  };

  return (
    <Paper className={classes.root} elevation={3}>
      <GradientText variant="h6" component="h2" gutterBottom>
        Create New Report
      </GradientText>
      
      <Button 
        variant="contained" 
        color="primary" 
        fullWidth 
        onClick={() => onCreateNew({ type: 'custom' })}
        className={classes.button}
      >
        Design Custom Report
      </Button>

      <Divider className={classes.divider} />

      <Typography variant="subtitle1" gutterBottom className={classes.subtitle} align="left">
        From Template:
      </Typography>
      
      {templates.length === 0 ? (
        <Box className={classes.loadingContainer}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List className={classes.templateList} dense>
          {templates.map((template) => (
            <ListItem 
              key={template.id} 
              button 
              className={classes.templateItem} 
              onClick={() => handleSelectTemplate(template)}
            >
              <ListItemText 
                primary={template.name} 
                secondary={template.description} 
                primaryTypographyProps={{ style: { fontWeight: 500 } }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Divider className={classes.divider} />

      <Button 
        variant="outlined" 
        color="secondary" 
        fullWidth 
        onClick={onCreateTemplate}
        className={classes.button}
        style={{ marginTop: 'auto' }}
        disabled={true}
      >
        Create New Template (Coming Soon)
      </Button>
    </Paper>
  );
}

export default NewReportOptions; 