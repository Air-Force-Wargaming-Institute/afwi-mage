import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Tooltip,
  Chip,
  Fade
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import NewReleasesIcon from '@material-ui/icons/NewReleases';
import SettingsIcon from '@material-ui/icons/Settings';
import FlagIcon from './FlagIcon';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  nationsList: {
    flexGrow: 1,
    overflow: 'auto',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    padding: 0,
  },
  panelTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(1),
    display: 'inline-block',
  },
  emptyNationsList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: theme.spacing(3),
  },
  listItem: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    transition: 'all 0.3s ease',
  },
  recentlyAddedItem: {
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  },
  configuredChip: {
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.success.dark,
    color: theme.palette.common.white,
    fontSize: '0.7rem',
  },
  notConfiguredChip: {
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.warning.dark,
    color: theme.palette.common.white,
    fontSize: '0.7rem',
  },
  newChip: {
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.common.white,
    fontSize: '0.7rem',
  },
  listItemTextPrimary: {
    display: 'flex',
    alignItems: 'center',
  },
  addEntityButton: {
    marginTop: theme.spacing(2),
  },
  countBadge: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    marginLeft: theme.spacing(1),
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  entityCount: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem',
  },
  configPrompt: {
    textAlign: 'center',
    margin: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    border: '1px dashed rgba(66, 133, 244, 0.5)',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  },
  configureButton: {
    minWidth: 'auto',
    padding: theme.spacing(0.5, 1.5),
    fontSize: '0.75rem',
    marginRight: theme.spacing(1)
  }
}));

function NationConfigPane({ 
  nations = [], 
  onConfigureNation, 
  onRemoveNation, 
  onAddOrganization,
  recentlyAddedId
}) {
  const classes = useStyles();
  const unconfiguredCount = nations.filter(nation => !nation.isConfigured).length;

  return (
    <Box className={classes.root}>
      <Box className={classes.titleContainer}>
        <Typography variant="h6" className={classes.panelTitle}>
          Activated Entities
        </Typography>
        
        {nations.length > 0 && (
          <Box className={classes.entityCount}>
            <Typography variant="body2">
              {nations.length} {nations.length === 1 ? 'entity' : 'entities'}
            </Typography>
          </Box>
        )}
      </Box>
      
      <Paper className={classes.nationsList} elevation={2}>
        {nations.length > 0 ? (
          <>
            <List>
              {nations.map((entity) => (
                <ListItem 
                  key={entity.entityId} 
                  className={`${classes.listItem} ${entity.entityId === recentlyAddedId ? classes.recentlyAddedItem : ''}`}
                >
                  <Box mr={2}>
                    <FlagIcon entityId={entity.entityId} entityType={entity.entityType} />
                  </Box>
                  <ListItemText 
                    primary={
                      <Box className={classes.listItemTextPrimary}>
                        {entity.entityName}
                        {entity.isConfigured ? (
                          <Tooltip title="Fully configured">
                            <Chip 
                              label="Configured" 
                              size="small" 
                              className={classes.configuredChip}
                              icon={<CheckCircleIcon style={{ fontSize: 16 }} />}
                            />
                          </Tooltip>
                        ) : entity.entityId === recentlyAddedId ? (
                          <Tooltip title="Newly added - needs configuration">
                            <Chip 
                              label="New" 
                              size="small" 
                              className={classes.newChip}
                              icon={<NewReleasesIcon style={{ fontSize: 16 }} />}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Needs configuration">
                            <Chip 
                              label="Not Configured" 
                              size="small" 
                              className={classes.notConfiguredChip}
                              icon={<ErrorIcon style={{ fontSize: 16 }} />}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction className={classes.actionButtons}>
                    <Button
                      variant="outlined"
                      size="small"
                      color={entity.entityId === recentlyAddedId ? "primary" : "default"}
                      startIcon={<SettingsIcon />}
                      onClick={() => onConfigureNation(entity)}
                      className={classes.configureButton}
                    >
                      Configure
                    </Button>
                    <Tooltip title="Remove entity">
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => onRemoveNation(entity.entityId)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            
            {unconfiguredCount > 0 && (
              <Fade in={true}>
                <Box className={classes.configPrompt}>
                  <Typography variant="body2">
                    {unconfiguredCount === 1 
                      ? "1 entity needs configuration" 
                      : `${unconfiguredCount} entities need configuration`}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Configure each entity to define its strategic posture & disposition
                  </Typography>
                </Box>
              </Fade>
            )}
          </>
        ) : (
          <Box className={classes.emptyNationsList}>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              No nations or organizations added yet
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Select countries from the map or add organizations manually
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Button 
        variant="contained" 
        color="primary" 
        startIcon={<AddIcon />} 
        className={classes.addEntityButton}
        onClick={onAddOrganization}
      >
        Add Organization
      </Button>
    </Box>
  );
}

export default NationConfigPane; 