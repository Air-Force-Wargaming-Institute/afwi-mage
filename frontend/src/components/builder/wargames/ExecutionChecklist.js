import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Collapse,
  Divider,
  LinearProgress,
  Button,
  IconButton,
  Grid
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import InfoIcon from '@material-ui/icons/Info';
import { GradientText } from '../../../styles/StyledComponents';
import FlagIcon from './FlagIcon';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(1),
    display: 'inline-block',
  },
  formLabel: {
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    fontSize: '1.4rem',
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(0.3),
    display: 'inline-block',
  },
  progress: {
    marginBottom: theme.spacing(3),
    height: 12,
    borderRadius: 6,
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  progressPercentage: {
    fontWeight: 700,
    color: theme.palette.primary.main,
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  listItem: {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
  },
  completedItem: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(52, 168, 83, 0.15)',
    },
  },
  incompleteItem: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(234, 67, 53, 0.15)',
    },
  },
  checkIcon: {
    color: theme.palette.success.main,
  },
  errorIcon: {
    color: theme.palette.error.main,
  },
  detailList: {
    paddingLeft: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  detailItem: {
    padding: theme.spacing(0.5, 1),
  },
  entityList: {
    marginTop: theme.spacing(1),
  },
  entityItem: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.shape.borderRadius,
  },
  entityFlag: {
    marginRight: theme.spacing(1),
  },
  entityName: {
    flexGrow: 1,
  },
  statusSummary: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readyStatus: {
    backgroundColor: 'rgba(52, 168, 83, 0.2)',
    borderLeft: `4px solid ${theme.palette.success.main}`,
  },
  notReadyStatus: {
    backgroundColor: 'rgba(234, 67, 53, 0.2)',
    borderLeft: `4px solid ${theme.palette.error.main}`,
  },
  statusText: {
    fontWeight: 500,
  },
  statusActions: {
    display: 'flex',
    alignItems: 'center',
  },
  dimeSection: {
    marginLeft: theme.spacing(4),
    marginTop: theme.spacing(1),
  },
  dimeItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  dimeLabel: {
    width: 120,
    fontWeight: 500,
  },
  dimeStatus: {
    marginLeft: theme.spacing(1),
  },
  dimeComplete: {
    color: theme.palette.success.main,
  },
  dimeIncomplete: {
    color: theme.palette.error.main,
  },
}));

/**
 * Component that validates and displays the execution readiness of a wargame
 */
