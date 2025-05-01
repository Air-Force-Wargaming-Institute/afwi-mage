import React, { useState } from 'react';
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
  Tooltip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import FlagIcon from './FlagIcon';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  description: {
    marginBottom: theme.spacing(2),
  },
  theatersList: {
    flexGrow: 1,
    overflow: 'auto',
    marginBottom: theme.spacing(2),
  },
  theaterCard: {
    marginBottom: theme.spacing(2),
    border: '1px solid rgba(255, 255, 255, 0.12)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
  },
  cardHeader: {
    padding: theme.spacing(1, 2),
    '& .MuiCardHeader-action': {
      margin: 0,
    },
  },
  cardContent: {
    padding: theme.spacing(2),
  },
  sideColumn: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  side1Column: {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: 'rgba(66, 133, 244, 0.05)',
  },
  side2Column: {
    borderLeft: `4px solid ${theme.palette.error.main}`,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  sideLabel: {
    position: 'absolute',
    top: -12,
    left: 10,
    padding: theme.spacing(0, 1),
    backgroundColor: theme.palette.background.paper,
    fontSize: '0.75rem',
    fontWeight: 'bold',
  },
  formControl: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
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
  addButton: {
    marginTop: theme.spacing(2),
  },
  emptyState: {
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.shape.borderRadius,
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
  theaterDescription: {
    marginTop: theme.spacing(2),
    width: '100%',
  },
  summaryInfo: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  theaterCount: {
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginRight: theme.spacing(1),
  }
}));

// Predefined color schemes for theaters
const THEATER_COLORS = [
  { side1: '#4285F4', side2: '#EA4335' }, // Blue vs Red
  { side1: '#34A853', side2: '#FBBC05' }, // Green vs Yellow
  { side1: '#673AB7', side2: '#FF9800' }, // Purple vs Orange
  { side1: '#00BCD4', side2: '#FF5722' }, // Cyan vs Deep Orange
  { side1: '#3F51B5', side2: '#F44336' }, // Indigo vs Red
];

