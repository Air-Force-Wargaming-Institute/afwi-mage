import React, { useState, useEffect, useCallback } from 'react';
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
  ButtonGroup,
  Tooltip,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Flag from 'react-world-flags';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import DoneIcon from '@material-ui/icons/Done';
import FlagIcon from './FlagIcon';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import DeleteIcon from '@material-ui/icons/Delete';
import DescriptionIcon from '@material-ui/icons/Description';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import ImageIcon from '@material-ui/icons/Image';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import TextEditorModal from './TextEditorModal';
import robotIcon from '../../../assets/robot-icon.png';

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
  approveButton: {
    marginLeft: theme.spacing(1),
    minWidth: 'auto',
    padding: theme.spacing(0.5, 1),
  },
  approveButtonApproved: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  fieldContainer: {
    position: 'relative',
    width: '100%',
  },
  approvedIndicator: {
    position: 'absolute',
    top: -10,
    right: 0,
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    fontSize: '0.7rem',
    padding: theme.spacing(0.25, 1),
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    alignItems: 'center',
    zIndex: 1,
  },
  approvedIcon: {
    fontSize: '0.85rem',
    marginRight: theme.spacing(0.5),
  },
  approveButtonRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%',
    marginTop: theme.spacing(0.5),
  },
  doctrineUploadArea: {
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    marginBottom: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(66, 133, 244, 0.1)',
      borderColor: theme.palette.secondary.main,
    },
  },
  dragActive: {
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    borderColor: theme.palette.secondary.main,
  },
  uploadIcon: {
    fontSize: '3rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  fileList: {
    maxHeight: '200px',
    overflowY: 'auto',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
  },
  fileItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  fileIcon: {
    color: theme.palette.primary.main,
  },
  fileSize: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  hiddenInput: {
    display: 'none',
  },
  objectivesList: {
    width: '100%',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
  },
  objectiveItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  addObjectiveButton: {
    marginTop: theme.spacing(1),
  },
  objectiveInput: {
    marginRight: theme.spacing(1),
    flexGrow: 1,
  },
  fieldHeaderContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  expandButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
  },
  textFieldContainer: {
    position: 'relative',
  },
  actionButtonsContainer: {
    display: 'flex',
    marginTop: theme.spacing(1),
    justifyContent: 'flex-start',
    '& > *': {
      marginRight: theme.spacing(1),
    }
  },
  disabledFieldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.text.disabled,
    pointerEvents: 'none',
  },
  fieldContainerDisabled: {
    opacity: 0.6,
    pointerEvents: 'none',
    position: 'relative',
    width: '100%',
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },
  objectivesSwitchContainer: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 3,
    backgroundColor: 'rgba(40,40,40,0.8)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  alertLevelSwitchContainer: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    top: theme.spacing(-1),
    right: theme.spacing(1),
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },
  doctrineSwitchContainer: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    top: theme.spacing(-1),
    right: theme.spacing(1),
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },
  fieldSwitchContainer: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    top: theme.spacing(0),
    right: theme.spacing(1),
    zIndex: 3,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },
  generalDocsContainer: {
    position: 'relative',
    marginBottom: theme.spacing(3),
  },
  generalDocsUploadArea: {
    border: `2px dashed ${theme.palette.info.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    marginBottom: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(0, 150, 255, 0.1)',
      borderColor: theme.palette.info.dark,
    },
  },
  generalDocsUploadIcon: {
    fontSize: '3rem',
    color: theme.palette.info.main,
    marginBottom: theme.spacing(1),
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

// Function to format tooltip text
const formatTooltip = (description, agents) => {
  return (
    <Box>
      <Typography variant="body2">{description}</Typography>
      <br />
      <Typography variant="body2"><strong>Agents:</strong></Typography>
      <Box component="ul" style={{ paddingLeft: 0, margin: '4px 0 0 0', listStyle: 'none' }}>
        {agents.map((agent, index) => (
          <Box component="li" key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <img src={robotIcon} alt="Agent icon" style={{ width: '12px', height: '14px', marginRight: '8px' }} />
            <Typography variant="body2" style={{ fontSize: '0.9rem' }}>{agent}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

function NationPosturePanel({ nation, otherNations, onSave, nationRelationships = {} }) {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // New state for objective inputs
  const [newDiplomacyObjective, setNewDiplomacyObjective] = useState('');
  const [newInformationObjective, setNewInformationObjective] = useState('');
  const [newMilitaryObjective, setNewMilitaryObjective] = useState('');
  const [newEconomicObjective, setNewEconomicObjective] = useState('');
  
  // State for tracking which objective is being edited
  const [editingObjective, setEditingObjective] = useState(null);
  
  // State for text editor modal
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [textEditorConfig, setTextEditorConfig] = useState({
    title: '',
    value: '',
    fieldName: '',
    section: '',
    field: '',
    placeholder: ''
  });
  
  // Initial state structure including enabledFields
  const initialNationData = {
    relationships: {},
    generalConfig: {
      supportingDocuments: [],
    },
    diplomacy: {
      objectives: [],
      posture: '',
      keyInitiatives: '',
      prioritiesMatrix: '',
      redLines: '',
      treatyObligations: '',
      diplomaticResources: '',
      specialConsiderations: '',
    },
    information: {
      objectives: [],
      propagandaThemes: '',
      cyberTargets: '',
      strategicCommunicationFramework: '',
      intelCollectionPriorities: '',
      disinformationResilience: '',
      mediaLandscapeControl: '',
      specialConsiderations: '',
    },
    military: {
      objectives: [],
      alertLevel: '',
      doctrine: '',
      doctrineFiles: [],
      forceStructureReadiness: '',
      escalationLadder: '',
      decisionMakingProtocol: '',
      forceProjectionCapabilities: '',
      defenseIndustrialCapacity: '',
      domainPosture: {
        land: '',
        sea: '',
        air: '',
        cyber: '',
        space: '',
      },
      specialConsiderations: '',
    },
    economic: {
      objectives: [],
      tradeFocus: '',
      resourceDeps: '',
      sanctionsPolicy: '',
      economicWarfareTools: '',
      criticalInfrastructureResilience: '',
      strategicResourceAccess: '',
      financialSystemLeverage: '',
      technologyTransferControls: '',
      specialConsiderations: '',
    },
    approvedFields: {},
    enabledFields: {
      generalConfig: { supportingDocuments: true },
      diplomacy: { objectives: true, posture: true, keyInitiatives: true, prioritiesMatrix: true, redLines: true, treatyObligations: true, diplomaticResources: true, specialConsiderations: true },
      information: { objectives: true, propagandaThemes: true, cyberTargets: true, strategicCommunicationFramework: true, intelCollectionPriorities: true, disinformationResilience: true, mediaLandscapeControl: true, specialConsiderations: true },
      military: { objectives: true, alertLevel: true, doctrine: true, forceStructureReadiness: true, escalationLadder: true, decisionMakingProtocol: true, forceProjectionCapabilities: true, defenseIndustrialCapacity: true, domainPosture: { land: true, sea: true, air: true, cyber: true, space: true }, specialConsiderations: true },
      economic: { objectives: true, tradeFocus: true, resourceDeps: true, sanctionsPolicy: true, economicWarfareTools: true, criticalInfrastructureResilience: true, strategicResourceAccess: true, financialSystemLeverage: true, technologyTransferControls: true, specialConsiderations: true },
    }
  };
  
  const [nationData, setNationData] = useState(initialNationData);
  
  // Alert level options
  const alertLevelOptions = [
    { value: 'Normal Peacetime Operations', label: 'Normal Peacetime Operations' },
    { value: 'Elevated Readiness', label: 'Elevated Readiness' },
    { value: 'Heightened Alert', label: 'Heightened Alert' },
    { value: 'High Alert', label: 'High Alert' },
    { value: 'Full Mobilization', label: 'Full Mobilization' },
    { value: 'War Footing', label: 'War Footing' }
  ];
  
  // Initialize nation data when nation changes
  useEffect(() => {
    if (nation) {
      let baseData = JSON.parse(JSON.stringify(initialNationData));
      if (nation.configData) {
        // Merge existing configData
        Object.keys(baseData).forEach(sectionKey => {
           if (sectionKey === 'generalConfig' && nation.configData.generalConfig) {
               baseData.generalConfig.supportingDocuments = nation.configData.generalConfig.supportingDocuments || [];
           } else if (sectionKey !== 'enabledFields' && sectionKey !== 'approvedFields') {
            if (nation.configData[sectionKey] && typeof baseData[sectionKey] === 'object' && !Array.isArray(baseData[sectionKey])) {
              Object.keys(baseData[sectionKey]).forEach(fieldKey => {
                if(typeof baseData[sectionKey][fieldKey] === 'object' && nation.configData[sectionKey]?.[fieldKey]) {
                  Object.keys(baseData[sectionKey][fieldKey]).forEach(subFieldKey => {
                     if (nation.configData[sectionKey][fieldKey]?.[subFieldKey] !== undefined) {
                       baseData[sectionKey][fieldKey][subFieldKey] = nation.configData[sectionKey][fieldKey][subFieldKey];
                     }
                  });
                } else if (nation.configData[sectionKey]?.[fieldKey] !== undefined) {
                   if (fieldKey === 'objectives' && !Array.isArray(nation.configData[sectionKey][fieldKey])) {
                     baseData[sectionKey][fieldKey] = nation.configData[sectionKey][fieldKey] ? [nation.configData[sectionKey][fieldKey]] : [];
                   } else {
                     baseData[sectionKey][fieldKey] = nation.configData[sectionKey][fieldKey];
                   }
                }
              });
            }
           }
        });
         baseData.approvedFields = { ...initialNationData.approvedFields, ...(nation.configData.approvedFields || {}) };
         const mergeEnabledFields = (target, source, initialSource) => {
            Object.keys(source).forEach(key => {
              if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                 mergeEnabledFields(target[key], source[key], initialSource[key] || {});
              } else {
                target[key] = source[key] !== undefined ? source[key] : true;
              }
            });
             Object.keys(initialSource).forEach(defaultKey => {
                 if (typeof initialSource[defaultKey] === 'object' && !Array.isArray(initialSource[defaultKey])) {
                     if (target[defaultKey] === undefined) target[defaultKey] = {};
                     Object.keys(initialSource[defaultKey]).forEach(subKey => {
                         if (target[defaultKey][subKey] === undefined) target[defaultKey][subKey] = true;
                     })
                 } else {
                     if(target[defaultKey] === undefined) target[defaultKey] = true;
                 }
             });
         };
         baseData.enabledFields = JSON.parse(JSON.stringify(initialNationData.enabledFields));
         if (nation.configData.enabledFields) {
            mergeEnabledFields(baseData.enabledFields, nation.configData.enabledFields, initialNationData.enabledFields);
        }
      }
      setNationData(baseData);
    } else {
      setNationData(initialNationData);
    }
  }, [nation]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleInputChange = (section, field, value) => {
    // Mark field as unapproved when changed
    const fieldKey = `${section}.${field}`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      },
      approvedFields: updatedApprovedFields
    }));
  };
  
  const handleMilitaryDomainChange = (domain, value) => {
    // Mark field as unapproved when changed
    const fieldKey = `military.domainPosture.${domain}`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        domainPosture: {
          ...prev.military.domainPosture,
          [domain]: value
        }
      },
      approvedFields: updatedApprovedFields
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
  
  // New handler to toggle field approval status
  const handleToggleApproval = (fieldKey) => {
    const updatedApprovedFields = { ...nationData.approvedFields };
    
    if (updatedApprovedFields[fieldKey]) {
      delete updatedApprovedFields[fieldKey];
    } else {
      updatedApprovedFields[fieldKey] = true;
    }
    
    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };
  
  const handleSave = () => {
    // Ensure objectives are arrays before saving
     const saveData = {
         ...nationData,
         diplomacy: { ...nationData.diplomacy, objectives: Array.isArray(nationData.diplomacy.objectives) ? nationData.diplomacy.objectives : [] },
         information: { ...nationData.information, objectives: Array.isArray(nationData.information.objectives) ? nationData.information.objectives : [] },
         military: { ...nationData.military, objectives: Array.isArray(nationData.military.objectives) ? nationData.military.objectives : [] },
         economic: { ...nationData.economic, objectives: Array.isArray(nationData.economic.objectives) ? nationData.economic.objectives : [] },
     };
    onSave({ ...nation, configData: saveData, isConfigured: true });
  };
  
  // Check if a field is approved
  const isFieldApproved = (fieldKey) => {
    return !!nationData.approvedFields[fieldKey];
  };
  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get appropriate icon for file type
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['pdf'].includes(extension)) {
      return <PictureAsPdfIcon className={classes.fileIcon} />;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
      return <ImageIcon className={classes.fileIcon} />;
    } else {
      return <DescriptionIcon className={classes.fileIcon} />;
    }
  };
  
  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);
  
  // Handle file selection via input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };
  
  // Process uploaded files
  const handleFileUpload = (files) => {
    // Create file objects with metadata
    const newFiles = files.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // In a real app, you might want to:
      // 1. Upload the file to a server and store the URL
      // 2. Read the file content and store it
      // For this example, we'll just store metadata
    }));
    
    // Update state with new files
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        doctrineFiles: [...prev.military.doctrineFiles, ...newFiles]
      }
    }));
    
    // Mark as unapproved when files are added
    const fieldKey = 'military.doctrine';
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };
  
  // Remove a file
  const handleRemoveFile = (fileId) => {
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        doctrineFiles: prev.military.doctrineFiles.filter(file => file.id !== fileId)
      }
    }));
    
    // Mark as unapproved when files are removed
    const fieldKey = 'military.doctrine';
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };
  
  // Generic handler for adding objectives to any DIME section
  const handleAddObjective = (section, objective) => {
    if (!objective.trim()) return;
    
    // Mark field as unapproved when changed
    const fieldKey = `${section}.objectives`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        objectives: [...prev[section].objectives, objective.trim()]
      },
      approvedFields: updatedApprovedFields
    }));
    
    // Clear the input field
    switch(section) {
      case 'diplomacy':
        setNewDiplomacyObjective('');
        break;
      case 'information':
        setNewInformationObjective('');
        break;
      case 'military':
        setNewMilitaryObjective('');
        break;
      case 'economic':
        setNewEconomicObjective('');
        break;
    }
  };
  
  // Generic handler for editing objectives in any DIME section
  const handleEditObjective = (section, index, newValue) => {
    if (!newValue.trim()) return;
    
    // Mark field as unapproved when changed
    const fieldKey = `${section}.objectives`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => {
      const updatedObjectives = [...prev[section].objectives];
      updatedObjectives[index] = newValue.trim();
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          objectives: updatedObjectives
        },
        approvedFields: updatedApprovedFields
      };
    });
    
    setEditingObjective(null);
  };
  
  // Generic handler for deleting objectives in any DIME section
  const handleDeleteObjective = (section, index) => {
    // Mark field as unapproved when changed
    const fieldKey = `${section}.objectives`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => {
      const updatedObjectives = [...prev[section].objectives];
      updatedObjectives.splice(index, 1);
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          objectives: updatedObjectives
        },
        approvedFields: updatedApprovedFields
      };
    });
  };
  
  // New handler to toggle field enable/disable status
  const handleToggleEnableField = (fieldKey) => {
    const keys = fieldKey.split('.');
    const section = keys[0];
    let currentLevel = nationData.enabledFields[section];
    let dataLevel = nationData[section];

    for (let i = 1; i < keys.length - 1; i++) {
      if (!currentLevel[keys[i]]) currentLevel[keys[i]] = {}; // Create intermediate objects if they don't exist
      if (!dataLevel[keys[i]]) dataLevel[keys[i]] = {};
      currentLevel = currentLevel[keys[i]];
      dataLevel = dataLevel[keys[i]];
    }

    const finalKey = keys[keys.length - 1];
    const currentEnabledState = currentLevel[finalKey];
    const newEnabledState = !currentEnabledState;

    // Update the enabled state
    currentLevel[finalKey] = newEnabledState;

    // Clear approval when enabling/disabling
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];

    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };

  // Check if a field is enabled
  const isFieldEnabled = (fieldKey) => {
    try {
      return fieldKey.split('.').reduce((obj, key) => obj && obj[key], nationData.enabledFields);
    } catch (e) {
      // console.error(`Error checking enabled status for ${fieldKey}:`, e);
      return true; // Default to enabled if path is invalid
    }
  };
  
  // Handler for opening text editor modal
  const handleOpenTextEditor = (title, value, section, field, placeholder) => {
    setTextEditorConfig({
      title,
      value,
      fieldName: `${section}.${field}`,
      section,
      field,
      placeholder
    });
    setTextEditorOpen(true);
  };
  
  // Handler for saving text from editor modal
  const handleTextEditorSave = (newValue) => {
    const { section, field } = textEditorConfig;
    
    if (section && field) {
      // Handle special case for military domain posture fields
      if (section === 'military' && field.includes('domainPosture.')) {
        const domain = field.split('.')[1];
        handleMilitaryDomainChange(domain, newValue);
      } else {
        // Standard field update
        handleInputChange(section, field, newValue);
      }
    }
    
    setTextEditorOpen(false);
  };
  
  // Handler for MAGE Assist button
  const handleMageAssist = (section, field) => {
    // Placeholder for future LLM functionality
    console.log(`MAGE Assist requested for ${section}.${field}`);
    // This would eventually trigger the MAGE LLM to help with content generation
  };
  
  // Specific File Handlers for General Config Docs
  const handleGeneralDocsUpload = useCallback((files) => {
    const newFiles = files.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name, size: file.size, type: file.type, lastModified: file.lastModified,
    }));
    setNationData(prev => ({
      ...prev,
      generalConfig: { ...prev.generalConfig, supportingDocuments: [...(prev.generalConfig?.supportingDocuments || []), ...newFiles] }
    }));
     // No specific approval tied directly to upload, maybe handled separately?
  }, []);

  const handleGeneralDocsDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleGeneralDocsUpload(files);
  }, [handleGeneralDocsUpload]);

  const handleGeneralDocsFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleGeneralDocsUpload(files);
  };

  const handleRemoveGeneralDoc = (fileId) => {
    setNationData(prev => ({
      ...prev,
      generalConfig: { ...prev.generalConfig, supportingDocuments: (prev.generalConfig?.supportingDocuments || []).filter(file => file.id !== fileId) }
    }));
     // No specific approval tied directly to removal
  };
  
  // DEFINE RENDER HELPERS WITHIN THE COMPONENT SCOPE

  const renderObjectivesList = (section, newObjective, setNewObjective) => {
    const fieldKey = `${section}.objectives`;
    const isEnabled = isFieldEnabled(fieldKey);
    const isApproved = isFieldApproved(fieldKey);
    const objectives = nationData[section]?.objectives || [];
    
    return (
      <Box mb={3} style={{ position: 'relative' }}>
         <FormControlLabel
           control={<Switch checked={isEnabled} onChange={() => handleToggleEnableField(fieldKey)} name={`${fieldKey}-enable`} color="primary" />}
           label={isEnabled ? "Objectives Enabled" : "Objectives Disabled"}
           className={classes.objectivesSwitchContainer}
         />
        <Box className={!isEnabled ? classes.fieldContainerDisabled : classes.fieldContainer}>
           <Box className={classes.fieldHeaderContainer} style={{ filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
          <Typography variant="subtitle1" style={{ marginRight: '16px' }}>Strategic Objectives</Typography>
          <Button
            variant={isApproved ? "contained" : "outlined"}
            size="small"
            onClick={() => handleToggleApproval(fieldKey)}
            className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`}
            startIcon={isApproved ? <DoneIcon /> : null}
               disabled={!isEnabled}
          >
            {isApproved ? "Approved" : "Approve & Commit"}
          </Button>
        </Box>
           <Typography variant="body2" color="textSecondary" paragraph style={{ filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
             Define the key {section === 'diplomacy' ? 'diplomatic' : section === 'information' ? 'information' : section === 'military' ? 'military' : 'economic'} goals and priorities for this entity.
        </Typography>
        {objectives.length > 0 && (
             <List className={classes.objectivesList} style={{ filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
            {objectives.map((objective, index) => (
              <ListItem key={index} className={classes.objectiveItem}>
                <ListItemText
                  primary={
                    editingObjective && editingObjective.section === section && editingObjective.index === index ? (
                         <TextField fullWidth value={editingObjective.value} onChange={(e) => setEditingObjective({...editingObjective, value: e.target.value})} autoFocus onKeyPress={(e) => {if (e.key === 'Enter') { handleEditObjective(section, index, editingObjective.value); e.preventDefault(); }}} onBlur={() => handleEditObjective(section, index, editingObjective.value)} disabled={!isEnabled} />
                       ) : (`${index + 1}. ${objective}`)
                  }
                />
                {(!editingObjective || editingObjective.section !== section || editingObjective.index !== index) && (
                  <ListItemSecondaryAction>
                       <IconButton edge="end" aria-label="edit" onClick={() => setEditingObjective({section, index, value: objective})} style={{ marginRight: 8 }} disabled={!isEnabled}><EditIcon fontSize="small" /></IconButton>
                       <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteObjective(section, index)} disabled={!isEnabled}><DeleteIcon fontSize="small" /></IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
           <Grid container spacing={1} alignItems="center" style={{ marginTop: 8, filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
          <Grid item xs>
               <TextField placeholder={`Enter a ${section} objective...`} variant="outlined" fullWidth size="small" value={newObjective} onChange={(e) => setNewObjective(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { handleAddObjective(section, newObjective); e.preventDefault(); } }} disabled={!isEnabled} />
          </Grid>
          <Grid item>
               <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleAddObjective(section, newObjective)} disabled={!newObjective.trim() || !isEnabled} size="small">Add</Button>
          </Grid>
        </Grid>
        </Box>
      </Box>
    );
  };
  
  const renderDoctrineUploadArea = (gridProps = { xs: 12, md: 6 }) => {
    const fieldKey = 'military.doctrine';
    const isEnabled = isFieldEnabled(fieldKey);
    const isApproved = isFieldApproved(fieldKey);
    const doctrineFiles = nationData.military?.doctrineFiles || [];
    return (
      <Grid item {...gridProps}>
        <Box style={{ position: 'relative' }}>
          <FormControlLabel
            control={<Switch checked={isEnabled} onChange={() => handleToggleEnableField(fieldKey)} name={`${fieldKey}-enable`} color="primary" />}
            label={isEnabled ? "Doctrine Enabled" : "Doctrine Disabled"}
            className={classes.doctrineSwitchContainer}
          />
          <Box className={!isEnabled ? classes.fieldContainerDisabled : classes.fieldContainer}>
            {isApproved && isEnabled && (<Box className={classes.approvedIndicator}><DoneIcon className={classes.approvedIcon} /><Typography variant="caption">Approved</Typography></Box>)}
          <Typography variant="subtitle1" gutterBottom>Military Doctrine Documents</Typography>
            <Box className={`${classes.doctrineUploadArea} ${isDragging ? classes.dragActive : ''}`} onDragOver={isEnabled ? handleDragOver : undefined} onDragLeave={isEnabled ? handleDragLeave : undefined} onDrop={isEnabled ? handleDrop : undefined} onClick={isEnabled ? () => document.getElementById('doctrine-file-input').click() : undefined} style={{ cursor: isEnabled ? 'pointer' : 'not-allowed', filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
              <input id="doctrine-file-input" type="file" multiple className={classes.hiddenInput} onChange={handleFileSelect} disabled={!isEnabled} />
            <CloudUploadIcon className={classes.uploadIcon} />
              <Typography variant="body1" gutterBottom>Drag & drop doctrine documents here</Typography>
              <Typography variant="body2" color="textSecondary">or click to select files</Typography>
          </Box>
          {doctrineFiles.length > 0 && (
              <List className={classes.fileList} style={{ filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
              {doctrineFiles.map((file) => (
                <ListItem key={file.id} className={classes.fileItem}>
                    <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                    <ListItemText primary={file.name} secondary={<span className={classes.fileSize}>{formatFileSize(file.size)}</span>} />
                    <ListItemSecondaryAction><IconButton edge="end" onClick={() => handleRemoveFile(file.id)} disabled={!isEnabled}><DeleteIcon fontSize="small" /></IconButton></ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
            <TextField label="Doctrine Summary (Optional)" variant="outlined" fullWidth multiline rows={2} value={nationData.military?.doctrine || ''} onChange={(e) => handleInputChange('military', 'doctrine', e.target.value)} placeholder="Briefly summarize the doctrine outlined in the uploaded documents..." style={{ marginTop: 16 }} disabled={!isEnabled} />
          <Box className={classes.approveButtonRow}>
              <Button variant={isApproved ? "contained" : "outlined"} size="small" onClick={() => handleToggleApproval(fieldKey)} className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`} startIcon={isApproved ? <DoneIcon /> : null} disabled={!isEnabled}>{isApproved ? "Approved" : "Approve & Commit"}</Button>
            </Box>
          </Box>
        </Box>
      </Grid>
    );
  };
  
  const renderFieldWithApproval = (section, field, label, rows = 3, placeholder = '', gridProps = { xs: 12 }, tooltipDescription = '', tooltipAgents = []) => {
    const fieldKey = `${section}.${field}`;
    const isEnabled = isFieldEnabled(fieldKey);
    const isApproved = isFieldApproved(fieldKey);
    let fieldValue = '';
    try {
      fieldValue = field.split('.').reduce((obj, key) => obj && obj[key] !== undefined ? obj[key] : '', nationData[section] || '');
    } catch (e) { fieldValue = ''; }
    const tooltipContent = tooltipDescription ? formatTooltip(tooltipDescription, tooltipAgents) : label;
    return (
      <Grid item {...gridProps}>
        <Box style={{ position: 'relative' }}>
           <FormControlLabel
             control={<Switch checked={isEnabled} onChange={() => handleToggleEnableField(fieldKey)} name={`${fieldKey}-enable`} color="primary" />}
             label={isEnabled ? "Enabled" : "Disabled"}
             className={classes.fieldSwitchContainer}
            />
           <Box className={!isEnabled ? classes.fieldContainerDisabled : classes.fieldContainer}>
            {isApproved && isEnabled && (<Box className={classes.approvedIndicator}><DoneIcon className={classes.approvedIcon} /><Typography variant="caption">Approved</Typography></Box>)}
            <Tooltip title={tooltipContent} placement="top-start" arrow>
          <Box className={classes.textFieldContainer}>
                <TextField label={label} variant="outlined" fullWidth multiline={rows > 1} rows={rows} value={fieldValue || ''} onChange={(e) => { if (section === 'military' && field.startsWith('domainPosture.')) { const domain = field.split('.')[1]; handleMilitaryDomainChange(domain, e.target.value); } else { handleInputChange(section, field, e.target.value); } }} placeholder={placeholder} disabled={!isEnabled} />
                {rows > 1 && (<Tooltip title="Open fullscreen editor"><span><IconButton className={classes.expandButton} onClick={() => handleOpenTextEditor(label, fieldValue, section, field, placeholder)} size="small" disabled={!isEnabled}><FullscreenIcon /></IconButton></span></Tooltip>)}
          </Box>
            </Tooltip>
          <Box className={classes.actionButtonsContainer}>
              <Button variant={isApproved ? "contained" : "outlined"} size="small" onClick={() => handleToggleApproval(fieldKey)} className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`} startIcon={isApproved ? <DoneIcon /> : null} disabled={!isEnabled}>{isApproved ? "Approved" : "Approve & Commit"}</Button>
              {rows > 1 && (<><Button variant="outlined" size="small" color="secondary" startIcon={<FullscreenIcon />} onClick={() => handleOpenTextEditor(label, fieldValue, section, field, placeholder)} disabled={!isEnabled}>Open Editor</Button><Button variant="outlined" size="small" color="primary" startIcon={<AutorenewIcon />} onClick={() => handleMageAssist(section, field)} disabled={!isEnabled}>MAGE Assist</Button></>)}
              {isApproved && isEnabled && (<Typography variant="caption" color="textSecondary" style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}><DoneIcon fontSize="small" style={{ color: '#4caf50', marginRight: 4 }} />Content approved</Typography>)}
            </Box>
          </Box>
        </Box>
      </Grid>
    );
  };
  
  const renderAlertLevelDropdown = (gridProps = { xs: 12, md: 6 }) => {
    const fieldKey = 'military.alertLevel';
    const isEnabled = isFieldEnabled(fieldKey);
    const isApproved = isFieldApproved(fieldKey);
    const tooltipDescription = "Set the current military readiness status. Affects response times and resource availability.";
    const tooltipAgents = ["Military Command", "Readiness Assessment"];
    const tooltipContent = formatTooltip(tooltipDescription, tooltipAgents);
    return (
      <Grid item {...gridProps}>
        <Box style={{ position: 'relative' }}>
           <FormControlLabel
             control={<Switch checked={isEnabled} onChange={() => handleToggleEnableField(fieldKey)} name={`${fieldKey}-enable`} color="primary" />}
             label={isEnabled ? "Enabled" : "Disabled"}
             className={classes.alertLevelSwitchContainer}
            />
           <Box className={!isEnabled ? classes.fieldContainerDisabled : classes.fieldContainer}>
            {isApproved && isEnabled && (<Box className={classes.approvedIndicator}><DoneIcon className={classes.approvedIcon} /><Typography variant="caption">Approved</Typography></Box>)}
            <Tooltip title={tooltipContent} placement="top-start" arrow>
              <FormControl variant="outlined" fullWidth disabled={!isEnabled}>
            <InputLabel id="military-alert-level-label">Military Alert Level</InputLabel>
                <Select labelId="military-alert-level-label" id="military-alert-level" value={nationData.military?.alertLevel || ''} onChange={(e) => handleInputChange('military', 'alertLevel', e.target.value)} label="Military Alert Level">
                  <MenuItem value=""><em>Select an alert level...</em></MenuItem>
                  {alertLevelOptions.map((option) => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
            </Select>
          </FormControl>
            </Tooltip>
          <Box className={classes.approveButtonRow}>
              <Button variant={isApproved ? "contained" : "outlined"} size="small" onClick={() => handleToggleApproval(fieldKey)} className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`} startIcon={isApproved ? <DoneIcon /> : null} disabled={!isEnabled}>{isApproved ? "Approved" : "Approve & Commit"}</Button>
            </Box>
          </Box>
        </Box>
      </Grid>
    );
  };
  
  const renderGeneralDocsUploadArea = () => {
    const fieldKey = 'generalConfig.supportingDocuments';
    const isEnabled = isFieldEnabled(fieldKey);
    const supportingDocuments = nationData.generalConfig?.supportingDocuments || [];

    return (
      <Box className={classes.generalDocsContainer}>
         <FormControlLabel
           control={<Switch checked={isEnabled} onChange={() => handleToggleEnableField(fieldKey)} name={`${fieldKey}-enable`} color="primary" />}
           label={isEnabled ? "Doc Upload Enabled" : "Doc Upload Disabled"}
           className={classes.switchContainer}
         />
         <Box className={!isEnabled ? classes.fieldContainerDisabled : classes.fieldContainer}>
          <Typography variant="subtitle1" gutterBottom>Upload Supporting Documents</Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Upload relevant treaties, historical documents, policies, doctrines, or other materials that inform this entity's background and potential actions across all DIME areas.
          </Typography>

          <Box
            className={`${classes.generalDocsUploadArea} ${isDragging ? classes.dragActive : ''}`}
            onDragOver={isEnabled ? handleDragOver : undefined}
            onDragLeave={isEnabled ? handleDragLeave : undefined}
            onDrop={isEnabled ? handleGeneralDocsDrop : undefined}
            onClick={isEnabled ? () => document.getElementById('general-docs-file-input').click() : undefined}
            style={{ cursor: isEnabled ? 'pointer' : 'not-allowed', filter: !isEnabled ? 'grayscale(1)' : 'none' }}
          >
            <input
              id="general-docs-file-input"
              type="file"
              multiple
              className={classes.hiddenInput}
              onChange={handleGeneralDocsFileSelect}
              disabled={!isEnabled}
            />
            <CloudUploadIcon className={classes.generalDocsUploadIcon} />
            <Typography variant="body1" gutterBottom>Drag & drop general documents here</Typography>
            <Typography variant="body2" color="textSecondary">or click to select files</Typography>
          </Box>

          {supportingDocuments.length > 0 && (
            <List className={classes.fileList} style={{ filter: !isEnabled ? 'grayscale(1)' : 'none' }}>
              {supportingDocuments.map((file) => (
                <ListItem key={file.id} className={classes.fileItem}>
                  <ListItemIcon>{getFileIcon(file.name)}</ListItemIcon>
                  <ListItemText primary={file.name} secondary={<span className={classes.fileSize}>{formatFileSize(file.size)}</span>} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleRemoveGeneralDoc(file.id)} disabled={!isEnabled}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
         </Box>
      </Box>
    );
  };

  if (!nation) return null;
  
  return (
    <Paper className={classes.root} elevation={2}>
      <Box className={classes.header}>
        <Box className={classes.flagContainer}>
          <Flag code={nation.entityId} className={classes.flag} />
        </Box>
        <Typography variant="h5" style={{ fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.6)'}}>{nation.entityName} Configuration</Typography>
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
          label={<Typography variant="subtitle1">General Configuration & Supporting Documents</Typography>}
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
        <TabPanel value={tabValue} index={0} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              General Configuration & Supporting Documents
          </Typography>
            {renderGeneralDocsUploadArea()}
                          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Diplomatic Posture
            </Typography>
            
            {renderObjectivesList('diplomacy', newDiplomacyObjective, setNewDiplomacyObjective)}
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'diplomacy', 
                'posture', 
                "General Diplomatic Posture", 
                3, 
                "Describe the general diplomatic stance (e.g., cooperative, assertive, isolationist)...",
                { xs: 12, md: 6 },
                "Overall diplomatic approach influencing interactions.",
                ["Head of State", "Foreign Minister", "Diplomatic Corps Lead"]
              )}
              
              {renderFieldWithApproval(
                'diplomacy', 
                'keyInitiatives', 
                "Key Diplomatic Initiatives", 
                3, 
                "Outline current or planned diplomatic initiatives...",
                { xs: 12, md: 6 },
                "Specific active diplomatic efforts.",
                ["Diplomatic Initiative Lead", "Regional Ambassadors", "Special Envoys"]
              )}
              
              {renderFieldWithApproval(
                'diplomacy',
                'prioritiesMatrix',
                "Diplomatic Priorities Matrix",
                4,
                "Describe and rank priorities: Bilateral (key nations), Multilateral (forums like UN, NATO), Issue Areas (e.g., climate, trade, security).",
                { xs: 12, md: 6 },
                "Guides resource allocation and focus for diplomatic efforts.",
                ["Foreign Policy Strategist", "Resource Allocation Agent"]
              )}
              
              {renderFieldWithApproval(
                'diplomacy',
                'redLines',
                "Red Lines & Core Interests",
                3,
                "Define non-negotiable positions, vital national interests, and actions by others that would trigger significant diplomatic or other responses.",
                { xs: 12, md: 6 },
                "Defines critical boundaries and triggers for strong reactions.",
                ["National Security Advisor", "Crisis Response Team Lead"]
              )}
              
              {renderFieldWithApproval(
                'diplomacy',
                'treatyObligations',
                "Alliance & Treaty Obligations",
                3,
                "List key treaty commitments (e.g., NATO Article 5, mutual defense pacts) and describe how they constrain or dictate actions.",
                { xs: 12, md: 6 },
                "Formal commitments influencing diplomatic and military options.",
                ["Legal Advisor (International Law)", "Alliance Coordinator"]
              )}
              
              {renderFieldWithApproval(
                'diplomacy',
                'diplomaticResources',
                "Diplomatic Resources & Capabilities",
                3,
                "Describe the strengths, weaknesses, and limitations of the diplomatic corps (e.g., number of embassies, expertise areas, negotiation leverage).",
                { xs: 12, md: 6 },
                "Capacity for diplomatic action.",
                ["Diplomatic Corps Lead", "Foreign Ministry Operations"]
              )}
              
              {renderFieldWithApproval(
                'diplomacy', 
                'specialConsiderations', 
                "Special Considerations (Diplomacy)",
                3, 
                "Any unique factors, sensitivities, or constraints that influence diplomatic behavior...",
                { xs: 12 },
                "Unique diplomatic context, historical factors, or cultural nuances.",
                ["Cultural Advisor", "Historical Context Analyst"]
              )}
            </Grid>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Information Operations
            </Typography>
            
            {renderObjectivesList('information', newInformationObjective, setNewInformationObjective)}
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'information', 
                'propagandaThemes', 
                "Propaganda Themes", 
                3, 
                "Key narratives and messaging themes for domestic and international audiences...",
                { xs: 12, md: 6 },
                "Core messages used in influence campaigns.",
                ["Strategic Communicator", "Public Affairs Officer", "Propaganda Analyst"]
              )}
              
              {renderFieldWithApproval(
                'information', 
                'cyberTargets', 
                "Cyber Capabilities & Targets (Info Ops)",
                3, 
                "Describe cyber capabilities and potential targets specifically for information operations (e.g., influencing media, social networks).",
                { xs: 12, md: 6 },
                "Cyber tools for influence operations.",
                ["Cyber Influence Lead", "Social Media Analyst", "Network Intrusion Specialist (Info Ops)"]
              )}
              
              {renderFieldWithApproval(
                'information',
                'strategicCommunicationFramework',
                "Strategic Communication Framework",
                3,
                "Outline the approach to coordinating and disseminating narratives across government channels and media.",
                { xs: 12, md: 6 },
                "Overall strategy for managing information flow and messaging.",
                ["Information Strategy Lead", "Interagency Comms Coordinator"]
              )}
              
              {renderFieldWithApproval(
                'information',
                'intelCollectionPriorities',
                "Intelligence Collection Priorities (Info)",
                3,
                "Specify key information intelligence needs related to diplomatic, economic, or military intentions/capabilities of others.",
                { xs: 12, md: 6 },
                "Focus areas for information gathering.",
                ["Intelligence Director (Info Ops)", "Collection Manager", "HUMINT/SIGINT/OSINT Leads"]
              )}
              
              {renderFieldWithApproval(
                'information',
                'disinformationResilience',
                "Disinformation Resilience",
                3,
                "Describe the capacity and methods used to identify, attribute, and counter foreign disinformation campaigns.",
                { xs: 12, md: 6 },
                "Ability to defend against hostile influence operations.",
                ["Counter-Disinformation Analyst", "Media Monitoring Lead", "Public Awareness Campaign Mgr."]
              )}
              
              {renderFieldWithApproval(
                'information',
                'mediaLandscapeControl',
                "Media Landscape & Control",
                3,
                "Describe the domestic media environment (free press, state-controlled) and the government's ability to influence or control information flow.",
                { xs: 12, md: 6 },
                "Level of influence over domestic information space.",
                ["Domestic Media Liaison", "State Media Director", "Internet Censorship Monitor"]
              )}
              
              {renderFieldWithApproval(
                'information', 
                'specialConsiderations', 
                "Special Considerations (Information)",
                3, 
                "Any unique factors, sensitivities, or constraints that influence information operations...",
                { xs: 12 },
                "Unique context for information warfare (e.g., linguistic diversity, specific platform usage).",
                ["Cultural Analyst (Info Ops)", "Regional Media Expert"]
              )}
            </Grid>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Military Posture
            </Typography>
            
            {renderObjectivesList('military', newMilitaryObjective, setNewMilitaryObjective)}
            
            <Grid container spacing={3}>
              {renderAlertLevelDropdown({ xs: 12, md: 6 })}
              {renderDoctrineUploadArea({ xs: 12, md: 6 })}

              {/* --- New Military Fields --- */}
               {renderFieldWithApproval(
                 'military',
                 'forceStructureReadiness',
                 "Force Structure & Readiness",
                 4,
                 "Describe the composition of major military units (divisions, fleets, air wings), their readiness levels, and key equipment.",
                 { xs: 12, md: 6 },
                 "Details the available military units and their combat readiness.",
                 ["Force Structure Analyst", "Readiness Assessment Officer", "Joint Operations Planner"]
               )}

               {renderFieldWithApproval(
                 'military',
                 'escalationLadder',
                 "Escalation Ladder & Thresholds",
                 3,
                 "Define the steps of military response considered for various provocations or scenarios, and the thresholds for escalating.",
                 { xs: 12, md: 6 },
                 "Pre-defined response levels to guide escalation decisions.",
                 ["Military Strategist", "Crisis Action Planner", "Rules of Engagement Advisor"]
               )}

               {renderFieldWithApproval(
                 'military',
                 'decisionMakingProtocol',
                 "Military Decision-Making Protocol",
                 3,
                 "Describe the command structure (e.g., civilian control, joint chiefs) and authorization process for significant military actions.",
                 { xs: 12, md: 6 },
                 "How military decisions are made and authorized.",
                 ["National Command Authority Liaison", "Joint Staff Planner", "Military Legal Advisor"]
               )}

               {renderFieldWithApproval(
                 'military',
                 'forceProjectionCapabilities',
                 "Force Projection Capabilities",
                 3,
                 "Detail the ability to deploy and sustain military forces abroad (e.g., logistics, transport, overseas basing).",
                 { xs: 12, md: 6 },
                 "Ability to operate forces away from home territory.",
                 ["Logistics Command Lead", "Strategic Mobility Planner", "Overseas Base Commander"]
               )}

               {renderFieldWithApproval(
                 'military',
                 'defenseIndustrialCapacity',
                 "Defense-Industrial Capacity",
                 3,
                 "Describe the ability to produce/procure military equipment, munitions, and sustain protracted operations.",
                 { xs: 12 },
                 "Ability to sustain military effort through production and procurement.",
                 ["Defense Procurement Lead", "Industrial Base Analyst", "Wartime Production Planner"]
               )}
              {/* --- End New Military Fields --- */}
            </Grid>
            
            <Typography variant="subtitle1" gutterBottom style={{ marginTop: 24 }}>
              Domain-Specific Posture
            </Typography>
            
            {/* --- Re-add Domain Specific Posture Fields --- */}
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'military', 
                'domainPosture.land', 
                "Land Forces Posture",
                2, 
                "Disposition and employment of land forces...",
                { xs: 12, md: 4 },
                "How ground forces are positioned and intended to operate.",
                ["Army Command Lead", "Ground Operations Planner", "Logistics Support (Land)"]
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.sea', 
                "Naval Forces Posture",
                2, 
                "Disposition and employment of naval forces...",
                { xs: 12, md: 4 },
                "How naval assets are positioned and intended to operate.",
                ["Navy Command Lead", "Maritime Operations Planner", "Fleet Logistics"]
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.air', 
                "Air Forces Posture",
                2, 
                "Disposition and employment of air forces...",
                { xs: 12, md: 4 },
                "How air assets are positioned and intended to operate.",
                ["Air Force Command Lead", "Air Operations Planner", "Air Base Logistics"]
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.cyber', 
                "Cyber Command Posture",
                2, 
                "Military cyber operations, capabilities, and posture (offensive/defensive focus)...",
                { xs: 12, md: 6 },
                "Military stance and capabilities in the cyber domain.",
                ["Cyber Command Lead", "Offensive Cyber Ops Planner", "Defensive Cyber Ops Lead"]
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.space', 
                "Space Command Posture",
                2, 
                "Military space operations, capabilities, and posture (e.g., satellite defense, ASAT)...",
                { xs: 12, md: 6 },
                "Military stance and capabilities in the space domain.",
                ["Space Command Lead", "Satellite Operations Mgr", "ASAT Capabilities Analyst"]
              )}
            </Grid>
            {/* --- End Domain Specific Posture Fields --- */}

            {/* Special Considerations for Military */}
            <Grid container spacing={3} style={{ marginTop: 16 }}>
              {renderFieldWithApproval(
                'military', 
                'specialConsiderations', 
                 "Special Considerations (Military)",
                3, 
                 "Any unique factors, sensitivities, or constraints that influence military operations...",
                 { xs: 12 },
                 "Unique military context (e.g., terrain, specific rivalries, historical precedents).",
                 ["Military Historian", "Regional Military Expert", "Special Operations Advisor"]
              )}
            </Grid>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={4} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Economic Posture
            </Typography>
            
            {renderObjectivesList('economic', newEconomicObjective, setNewEconomicObjective)}
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'economic', 
                'tradeFocus', 
                "Trade Focus & Key Partners",
                3, 
                "Key trade priorities, major partners, trade balances, and strategic import/export categories...",
                { xs: 12, md: 6 },
                "Primary trade relationships and dependencies.",
                ["Trade Minister", "Economic Analyst (Trade)", "Customs Lead"]
              )}
              
              {renderFieldWithApproval(
                'economic', 
                'resourceDeps', 
                "Resource Dependencies & Supply Chains",
                3, 
                "Critical resources (energy, minerals, food), key supply chain vulnerabilities, and stockpiling policies...",
                { xs: 12, md: 6 },
                "Reliance on external resources and supply chain security.",
                ["Resource Security Analyst", "Supply Chain Risk Manager", "Energy Minister"]
              )}
              
              {renderFieldWithApproval(
                'economic', 
                'sanctionsPolicy', 
                "Sanctions Policy", 
                2, 
                "Approach to economic sanctions (both imposing and responding to), effectiveness, and key targets/sectors...",
                { xs: 12 },
                "Strategy regarding the use and response to economic sanctions.",
                ["Sanctions Coordinator", "Treasury Analyst", "International Finance Liaison"]
              )}
              
              {renderFieldWithApproval(
                'economic',
                'economicWarfareTools',
                "Economic Warfare Tools",
                3,
                "Specific instruments available for economic coercion (e.g., tariffs, asset freezes, investment restrictions) and defense.",
                { xs: 12, md: 6 },
                "Tools used for economic statecraft and defense.",
                ["Economic Warfare Strategist", "Financial Intelligence Lead", "Trade Policy Advisor"]
              )}
              
              {renderFieldWithApproval(
                'economic',
                'criticalInfrastructureResilience',
                "Critical Infrastructure Resilience (Economic)",
                3,
                "Vulnerability and protection measures for key economic infrastructure (e.g., energy grids, financial networks, ports).",
                { xs: 12, md: 6 },
                "Security of essential economic systems.",
                ["Infrastructure Security Lead", "Energy Grid Manager", "Port Authority Liaison"]
              )}
              
              {renderFieldWithApproval(
                'economic',
                'strategicResourceAccess',
                "Strategic Resource Access & Control",
                3,
                "Describe efforts to secure long-term access to critical resources (e.g., foreign investment, control of shipping lanes).",
                { xs: 12, md: 6 },
                "Long-term strategy for securing vital resources.",
                ["Strategic Resource Planner", "Foreign Investment Analyst", "Maritime Security Lead"]
              )}
              
              {renderFieldWithApproval(
                'economic',
                'financialSystemLeverage',
                "Financial System Leverage",
                3,
                "Describe the nation's influence within the global financial system (e.g., currency status, debt holdings, SWIFT access).",
                { xs: 12, md: 6 },
                "Influence wielded through financial mechanisms.",
                ["Central Bank Governor", "International Monetary Fund Rep", "Financial Market Analyst"]
              )}
              
              {renderFieldWithApproval(
                'economic',
                'technologyTransferControls',
                "Technology Transfer & IP Controls",
                3,
                "Policies regarding the export/import of sensitive technologies and protection of intellectual property.",
                { xs: 12 },
                "Controls over sensitive technology flow.",
                ["Export Control Officer", "Intellectual Property Enforcement Lead", "Technology Security Analyst"]
              )}
              
              {renderFieldWithApproval(
                'economic', 
                'specialConsiderations', 
                "Special Considerations (Economic)",
                3, 
                "Any unique factors, sensitivities, or constraints that influence economic policy...",
                { xs: 12 },
                "Unique economic context (e.g., major industries, debt levels, currency stability).",
                ["Chief Economist", "Industry Sector Specialist", "Development Bank Lead"]
              )}
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
      
      {/* Add TextEditorModal */}
      <TextEditorModal
        open={textEditorOpen}
        onClose={() => setTextEditorOpen(false)}
        title={textEditorConfig.title}
        value={textEditorConfig.value}
        onChange={handleTextEditorSave}
        placeholder={textEditorConfig.placeholder}
        isApproved={textEditorConfig.fieldName ? isFieldApproved(textEditorConfig.fieldName) : false}
        onApprove={handleToggleApproval}
        fieldName={textEditorConfig.fieldName}
      />
    </Paper>
  );
}

export default NationPosturePanel; 