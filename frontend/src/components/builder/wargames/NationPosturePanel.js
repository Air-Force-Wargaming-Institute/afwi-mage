import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
  Button,
  Paper,
  Divider,
  ButtonGroup
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Flag from 'react-world-flags';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import FlagIcon from './FlagIcon';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2, 3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
  },
  flagContainer: {
    width: 60,
    height: 40,
    marginRight: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '2px',
  },
  flag: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  title: {
    marginLeft: theme.spacing(1),
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabPanel: {
    padding: theme.spacing(3),
    flex: 1,
    overflowY: 'auto',
  },
  sectionTitle: {
    marginBottom: theme.spacing(3),
    fontWeight: 600,
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(1),
    display: 'inline-block',
    fontSize: '1.5rem',
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  relationshipItem: {
    position: 'relative',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: 'transparent',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  relationshipItemContent: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius - 1,
  },
  formControl: {
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  specialConsiderationsField: {
    marginTop: theme.spacing(2),
  },
  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-wrapper': {
      fontSize: '1.2rem !important',
      fontWeight: 600,
    }
  },
  emptyRelationships: {
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
  },
  relationshipButtonGroup: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
  },
  relationshipButton: {
    flex: 1,
    margin: '0 4px',
    border: '1px solid',
    textTransform: 'none',
    fontWeight: 500,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.5, 1),
    transition: 'all 0.2s ease',
    '&:first-child': {
      marginLeft: 0,
    },
    '&:last-child': {
      marginRight: 0,
    },
  },
  allianceButton: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    '&.selected': {
      backgroundColor: `${theme.palette.primary.main}20`,
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.primary.main}10`,
    },
  },
  partnershipButton: {
    borderColor: theme.palette.success.main,
    color: theme.palette.success.main,
    '&.selected': {
      backgroundColor: `${theme.palette.success.main}20`,
      boxShadow: `0 0 0 1px ${theme.palette.success.main}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.success.main}10`,
    },
  },
  rivalryButton: {
    borderColor: theme.palette.error.main,
    color: theme.palette.error.main,
    '&.selected': {
      backgroundColor: `${theme.palette.error.main}20`,
      boxShadow: `0 0 0 1px ${theme.palette.error.main}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.error.main}10`,
    },
  },
  neutralButton: {
    borderColor: theme.palette.grey[500],
    color: theme.palette.grey[500],
    '&.selected': {
      backgroundColor: `${theme.palette.grey[500]}20`,
      boxShadow: `0 0 0 1px ${theme.palette.grey[500]}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.grey[500]}10`,
    },
  },
  nationName: {
    fontSize: '1.5rem',
    fontWeight: 500,
  },
  relationshipStatus: {
    padding: theme.spacing(1),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: theme.shape.borderRadius,
  },
  relationshipLabel: {
    fontWeight: 600,
  },
  allyLabel: {
    color: theme.palette.success.main,
  },
  partnerLabel: {
    color: theme.palette.primary.main,
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    marginTop: 'auto',
  },
}));

// TabPanel component for displaying tab content
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dime-tabpanel-${index}`}
      aria-labelledby={`dime-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className={other.className}>
          {children}
        </Box>
      )}
    </div>
  );
}

function NationPosturePanel({ nation, otherNations, onSave, nationRelationships = {} }) {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [nationData, setNationData] = useState({
    // Relationships
    relationships: {},
    
    // Diplomacy
    diplomacy: {
      objectives: '',
      posture: '',
      keyInitiatives: '',
      specialConsiderations: '',
    },
    
    // Information
    information: {
      objectives: '',
      propagandaThemes: '',
      cyberTargets: '',
      specialConsiderations: '',
    },
    
    // Military
    military: {
      objectives: '',
      alertLevel: '',
      doctrine: '',
      domainPosture: {
        land: '',
        sea: '',
        air: '',
        cyber: '',
        space: '',
      },
      specialConsiderations: '',
    },
    
    // Economic
    economic: {
      objectives: '',
      tradeFocus: '',
      resourceDeps: '',
      sanctionsPolicy: '',
      specialConsiderations: '',
    }
  });
  
  // Initialize nation data when nation changes
  useEffect(() => {
    if (nation) {
      // If nation already has configuration data, load it
      setNationData(nation.configData || nationData);
    }
  }, [nation]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleInputChange = (section, field, value) => {
    setNationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };
  
  const handleMilitaryDomainChange = (domain, value) => {
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        domainPosture: {
          ...prev.military.domainPosture,
          [domain]: value
        }
      }
    }));
  };
  
  const handleRelationshipTypeChange = (entityId, value) => {
    setNationData(prev => ({
      ...prev,
      relationships: {
        ...prev.relationships,
        [entityId]: {
          ...prev.relationships[entityId] || {},
          relationType: value
        }
      }
    }));
  };
  
  const handleRelationshipDetailsChange = (entityId, value) => {
    setNationData(prev => ({
      ...prev,
      relationships: {
        ...prev.relationships,
        [entityId]: {
          ...prev.relationships[entityId] || {},
          details: value
        }
      }
    }));
  };
  
  const handleSave = () => {
    onSave({ ...nation, configData: nationData, isConfigured: true });
  };
  
  // If no nation is provided, don't render anything
  if (!nation) return null;
  
  return (
    <Paper className={classes.root} elevation={2}>
      <Box className={classes.header}>
        <Box className={classes.flagContainer}>
          <Flag code={nation.entityId} className={classes.flag} />
        </Box>
        <Typography variant="h5" style={{
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.6)'
        }}>
          {nation.entityName} Configuration
        </Typography>
      </Box>
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        className={classes.tabs}
      >
        <Tab 
          label={<Typography variant="subtitle1">Relationships</Typography>} 
          id="dime-tab-0"
          aria-controls="dime-tabpanel-0"
        />
        <Tab 
          label={<Typography variant="subtitle1">Diplomacy</Typography>} 
          id="dime-tab-1"
          aria-controls="dime-tabpanel-1" 
        />
        <Tab 
          label={<Typography variant="subtitle1">Information</Typography>} 
          id="dime-tab-2"
          aria-controls="dime-tabpanel-2"
        />
        <Tab 
          label={<Typography variant="subtitle1">Military</Typography>} 
          id="dime-tab-3"
          aria-controls="dime-tabpanel-3"
        />
        <Tab 
          label={<Typography variant="subtitle1">Economic</Typography>} 
          id="dime-tab-4"
          aria-controls="dime-tabpanel-4"
        />
      </Tabs>
      
      <Box className={classes.content}>
        {/* Relationships Tab - READ ONLY VIEW */}
        <TabPanel value={tabValue} index={0} className={classes.tabPanel}>
          <Typography variant="h5" className={classes.sectionTitle}>
            Relationships with Other Nations
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            This is a summary of relationships defined in the Relationships & Theaters configuration. 
            To modify these relationships, select the "Configure Relationships & Theaters of Conflict" button on Wargame Crafter tab.
          </Typography>
          
          {otherNations && otherNations.length > 0 ? (
            otherNations.map(otherNation => {
              // Get relationship key - ensure consistent order regardless of which nation comes first
              const relationshipKey = [nation.entityId, otherNation.entityId].sort().join('_');
              const relationshipData = nationRelationships[relationshipKey] || {};
              const relationType = relationshipData.type || '';
              const notes = relationshipData.notes || '';
              
              return (
                <Box key={otherNation.entityId} className={classes.relationshipItem}>
                  <Box className={classes.relationshipItemContent}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box display="flex" alignItems="center">
                          <Box width={30} height={20} marginRight={1} overflow="hidden" border="1px solid rgba(255,255,255,0.12)">
                            <Flag code={otherNation.entityId} style={{ width: '100%', height: 'auto' }} />
                          </Box>
                          <Typography variant="h6" className={classes.nationName}>
                            {otherNation.entityName}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12}>
                        {/* Relationship buttons similar to RelationshipMatrix but read-only */}
                        <Box className={classes.relationshipButtonGroup} mt={1}>
                          <Button
                            className={`${classes.relationshipButton} ${classes.allianceButton} ${relationType === 'ally' ? 'selected' : ''}`}
                            variant={relationType === 'ally' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'ally' ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                              fontWeight: relationType === 'ally' ? 700 : 400
                            }}
                          >
                            Ally
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.partnershipButton} ${relationType === 'partner' ? 'selected' : ''}`}
                            variant={relationType === 'partner' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'partner' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
                              fontWeight: relationType === 'partner' ? 700 : 400
                            }}
                          >
                            Partner
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.neutralButton} ${relationType === 'neutral' ? 'selected' : ''}`}
                            variant={relationType === 'neutral' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'neutral' ? 'rgba(157, 157, 157, 0.2)' : 'transparent',
                              fontWeight: relationType === 'neutral' ? 700 : 400
                            }}
                          >
                            Neutral
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.rivalryButton} ${relationType === 'adversary' ? 'selected' : ''}`}
                            variant={relationType === 'adversary' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'adversary' ? 'rgba(234, 67, 53, 0.2)' : 'transparent',
                              fontWeight: relationType === 'adversary' ? 700 : 400
                            }}
                          >
                            Adversary
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.rivalryButton} ${relationType === 'enemy' ? 'selected' : ''}`}
                            variant={relationType === 'enemy' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'enemy' ? 'rgba(234, 67, 53, 0.2)' : 'transparent',
                              fontWeight: relationType === 'enemy' ? 700 : 400
                            }}
                          >
                            Enemy
                          </Button>
                        </Box>
                        
                        {!relationType && (
                          <Typography color="textSecondary" variant="body2" style={{ marginTop: 10, fontStyle: 'italic' }}>
                            No relationship has been defined with {otherNation.entityName}
                          </Typography>
                        )}
                      </Grid>
                      
                      {notes && (
                        <Grid item xs={12}>
                          <Box mt={2} p={2} bgcolor="rgba(0,0,0,0.1)" borderRadius={1}>
                            <Typography variant="subtitle2" gutterBottom>
                              Relationship Notes:
                            </Typography>
                            <Typography variant="body2">
                              {notes}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box className={classes.emptyRelationships}>
              <Typography variant="body1" color="textSecondary">
                No other nations or organizations have been activated in this wargame.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Add more entities to define relationships with {nation.entityName}.
              </Typography>
            </Box>
          )}
        </TabPanel>
        
        {/* Diplomacy Tab */}
        <TabPanel value={tabValue} index={1} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Diplomatic Posture
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Strategic Objectives"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.diplomacy.objectives}
                  onChange={(e) => handleInputChange('diplomacy', 'objectives', e.target.value)}
                  placeholder="Describe the key diplomatic goals and priorities..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="General Diplomatic Posture"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.diplomacy.posture}
                  onChange={(e) => handleInputChange('diplomacy', 'posture', e.target.value)}
                  placeholder="Describe the general diplomatic stance (e.g., cooperative, assertive, isolationist)..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Key Diplomatic Initiatives"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.diplomacy.keyInitiatives}
                  onChange={(e) => handleInputChange('diplomacy', 'keyInitiatives', e.target.value)}
                  placeholder="Outline current or planned diplomatic initiatives..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Special Considerations"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.diplomacy.specialConsiderations}
                  onChange={(e) => handleInputChange('diplomacy', 'specialConsiderations', e.target.value)}
                  placeholder="Any unique factors, sensitivities, or constraints that influence diplomatic behavior..."
                  className={classes.specialConsiderationsField}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Information Tab */}
        <TabPanel value={tabValue} index={2} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Information Operations
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Information Objectives"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.information.objectives}
                  onChange={(e) => handleInputChange('information', 'objectives', e.target.value)}
                  placeholder="Describe the key information and influence goals..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Propaganda Themes"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.information.propagandaThemes}
                  onChange={(e) => handleInputChange('information', 'propagandaThemes', e.target.value)}
                  placeholder="Key narratives and messaging themes for domestic and international audiences..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Cyber Capabilities & Targets"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.information.cyberTargets}
                  onChange={(e) => handleInputChange('information', 'cyberTargets', e.target.value)}
                  placeholder="Describe cyber capabilities and potential targets for information operations..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Special Considerations"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.information.specialConsiderations}
                  onChange={(e) => handleInputChange('information', 'specialConsiderations', e.target.value)}
                  placeholder="Any unique factors, sensitivities, or constraints that influence information operations..."
                  className={classes.specialConsiderationsField}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Military Tab */}
        <TabPanel value={tabValue} index={3} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Military Posture
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Military Objectives"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.military.objectives}
                  onChange={(e) => handleInputChange('military', 'objectives', e.target.value)}
                  placeholder="Describe the key military goals and priorities..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Military Alert Level"
                  variant="outlined"
                  fullWidth
                  value={nationData.military.alertLevel}
                  onChange={(e) => handleInputChange('military', 'alertLevel', e.target.value)}
                  placeholder="Current readiness status (e.g., normal, heightened, full mobilization)..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Military Doctrine"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.military.doctrine}
                  onChange={(e) => handleInputChange('military', 'doctrine', e.target.value)}
                  placeholder="General approach to warfare (e.g., offensive, defensive, asymmetric)..."
                />
              </Grid>
            </Grid>
            
            <Typography variant="subtitle1" gutterBottom style={{ marginTop: 24 }}>
              Domain-Specific Posture
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Land Forces"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.military.domainPosture.land}
                  onChange={(e) => handleMilitaryDomainChange('land', e.target.value)}
                  placeholder="Disposition and employment of land forces..."
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Naval Forces"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.military.domainPosture.sea}
                  onChange={(e) => handleMilitaryDomainChange('sea', e.target.value)}
                  placeholder="Disposition and employment of naval forces..."
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Air Forces"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.military.domainPosture.air}
                  onChange={(e) => handleMilitaryDomainChange('air', e.target.value)}
                  placeholder="Disposition and employment of air forces..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Cyber Capabilities"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.military.domainPosture.cyber}
                  onChange={(e) => handleMilitaryDomainChange('cyber', e.target.value)}
                  placeholder="Military cyber operations and capabilities..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Space Capabilities"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.military.domainPosture.space}
                  onChange={(e) => handleMilitaryDomainChange('space', e.target.value)}
                  placeholder="Military space operations and capabilities..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Special Considerations"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.military.specialConsiderations}
                  onChange={(e) => handleInputChange('military', 'specialConsiderations', e.target.value)}
                  placeholder="Any unique factors, sensitivities, or constraints that influence military operations..."
                  className={classes.specialConsiderationsField}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Economic Tab */}
        <TabPanel value={tabValue} index={4} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Economic Posture
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Economic Objectives"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.economic.objectives}
                  onChange={(e) => handleInputChange('economic', 'objectives', e.target.value)}
                  placeholder="Describe the key economic goals and priorities..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Trade Focus"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.economic.tradeFocus}
                  onChange={(e) => handleInputChange('economic', 'tradeFocus', e.target.value)}
                  placeholder="Key trade priorities, partners, and goals..."
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Resource Dependencies"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.economic.resourceDeps}
                  onChange={(e) => handleInputChange('economic', 'resourceDeps', e.target.value)}
                  placeholder="Critical resources, supply chains, and dependencies..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Sanctions Policy"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={nationData.economic.sanctionsPolicy}
                  onChange={(e) => handleInputChange('economic', 'sanctionsPolicy', e.target.value)}
                  placeholder="Approach to economic sanctions (both imposing and responding to)..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Special Considerations"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  value={nationData.economic.specialConsiderations}
                  onChange={(e) => handleInputChange('economic', 'specialConsiderations', e.target.value)}
                  placeholder="Any unique factors, sensitivities, or constraints that influence economic policy..."
                  className={classes.specialConsiderationsField}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Box>
      
      <Box className={classes.actionBar}>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
        >
          Save Configuration
        </Button>
      </Box>
    </Paper>
  );
}

export default NationPosturePanel; 