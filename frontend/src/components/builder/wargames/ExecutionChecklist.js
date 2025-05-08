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
      // Rerun validation to get the structured results
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
      
      // Count entity items (DIME per entity) + 1 for overall relationships
      if (results.entities.items && Object.keys(results.entities.items).length > 0) {
        const numEntities = Object.keys(results.entities.items).length;
        // Count DIME for each entity
        totalItems += numEntities * 4; // 4 DIME sections per entity
        Object.values(results.entities.items).forEach(entity => {
          if (entity.diplomacy === 'complete') completedItems++;
          if (entity.information === 'complete') completedItems++;
          if (entity.military === 'complete') completedItems++;
          if (entity.economic === 'complete') completedItems++;
        });
        
        // Add 1 item for the overall relationship check
        totalItems += 1;
        // Check if relationships were determined complete by validateWargameData
        // Infer this by checking if the entities section is complete OR
        // if the entities message specifically mentions relationships being needed.
        // A cleaner way might involve recalculating, but this uses the validation result.
        const relationshipsAreComplete = results.entities.status === 'complete' || 
             (results.entities.status === 'incomplete' && !results.entities.message?.includes('relationships need definition'));
        
        if (relationshipsAreComplete) {
          completedItems++;
        }
      }
      
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      setCompletionPercentage(percentage);
    }
  }, [wargameData]);

  // Helper function to validate wargame data
  const validateWargameData = (data) => {
    // Define DIME fields that require enabled/approved checks
    const dimeFieldsConfig = {
      diplomacy: ['objectives', 'posture', 'keyInitiatives', 'prioritiesMatrix', 'redLines', 'treatyObligations', 'diplomaticResources', 'specialConsiderations'],
      information: ['objectives', 'propagandaThemes', 'cyberTargets', 'strategicCommunicationFramework', 'intelCollectionPriorities', 'disinformationResilience', 'mediaLandscapeControl', 'specialConsiderations'],
      military: [
        'objectives', 'alertLevel', 'doctrine', 'forceStructureReadiness', 
        'escalationLadder', 'decisionMakingProtocol', 'forceProjectionCapabilities', 
        'defenseIndustrialCapacity', 'specialConsiderations',
      ],
      economic: ['objectives', 'tradeFocus', 'resourceDeps', 'sanctionsPolicy', 'economicWarfareTools', 'criticalInfrastructureResilience', 'strategicResourceAccess', 'financialSystemLeverage', 'technologyTransferControls', 'specialConsiderations']
    };

    const militaryDomainFields = ['land', 'sea', 'air', 'cyber', 'space'];

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
        results.entities.status = 'incomplete';
      } else {
        // Calculate required relationships
        const numEntities = data.activatedEntities.length;
        const requiredRelationships = (numEntities * (numEntities - 1)) / 2;
        const definedRelationships = Object.values(data.nationRelationships || {}).filter(rel => rel?.type).length;
        const relationshipsComplete = definedRelationships >= requiredRelationships;

        // For each entity, check DIME configuration
        let allEntitiesFullyConfigured = true; // Tracks if all entities meet the new criteria

        data.activatedEntities.forEach(entity => {
          const entityResults = {
            status: 'incomplete', // Default to incomplete for the entity
            diplomacy: 'incomplete',
            information: 'incomplete',
            military: 'incomplete',
            economic: 'incomplete',
            message: ''
          };

          const entityConfigData = entity.configData || {};
          const entityEnabledFields = entityConfigData.enabledFields || {};
          const entityApprovedFields = entityConfigData.approvedFields || {};

          let currentEntityDimeComplete = true;
          const entityIncompleteDimeCategories = [];


          for (const section of ['diplomacy', 'information', 'military', 'economic']) {
            let sectionCategoryComplete = true;
            const fieldsToCheck = dimeFieldsConfig[section];
            const sectionEnabledFields = entityEnabledFields[section] || {};

            for (const field of fieldsToCheck) {
              const fieldEnabled = sectionEnabledFields[field] === undefined ? true : sectionEnabledFields[field];

              if (fieldEnabled) {
                const fieldApproved = entityApprovedFields[`${section}.${field}`] === true;
                if (!fieldApproved) {
                  sectionCategoryComplete = false;
                  break; 
                }
              }
            }

            // Special handling for military.domainPosture
            if (section === 'military' && sectionCategoryComplete) {
              const militaryEnabledFields = entityEnabledFields.military || {};
              const domainPostureGroupEnabled = militaryEnabledFields.domainPosture === undefined ? true : militaryEnabledFields.domainPosture;
              
              if (domainPostureGroupEnabled) { // Check if the whole domainPosture group is considered enabled
                const domainPostureEnabledFields = militaryEnabledFields.domainPosture || {};
                for (const domainField of militaryDomainFields) {
                  const specificDomainFieldIsEnabled = domainPostureEnabledFields[domainField] === undefined ? true : domainPostureEnabledFields[domainField];
                  if (specificDomainFieldIsEnabled) {
                    const domainFieldApproved = entityApprovedFields[`military.domainPosture.${domainField}`] === true;
                    if (!domainFieldApproved) {
                      sectionCategoryComplete = false;
                      break; 
                    }
                  }
                }
              }
            }
            
            entityResults[section] = sectionCategoryComplete ? 'complete' : 'incomplete';
            if (!sectionCategoryComplete) {
              entityIncompleteDimeCategories.push(section.charAt(0).toUpperCase() + section.slice(1));
              currentEntityDimeComplete = false; 
            }
          }
          
          if (currentEntityDimeComplete) {
            entityResults.status = 'complete';
          } else {
            entityResults.status = 'incomplete';
            // Ensure message reflects only DIME issues if relationships are separate
            const dimeMessage = `Incomplete DIME sections: ${entityIncompleteDimeCategories.join(', ')}`;
            entityResults.message = dimeMessage;
            allEntitiesFullyConfigured = false; 
          }
          
          results.entities.items[entity.entityId] = entityResults;
        });
        
        if (allEntitiesFullyConfigured && relationshipsComplete) {
          results.entities.status = 'complete';
        } else {
          results.entities.status = 'incomplete';
          const messages = [];
          if (!allEntitiesFullyConfigured) messages.push('Some entities have incomplete DIME configurations (enabled elements must be approved and committed)');
          if (!relationshipsComplete) messages.push(`${requiredRelationships - definedRelationships} relationships need definition`);
          results.entities.message = messages.join('. ');
        }
      }
    } else {
      results.entities.status = 'incomplete';
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
                ? `All ${Object.keys(validationResults.entities.items).length} entities configured & relationships defined`
                : validationResults.entities.message || 'Configuration incomplete'
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