function TheaterCard({ 
  theater, 
  nations, 
  onUpdate, 
  onDelete,
  colorScheme
}) {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [theaterName, setTheaterName] = useState(theater.name);
  const [theaterDescription, setTheaterDescription] = useState(theater.description || '');
  const [side1Lead, setSide1Lead] = useState(theater.sides[0].leadNationId || '');
  const [side2Lead, setSide2Lead] = useState(theater.sides[1].leadNationId || '');
  const [side1Supporting, setSide1Supporting] = useState(theater.sides[0].supportingNationIds || []);
  const [side2Supporting, setSide2Supporting] = useState(theater.sides[1].supportingNationIds || []);

  // Handler for toggling card expansion
  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  // Handler for starting the edit mode
  const handleStartEdit = () => {
    setIsEditing(true);
    setExpanded(true); // Always expand when editing
  };

  // Handler for saving changes
  const handleSave = () => {
    const updatedTheater = {
      ...theater,
      name: theaterName,
      description: theaterDescription,
      sides: [
        {
          ...theater.sides[0],
          leadNationId: side1Lead,
          supportingNationIds: side1Supporting,
          colorCode: colorScheme.side1
        },
        {
          ...theater.sides[1],
          leadNationId: side2Lead,
          supportingNationIds: side2Supporting,
          colorCode: colorScheme.side2
        }
      ]
    };
    
    onUpdate(updatedTheater);
    setIsEditing(false);
  };

  // Handler for canceling edit mode
  const handleCancelEdit = () => {
    // Reset to original values
    setTheaterName(theater.name);
    setTheaterDescription(theater.description || '');
    setSide1Lead(theater.sides[0].leadNationId || '');
    setSide2Lead(theater.sides[1].leadNationId || '');
    setSide1Supporting(theater.sides[0].supportingNationIds || []);
    setSide2Supporting(theater.sides[1].supportingNationIds || []);
    setIsEditing(false);
  };

  // Handler for side 1 lead nation change
  const handleSide1LeadChange = (event) => {
    const nationId = event.target.value;
    setSide1Lead(nationId);
    
    // Remove from supporting nations if selected as lead
    if (side1Supporting.includes(nationId)) {
      setSide1Supporting(side1Supporting.filter(id => id !== nationId));
    }
    
    // Remove from side 2 if selected for side 1
    if (side2Lead === nationId) {
      setSide2Lead('');
    }
    if (side2Supporting.includes(nationId)) {
      setSide2Supporting(side2Supporting.filter(id => id !== nationId));
    }
  };

  // Handler for side 2 lead nation change
  const handleSide2LeadChange = (event) => {
    const nationId = event.target.value;
    setSide2Lead(nationId);
    
    // Remove from supporting nations if selected as lead
    if (side2Supporting.includes(nationId)) {
      setSide2Supporting(side2Supporting.filter(id => id !== nationId));
    }
    
    // Remove from side 1 if selected for side 2
    if (side1Lead === nationId) {
      setSide1Lead('');
    }
    if (side1Supporting.includes(nationId)) {
      setSide1Supporting(side1Supporting.filter(id => id !== nationId));
    }
  };

  // Handler for side 1 supporting nations change
  const handleSide1SupportingToggle = (nationId) => {
    if (side1Supporting.includes(nationId)) {
      // Remove nation
      setSide1Supporting(side1Supporting.filter(id => id !== nationId));
    } else {
      // Add nation if not already a lead on either side
      if (side1Lead !== nationId && side2Lead !== nationId && !side2Supporting.includes(nationId)) {
        setSide1Supporting([...side1Supporting, nationId]);
      }
    }
  };

  // Handler for side 2 supporting nations change
  const handleSide2SupportingToggle = (nationId) => {
    if (side2Supporting.includes(nationId)) {
      // Remove nation
      setSide2Supporting(side2Supporting.filter(id => id !== nationId));
    } else {
      // Add nation if not already a lead on either side
      if (side2Lead !== nationId && side1Lead !== nationId && !side1Supporting.includes(nationId)) {
        setSide2Supporting([...side2Supporting, nationId]);
      }
    }
  };

  // Find entity by ID
  const findEntityById = (entityId) => {
    return nations.find(nation => nation.entityId === entityId);
  };

  // Filter nations for selection dropdowns
  // Side 1 lead can't be side 2 lead, etc.
  const availableNationsForSide1Lead = nations.filter(nation => 
    nation.entityId !== side2Lead
  );
  
  const availableNationsForSide2Lead = nations.filter(nation => 
    nation.entityId !== side1Lead
  );
  
  const availableNationsForSide1Supporting = nations.filter(nation => 
    nation.entityId !== side1Lead && 
    nation.entityId !== side2Lead && 
    !side2Supporting.includes(nation.entityId)
  );
  
  const availableNationsForSide2Supporting = nations.filter(nation => 
    nation.entityId !== side2Lead && 
    nation.entityId !== side1Lead && 
    !side1Supporting.includes(nation.entityId)
  );

  return (
    <Card className={classes.theaterCard}>
      <CardHeader
        title={
          isEditing ? (
            <TextField
              value={theaterName}
              onChange={(e) => setTheaterName(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Theater Name"
            />
          ) : (
            <Box display="flex" alignItems="center">
              <Box className={classes.colorIndicator} style={{ backgroundColor: colorScheme.side1 }} />
              <Typography variant="h6">{theater.name}</Typography>
            </Box>
          )
        }
        action={
          <Box>
            {isEditing ? (
              <>
                <IconButton size="small" onClick={handleSave} color="primary">
                  <Tooltip title="Save changes">
                    <AddIcon />
                  </Tooltip>
                </IconButton>
                <IconButton size="small" onClick={handleCancelEdit}>
                  <Tooltip title="Cancel">
                    <DeleteIcon />
                  </Tooltip>
                </IconButton>
              </>
            ) : (
              <>
                <IconButton size="small" onClick={handleStartEdit}>
                  <Tooltip title="Edit theater">
                    <EditIcon />
                  </Tooltip>
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(theater.id)}>
                  <Tooltip title="Delete theater">
                    <DeleteIcon />
                  </Tooltip>
                </IconButton>
                <IconButton size="small" onClick={handleToggleExpand}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </>
            )}
          </Box>
        }
        className={classes.cardHeader}
      />
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent className={classes.cardContent}>
          <Grid container spacing={2}>
            {/* Side 1 Column */}
            <Grid item xs={12} md={6}>
              <Box className={`${classes.sideColumn} ${classes.side1Column}`}>
                <Typography className={classes.sideLabel} style={{ color: colorScheme.side1 }}>
                  Side 1
                </Typography>
                
                {/* Lead Nation Selection */}
                <FormControl variant="outlined" className={classes.formControl} size="small">
                  <InputLabel id={`side1-lead-label-${theater.id}`}>Lead Nation or Organization</InputLabel>
                  <Select
                    labelId={`side1-lead-label-${theater.id}`}
                    id={`side1-lead-${theater.id}`}
                    value={side1Lead}
                    onChange={handleSide1LeadChange}
                    label="Lead Nation or Organization"
                    disabled={!isEditing}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {availableNationsForSide1Lead.map((nation) => (
                      <MenuItem key={nation.entityId} value={nation.entityId}>
                        <Box className={classes.flagContainer}>
                          <Box className={classes.flagIcon}>
                            <FlagIcon entityId={nation.entityId} entityType={nation.entityType} />
                          </Box>
                          <Typography>{nation.entityName}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Display Lead Nation */}
                {side1Lead && !isEditing && (
                  <Box className={classes.flagContainer}>
                    <Box className={classes.flagIcon}>
                      <FlagIcon entityId={side1Lead} entityType={findEntityById(side1Lead)?.entityType} />
                    </Box>
                    <Typography variant="body1">
                      {findEntityById(side1Lead)?.entityName}
                      <Chip size="small" label="Lead" style={{ marginLeft: 8, backgroundColor: colorScheme.side1, color: '#fff' }} />
                    </Typography>
                  </Box>
                )}

                {/* Supporting Nations */}
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                  Supporting:
                </Typography>
                
                {isEditing ? (
                  <Box className={classes.supportingNations}>
                    {availableNationsForSide1Supporting.map((nation) => (
                      <Chip
                        key={nation.entityId}
                        icon={<FlagIcon entityId={nation.entityId} entityType={nation.entityType} />}
                        label={nation.entityName}
                        onClick={() => handleSide1SupportingToggle(nation.entityId)}
                        className={classes.chip}
                        color={side1Supporting.includes(nation.entityId) ? "primary" : "default"}
                        variant={side1Supporting.includes(nation.entityId) ? "default" : "outlined"}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box className={classes.supportingNations}>
                    {side1Supporting.length > 0 ? (
                      side1Supporting.map((nationId) => {
                        const nation = findEntityById(nationId);
                        return nation ? (
                          <Chip
                            key={nationId}
                            icon={<FlagIcon entityId={nationId} entityType={nation.entityType} />}
                            label={nation.entityName}
                            className={classes.chip}
                            variant="outlined"
                          />
                        ) : null;
                      })
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No supporting nations
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Side 2 Column */}
            <Grid item xs={12} md={6}>
              <Box className={`${classes.sideColumn} ${classes.side2Column}`}>
                <Typography className={classes.sideLabel} style={{ color: colorScheme.side2 }}>
                  Side 2
                </Typography>
                
                {/* Lead Nation Selection */}
                <FormControl variant="outlined" className={classes.formControl} size="small">
                  <InputLabel id={`side2-lead-label-${theater.id}`}>Lead Nation or Organization</InputLabel>
                  <Select
                    labelId={`side2-lead-label-${theater.id}`}
                    id={`side2-lead-${theater.id}`}
                    value={side2Lead}
                    onChange={handleSide2LeadChange}
                    label="Lead Nation or Organization"
                    disabled={!isEditing}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {availableNationsForSide2Lead.map((nation) => (
                      <MenuItem key={nation.entityId} value={nation.entityId}>
                        <Box className={classes.flagContainer}>
                          <Box className={classes.flagIcon}>
                            <FlagIcon entityId={nation.entityId} entityType={nation.entityType} />
                          </Box>
                          <Typography>{nation.entityName}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Display Lead Nation */}
                {side2Lead && !isEditing && (
                  <Box className={classes.flagContainer}>
                    <Box className={classes.flagIcon}>
                      <FlagIcon entityId={side2Lead} entityType={findEntityById(side2Lead)?.entityType} />
                    </Box>
                    <Typography variant="body1">
                      {findEntityById(side2Lead)?.entityName}
                      <Chip size="small" label="Lead" style={{ marginLeft: 8, backgroundColor: colorScheme.side2, color: '#fff' }} />
                    </Typography>
                  </Box>
                )}

                {/* Supporting Nations */}
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
                  Supporting:
                </Typography>
                
                {isEditing ? (
                  <Box className={classes.supportingNations}>
                    {availableNationsForSide2Supporting.map((nation) => (
                      <Chip
                        key={nation.entityId}
                        icon={<FlagIcon entityId={nation.entityId} entityType={nation.entityType} />}
                        label={nation.entityName}
                        onClick={() => handleSide2SupportingToggle(nation.entityId)}
                        className={classes.chip}
                        color={side2Supporting.includes(nation.entityId) ? "primary" : "default"}
                        variant={side2Supporting.includes(nation.entityId) ? "default" : "outlined"}
                      />
                    ))}
                  </Box>
                ) : (
                  <Box className={classes.supportingNations}>
                    {side2Supporting.length > 0 ? (
                      side2Supporting.map((nationId) => {
                        const nation = findEntityById(nationId);
                        return nation ? (
                          <Chip
                            key={nationId}
                            icon={<FlagIcon entityId={nationId} entityType={nation.entityType} />}
                            label={nation.entityName}
                            className={classes.chip}
                            variant="outlined"
                          />
                        ) : null;
                      })
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No supporting nations
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Theater Description */}
            <Grid item xs={12}>
              {isEditing ? (
                <TextField
                  className={classes.theaterDescription}
                  label="Theater Description (Rec)"
                  multiline
                  rows={2}
                  value={theaterDescription}
                  onChange={(e) => setTheaterDescription(e.target.value)}
                  variant="outlined"
                  size="small"
                  placeholder="Describe the theater of conflict..."
                />
              ) : (
                theaterDescription && (
                  <Box mt={2}>
                    <Typography variant="body2" color="textSecondary">
                      {theaterDescription}
                    </Typography>
                  </Box>
                )
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
}

function ConflictTheatersPane({ nations = [], theaters = [], onChange }) {
  const classes = useStyles();
  
  // Generate a new empty theater
  const createNewTheater = () => {
    return {
      id: `theater-${Date.now()}`,
      name: `New Theater`,
      description: '',
      sides: [
        {
          id: 'side1',
          leadNationId: '',
          supportingNationIds: [],
          colorCode: THEATER_COLORS[theaters.length % THEATER_COLORS.length].side1
        },
        {
          id: 'side2',
          leadNationId: '',
          supportingNationIds: [],
          colorCode: THEATER_COLORS[theaters.length % THEATER_COLORS.length].side2
        }
      ]
    };
  };

  // Add a new theater
  const handleAddTheater = () => {
    const newTheater = createNewTheater();
    const updatedTheaters = [...theaters, newTheater];
    onChange(updatedTheaters);
  };

  // Update an existing theater
  const handleUpdateTheater = (updatedTheater) => {
    const updatedTheaters = theaters.map(theater => 
      theater.id === updatedTheater.id ? updatedTheater : theater
    );
    onChange(updatedTheaters);
  };

  // Delete a theater
  const handleDeleteTheater = (theaterId) => {
    const updatedTheaters = theaters.filter(theater => theater.id !== theaterId);
    onChange(updatedTheaters);
  };

  return (
    <Box className={classes.root}>
      <Typography variant="body2" color="textSecondary" paragraph className={classes.description}>
        Theaters of conflict define distinct geographic areas where opposing forces engage. 
        Each theater has two sides with lead nations and supporting nations. 
        This helps organize complex multi-front scenarios like world wars.
      </Typography>
      
      <Paper className={classes.theatersList} elevation={2}>
        {theaters.length > 0 ? (
          theaters.map((theater, index) => (
            <TheaterCard
              key={theater.id}
              theater={theater}
              nations={nations}
              onUpdate={handleUpdateTheater}
              onDelete={handleDeleteTheater}
              colorScheme={THEATER_COLORS[index % THEATER_COLORS.length]}
            />
          ))
        ) : (
          <Box className={classes.emptyState}>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              No conflict theaters defined yet
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Add theaters to organize nations into opposing sides
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Box>
        <Button
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          className={classes.addButton}
          onClick={handleAddTheater}
          disabled={nations.length < 2}
        >
          Add Theater
        </Button>
        
        {nations.length < 2 && (
          <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
            Add at least 2 nations to create a conflict theater
          </Typography>
        )}
        
        <Box className={classes.summaryInfo}>
          <Typography variant="body2">
            Total theaters: <span className={classes.theaterCount}>{theaters.length}</span>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default ConflictTheatersPane;
