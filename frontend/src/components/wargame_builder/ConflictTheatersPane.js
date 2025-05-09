import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Divider,
  Collapse,
  Card,
  CardHeader,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import SaveIcon from '@material-ui/icons/Save';
import CancelIcon from '@material-ui/icons/Cancel';
import FlagIcon from './FlagIcon';

const GEOGRAPHIC_COCOMS = [
  { id: 'AFRICOM', name: 'US Africa Command' },
  { id: 'CENTCOM', name: 'US Central Command' },
  { id: 'EUCOM', name: 'US European Command' },
  { id: 'INDOPACOM', name: 'US Indo-Pacific Command' },
  { id: 'NORTHCOM', name: 'US Northern Command' },
  { id: 'SOUTHCOM', name: 'US Southern Command' },
  { id: 'SPACECOM_GEO', name: 'US Space Command (Geographic)' },
];

const FUNCTIONAL_COCOMS = [
  { id: 'CYBERCOM', name: 'US Cyber Command' },
  { id: 'SOCOM', name: 'US Special Operations Command' },
  { id: 'STRATCOM', name: 'US Strategic Command' },
  { id: 'TRANSCOM', name: 'US Transportation Command' },
];

const THEATER_COLORS = [
  { side1: '#4285F4', side2: '#EA4335', name: 'Skyline Divide' }, 
  { side1: '#34A853', side2: '#FBBC05', name: 'Forest Gold' }, 
  { side1: '#673AB7', side2: '#FF9800', name: 'Twilight Flare' }, 
  { side1: '#00BCD4', side2: '#FF5722', name: 'Ocean Ember' }, 
  { side1: '#3F51B5', side2: '#F44336', name: 'Midnight Blaze' }, 
  { side1: '#9C27B0', side2: '#FFC107', name: 'Regal Sun' }, 
  { side1: '#009688', side2: '#E91E63', name: 'Jade Bloom' }, 
];

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  descriptionText: {
    marginBottom: theme.spacing(2),
  },
  theatersList: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  theaterCard: {
    marginBottom: theme.spacing(2),
    border: '1px solid rgba(255, 255, 255, 0.12)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible',
  },
  cardHeader: {
    padding: theme.spacing(1, 2),
    '& .MuiCardHeader-action': {
      margin: 0,
      display: 'flex',
      alignItems: 'center',
    },
  },
  cardContent: {
    padding: theme.spacing(2),
  },
  sideColumn: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    paddingTop: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    position: 'relative',
    minHeight: 200,
  },
  side1Column: {
    backgroundColor: 'rgba(66, 133, 244, 0.05)',
  },
  side2Column: {
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  sideLabel: {
    position: 'absolute',
    top: -12,
    left: 10,
    padding: theme.spacing(0, 1),
    backgroundColor: theme.palette.background.paper,
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  formControl: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  flagContainer: {
    display: 'flex',
    alignItems: 'center',
    margin: theme.spacing(0.5, 0),
  },
  flagIcon: {
    marginRight: theme.spacing(1),
  },
  supportingNations: {
    display: 'flex',
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: theme.spacing(1),
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  theaterDescriptionField: {
    marginTop: theme.spacing(2),
    width: '100%',
  },
  summaryInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    padding: theme.spacing(0, 1),
  },
  theaterCount: {
    fontWeight: 'bold',
    marginRight: theme.spacing(1),
  },
  functionalCocomSection: {
    marginTop: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  functionalCocomList: {
    paddingLeft: theme.spacing(1),
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

function GeographicCocomCard({
  cocom,
  theaterState,
  nations,
  onUpdateTheaterState,
  colorScheme,
}) {
  const classes = useStyles();
  
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    side1Lead: '',
    side2Lead: '',
    side1Supporting: [],
    side2Supporting: [],
  });

  const editDataRef = useRef(editData);
  useEffect(() => {
    editDataRef.current = editData;
  }, [editData]);

  useEffect(() => {
    setEditData({
      name: theaterState.name || cocom.name,
      description: theaterState.description || '',
      side1Lead: theaterState.sides[0]?.leadNationId || '',
      side2Lead: theaterState.sides[1]?.leadNationId || '',
      side1Supporting: theaterState.sides[0]?.supportingNationIds || [],
      side2Supporting: theaterState.sides[1]?.supportingNationIds || [],
    });
  }, [theaterState, cocom.name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof onUpdateTheaterState !== 'function') return;

      const currentEditData = editDataRef.current;
      const nameChanged = currentEditData.name !== (theaterState.name || cocom.name);
      const descriptionChanged = currentEditData.description !== theaterState.description;

      if (nameChanged || descriptionChanged) {
        onUpdateTheaterState({
          ...theaterState, 
          name: currentEditData.name, 
          description: currentEditData.description, 
          sides: [
            { ...(theaterState.sides[0] || { id: 'side1' }), leadNationId: currentEditData.side1Lead, supportingNationIds: currentEditData.side1Supporting, colorCode: colorScheme.side1 },
            { ...(theaterState.sides[1] || { id: 'side2' }), leadNationId: currentEditData.side2Lead, supportingNationIds: currentEditData.side2Supporting, colorCode: colorScheme.side2 }
          ],
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [editData.name, editData.description, cocom.name, colorScheme, onUpdateTheaterState, theaterState]);

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const createImmediateUpdatePayload = (specificChanges) => {
    return {
      ...theaterState,
      name: editData.name,
      description: editData.description,
      sides: [
        { ...(theaterState.sides[0] || { id: 'side1' }), leadNationId: editData.side1Lead, supportingNationIds: editData.side1Supporting, colorCode: colorScheme.side1 },
        { ...(theaterState.sides[1] || { id: 'side2' }), leadNationId: editData.side2Lead, supportingNationIds: editData.side2Supporting, colorCode: colorScheme.side2 }
      ],
      ...specificChanges,
    };
  };

  const handleActivationToggle = (event) => {
    onUpdateTheaterState(createImmediateUpdatePayload({ isActive: event.target.checked }));
  };

  const handleFunctionalCocomToggle = (funcCocomId, isActive) => {
    onUpdateTheaterState(createImmediateUpdatePayload({
      functionalCocoms: {
        ...(theaterState.functionalCocoms || {}),
        [funcCocomId]: isActive,
      },
    }));
  };
  
  const handleSideLeadChange = (sideNum, nationId) => {
    const newLocalEditData = { ...editData };
    if (sideNum === 1) {
      newLocalEditData.side1Lead = nationId;
      if (newLocalEditData.side1Supporting.includes(nationId)) {
        newLocalEditData.side1Supporting = newLocalEditData.side1Supporting.filter(id => id !== nationId);
      }
      if (newLocalEditData.side2Lead === nationId) newLocalEditData.side2Lead = '';
      if (newLocalEditData.side2Supporting.includes(nationId)) {
        newLocalEditData.side2Supporting = newLocalEditData.side2Supporting.filter(id => id !== nationId);
      }
    } else {
      newLocalEditData.side2Lead = nationId;
      if (newLocalEditData.side2Supporting.includes(nationId)) {
        newLocalEditData.side2Supporting = newLocalEditData.side2Supporting.filter(id => id !== nationId);
      }
      if (newLocalEditData.side1Lead === nationId) newLocalEditData.side1Lead = '';
      if (newLocalEditData.side1Supporting.includes(nationId)) {
        newLocalEditData.side1Supporting = newLocalEditData.side1Supporting.filter(id => id !== nationId);
      }
    }
    setEditData(newLocalEditData);

    onUpdateTheaterState({
        ...theaterState,
        name: newLocalEditData.name,
        description: newLocalEditData.description,
        sides: [
            { ...(theaterState.sides[0] || { id: 'side1' }), leadNationId: newLocalEditData.side1Lead, supportingNationIds: newLocalEditData.side1Supporting, colorCode: colorScheme.side1 },
            { ...(theaterState.sides[1] || { id: 'side2' }), leadNationId: newLocalEditData.side2Lead, supportingNationIds: newLocalEditData.side2Supporting, colorCode: colorScheme.side2 }
        ],
        isActive: theaterState.isActive,
        functionalCocoms: theaterState.functionalCocoms || {},
    });
  };

  const handleSideSupportingToggle = (sideNum, nationId) => {
    const newLocalEditData = { ...editData };
    let supportingArray = sideNum === 1 ? [...newLocalEditData.side1Supporting] : [...newLocalEditData.side2Supporting];
    const otherLead = sideNum === 1 ? newLocalEditData.side2Lead : newLocalEditData.side1Lead;
    const otherSupporting = sideNum === 1 ? newLocalEditData.side2Supporting : newLocalEditData.side1Supporting;
    const currentLead = sideNum === 1 ? newLocalEditData.side1Lead : newLocalEditData.side2Lead;

    if (supportingArray.includes(nationId)) {
      supportingArray = supportingArray.filter(id => id !== nationId);
    } else {
      if (currentLead !== nationId && otherLead !== nationId && !otherSupporting.includes(nationId)) {
        supportingArray = [...supportingArray, nationId];
      }
    }
    if (sideNum === 1) newLocalEditData.side1Supporting = supportingArray;
    else newLocalEditData.side2Supporting = supportingArray;
    
    setEditData(newLocalEditData);

    onUpdateTheaterState({
        ...theaterState,
        name: newLocalEditData.name,
        description: newLocalEditData.description,
        sides: [
            { ...(theaterState.sides[0] || { id: 'side1' }), leadNationId: newLocalEditData.side1Lead, supportingNationIds: newLocalEditData.side1Supporting, colorCode: colorScheme.side1 },
            { ...(theaterState.sides[1] || { id: 'side2' }), leadNationId: newLocalEditData.side2Lead, supportingNationIds: newLocalEditData.side2Supporting, colorCode: colorScheme.side2 }
        ],
        isActive: theaterState.isActive,
        functionalCocoms: theaterState.functionalCocoms || {},
    });
  };
  
  const findEntityById = (entityId) => nations.find(nation => nation.entityId === entityId);

  const availableNationsForSide1Lead = nations.filter(n => n.entityId !== editData.side2Lead);
  const availableNationsForSide2Lead = nations.filter(n => n.entityId !== editData.side1Lead);
  const availableNationsForSide1Supporting = nations.filter(n => 
    n.entityId !== editData.side1Lead && 
    n.entityId !== editData.side2Lead && 
    !editData.side2Supporting.includes(n.entityId)
  );
  const availableNationsForSide2Supporting = nations.filter(n => 
    n.entityId !== editData.side2Lead && 
    n.entityId !== editData.side1Lead && 
    !editData.side1Supporting.includes(n.entityId)
  );

  return (
    <Card className={classes.theaterCard} style={{borderColor: theaterState.isActive ? colorScheme.side1 : 'rgba(255, 255, 255, 0.12)'}}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center">
            <Box className={classes.colorIndicator} style={{ backgroundColor: colorScheme.side1 }} />
            <Typography variant="h6">{theaterState.name || cocom.name}</Typography>
          </Box>
        }
        action={
          <FormControlLabel
            control={<Switch checked={theaterState.isActive} onChange={handleActivationToggle} name={`${cocom.id}-activate`} color="primary"/>}
            label={theaterState.isActive ? "Active" : "Inactive"}
          />
        }
        className={classes.cardHeader}
      />
      <Collapse in={theaterState.isActive} timeout="auto" unmountOnExit>
        <CardContent className={classes.cardContent}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
                 <TextField
                    label="Theater Display Name"
                    value={editData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    placeholder="Enter display name for this theater"
                    style={{marginBottom: 16}}
                />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className={classes.sideColumn} style={{ borderLeft: `4px solid ${colorScheme.side1}` }}>
                <Typography className={classes.sideLabel} style={{ color: colorScheme.side1 }}>Side 1</Typography>
                <FormControl variant="outlined" className={classes.formControl} size="small">
                  <InputLabel>Lead Nation/Organization</InputLabel>
                  <Select value={editData.side1Lead} onChange={(e) => handleSideLeadChange(1, e.target.value)} label="Lead Nation/Organization">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {availableNationsForSide1Lead.map((nation) => (
                      <MenuItem key={nation.entityId} value={nation.entityId}>
                        <Box className={classes.flagContainer}><FlagIcon entityId={nation.entityId} entityType={nation.entityType} className={classes.flagIcon}/><Typography>{nation.entityName}</Typography></Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>Supporting:</Typography>
                <Box className={classes.supportingNations}>
                  {availableNationsForSide1Supporting.map((nation) => (
                    <Chip
                      key={nation.entityId}
                      icon={<FlagIcon entityId={nation.entityId} entityType={nation.entityType} />}
                      label={nation.entityName}
                      onClick={() => handleSideSupportingToggle(1, nation.entityId)}
                      className={classes.chip}
                      color={editData.side1Supporting.includes(nation.entityId) ? "primary" : "default"}
                      variant={editData.side1Supporting.includes(nation.entityId) ? "default" : "outlined"}
                      clickable
                    />
                  ))}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box className={classes.sideColumn} style={{ borderLeft: `4px solid ${colorScheme.side2}`}}>
                <Typography className={classes.sideLabel} style={{ color: colorScheme.side2 }}>Side 2</Typography>
                 <FormControl variant="outlined" className={classes.formControl} size="small">
                  <InputLabel>Lead Nation/Organization</InputLabel>
                  <Select value={editData.side2Lead} onChange={(e) => handleSideLeadChange(2, e.target.value)} label="Lead Nation/Organization">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {availableNationsForSide2Lead.map((nation) => (
                      <MenuItem key={nation.entityId} value={nation.entityId}>
                        <Box className={classes.flagContainer}><FlagIcon entityId={nation.entityId} entityType={nation.entityType} className={classes.flagIcon}/><Typography>{nation.entityName}</Typography></Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>Supporting:</Typography>
                <Box className={classes.supportingNations}>
                  {availableNationsForSide2Supporting.map((nation) => (
                    <Chip
                      key={nation.entityId}
                      icon={<FlagIcon entityId={nation.entityId} entityType={nation.entityType} />}
                      label={nation.entityName}
                      onClick={() => handleSideSupportingToggle(2, nation.entityId)}
                      className={classes.chip}
                      color={editData.side2Supporting.includes(nation.entityId) ? "primary" : "default"}
                       variant={editData.side2Supporting.includes(nation.entityId) ? "default" : "outlined"}
                      clickable
                    />
                  ))}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                className={classes.theaterDescriptionField}
                label="Theater Description (Optional)"
                multiline
                rows={3}
                value={editData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
                placeholder="Describe the notional conflict scenario, objectives, or key characteristics of this theater..."
              />
            </Grid>

            <Grid item xs={12}>
              <Box className={classes.functionalCocomSection}>
                <Typography variant="subtitle1" gutterBottom>Functional COCOM Activation</Typography>
                <List dense className={classes.functionalCocomList}>
                  {FUNCTIONAL_COCOMS.map(fcocom => (
                    <ListItem key={fcocom.id} dense disableGutters>
                      <ListItemText primary={fcocom.name} />
                      <ListItemSecondaryAction>
                        <Switch
                          edge="end"
                          checked={theaterState.functionalCocoms[fcocom.id] || false}
                          onChange={(e) => handleFunctionalCocomToggle(fcocom.id, e.target.checked)}
                          color="primary"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
        <Box className={classes.cardActions}>
            {/* Manual Save and Cancel buttons are removed */}
        </Box>
      </Collapse>
    </Card>
  );
}

function ConflictTheatersPane({ nations = [], theaters: initialTheaters = [], onChange }) {
  const classes = useStyles();
  const [configuredTheaters, setConfiguredTheaters] = useState([]);

  useEffect(() => {
    const updatedTheaters = GEOGRAPHIC_COCOMS.map((geoCocom, index) => {
      const existingTheaterData = initialTheaters.find(t => t.cocomId === geoCocom.id);
      const defaultColorScheme = THEATER_COLORS[index % THEATER_COLORS.length];
      
      const defaultFunctionalCocoms = FUNCTIONAL_COCOMS.reduce((acc, fc) => {
        acc[fc.id] = false;
        return acc;
      }, {});

      return {
        cocomId: geoCocom.id,
        name: existingTheaterData?.name || geoCocom.name,
        description: existingTheaterData?.description || '',
        isActive: existingTheaterData?.isActive || false,
        sides: existingTheaterData?.sides || [
          { id: 'side1', leadNationId: '', supportingNationIds: [], colorCode: defaultColorScheme.side1 },
          { id: 'side2', leadNationId: '', supportingNationIds: [], colorCode: defaultColorScheme.side2 }
        ],
        functionalCocoms: existingTheaterData?.functionalCocoms || defaultFunctionalCocoms,
      };
    });
    setConfiguredTheaters(updatedTheaters);
  }, [initialTheaters]);

  const handleUpdateTheaterState = useCallback((updatedTheaterState) => {
    const newConfiguredTheaters = configuredTheaters.map(theater =>
      theater.cocomId === updatedTheaterState.cocomId ? updatedTheaterState : theater
    );
    setConfiguredTheaters(newConfiguredTheaters);
    onChange(newConfiguredTheaters);
  }, [configuredTheaters, onChange]);
  
  const activeTheatersCount = configuredTheaters.filter(t => t.isActive).length;

  return (
    <Box className={classes.root}>
      <Typography variant="body2" color="textSecondary" paragraph className={classes.descriptionText}>
        Activate and configure Geographic Combatant Commands (COCOMs) as theaters of conflict. 
        For each active theater, define the opposing sides, their lead and supporting nations, and activate relevant Functional COCOMs.
      </Typography>
      
      <Paper className={classes.theatersList} elevation={0} variant="outlined">
        {configuredTheaters.length > 0 ? (
          configuredTheaters.map((theaterState, index) => (
            <GeographicCocomCard
              key={theaterState.cocomId}
              cocom={GEOGRAPHIC_COCOMS.find(gc => gc.id === theaterState.cocomId)}
              theaterState={theaterState}
              nations={nations}
              onUpdateTheaterState={handleUpdateTheaterState}
              colorScheme={THEATER_COLORS[index % THEATER_COLORS.length]}
            />
          ))
        ) : (
           <Box p={3} textAlign="center">
            <Typography variant="body1" color="textSecondary">Loading theater configurations...</Typography>
          </Box>
        )}
      </Paper>
      
      <Box className={classes.summaryInfo}>
        <Typography variant="body2">
          Total Active Theaters: <span className={classes.theaterCount} style={{color: activeTheatersCount > 0 ? THEATER_COLORS[0].side1 : 'inherit'}}>{activeTheatersCount}</span> / {GEOGRAPHIC_COCOMS.length}
        </Typography>
      </Box>
    </Box>
  );
}

export default ConflictTheatersPane;
