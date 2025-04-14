import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  ButtonGroup,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import FlagIcon from './FlagIcon';
import InfoIcon from '@material-ui/icons/Info';
import ExpandIcon from '@material-ui/icons/OpenInNew';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CloseIcon from '@material-ui/icons/Close';
import FullscreenIcon from '@material-ui/icons/Fullscreen';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  description: {
    marginBottom: theme.spacing(2),
  },
  progressContainer: {
    marginBottom: theme.spacing(2),
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  progress: {
    height: 8,
    borderRadius: 4,
  },
  relationshipsList: {
    flexGrow: 1,
    overflow: 'auto',
    marginBottom: theme.spacing(2),
  },
  relationshipItem: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  relationshipUndefined: {
    borderLeft: '4px solid #9e9e9e',
  },
  relationshipDefined: {
    borderLeft: '4px solid #4caf50',
  },
  nationContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  },
  vsLabel: {
    margin: theme.spacing(0, 2),
    color: theme.palette.text.secondary,
    fontWeight: 'bold',
  },
  flagIcon: {
    marginRight: theme.spacing(1),
  },
  buttonGroup: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  relationshipButton: {
    flex: 1,
    position: 'relative',
    fontWeight: 500,
    '&.selected': {
      boxShadow: `inset 0 0 0 1px currentColor`,
      fontWeight: 700,
    },
    '&.selected::after': {
      content: '""',
      position: 'absolute',
      bottom: -8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: '6px solid currentColor',
    },
  },
  allyButton: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    '&.selected': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.primary.main}`,
    },
  },
  partnerButton: {
    borderColor: theme.palette.success.main,
    color: theme.palette.success.main,
    '&.selected': {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.success.main}`,
    },
  },
  neutralButton: {
    borderColor: theme.palette.grey[500],
    color: theme.palette.grey[500],
    '&.selected': {
      backgroundColor: theme.palette.grey[500],
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.grey[500]}`,
    },
  },
  adversaryButton: {
    borderColor: theme.palette.warning.main,
    color: theme.palette.warning.main,
    '&.selected': {
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.warning.main}`,
    },
  },
  enemyButton: {
    borderColor: theme.palette.error.main,
    color: theme.palette.error.main,
    '&.selected': {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.error.main}`,
    },
  },
  infoIcon: {
    marginLeft: theme.spacing(1),
    fontSize: '1rem',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    }
  },
  notesContainer: {
    marginTop: theme.spacing(2),
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create('all', {
      duration: theme.transitions.duration.standard,
    }),
  },
  expandButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    zIndex: 1,
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    }
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  relationshipStatus: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  relationshipLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    fontWeight: 500,
    marginLeft: 'auto',
  },
  allyLabel: {
    backgroundColor: `${theme.palette.primary.main}20`,
    color: theme.palette.primary.main,
  },
  partnerLabel: {
    backgroundColor: `${theme.palette.success.main}20`,
    color: theme.palette.success.main,
  },
  neutralLabel: {
    backgroundColor: `${theme.palette.grey[500]}20`,
    color: theme.palette.grey[500],
  },
  adversaryLabel: {
    backgroundColor: `${theme.palette.warning.main}20`,
    color: theme.palette.warning.main,
  },
  enemyLabel: {
    backgroundColor: `${theme.palette.error.main}20`,
    color: theme.palette.error.main,
  },
  relationshipIcon: {
    fontSize: '1rem',
    marginRight: theme.spacing(0.5),
  },
  matrixContainer: {
    flex: '1 1 auto',
    overflowY: 'auto',
  },
  row: {
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  cell: {
    padding: theme.spacing(0.5),
    textAlign: 'center',
  },
  nationCell: {
    fontWeight: 'bold',
    padding: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  relationButton: {
    minWidth: 'unset',
    margin: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.75rem',
    fontWeight: 'normal',
    transition: theme.transitions.create(['background-color', 'box-shadow', 'border-color', 'color'], {
      duration: theme.transitions.duration.short,
    }),
  },
  relationButtonAlly: {
    color: theme.palette.success.main,
    borderColor: theme.palette.success.main,
    '&.selected': {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.success.main}`,
      transform: 'scale(1.05)',
    }
  },
  relationButtonFriendly: {
    color: theme.palette.info.main,
    borderColor: theme.palette.info.main,
    '&.selected': {
      backgroundColor: theme.palette.info.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.info.main}`,
      transform: 'scale(1.05)',
    }
  },
  relationButtonNeutral: {
    color: theme.palette.grey[600],
    borderColor: theme.palette.grey[400],
    '&.selected': {
      backgroundColor: theme.palette.grey[600],
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.grey[400]}`,
      transform: 'scale(1.05)',
    }
  },
  relationButtonUnfriendly: {
    color: theme.palette.warning.main,
    borderColor: theme.palette.warning.main,
    '&.selected': {
      backgroundColor: theme.palette.warning.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.warning.main}`,
      transform: 'scale(1.05)',
    }
  },
  relationButtonHostile: {
    color: theme.palette.error.main,
    borderColor: theme.palette.error.main,
    '&.selected': {
      backgroundColor: theme.palette.error.main,
      color: theme.palette.common.white,
      fontWeight: 'bold',
      boxShadow: `0 0 8px ${theme.palette.error.main}`,
      transform: 'scale(1.05)',
    }
  },
  relationshipDetails: {
    marginTop: theme.spacing(1),
  },
  relationshipNotesField: {
    marginTop: theme.spacing(1),
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogContent: {
    minWidth: 400,
    minHeight: 200,
    padding: theme.spacing(3),
  },
}));

// Helper function to generate a unique key for a nation pair
const getPairKey = (nation1Id, nation2Id) => {
  // Sort the IDs to ensure consistent keys regardless of order
  const sortedIds = [nation1Id, nation2Id].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

function RelationshipMatrix({ 
  nations = [], 
  relationships = {}, 
  onChange 
}) {
  const classes = useStyles();
  const [pairsToDefine, setPairsToDefine] = useState([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');
  
  // Generate all the nation pairs that need relationships defined
  useEffect(() => {
    if (nations.length < 2) return;
    
    const pairs = [];
    
    for (let i = 0; i < nations.length; i++) {
      for (let j = i + 1; j < nations.length; j++) {
        pairs.push({
          nation1: nations[i],
          nation2: nations[j],
          key: getPairKey(nations[i].entityId, nations[j].entityId)
        });
      }
    }
    
    setPairsToDefine(pairs);
    
    // Calculate completion percentage
    const totalPairs = pairs.length;
    const definedPairs = pairs.filter(pair => relationships[pair.key]?.type).length;
    
    setCompletionPercentage(totalPairs > 0 ? Math.round((definedPairs / totalPairs) * 100) : 0);
  }, [nations, relationships]);
  
  // Handler for setting relationship type
  const handleSetRelationship = (pairKey, relationType) => {
    const updatedRelationships = {
      ...relationships,
      [pairKey]: {
        type: relationType,
        notes: relationships[pairKey]?.notes || ''
      }
    };
    
    onChange(updatedRelationships);
  };
  
  // Handler for updating relationship notes
  const handleUpdateNotes = (pairKey, notes) => {
    const updatedRelationships = {
      ...relationships,
      [pairKey]: {
        ...relationships[pairKey],
        notes
      }
    };
    
    onChange(updatedRelationships);
  };
  
  // Handler for expanded notes dialog
  const handleOpenExpandedNotes = (pair) => {
    setExpandedNotes(pair);
  };
  
  const handleCloseExpandedNotes = () => {
    setExpandedNotes(null);
  };
  
  const handleSaveExpandedNotes = (notes) => {
    if (expandedNotes) {
      handleUpdateNotes(expandedNotes.key, notes);
      setExpandedNotes(null);
    }
  };
  
  // Determine if all relationships are defined
  const allRelationshipsDefined = completionPercentage === 100;

  // Get relationship type label
  const getRelationshipTypeLabel = (type) => {
    switch (type) {
      case 'ally': return 'Allies';
      case 'partner': return 'Partners';
      case 'neutral': return 'Neutral';
      case 'adversary': return 'Adversaries';
      case 'enemy': return 'Enemies';
      default: return '';
    }
  };
  
  // Get class for relationship type label
  const getRelationshipLabelClass = (type) => {
    switch (type) {
      case 'ally': return classes.allyLabel;
      case 'partner': return classes.partnerLabel;
      case 'neutral': return classes.neutralLabel;
      case 'adversary': return classes.adversaryLabel;
      case 'enemy': return classes.enemyLabel;
      default: return '';
    }
  };

  const handleCellClick = (nation1, nation2) => {
    if (nation1.entityId === nation2.entityId) return; // Skip self-relations
    
    const sortedNations = [nation1, nation2].sort((a, b) => a.entityId.localeCompare(b.entityId));
    setSelectedCell({
      nation1: sortedNations[0],
      nation2: sortedNations[1],
    });
    
    const key = getPairKey(sortedNations[0].entityId, sortedNations[1].entityId);
    if (relationships[key]?.notes) {
      setCurrentNotes(relationships[key].notes);
    } else {
      setCurrentNotes('');
    }
  };

  const handleNotesChange = (notes) => {
    if (!selectedCell) return;
    
    const key = getPairKey(selectedCell.nation1.entityId, selectedCell.nation2.entityId);
    
    const updatedRelationships = {
      ...relationships,
      [key]: {
        ...relationships[key],
        notes,
      }
    };
    
    setCurrentNotes(notes);
    onChange(updatedRelationships);
  };

  const handleOpenNotesDialog = () => {
    setNotesDialogOpen(true);
  };

  const handleCloseNotesDialog = () => {
    setNotesDialogOpen(false);
  };

  return (
    <Box className={classes.root}>
      <Typography variant="body2" color="textSecondary" paragraph className={classes.description}>
        Define the relationship between each pair of nations/organizations before configuring theaters of conflict.
        This will ensure that your theater configurations align with the established relationships.
      </Typography>
      
      <Box className={classes.progressContainer}>
        <Box className={classes.progressLabel}>
          <Typography variant="body2">
            Relationships defined: {completionPercentage}%
          </Typography>
          <Typography variant="body2" color={allRelationshipsDefined ? "primary" : "textSecondary"}>
            {allRelationshipsDefined ? "Complete!" : `${pairsToDefine.filter(pair => !relationships[pair.key]?.type).length} remaining`}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={completionPercentage} 
          className={classes.progress}
          color={allRelationshipsDefined ? "secondary" : "primary"}
        />
      </Box>
      
      <Paper className={classes.relationshipsList} elevation={2}>
        {pairsToDefine.length > 0 ? (
          pairsToDefine.map(pair => {
            const pairKey = pair.key;
            const currentRelationship = relationships[pairKey] || {};
            const relationType = currentRelationship.type || '';
            const relationshipNotes = currentRelationship.notes || '';
            
            return (
              <Box 
                key={pairKey} 
                className={`${classes.relationshipItem} ${relationType ? classes.relationshipDefined : classes.relationshipUndefined}`}
              >
                <Box className={classes.nationContainer}>
                  <Box className={classes.flagIcon}>
                    <FlagIcon entityId={pair.nation1.entityId} entityType={pair.nation1.entityType} />
                  </Box>
                  <Typography variant="body1">{pair.nation1.entityName}</Typography>
                  
                  <Typography className={classes.vsLabel}>vs</Typography>
                  
                  <Box className={classes.flagIcon}>
                    <FlagIcon entityId={pair.nation2.entityId} entityType={pair.nation2.entityType} />
                  </Box>
                  <Typography variant="body1">{pair.nation2.entityName}</Typography>
                </Box>
                
                {relationType ? (
                  <Box className={classes.relationshipStatus}>
                    <Typography className={`${classes.relationshipLabel} ${getRelationshipLabelClass(relationType)}`}>
                      <CheckCircleIcon className={classes.relationshipIcon} />
                      {getRelationshipTypeLabel(relationType)}
                    </Typography>
                  </Box>
                ) : null}
                
                <ButtonGroup variant="outlined" size="small" className={classes.buttonGroup}>
                  <Button
                    className={`${classes.relationshipButton} ${classes.allyButton} ${relationType === 'ally' ? 'selected' : ''}`}
                    onClick={() => handleSetRelationship(pairKey, 'ally')}
                    variant={relationType === 'ally' ? 'contained' : 'outlined'}
                    disableElevation
                  >
                    Ally
                  </Button>
                  <Button
                    className={`${classes.relationshipButton} ${classes.partnerButton} ${relationType === 'partner' ? 'selected' : ''}`}
                    onClick={() => handleSetRelationship(pairKey, 'partner')}
                    variant={relationType === 'partner' ? 'contained' : 'outlined'}
                    disableElevation
                  >
                    Partner
                  </Button>
                  <Button
                    className={`${classes.relationshipButton} ${classes.neutralButton} ${relationType === 'neutral' ? 'selected' : ''}`}
                    onClick={() => handleSetRelationship(pairKey, 'neutral')}
                    variant={relationType === 'neutral' ? 'contained' : 'outlined'}
                    disableElevation
                  >
                    Neutral
                  </Button>
                  <Button
                    className={`${classes.relationshipButton} ${classes.adversaryButton} ${relationType === 'adversary' ? 'selected' : ''}`}
                    onClick={() => handleSetRelationship(pairKey, 'adversary')}
                    variant={relationType === 'adversary' ? 'contained' : 'outlined'}
                    disableElevation
                  >
                    Adversary
                  </Button>
                  <Button
                    className={`${classes.relationshipButton} ${classes.enemyButton} ${relationType === 'enemy' ? 'selected' : ''}`}
                    onClick={() => handleSetRelationship(pairKey, 'enemy')}
                    variant={relationType === 'enemy' ? 'contained' : 'outlined'}
                    disableElevation
                  >
                    Enemy
                  </Button>
                </ButtonGroup>
                
                {relationType && (
                  <Collapse in={true}>
                    <Box className={classes.notesContainer}>
                      <Typography variant="subtitle2" gutterBottom>
                        Relationship Details
                      </Typography>
                      <TextField
                        multiline
                        rows={3}
                        variant="outlined"
                        fullWidth
                        size="small"
                        value={relationshipNotes}
                        onChange={(e) => handleUpdateNotes(pairKey, e.target.value)}
                        placeholder="Describe the specific nature of the relationship, historical context, and relevant details..."
                      />
                      <Tooltip title="Expand for more writing space">
                        <IconButton 
                          size="small" 
                          className={classes.expandButton}
                          onClick={() => handleOpenExpandedNotes({
                            ...pair,
                            notes: relationshipNotes,
                            type: relationType
                          })}
                          color="primary"
                        >
                          <ExpandIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Collapse>
                )}
              </Box>
            );
          })
        ) : (
          <Box padding={3} textAlign="center">
            <Typography color="textSecondary">
              Please add at least two nations or organizations to define relationships
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="textSecondary">
          <b>{pairsToDefine.length}</b> relationships to define
        </Typography>
        
        <Tooltip title="Define relationships between all nations to enable theater configuration. Theaters of conflict should align with these relationships.">
          <IconButton size="small">
            <InfoIcon className={classes.infoIcon} />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Expanded Notes Dialog */}
      <Dialog 
        open={expandedNotes !== null} 
        onClose={handleCloseExpandedNotes}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {expandedNotes && (
            <Box>
              <Typography variant="h6">
                Relationship Details
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <Box component="span" display="inline-flex" alignItems="center">
                  <FlagIcon entityId={expandedNotes.nation1?.entityId} entityType={expandedNotes.nation1?.entityType} style={{ marginRight: 8 }} />
                  {expandedNotes.nation1?.entityName}
                </Box>
                {' — '}
                <Box component="span" display="inline-flex" alignItems="center">
                  <FlagIcon entityId={expandedNotes.nation2?.entityId} entityType={expandedNotes.nation2?.entityType} style={{ marginRight: 8 }} />
                  {expandedNotes.nation2?.entityName}
                </Box>
                {' — '}
                <span className={getRelationshipLabelClass(expandedNotes.type)} style={{ padding: '2px 8px', borderRadius: 4 }}>
                  {getRelationshipTypeLabel(expandedNotes.type)}
                </span>
              </Typography>
              <IconButton
                aria-label="close"
                className={classes.closeButton}
                onClick={handleCloseExpandedNotes}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {expandedNotes && (
            <TextField
              autoFocus
              multiline
              rows={12}
              variant="outlined"
              fullWidth
              value={expandedNotes.notes || ''}
              onChange={(e) => setExpandedNotes({...expandedNotes, notes: e.target.value})}
              placeholder="Describe the relationship in detail. Include historical context, current dynamics, areas of cooperation or tension, potential for change, and specific policy considerations."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExpandedNotes} color="default">
            Cancel
          </Button>
          <Button 
            onClick={() => handleSaveExpandedNotes(expandedNotes?.notes || '')} 
            color="primary"
            variant="contained"
          >
            Save Details
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Relationship details panel */}
      {selectedCell && (
        <Box className={classes.relationshipDetails}>
          <Typography variant="subtitle1">
            {selectedCell.nation1.entityName} — {selectedCell.nation2.entityName} Relationship
          </Typography>
          
          <Box display="flex" alignItems="center">
            <TextField
              label="Relationship Notes"
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              variant="outlined"
              value={currentNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className={classes.relationshipNotesField}
            />
            <Tooltip title="Expand notes">
              <IconButton 
                className={classes.expandButton} 
                onClick={handleOpenNotesDialog}
                size="small"
              >
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
      
      {/* Expanded notes dialog */}
      <Dialog
        open={notesDialogOpen}
        onClose={handleCloseNotesDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle disableTypography className={classes.dialogTitle}>
          <Typography variant="h6">
            {selectedCell && `${selectedCell.nation1.entityName} — ${selectedCell.nation2.entityName} Relationship Notes`}
          </Typography>
          <IconButton className={classes.closeButton} onClick={handleCloseNotesDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <TextField
            autoFocus
            multiline
            fullWidth
            variant="outlined"
            minRows={10}
            value={currentNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Enter detailed notes about this relationship including historical context, disputed territories, trade agreements, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotesDialog} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RelationshipMatrix; 