const ExecutionChecklist = ({ wargameData }) => {
  const classes = useStyles();
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: false,
    scenarioContext: false,
    simulationParams: false,
    entities: false,
  });
  const [validationResults, setValidationResults] = useState(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Toggle expanded section
  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Validate the wargame data whenever it changes
  useEffect(() => {
    if (wargameData) {
      const results = validateWargameData(wargameData);
      setValidationResults(results);
      
      // Calculate overall completion percentage
      let totalItems = 0;
      let completedItems = 0;
      
      // Count basic info items
      Object.values(results.basicInfo.items).forEach(item => {
        totalItems++;
        if (item.status === 'complete') completedItems++;
      });
      
      // Count scenario context items
      Object.values(results.scenarioContext.items).forEach(item => {
        totalItems++;
        if (item.status === 'complete') completedItems++;
      });
      
      // Count simulation params items
      Object.values(results.simulationParams.items).forEach(item => {
        totalItems++;
        if (item.status === 'complete') completedItems++;
      });
      
      // Count entity items (with multiplier for DIME sections)
      if (results.entities.items) {
        Object.values(results.entities.items).forEach(entity => {
          // Count each DIME section plus relationships
          totalItems += 5; // D, I, M, E, relationships
          if (entity.diplomacy === 'complete') completedItems++;
          if (entity.information === 'complete') completedItems++;
          if (entity.military === 'complete') completedItems++;
          if (entity.economic === 'complete') completedItems++;
          if (entity.relationships === 'complete') completedItems++;
        });
      }
      
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      setCompletionPercentage(percentage);
    }
  }, [wargameData]);

  // Helper function to validate wargame data
  const validateWargameData = (data) => {
    // Initialize results structure
    const results = {
      overallStatus: 'incomplete',
      basicInfo: {
        status: 'incomplete',
        items: {
          name: { 
            status: data?.name ? 'complete' : 'incomplete',
            message: 'Wargame name is required'
          },
          securityClassification: {
            status: data?.securityClassification ? 'complete' : 'incomplete',
            message: 'Security classification is required'
          },
          designer: {
            status: data?.designer ? 'complete' : 'incomplete',
            message: 'Designer name is required'
          }
        }
      },
      scenarioContext: {
        status: 'incomplete',
        items: {
          roadToWar: {
            status: data?.roadToWar?.trim() ? 'complete' : 'incomplete',
            message: 'Road to War narrative is required'
          },
          researchObjectives: {
            status: Array.isArray(data?.researchObjectives) && data?.researchObjectives.length > 0 ? 'complete' : 'incomplete',
            message: 'At least one research objective is required'
          }
        }
      },
      simulationParams: {
        status: 'incomplete',
        items: {
          numberOfIterations: {
            status: data?.numberOfIterations && data.numberOfIterations > 0 ? 'complete' : 'incomplete',
            message: 'Number of iterations must be greater than 0'
          },
          numberOfMoves: {
            status: data?.numberOfMoves && data.numberOfMoves > 0 ? 'complete' : 'incomplete',
            message: 'Number of moves must be greater than 0'
          },
          timeHorizon: {
            status: data?.timeHorizon?.trim() ? 'complete' : 'incomplete',
            message: 'Time horizon is required'
          }
        }
      },
      entities: {
        status: 'incomplete',
        items: {}
      }
    };

    // Validate entities
    if (data?.activatedEntities && data.activatedEntities.length > 0) {
      if (data.activatedEntities.length < 2) {
        results.entities.message = 'At least 2 nations/organizations required';
      } else {
        // For each entity, check DIME configuration
        data.activatedEntities.forEach(entity => {
          const entityResults = {
            status: 'incomplete',
            diplomacy: entity.configData?.diplomacy?.objectives ? 'complete' : 'incomplete',
            information: entity.configData?.information?.objectives ? 'complete' : 'incomplete',
            military: entity.configData?.military?.objectives ? 'complete' : 'incomplete',
            economic: entity.configData?.economic?.objectives ? 'complete' : 'incomplete',
            relationships: Object.keys(entity.configData?.relationships || {}).length > 0 ? 'complete' : 'incomplete',
            message: ''
          };
          
          // Build message for incomplete sections
          const incompleteSections = [];
          if (entityResults.diplomacy === 'incomplete') incompleteSections.push('Diplomacy');
          if (entityResults.information === 'incomplete') incompleteSections.push('Information');
          if (entityResults.military === 'incomplete') incompleteSections.push('Military');
          if (entityResults.economic === 'incomplete') incompleteSections.push('Economic');
          if (entityResults.relationships === 'incomplete') incompleteSections.push('Relationships');
          
          if (incompleteSections.length > 0) {
            entityResults.message = `Incomplete sections: ${incompleteSections.join(', ')}`;
          } else {
            entityResults.status = 'complete';
          }
          
          // Add to results
          results.entities.items[entity.entityId] = entityResults;
        });
        
        // Check if all entities are complete
        const allEntitiesComplete = Object.values(results.entities.items).every(
          entity => entity.status === 'complete'
        );
        
        if (allEntitiesComplete) {
          results.entities.status = 'complete';
        } else {
          results.entities.status = 'incomplete';
          results.entities.message = 'Some entities have incomplete configuration';
        }
      }
    } else {
      results.entities.message = 'No nations/organizations selected';
    }
    
    // Update section statuses
    results.basicInfo.status = Object.values(results.basicInfo.items).every(
      item => item.status === 'complete'
    ) ? 'complete' : 'incomplete';
    
    results.scenarioContext.status = Object.values(results.scenarioContext.items).every(
      item => item.status === 'complete'
    ) ? 'complete' : 'incomplete';
    
    results.simulationParams.status = Object.values(results.simulationParams.items).every(
      item => item.status === 'complete'
    ) ? 'complete' : 'incomplete';
    
    // Update overall status
    results.overallStatus = 
      results.basicInfo.status === 'complete' &&
      results.scenarioContext.status === 'complete' &&
      results.simulationParams.status === 'complete' &&
      results.entities.status === 'complete'
      ? 'complete' : 'incomplete';
    
    return results;
  };

  if (!validationResults) {
    return <Typography>Loading validation status...</Typography>;
  }

  return (
    <Box className={classes.root}>
      {/* Overall Status */}
      <Box 
        className={`${classes.statusSummary} ${
          validationResults.overallStatus === 'complete' 
            ? classes.readyStatus 
            : classes.notReadyStatus
        }`}
      >
        <Box>
          {validationResults.overallStatus === 'complete' ? (
            <Typography variant="h6" className={classes.statusText}>
              <CheckCircleIcon className={classes.checkIcon} /> Ready for Execution
            </Typography>
          ) : (
            <Typography variant="h6" className={classes.statusText}>
              <ErrorIcon className={classes.errorIcon} /> Not Ready for Execution
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary">
            {validationResults.overallStatus === 'complete'
              ? 'All required information has been provided'
              : 'Please complete all required fields before executing the wargame'}
          </Typography>
        </Box>
        <Box className={classes.statusActions}>
          <Button 
            variant="contained" 
            color="primary" 
            disabled={validationResults.overallStatus !== 'complete'}
          >
            Execute Wargame
          </Button>
        </Box>
      </Box>
      
      {/* Completion Progress */}
      <Box className={classes.section}>
        <Box className={classes.progressLabel}>
          <Typography variant="body1">Overall Completion</Typography>
          <Typography variant="body1" className={classes.progressPercentage}>
            {completionPercentage}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={completionPercentage} 
          className={classes.progress}
          color={completionPercentage === 100 ? "secondary" : "primary"}
        />
      </Box>
      
      {/* Basic Information Section */}
      <Box className={classes.section}>
        <ListItem 
          button 
          onClick={() => toggleSection('basicInfo')}
          className={`${classes.listItem} ${
            validationResults.basicInfo.status === 'complete' 
              ? classes.completedItem 
              : classes.incompleteItem
          }`}
        >
          <ListItemIcon>
            {validationResults.basicInfo.status === 'complete' ? (
              <CheckCircleIcon className={classes.checkIcon} />
            ) : (
              <ErrorIcon className={classes.errorIcon} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Basic Information" 
            secondary={
              validationResults.basicInfo.status === 'complete'
                ? 'All basic information is complete'
                : 'Some required basic information is missing'
            }
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" onClick={() => toggleSection('basicInfo')}>
              {expandedSections.basicInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
        
        <Collapse in={expandedSections.basicInfo} timeout="auto" unmountOnExit>
          <List className={classes.detailList} component="div" disablePadding>
            {Object.entries(validationResults.basicInfo.items).map(([key, item]) => (
              <ListItem key={key} className={classes.detailItem}>
                <ListItemIcon>
                  {item.status === 'complete' ? (
                    <CheckCircleIcon className={classes.checkIcon} fontSize="small" />
                  ) : (
                    <ErrorIcon className={classes.errorIcon} fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    key === 'name' ? 'Wargame Name' :
                    key === 'securityClassification' ? 'Security Classification' :
                    key === 'designer' ? 'Designer' : key
                  }
                  secondary={item.status === 'incomplete' ? item.message : null}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
      
      {/* Scenario Context Section */}
      <Box className={classes.section}>
        <ListItem 
          button 
          onClick={() => toggleSection('scenarioContext')}
          className={`${classes.listItem} ${
            validationResults.scenarioContext.status === 'complete' 
              ? classes.completedItem 
              : classes.incompleteItem
          }`}
        >
          <ListItemIcon>
            {validationResults.scenarioContext.status === 'complete' ? (
              <CheckCircleIcon className={classes.checkIcon} />
            ) : (
              <ErrorIcon className={classes.errorIcon} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Scenario Context" 
            secondary={
              validationResults.scenarioContext.status === 'complete'
                ? 'Scenario context is complete'
                : 'Scenario context information is incomplete'
            }
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" onClick={() => toggleSection('scenarioContext')}>
              {expandedSections.scenarioContext ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
        
        <Collapse in={expandedSections.scenarioContext} timeout="auto" unmountOnExit>
          <List className={classes.detailList} component="div" disablePadding>
            {Object.entries(validationResults.scenarioContext.items).map(([key, item]) => (
              <ListItem key={key} className={classes.detailItem}>
                <ListItemIcon>
                  {item.status === 'complete' ? (
                    <CheckCircleIcon className={classes.checkIcon} fontSize="small" />
                  ) : (
                    <ErrorIcon className={classes.errorIcon} fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    key === 'roadToWar' ? 'Road to War Narrative' :
                    key === 'researchObjectives' ? 'Research Objectives' : key
                  }
                  secondary={item.status === 'incomplete' ? item.message : null}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
      
      {/* Simulation Parameters Section */}
      <Box className={classes.section}>
        <ListItem 
          button 
          onClick={() => toggleSection('simulationParams')}
          className={`${classes.listItem} ${
            validationResults.simulationParams.status === 'complete' 
              ? classes.completedItem 
              : classes.incompleteItem
          }`}
        >
          <ListItemIcon>
            {validationResults.simulationParams.status === 'complete' ? (
              <CheckCircleIcon className={classes.checkIcon} />
            ) : (
              <ErrorIcon className={classes.errorIcon} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Simulation Parameters" 
            secondary={
              validationResults.simulationParams.status === 'complete'
                ? 'All simulation parameters are defined'
                : 'Some simulation parameters are missing'
            }
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" onClick={() => toggleSection('simulationParams')}>
              {expandedSections.simulationParams ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
        
        <Collapse in={expandedSections.simulationParams} timeout="auto" unmountOnExit>
          <List className={classes.detailList} component="div" disablePadding>
            {Object.entries(validationResults.simulationParams.items).map(([key, item]) => (
              <ListItem key={key} className={classes.detailItem}>
                <ListItemIcon>
                  {item.status === 'complete' ? (
                    <CheckCircleIcon className={classes.checkIcon} fontSize="small" />
                  ) : (
                    <ErrorIcon className={classes.errorIcon} fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    key === 'numberOfIterations' ? 'Number of Iterations' :
                    key === 'numberOfMoves' ? 'Number of Moves/Turns' :
                    key === 'timeHorizon' ? 'Time Horizon' : key
                  }
                  secondary={item.status === 'incomplete' ? item.message : null}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </Box>
      
      {/* Entities Section */}
      <Box className={classes.section}>
        <ListItem 
          button 
          onClick={() => toggleSection('entities')}
          className={`${classes.listItem} ${
            validationResults.entities.status === 'complete' 
              ? classes.completedItem 
              : classes.incompleteItem
          }`}
        >
          <ListItemIcon>
            {validationResults.entities.status === 'complete' ? (
              <CheckCircleIcon className={classes.checkIcon} />
            ) : (
              <ErrorIcon className={classes.errorIcon} />
            )}
          </ListItemIcon>
          <ListItemText 
            primary="Nations & Organizations" 
            secondary={
              validationResults.entities.status === 'complete'
                ? 'All nations and organizations are fully configured'
                : validationResults.entities.message || 'Some nations or organizations need configuration'
            }
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" onClick={() => toggleSection('entities')}>
              {expandedSections.entities ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
        
        <Collapse in={expandedSections.entities} timeout="auto" unmountOnExit>
          <List className={classes.entityList} component="div" disablePadding>
            {Object.entries(validationResults.entities.items).map(([entityId, entity]) => {
              // Find entity name in wargame data
              const entityData = wargameData.activatedEntities.find(e => e.entityId === entityId);
              const entityName = entityData ? entityData.entityName : entityId;
              const entityType = entityData ? entityData.entityType : 'nation';
              
              return (
                <Box key={entityId} className={classes.entityItem}>
                  <Box className={classes.entityFlag}>
                    <FlagIcon entityId={entityId} entityType={entityType} />
                  </Box>
                  <Box className={classes.entityName}>
                    <Typography variant="subtitle1">{entityName}</Typography>
                    {entity.status === 'incomplete' && (
                      <Typography variant="body2" color="error">
                        {entity.message}
                      </Typography>
                    )}
                  </Box>
                  <Box className={classes.entityStatus}>
                    {entity.status === 'complete' ? (
                      <CheckCircleIcon className={classes.checkIcon} />
                    ) : (
                      <ErrorIcon className={classes.errorIcon} />
                    )}
                  </Box>
                  
                  {/* DIME sections status */}
                  <Grid container className={classes.dimeSection}>
                    <Grid item xs={12} sm={6}>
                      <Box className={classes.dimeItem}>
                        <Typography className={classes.dimeLabel}>Diplomacy:</Typography>
                        <Typography 
                          className={`${classes.dimeStatus} ${
                            entity.diplomacy === 'complete' 
                              ? classes.dimeComplete 
                              : classes.dimeIncomplete
                          }`}
                        >
                          {entity.diplomacy === 'complete' ? 'Complete' : 'Incomplete'}
                        </Typography>
                      </Box>
                      <Box className={classes.dimeItem}>
                        <Typography className={classes.dimeLabel}>Information:</Typography>
                        <Typography 
                          className={`${classes.dimeStatus} ${
                            entity.information === 'complete' 
                              ? classes.dimeComplete 
                              : classes.dimeIncomplete
                          }`}
                        >
                          {entity.information === 'complete' ? 'Complete' : 'Incomplete'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box className={classes.dimeItem}>
                        <Typography className={classes.dimeLabel}>Military:</Typography>
                        <Typography 
                          className={`${classes.dimeStatus} ${
                            entity.military === 'complete' 
                              ? classes.dimeComplete 
                              : classes.dimeIncomplete
                          }`}
                        >
                          {entity.military === 'complete' ? 'Complete' : 'Incomplete'}
                        </Typography>
                      </Box>
                      <Box className={classes.dimeItem}>
                        <Typography className={classes.dimeLabel}>Economic:</Typography>
                        <Typography 
                          className={`${classes.dimeStatus} ${
                            entity.economic === 'complete' 
                              ? classes.dimeComplete 
                              : classes.dimeIncomplete
                          }`}
                        >
                          {entity.economic === 'complete' ? 'Complete' : 'Incomplete'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box className={classes.dimeItem}>
                        <Typography className={classes.dimeLabel}>Relationships:</Typography>
                        <Typography 
                          className={`${classes.dimeStatus} ${
                            entity.relationships === 'complete' 
                              ? classes.dimeComplete 
                              : classes.dimeIncomplete
                          }`}
                        >
                          {entity.relationships === 'complete' ? 'Complete' : 'Incomplete'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
          </List>
        </Collapse>
      </Box>
    </Box>
  );
};

export default ExecutionChecklist;
