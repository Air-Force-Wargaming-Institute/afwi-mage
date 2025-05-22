import React, { useEffect, useState, useContext } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Paper, 
  makeStyles, 
  IconButton,
  ButtonGroup,
  Tooltip,
  Collapse,
  useTheme,
  CircularProgress
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import RefreshIcon from '@material-ui/icons/Refresh';
import InfoIcon from '@material-ui/icons/Info';
import VerticalAlignTopIcon from '@material-ui/icons/VerticalAlignTop';
import UnlinkIcon from '@material-ui/icons/LinkOff';
import { GradientText, SubtleGlowPaper } from '../../styles/StyledComponents';
import { getGatewayUrl } from '../../config';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import ReportTextEditorModal from './ReportTextEditorModal';
import FullscreenIcon from '@material-ui/icons/Fullscreen';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  configSection: {
    marginBottom: theme.spacing(1),
    position: 'relative',
    zIndex: 1,
  },
  elementsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  elementItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    paddingTop: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    paddingBottom: theme.spacing(0.25),
    position: 'relative',
    '&:hover .insertButtonOverlay': {
      opacity: 1,
    },
  },
  elementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.25),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.25),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    padding: theme.spacing(0.25),
    borderRadius: theme.shape.borderRadius,
  },
  elementTitleText: {
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  elementActions: {
    display: 'flex',
    gap: theme.spacing(0.25),
  },
  elementControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeToggleButtonGroup: {
  },
  typeToggleButton: {
    minWidth: '36px',
    padding: theme.spacing(0.25, 1.5),
  },
  formatButtonGroup: {
  },
  formatButton: {
    minWidth: '36px',
    padding: theme.spacing(0.25, 0.5),
  },
  formatIconButton: {
    padding: theme.spacing(0.5),
  },
  insertButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  bulletList: {
    listStyleType: 'disc',
    paddingLeft: theme.spacing(1.5),
    margin: theme.spacing(0.5, 0),
  },
  bulletItem: {
    display: 'list-item',
    marginBottom: theme.spacing(0.25),
    '&:last-child': {
      marginBottom: 0,
    },
  },
  elementContent: {
    padding: theme.spacing(0.5),
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    width: `calc(100% + ${theme.spacing(1) * 2}px)`,
    position: 'sticky',
    top: -theme.spacing(1),
    zIndex: 2,
    backgroundColor: `#121212`,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    marginLeft: -theme.spacing(1),
    marginRight: -theme.spacing(1),
  },
  sectionContent: {
    marginLeft: theme.spacing(1),
    borderLeft: `2px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(1),
  },
  collapseButton: {
    padding: theme.spacing(0.25),
    marginRight: theme.spacing(0.5),
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  elementTitle: {
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.95rem',
    padding: theme.spacing(0.25),
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  elementTitleInput: {
    flex: 1,
    '& .MuiInputBase-root': {
      fontSize: '0.95rem',
      fontWeight: 500,
    },
    '& .MuiInputBase-input': {
      padding: theme.spacing(0.25),
    },
  },
  itemBottomActionsContainer: {
    display: 'flex',
    paddingTop: theme.spacing(0.5),
  },
  insertButtonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTop: `1px solid ${theme.palette.divider}`,
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 1,
  },
  insertButton: {
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  collapseAllButton: {
    marginLeft: 'auto',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  regenerateButton: {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    backgroundColor: theme.palette.primary.light,
    color: '#fff',
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  regenerateTooltip: {
    maxWidth: 280,
  },
  textFieldContainer: {
    position: 'relative',
    width: '100%',
  },
  expandButton: {
    position: 'absolute',
    right: theme.spacing(0.25),
    top: theme.spacing(0.25),
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }
  },
  // Styles for Section Items
  sectionItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1), // Space between header and body
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.default, // Slightly different background from elements
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1.5), // Space between sections or section and element
  },
  sectionHeaderContainer: { // Renamed from pre-existing sectionHeader to avoid confusion with the overall panel section header
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    cursor: 'pointer', // Allow clicking section header to expand/collapse
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  sectionTitleContainer: { // Renamed from pre-existing sectionTitle
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flex: 1,
  },
  sectionTitleText: {
    fontWeight: theme.typography.fontWeightBold,
    fontSize: '1.1rem',
  },
  sectionActions: {
    display: 'flex',
    gap: theme.spacing(0.5),
  },
  sectionBody: {
    paddingLeft: theme.spacing(2), // Indent section body slightly
    // This is where child elements will eventually be rendered
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1), // Space between child elements within a section
  },
  childElementItem: {
    marginLeft: theme.spacing(2), // Indent child elements further
  },
}));

// Available format options
const formatOptions = [
  { value: 'paragraph', label: 'P' },
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
  { value: 'bulletList', label: 'Bullet List', icon: FormatListBulletedIcon },
  { value: 'numberedList', label: 'Numbered List', icon: FormatListNumberedIcon },
  // Add more formats like blockquote, code block if needed
];

function ReportConfigPanel({ definition, onChange, currentReportId, onRegenerateSection, isGenerating, generatingElements = {}, isNewReport }) {
  const classes = useStyles();
  const theme = useTheme();
  const { token } = useContext(AuthContext);
  const [vectorStores, setVectorStores] = useState([]);
  const [isLoadingVectorStores, setIsLoadingVectorStores] = useState(false);
  const [vectorStoreError, setVectorStoreError] = useState(null);
  const [collapsedElements, setCollapsedElements] = useState({});
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitleValue, setEditingSectionTitleValue] = useState('');
  const isTemplate = definition?.isTemplate || false;
  
  // State for the new Text Editor Modal
  const [isReportTextEditorOpen, setIsReportTextEditorOpen] = useState(false);
  const [reportTextEditorConfig, setReportTextEditorConfig] = useState({
    title: '',
    value: '',
    elementId: null,
    field: '',
    placeholder: '',
  });
  
  const fetchVectorStores = async () => {
    if (!token) return;
    
    setIsLoadingVectorStores(true);
    setVectorStoreError(null);
    try {
      const response = await axios.get(
        getGatewayUrl('/api/report_builder/vector_stores'),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setVectorStores(response.data);
    } catch (error) {
      console.error('Error fetching vector stores:', error);
      setVectorStoreError(error.response?.data?.detail || error.message);
      setVectorStores([]);
    } finally {
      setIsLoadingVectorStores(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateKey = urlParams.get('templateKey');

    if (templateKey && currentReportId && (!definition || !definition.items || definition.items.length === 0)) {
      try {
        const templateDataString = sessionStorage.getItem(templateKey);
        if (templateDataString) {
          const template = JSON.parse(templateDataString); // template is already in the new format
          
          // Simplified processing: template.prebuiltElements are now in the correct format.
          // We just need to ensure unique IDs for elements within this new report instance.
          const processedElements = (template.prebuiltElements || []).map((element, index) => ({
            ...element, // Spread the element, which already has `format` and correct `content` structure
            id: `${template.id || 'template'}-${element.title ? element.title.replace(/\s+/g, '-').toLowerCase() : 'element'}-${index}-${Date.now()}`,
            // No need for derivedFormat or content processing logic here anymore.
            item_type: 'element', // Ensure all elements created from templates have item_type
          }));

          onChange({
            id: currentReportId,
            title: template.name || 'New Report from Template',
            description: template.description || '',
            items: processedElements,
            vectorStoreId: template.vectorStoreId || ''
          });
          // sessionStorage.removeItem(templateKey); // Optional: Clear sessionStorage after use
        }
      } catch (error) {
        console.error('Error processing template data from sessionStorage:', error);
      }
    }
  }, [definition, onChange, currentReportId]);

  // Defensive useEffect to ensure items have item_type
  useEffect(() => {
    if (definition && definition.items && Array.isArray(definition.items)) {
      let itemsChanged = false;
      const newProcessedItems = definition.items.map(item => {
        if (item && typeof item === 'object' && !item.item_type) {
          // Basic heuristic: if it has a parent_uuid, or its ID starts with 'element-', it's likely an element.
          // If its ID starts with 'section-', it's likely a section.
          // This is a fallback if item_type is missing.
          if (item.parent_uuid || (item.id && typeof item.id === 'string' && item.id.startsWith('element-'))) {
            itemsChanged = true;
            return { ...item, item_type: 'element' };
          } else if (item.id && typeof item.id === 'string' && item.id.startsWith('section-')) {
            itemsChanged = true;
            return { ...item, item_type: 'section' };
          }
        }
        return item;
      });

      if (itemsChanged) {
        console.warn("ReportConfigPanel: Patched one or more items with missing 'item_type'. This should ideally be fixed at the data source or creation point.");
        // Call onChange carefully to avoid infinite loops if the parent doesn't handle it well.
        // This assumes onChange can update the definition prop.
        onChange({ ...definition, items: newProcessedItems });
      }
    }
  }, [definition, onChange]);

  // New generic handler for simple field changes
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    onChange({ type: 'UPDATE_REPORT_FIELD', field: name, value: value });
  };

  const createNewElement = (parentId = null) => ({
    id: `element-${Date.now()}`,
    item_type: 'element', // Added item_type for consistency
    title: parentId ? 'New Child Element' : 'New Element', // Differentiate title slightly
    type: 'explicit',
    format: 'paragraph',
    content: '',
    instructions: '',
    ai_generated_content: null,
    parent_uuid: parentId,
  });

  const createNewSection = () => {
    const sectionId = `section-${Date.now()}`;
    const defaultChildElement = createNewElement(sectionId); // Pass sectionId as parentId
    
    const newSection = {
      id: sectionId,
      item_type: 'section', // Keep for potential direct use, though ReportDesignerPage uses 'type' primarily
      type: 'section',      // Ensure frontend 'type' is set for sections
      title: 'New Section',
      elements: [defaultChildElement], // Sections should contain their elements
      // Removed element-specific fields (type, format, content, etc.)
      // as they don't belong on the Section schema in schemas.py.
      // The backend Section schema expects an 'elements' list of child ReportElement objects.
    };
    return { newSection, defaultChildElement }; // Return both the section and its default child
  };

  const handleAddElement = () => {
    const newElement = createNewElement(); // Creates a top-level element
    const newItems = [...(definition?.items || []), newElement];
    onChange({ ...definition, items: newItems });
  };

  const handleAddSection = () => {
    const { newSection, defaultChildElement } = createNewSection(); 
    const newItems = [
      ...(definition?.items || []),
      newSection, 
      defaultChildElement // Add the default child to the flat list as well
    ];
    onChange({ ...definition, items: newItems });
  };

  const handleInsertElementBelow = (clickedItemGlobalIndex, isTriggeredFromSection = false) => {
    let currentFlatItems = [...(definition?.items || [])]; // Operate on a copy
    const originalClickedItem = currentFlatItems[clickedItemGlobalIndex];

    if (clickedItemGlobalIndex < 0 || clickedItemGlobalIndex >= currentFlatItems.length || !originalClickedItem) {
      console.error("handleInsertElementBelow: clickedItemGlobalIndex is out of bounds or item not found.");
      return;
    }

    let newElementParentId = null;
    // Default insert position is after the clicked item in the flat list
    let insertAtIndexInFlatList = clickedItemGlobalIndex + 1; 

    if (isTriggeredFromSection) {
      // Clicked item IS a Section. New element should be TOP-LEVEL, inserted after the section and its children.
      if (originalClickedItem.item_type === 'section') {
        newElementParentId = null; 
        // Adjust insertAtIndexInFlatList to be after the section and all its children
        let lastChildIndex = clickedItemGlobalIndex;
        for (let i = clickedItemGlobalIndex + 1; i < currentFlatItems.length; i++) {
          if (currentFlatItems[i].parent_uuid === originalClickedItem.id) {
            lastChildIndex = i;
          } else {
            break;
          }
        }
        insertAtIndexInFlatList = lastChildIndex + 1;
      } else {
        console.error("handleInsertElementBelow: isTriggeredFromSection is true, but clickedItem is not a section.");
        return; 
      }
    } else {
      // Clicked item is an Element (either top-level or child).
      // New element is inserted below it, inheriting parent_uuid if clickedItem is a child.
      if (originalClickedItem.item_type === 'element') {
        newElementParentId = originalClickedItem.parent_uuid || null; 
      } else {
        console.warn("handleInsertElementBelow: isTriggeredFromSection is false, but clickedItem is not an element. Creating top-level element.");
        newElementParentId = null; 
      }
    }

    const newElement = createNewElement(newElementParentId);

    // Add the new element to a temporary flat list
    let tempFlatItems = [...currentFlatItems];
    tempFlatItems.splice(insertAtIndexInFlatList, 0, newElement);

    // If the new element is a child of a section, update that section's 'elements' array in tempFlatItems
    if (newElementParentId) {
      tempFlatItems = tempFlatItems.map(item => {
        if (item.id === newElementParentId && item.item_type === 'section') {
          // Get all children of this section from the *current* tempFlatItems state
          // This ensures the elements array reflects the actual children in the flat list and their order
          const currentChildrenOfThisSection = tempFlatItems.filter(
            child => child.parent_uuid === newElementParentId
          );
          return { ...item, elements: currentChildrenOfThisSection };
        }
        return item;
      });
    }
    onChange({ ...definition, items: tempFlatItems });
  };

  const handleInsertSectionBelow = (clickedItemGlobalIndex) => {
    const allItems = definition?.items || [];
    if (clickedItemGlobalIndex < 0 || clickedItemGlobalIndex >= allItems.length) {
      console.error("handleInsertSectionBelow: clickedItemGlobalIndex is out of bounds.");
      return;
    }
    const { newSection, defaultChildElement } = createNewSection();
    const newItems = [...allItems];
    // Insert both the section and its default child element into the flat list
    newItems.splice(clickedItemGlobalIndex + 1, 0, newSection, defaultChildElement);
    onChange({ ...definition, items: newItems });
  };

  const handleElementChange = (itemId, field, value) => {
    let updatedItemInstance = null; // To store the instance of the updated item

    const newItems = (definition?.items || []).map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'type') {
          if (value === 'explicit') {
            if (updatedItem.ai_generated_content === undefined) {
              updatedItem.ai_generated_content = null;
            }
            if (updatedItem.instructions === undefined) {
              updatedItem.instructions = '';
            }
          } else if (value === 'generative') {
            if (updatedItem.content === undefined) {
              updatedItem.content = '';
            }
            if (updatedItem.instructions === undefined) {
              updatedItem.instructions = '';
            }
            if (updatedItem.ai_generated_content === undefined) {
              updatedItem.ai_generated_content = null;
            }
          }
        }
        updatedItemInstance = updatedItem; // Save the updated item instance
        return updatedItem;
      }
      return item;
    });

    // If an item was updated and it has a parent_uuid, update it in its parent section's elements array too.
    if (updatedItemInstance && updatedItemInstance.parent_uuid) {
      const parentSection = newItems.find(sec => sec.id === updatedItemInstance.parent_uuid && sec.item_type === 'section');
      if (parentSection && Array.isArray(parentSection.elements)) {
        parentSection.elements = parentSection.elements.map(el => 
          el.id === itemId ? updatedItemInstance : el
        );
      }
    }
    
    onChange({ ...definition, items: newItems });
  };

  const handleDeleteItem = (itemId) => {
    const currentItems = [...(definition?.items || [])]; 
    const itemToDeleteIndex = currentItems.findIndex(item => item.id === itemId);

    if (itemToDeleteIndex === -1) {
      console.error("handleDeleteItem: Item to delete not found.", itemId);
      return;
    }

    const itemToDelete = { ...currentItems[itemToDeleteIndex] }; 
    let newItems = [];

    if (itemToDelete.item_type === 'section') {
      const sectionId = itemToDelete.id;
      // Get child IDs from the section's own elements array
      const childElementIds = (itemToDelete.elements || []).map(el => el.id);

      newItems = currentItems
        .filter(item => item.id !== sectionId) // Remove the section itself
        .map(item => {
          if (childElementIds.includes(item.id)) {
            // Unparent the identified children
            return { ...item, parent_uuid: null };
          }
          return item; // Keep other items as they are
        });

    } else if (itemToDelete.item_type === 'element') {
      newItems = currentItems.filter(item => item.id !== itemId); 
      const parentId = itemToDelete.parent_uuid;

      if (parentId) {
        const parentSectionIndex = newItems.findIndex(sec => sec.id === parentId && sec.item_type === 'section');
        if (parentSectionIndex !== -1) {
          const parentSection = { ...newItems[parentSectionIndex] }; 
          
          if (Array.isArray(parentSection.elements)) {
            parentSection.elements = parentSection.elements.filter(el => el.id !== itemId);
          }

          if (!parentSection.elements || parentSection.elements.length === 0) {
            const newDefaultChild = createNewElement(parentId);
            parentSection.elements = [newDefaultChild];
            
            newItems.splice(parentSectionIndex, 1, parentSection);
            
            let insertAtIndex = parentSectionIndex + 1;
            newItems.splice(insertAtIndex, 0, newDefaultChild);
          } else {
            newItems.splice(parentSectionIndex, 1, parentSection);
          }
        }
      }
    } else {
      console.warn(`handleDeleteItem: Unknown item_type '${itemToDelete.item_type}' for item ID ${itemId}. Removing.`);
      newItems = currentItems.filter(item => item.id !== itemId);
    }

    onChange({ ...definition, items: newItems });
  };

  const handleMoveItem = (clickedItemTopLevelIndex, direction) => {
    console.log(`--- handleMoveItem ---`);
    console.log(`Attempting to move item at topLevelDisplayIndex: ${clickedItemTopLevelIndex}, direction: ${direction}`);

    const originalItems = [...(definition?.items || [])];
    const originalTopLevelItems = originalItems.filter(i => !i.parent_uuid);
    
    console.log('Original Top Level Items:', originalTopLevelItems.map(i => i.id));

    if (clickedItemTopLevelIndex < 0 || clickedItemTopLevelIndex >= originalTopLevelItems.length) {
        console.error("MoveItem: clickedItemTopLevelIndex is out of bounds.");
        return; 
    }

    const itemToMoveAsTopLevel = originalTopLevelItems[clickedItemTopLevelIndex];
    console.log(`Item to move (top level): ${itemToMoveAsTopLevel.id} (type: ${itemToMoveAsTopLevel.item_type})`);

    // 1. Identify the full block of items to move (the top-level item + its children if it's a section)
    let blockToMove = [itemToMoveAsTopLevel];
    if (itemToMoveAsTopLevel.item_type === 'section') {
        const children = originalItems.filter(child => child.parent_uuid === itemToMoveAsTopLevel.id);
        const sortedChildren = children.sort((a,b) => originalItems.indexOf(a) - originalItems.indexOf(b));
        blockToMove.push(...sortedChildren);
        console.log(`Section block identified. Children IDs:`, sortedChildren.map(c => c.id));
    }
    console.log(`Full blockToMove IDs:`, blockToMove.map(item => item.id));
    const blockToMoveIds = blockToMove.map(item => item.id);

    // 2. Create a list of all items *not* in the block that is being moved
    const itemsLeftBehind = originalItems.filter(item => !blockToMoveIds.includes(item.id));
    console.log(`Items left behind (IDs):`, itemsLeftBehind.map(i => i.id));

    // 3. Determine the target top-level display index for the block
    let newTargetTopLevelSlot = clickedItemTopLevelIndex + direction;
    console.log(`Calculated newTargetTopLevelSlot: ${newTargetTopLevelSlot}`);

    // 4. Handle boundary conditions: moving to the very beginning or very end
    if (newTargetTopLevelSlot < 0) { // Move to the very beginning
        console.log('Moving block to the very beginning.');
        const finalArrangement = [...blockToMove, ...itemsLeftBehind];
        onChange({ ...definition, items: finalArrangement });
        return;
    }

    const topLevelItemsInLeftBehind = itemsLeftBehind.filter(i => !i.parent_uuid);
    console.log(`Top Level Items in Left Behind (IDs):`, topLevelItemsInLeftBehind.map(i => i.id));

    if (newTargetTopLevelSlot >= topLevelItemsInLeftBehind.length) { // Move to the very end
        console.log('Moving block to the very end.');
        const finalArrangement = [...itemsLeftBehind, ...blockToMove];
        onChange({ ...definition, items: finalArrangement });
        return;
    }

    // 5. Identify the anchor top-level item in the 'itemsLeftBehind' list.
    const anchorTopLevelItem = topLevelItemsInLeftBehind[newTargetTopLevelSlot];
    console.log(`Anchor Top Level Item: ${anchorTopLevelItem.id}`);

    // 6. Find the actual starting index of this anchorTopLevelItem in the 'itemsLeftBehind' list.
    let spliceAtIndex = -1;
    for (let i = 0; i < itemsLeftBehind.length; i++) {
        if (itemsLeftBehind[i].id === anchorTopLevelItem.id) {
            spliceAtIndex = i;
            break;
        }
    }
    console.log(`Actual spliceAtIndex in itemsLeftBehind: ${spliceAtIndex}`);
    
    if (spliceAtIndex === -1) {
        console.error("MoveItem Error: Anchor item for splice not found in itemsLeftBehind.");
        return; 
    }

    // 7. Insert the block into the 'itemsLeftBehind' list at the determined splice point.
    const finalArrangement = [...itemsLeftBehind]; 
    finalArrangement.splice(spliceAtIndex, 0, ...blockToMove);
    console.log('Final Arrangement IDs:', finalArrangement.map(i => i.id));
    console.log(`--- handleMoveItem END ---`);
    onChange({ ...definition, items: finalArrangement });
  };

  const isBulletFormat = (item) => {
    return item.format === 'bulletList';
  };

  const getBulletItems = (item) => {
    if (item.type === 'bulletList') {
      return item.items;
    }
    if (item.format === 'bulletList') {
      return item.content ? item.content.split('\n') : [];
    }
    return [];
  };

  const handleBulletChange = (itemId, value, item) => {
    const items = value.split('\n').filter(item => item.trim() !== '');
    if (item.type === 'bulletList') {
      handleElementChange(itemId, 'items', items);
    } else {
      handleElementChange(itemId, 'content', value);
    }
  };

  const toggleElement = (itemId) => {
    setCollapsedElements(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleTitleClick = (itemId, e) => {
    e.stopPropagation();
    setEditingTitle(itemId);
    // Set the initial editing value to the current title (or empty string if null)
    const currentItem = definition?.items?.find(i => i.id === itemId);
    setEditingTitleValue(currentItem?.title || '');

    // If the item is currently collapsed, expand it when its title is clicked for editing.
    // This assumes sections might also use this collapsedElements state or have their own.
    if (collapsedElements[itemId]) {
      toggleElement(itemId); // toggleElement might need to be aware of sections vs elements later
    }
  };

  // Generic handler for item title input changes
  const handleItemTitleInputChange = (value) => {
    setEditingTitleValue(value); // For elements
    setEditingSectionTitleValue(value); // For sections - assumes only one can be edited at a time
  };

  const saveTitleChange = (itemId) => {
    const currentItem = definition?.items?.find(i => i.id === itemId);
    if (currentItem && currentItem.item_type === 'element') { 
        handleElementChange(itemId, 'title', editingTitleValue);
    } 
    // Note: Section title saving will be handled by saveSectionTitleChange
    setEditingTitle(null);
    setEditingTitleValue(''); // Clear element title value
  };

  const handleTitleKeyPress = (e, itemId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitleChange(itemId); // This is for elements
    }
  };

  // Handlers for Section Title Editing
  const handleSectionTitleClick = (sectionId, currentTitle, e) => {
    e.stopPropagation(); // Prevent section collapse/expand
    setEditingSectionId(sectionId);
    setEditingSectionTitleValue(currentTitle || '');
    setEditingTitle(null); // Ensure element title editing is reset
    setEditingTitleValue('');
  };

  const saveSectionTitleChange = (sectionId) => {
    // Use handleElementChange to update the section's title in the flat list
    // This assumes handleElementChange correctly finds items by ID and updates their fields.
    handleElementChange(sectionId, 'title', editingSectionTitleValue);
    setEditingSectionId(null);
    setEditingSectionTitleValue(''); // Clear section title value
  };

  const handleSectionTitleKeyPress = (e, sectionId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSectionTitleChange(sectionId);
    }
  };

  const toggleAllElements = (collapse) => {
    const newCollapsedState = {};
    // This will now iterate over both sections and elements.
    // We need to decide if "Collapse/Expand All" applies to sections, elements, or both.
    // For now, it will apply to any item with an ID in definition.items.
    (definition?.items || []).forEach(item => {
      newCollapsedState[item.id] = collapse;
    });
    setCollapsedElements(newCollapsedState);
  };

  const areAllCollapsed = () => {
    // Similar to toggleAllElements, this considers all items.
    return (definition?.items || []).every(item => collapsedElements[item.id]);
  };

  // Helper functions for the ReportTextEditorModal
  const handleOpenReportTextEditor = (elementId, field, currentValue, title, placeholder) => {
    setReportTextEditorConfig({
      elementId,
      field,
      value: currentValue,
      title,
      placeholder,
    });
    setIsReportTextEditorOpen(true);
  };

  const handleCloseReportTextEditor = () => {
    setIsReportTextEditorOpen(false);
  };

  const handleReportTextEditorSave = (newValue) => {
    const { elementId, field } = reportTextEditorConfig;
    if (elementId && field) {
      handleElementChange(elementId, field, newValue);
    }
    handleCloseReportTextEditor();
  };

  const handleAddElementToSectionAbove = (elementId) => {
    const originalItems = definition?.items || [];
    let newItems = originalItems.map(item => {
      const itemCopy = { ...item };
      if (itemCopy.item_type === 'section' && Array.isArray(itemCopy.elements)) {
        itemCopy.elements = itemCopy.elements.map(el => ({ ...el }));
      }
      return itemCopy;
    });

    const elementToMoveIndex = newItems.findIndex(i => i.id === elementId);
    if (elementToMoveIndex === -1) {
      console.error("handleAddElementToSectionAbove: Element to move not found.");
      return;
    }
    
    const elementToMove = newItems[elementToMoveIndex]; 
    if (elementToMove.parent_uuid) { 
      console.warn("handleAddElementToSectionAbove: Element is not a top-level element.", elementToMove);
      return;
    }

    const topLevelDisplayItems = newItems.filter(i => !i.parent_uuid); 
    const currentElementTopLevelIndex = topLevelDisplayItems.findIndex(i => i.id === elementId);
    if (currentElementTopLevelIndex <= 0) {
      console.warn("handleAddElementToSectionAbove: No item directly above or it's the first top-level item.");
      return;
    }

    const itemAbove = topLevelDisplayItems[currentElementTopLevelIndex - 1];
    if (itemAbove.item_type !== 'section') {
      console.warn("handleAddElementToSectionAbove: Item directly above is not a section.");
      return;
    }
    
    const targetSectionId = itemAbove.id;
    let targetSectionObjectInNewItems = newItems.find(s => s.id === targetSectionId && s.item_type === 'section');

    if (!targetSectionObjectInNewItems) {
        console.error("handleAddElementToSectionAbove: Target section object not found in newItems list.");
        return;
    }

    // Create a mutable copy of the element that is being moved into the section
    const movingElementCopy = { ...elementToMove, parent_uuid: targetSectionId };

    // Remove the original element from its top-level position *before* modifying the section
    newItems.splice(elementToMoveIndex, 1);

    // Update the section object in the newItems array
    // Find it again in case splice shifted indices, though it shouldn't if elementToMoveIndex was after section
    const targetSectionIndex = newItems.findIndex(s => s.id === targetSectionId && s.item_type === 'section');
    if (targetSectionIndex === -1) {
        console.error("handleAddElementToSectionAbove: Target section disappeared after splice?");
        onChange({ ...definition, items: originalItems }); // Revert to original on error
        return;
    }
    
    // Get a fresh reference to the section from the potentially modified newItems array
    targetSectionObjectInNewItems = newItems[targetSectionIndex];

    // Add the (copy of the) moving element to the section's elements array
    // This is the section object that is part of the newItems array
    const updatedSectionElements = [...(targetSectionObjectInNewItems.elements || [])];
    if (!updatedSectionElements.find(el => el.id === movingElementCopy.id)) {
        updatedSectionElements.push(movingElementCopy);
    }

    // Update the section object in newItems with the new elements array
    newItems[targetSectionIndex] = {
      ...targetSectionObjectInNewItems,
      elements: updatedSectionElements
    };
    
    // Also, add the movingElement (with updated parent_uuid) into the newItems list if it wasn't there already.
    // This step is crucial: the element needs to exist in the flat list as a child.
    // Since we spliced it out earlier, we need to re-insert it in the correct conceptual order,
    // which is usually after the parent section or among its siblings.
    // For simplicity and consistency with how children are handled on creation, we ensure it's in the list.
    // The actual visual rendering order is determined by iterating newItems and grouping by parent_uuid.
    
    // Find the index of the parent section again (could have changed if we modified newItems directly)
    const finalParentSectionIndex = newItems.findIndex(s => s.id === targetSectionId && s.item_type === 'section');
    if (finalParentSectionIndex !== -1) {
        // Determine insertion point: after the parent and all its *other* children already in newItems
        let insertAfterIndex = finalParentSectionIndex;
        for (let i = finalParentSectionIndex + 1; i < newItems.length; i++) {
            if (newItems[i].parent_uuid === targetSectionId) {
                insertAfterIndex = i;
            } else {
                break;
            }
        }
        newItems.splice(insertAfterIndex + 1, 0, movingElementCopy);
    } else {
        // Fallback: if parent section somehow not found, add to end (should not happen)
        newItems.push(movingElementCopy);
    }
    
    // Final pass to ensure all sections have their .elements array correctly populated from the flat list
    newItems = newItems.map(item => {
      if (item.item_type === 'section') {
        const childrenOfThisSection = newItems.filter(child => child.parent_uuid === item.id);
        return { ...item, elements: childrenOfThisSection };
      }
      return item;
    });

    onChange({ ...definition, items: newItems });
  };

  const handleMoveChildElement = (childElementId, direction) => {
    let allItems = [...(definition?.items || [])];
    const childToMove = allItems.find(item => item.id === childElementId);

    if (!childToMove || !childToMove.parent_uuid) {
      console.error("handleMoveChildElement: Item not found or not a child element.");
      return;
    }

    const parentId = childToMove.parent_uuid;
    const siblings = allItems.filter(item => item.parent_uuid === parentId);
    const currentIndexInSiblings = siblings.findIndex(item => item.id === childElementId);

    if (currentIndexInSiblings === -1) { // Should not happen if childToMove was found in allItems
        console.error("handleMoveChildElement: Child not found in its own sibling group.");
        return;
    }

    const newIndexInSiblings = currentIndexInSiblings + direction;

    if (newIndexInSiblings < 0 || newIndexInSiblings >= siblings.length) {
      return; // Cannot move outside bounds
    }

    // Perform the move within the siblings array
    const reorderedSiblings = [...siblings];
    const [movedItem] = reorderedSiblings.splice(currentIndexInSiblings, 1);
    reorderedSiblings.splice(newIndexInSiblings, 0, movedItem);

    // Now, replace the old sequence of siblings in the main allItems array with the reorderedSiblings
    // Find the global index of the first sibling
    const firstSiblingGlobalIndex = allItems.findIndex(item => item.parent_uuid === parentId && item.id === siblings[0].id);
    
    if (firstSiblingGlobalIndex === -1) {
        console.error("handleMoveChildElement: Could not find the start of the sibling block in allItems.");
        // This is a critical error in state consistency if reached.
        return;
    }

    // Remove the old block of siblings and insert the new reordered block
    allItems.splice(firstSiblingGlobalIndex, siblings.length, ...reorderedSiblings);

    onChange({ ...definition, items: allItems });
  };

  const handleRemoveElementFromSection = (elementId, parentSectionId) => {
    const currentItems = definition?.items || [];
    let newItems = currentItems.map(item => ({ // Create fresh copies for all top-level items
        ...item,
        elements: (item.item_type === 'section' && Array.isArray(item.elements)) 
                    ? item.elements.map(el => ({...el})) 
                    : item.elements
    }));

    // Find the element in the flat list by its ID.
    // The parentSectionId is known from the context where the remove button was clicked.
    const elementToUnparentGlobalIndex = newItems.findIndex(item => item.id === elementId);
    const parentSectionGlobalIndex = newItems.findIndex(item => item.id === parentSectionId && item.item_type === 'section');

    if (elementToUnparentGlobalIndex === -1 || parentSectionGlobalIndex === -1) {
        console.error("RemoveFromSection: Element (by ID) or ParentSection (by ID and type) not found in the items list.", elementId, parentSectionId);
        return;
    }

    // Get a fresh copy of the element that will be unparented and modified
    let unparentedElement = { ...newItems[elementToUnparentGlobalIndex] };
    unparentedElement.parent_uuid = null;

    // Modify the parent section (which is also a copy in newItems)
    const parentSection = newItems[parentSectionGlobalIndex];
    if (Array.isArray(parentSection.elements)) {
        parentSection.elements = parentSection.elements.filter(el => el.id !== elementId);
    }

    let newDefaultChildForSection = null;
    if (!parentSection.elements || parentSection.elements.length === 0) {
        newDefaultChildForSection = createNewElement(parentSectionId); // parent_uuid is set here
        parentSection.elements = [newDefaultChildForSection];
    }

    // Filter out the original element-to-unparent from its old position in the newItems list.
    // And also filter out the newDefaultChild if it was created, as we'll re-insert it strategically.
    newItems = newItems.filter(item => item.id !== elementId); 
    if (newDefaultChildForSection) {
        newItems = newItems.filter(item => item.id !== newDefaultChildForSection.id); 
    }
    
    // If a new default child was created for the section, it needs to be in the flat list
    if (newDefaultChildForSection) {
        const actualParentIdx = newItems.findIndex(p => p.id === parentSectionId);
        if (actualParentIdx !== -1) {
            newItems.splice(actualParentIdx + 1, 0, newDefaultChildForSection);
        } else {
            newItems.push(newDefaultChildForSection); // Fallback
        }
    }

    // Determine where to insert the now unparentedElement.
    // After the parent section and all its current children (including the potential new default child).
    let insertAtIndexForUnparented = -1;
    const finalParentIdx = newItems.findIndex(p => p.id === parentSectionId);

    if (finalParentIdx !== -1) {
        insertAtIndexForUnparented = finalParentIdx + 1; // Start after parent
        for (let i = insertAtIndexForUnparented; i < newItems.length; i++) {
            if (newItems[i].parent_uuid === parentSectionId) {
                insertAtIndexForUnparented = i + 1;
            } else {
                break; 
            }
        }
    } else {
        insertAtIndexForUnparented = newItems.length; // Fallback: add to end
    }
    newItems.splice(insertAtIndexForUnparented, 0, unparentedElement);

    onChange({ ...definition, items: newItems });
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.configSection}>
        <GradientText variant="h6" component="h2" gutterBottom>
          {isTemplate ? 'Template Configuration' : 'Report Configuration'}
        </GradientText>
        <TextField
          label={isTemplate ? "Template Title" : "Report Title"}
          value={definition?.title || ''}
          name="title"
          onChange={handleFieldChange}
          fullWidth
          style={{ marginBottom: theme.spacing(1) }}
          disabled={isTemplate && definition?.category === 'System'}
        />
        <TextField
          label="Description"
          value={definition?.description || ''}
          name="description"
          onChange={handleFieldChange}
          multiline
          rows={3}
          fullWidth
          style={{ marginBottom: theme.spacing(1) }}
        />
        {!isTemplate && (
          <FormControl fullWidth style={{ marginBottom: theme.spacing(1) }} disabled={isLoadingVectorStores || !!vectorStoreError}>
            <InputLabel id="vector-store-label">Vector Store</InputLabel>
            <Select
              labelId="vector-store-label"
              name="vectorStoreId"
              value={definition?.vectorStoreId || ''}
              onChange={handleFieldChange}
              onOpen={fetchVectorStores}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {isLoadingVectorStores && (
                <MenuItem disabled value="loading">
                  <em>Loading vector stores...</em>
                </MenuItem>
              )}
              {vectorStoreError && (
                <MenuItem disabled value="error">
                  <em>Error loading vector stores</em>
                </MenuItem>
              )}
              {vectorStores.length === 0 && (
                <MenuItem disabled value="none_available">
                  <em>None Available</em>
                </MenuItem>
              )}
              {vectorStores.length > 0 && 
                vectorStores.map(vs => (
                  <MenuItem key={vs.id} value={vs.id}>{vs.name}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
        )}
      </Box>

      <Box className={classes.sectionHeader}>
        <GradientText variant="h6" component="h2">
          {isTemplate ? 'Template Items' : 'Report Items'}
        </GradientText>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          onClick={() => toggleAllElements(!areAllCollapsed())}
          className={classes.collapseAllButton}
          startIcon={areAllCollapsed() ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        >
          {areAllCollapsed() ? 'Expand All' : 'Collapse All'}
        </Button>
      </Box>

      <Box className={classes.elementsContainer}>
        {(() => {
          const allItems = definition?.items || [];
          const topLevelDisplayItems = allItems.filter(i => !i.parent_uuid);

          return topLevelDisplayItems.map((item, displayIndex) => {
            // `item` is a top-level item (section or element)
            // `displayIndex` is its index within topLevelDisplayItems
            console.log('Rendering item:', item.id, 'item_type:', item.item_type, 'parent_uuid:', item.parent_uuid);

            if (item.parent_uuid) { // This should not happen if topLevelDisplayItems is filtered correctly
              return null; 
            }

            if (item.item_type === 'section') {
              console.log('Item IS a section:', item.id);
              // const allItems = definition?.items || []; // Already in scope from main map function
              // const topLevelDisplayItems = allItems.filter(i => !i.parent_uuid); // Already in scope

              // Restore original structure
              return (
                <Paper 
                  key={item.id || `section-${displayIndex}`} 
                  className={classes.sectionItem} 
                  elevation={0} 
                >
                  {/* Section Header (title, collapse icon, move/delete actions) */}
                  <Box 
                    className={classes.sectionHeaderContainer}
                    onClick={() => toggleElement(item.id)} // For collapse/expand
                  >
                    <Box className={classes.sectionTitleContainer}>
                      <IconButton 
                        size="small" 
                        className={classes.collapseButton} 
                        title={collapsedElements[item.id] ? "Expand Section" : "Collapse Section"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleElement(item.id);
                        }}
                      >
                        {collapsedElements[item.id] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                      </IconButton>
                      {editingSectionId === item.id ? (
                        <TextField
                          className={classes.elementTitleInput}
                          value={editingSectionTitleValue}
                          onChange={(e) => handleItemTitleInputChange(e.target.value)}
                          onBlur={() => saveSectionTitleChange(item.id)} 
                          onKeyPress={(e) => handleSectionTitleKeyPress(e, item.id)} 
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          size="small"
                          variant="standard"
                        />
                      ) : (
                        <Typography 
                          className={classes.sectionTitleText}
                          onClick={(e) => handleSectionTitleClick(item.id, item.title, e)}
                        >
                          {item.title || `Section ${displayIndex + 1}`}
                        </Typography>
                      )}
                    </Box>
                    <Box className={classes.sectionActions}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveItem(displayIndex, -1); 
                        }}
                        disabled={displayIndex === 0} 
                        title="Move Section Up"
                      >
                        <ArrowUpwardIcon fontSize="inherit"/>
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveItem(displayIndex, 1); 
                        }}
                        disabled={displayIndex === topLevelDisplayItems.length - 1}
                        title="Move Section Down"
                      >
                        <ArrowDownwardIcon fontSize="inherit"/>
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="secondary" 
                        title="Delete Section"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                      >
                        <DeleteIcon fontSize="inherit"/>
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Restore Original Section Body */}
                  <Collapse in={!collapsedElements[item.id]}>
                    <Box className={classes.sectionBody}>
                      { 
                        (() => {
                          const childElements = item.elements || []; // Use the section's own elements array
                          if (childElements.length > 0) {
                            return childElements.map((childElement, childIndex) => (
                              // --- Reusing Element Rendering Logic for Child Elements ---
                              <SubtleGlowPaper 
                                key={childElement.id || `child-element-${childIndex}`} 
                                className={`${classes.elementItem} ${classes.childElementItem}`} 
                                elevation={2}
                                onClick={() => toggleElement(childElement.id)} 
                              >
                                <Box className={classes.elementHeader}>
                                  <Box style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                    <IconButton 
                                      size="small" 
                                      className={classes.collapseButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleElement(childElement.id); 
                                      }}
                                    >
                                      {collapsedElements[childElement.id] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                                    </IconButton>
                                    {editingTitle === childElement.id ? ( 
                                      <TextField
                                        className={classes.elementTitleInput}
                                        value={editingTitleValue}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleItemTitleInputChange(e.target.value);
                                        }}
                                        onBlur={() => saveTitleChange(childElement.id)} 
                                        onKeyPress={(e) => handleTitleKeyPress(e, childElement.id)} 
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                        size="small"
                                        variant="standard"
                                      />
                                    ) : (
                                      <Typography 
                                        className={classes.elementTitle}
                                        onClick={(e) => handleTitleClick(childElement.id, e)} 
                                      >
                                        {childElement.title || `Element ${childIndex + 1}`}
                                      </Typography>
                                    )}
                                  </Box>
                                  <Box className={classes.elementActions}>
                                    <Tooltip title="Remove from Section">
                                      <IconButton 
                                        size="small" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveElementFromSection(childElement.id, item.id);
                                        }}
                                      >
                                        <UnlinkIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveChildElement(childElement.id, -1);
                                      }}
                                      disabled={childIndex === 0} 
                                      title="Move Element Up Within Section"
                                    >
                                      <ArrowUpwardIcon fontSize="inherit"/>
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveChildElement(childElement.id, 1);
                                      }}
                                      disabled={childIndex === childElements.length - 1} 
                                      title="Move Element Down Within Section"
                                    >
                                      <ArrowDownwardIcon fontSize="inherit"/>
                                    </IconButton>
                                    <IconButton size="small" onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(childElement.id); 
                                    }} color="secondary" title="Delete Element">
                                      <DeleteIcon fontSize="inherit"/>
                                    </IconButton>
                                  </Box>
                                </Box>
                                <Collapse in={!collapsedElements[childElement.id]}> 
                                  <Box className={classes.elementContent} onClick={(e) => e.stopPropagation()}>
                                    {/* Element Controls (Type, Format, AI Gen) */}
                                    <Box className={classes.elementControls}>
                                      <ButtonGroup className={classes.typeToggleButtonGroup} size="small" aria-label="element type toggle">
                                        <Button
                                          className={classes.typeToggleButton}
                                          variant={childElement.type === 'explicit' ? 'contained' : 'outlined'}
                                          color={childElement.type === 'explicit' ? 'primary' : 'default'}
                                          onClick={() => handleElementChange(childElement.id, 'type', 'explicit')}
                                        >
                                          Explicit
                                        </Button>
                                        <Button
                                          className={classes.typeToggleButton}
                                          variant={childElement.type === 'generative' ? 'contained' : 'outlined'}
                                          color={childElement.type === 'generative' ? 'primary' : 'default'}
                                          onClick={() => handleElementChange(childElement.id, 'type', 'generative')}
                                        >
                                          AI Gen
                                        </Button>
                                      </ButtonGroup>
                                      {childElement.type === 'explicit' && (
                                        <ButtonGroup className={classes.formatButtonGroup} size="small" aria-label="format options">
                                          {formatOptions.map(opt => {
                                            const isSelected = childElement.format === opt.value;
                                            const FormatIcon = opt.icon;
                                            return (
                                              FormatIcon ? (
                                                <Tooltip title={opt.label} key={opt.value}>
                                                  <IconButton
                                                    className={classes.formatIconButton}
                                                    size="small"
                                                    color={'primary'} 
                                                    onClick={() => handleElementChange(childElement.id, 'format', opt.value)}
                                                    style={{
                                                      border: `1px solid ${theme.palette.primary.main}`,
                                                      borderRadius: '4px',
                                                      color: isSelected ? theme.palette.primary.contrastText : theme.palette.primary.main,
                                                      backgroundColor: isSelected ? theme.palette.primary.main : 'transparent',
                                                    }}
                                                  >
                                                    <FormatIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              ) : (
                                                <Button 
                                                  key={opt.value}
                                                  className={classes.formatButton}
                                                  variant={isSelected ? 'contained' : 'outlined'}
                                                  color={isSelected ? 'primary' : 'default'}
                                                  onClick={() => handleElementChange(childElement.id, 'format', opt.value)}
                                                >
                                                  {opt.label}
                                                </Button>
                                              )
                                            );
                                          })}
                                        </ButtonGroup>
                                      )}
                                      {childElement.type === 'generative' && onRegenerateSection && (
                                        <Tooltip 
                                          title={
                                            isNewReport ? "Please save the document before AI generation." :
                                            !definition?.id ? "Please save the document before AI generation." : (
                                              <Typography variant="body2">
                                                {childElement.ai_generated_content ? 
                                                  "Regenerate this section's content..." :
                                                  "Generate this section's content..."}
                                              </Typography>
                                            )
                                          }
                                          classes={{ tooltip: classes.regenerateTooltip }}
                                          placement="top"
                                        >
                                          <span>
                                            <Button
                                              variant="contained"
                                              disabled={isGenerating || isNewReport || !definition?.id}
                                              className={classes.regenerateButton}
                                              size="small"
                                              onClick={() => onRegenerateSection(childElement.id)} 
                                              startIcon={generatingElements[childElement.id]?.status === 'generating' ? <CircularProgress size={16} color="inherit" /> : null} 
                                            >
                                              {childElement.ai_generated_content ? 'Regenerate' : 'Generate'}
                                            </Button>
                                          </span>
                                        </Tooltip>
                                      )}
                                    </Box>
                                    {/* Element Content (Textfields) */}
                                    {childElement.type === 'explicit' ? (
                                      <Box className={classes.textFieldContainer}>
                                        <TextField
                                          multiline
                                          rows={2}
                                          fullWidth
                                          variant="outlined"
                                          margin="dense"
                                          size="small"
                                          value={isBulletFormat(childElement) ? getBulletItems(childElement).join('\n') : childElement.content || ''}
                                          onChange={(e) => {
                                            if (isBulletFormat(childElement)) {
                                              handleBulletChange(childElement.id, e.target.value, childElement);
                                            } else {
                                              handleElementChange(childElement.id, 'content', e.target.value);
                                            }
                                          }}
                                          label={
                                            isBulletFormat(childElement) ? 
                                            'Content: Use line breaks for new items.' : 
                                            childElement.format === 'numberedList' ? 
                                            'Content: Use line breaks for new numbered items. Indent with spaces for sub-lists.' : 
                                            childElement.format === 'paragraph' ? 
                                            'Content: Line breaks will be preserved.' : 
                                            'Content: Formatting is controlled by the buttons above.'
                                          }
                                        />
                                        <Tooltip title="Open Fullscreen Editor">
                                          <IconButton size="small" className={classes.expandButton} onClick={() => handleOpenReportTextEditor(
                                            childElement.id, 
                                            'content', 
                                            childElement.content || '', 
                                            `Edit Content for ${childElement.title || 'Element ' + (childIndex + 1)}`, 
                                            isBulletFormat(childElement) ? 'Enter bullet items (one item per line)...': 'Enter element content...'
                                          )}>
                                            <FullscreenIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    ) : (
                                      <Box className={classes.textFieldContainer}>
                                        <TextField
                                          label="AI Prompt - Provide instructions for MAGE to generate this element."
                                          multiline
                                          rows={2}
                                          fullWidth
                                          variant="outlined"
                                          margin="dense"
                                          size="small"
                                          value={childElement.instructions || ''}
                                          onChange={(e) => handleElementChange(childElement.id, 'instructions', e.target.value)}
                                        />
                                        <Tooltip title="Open Fullscreen Editor">
                                          <IconButton size="small" className={classes.expandButton} onClick={() => handleOpenReportTextEditor(
                                            childElement.id, 
                                            'instructions', 
                                            childElement.instructions || '', 
                                            `Edit AI Prompt for ${childElement.title || 'Element ' + (childIndex + 1)}`, 
                                            'Enter AI prompt instructions...'
                                          )}>
                                            <FullscreenIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    )}
                                  </Box>
                                </Collapse>
                                {/* Child Element Bottom Actions */}
                                <Box className={classes.itemBottomActionsContainer} style={{ justifyContent: 'flex-end' }}>
                                  <Button 
                                    size="small"
                                    variant="text"
                                    color="primary" 
                                    startIcon={<AddIcon />} 
                                    onClick={(e) => { 
                                      e.stopPropagation();
                                      const globalItemIndex = allItems.findIndex(i => i.id === childElement.id);
                                      if (globalItemIndex !== -1) {
                                        handleInsertElementBelow(globalItemIndex);
                                      }
                                    }}
                                  >
                                    Insert Element Below
                                  </Button>
                                </Box>
                              </SubtleGlowPaper>
                            ));
                          } else {
                            return (
                              <Typography variant="caption" color="textSecondary" style={{ paddingLeft: theme.spacing(2), fontStyle: 'italic' }}>
                                This section is empty. Add elements to this section.
                              </Typography>
                            );
                          }
                        })()
                      }
                    </Box>
                  </Collapse>

                  {/* ACTION BUTTONS AT THE BOTTOM OF THE SECTION CARD - THIS IS WHAT WE ARE CHECKING */}
                  <Box className={classes.itemBottomActionsContainer} style={{ justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      variant="text"
                      color="default"
                      startIcon={<AddIcon />}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const globalItemIndex = allItems.findIndex(i => i.id === item.id);
                        if (globalItemIndex !== -1) {
                          handleInsertSectionBelow(globalItemIndex);
                        } 
                      }}
                      title="Insert a new section directly below this section"
                    >
                      Insert Section Below
                    </Button>
                    <Button 
                      size="small"
                      variant="text"
                      color="primary" 
                      startIcon={<AddIcon />} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const globalItemIndex = allItems.findIndex(i => i.id === item.id);
                        if (globalItemIndex !== -1) {
                          handleInsertElementBelow(globalItemIndex, true); 
                        }
                      }}
                      title="Insert a new top-level element directly below this section"
                    >
                      Insert Element Below
                    </Button>
                  </Box>
                </Paper>
              );
              // END Stage 1

            } else if (!item.parent_uuid) { // Render element if it's top-level (no parent_uuid)
              // --- Existing Rendering Logic for a top-level Element ---
              return (
                <SubtleGlowPaper 
                  key={item.id || `element-${displayIndex}`} 
                  className={classes.elementItem} 
                  elevation={2}
                  onClick={() => toggleElement(item.id)}
                >
                  <Box 
                    className={classes.elementHeader}
                  >
                    <Box style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <IconButton 
                        size="small" 
                        className={classes.collapseButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleElement(item.id);
                        }}
                      >
                        {collapsedElements[item.id] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                      </IconButton>
                      {editingTitle === item.id ? (
                        <TextField
                          className={classes.elementTitleInput}
                          value={editingTitleValue}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleItemTitleInputChange(e.target.value);
                          }}
                          onBlur={() => saveTitleChange(item.id)}
                          onKeyPress={(e) => handleTitleKeyPress(e, item.id)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          size="small"
                          variant="standard"
                        />
                      ) : (
                        <Typography 
                          className={classes.elementTitle}
                          onClick={(e) => handleTitleClick(item.id, e)}
                        >
                          {item.title || `Element ${displayIndex + 1}`}
                        </Typography>
                      )}
                    </Box>
                    <Box className={classes.elementActions}>
                      {displayIndex > 0 && topLevelDisplayItems[displayIndex - 1].item_type === 'section' && (
                        <Tooltip title="Add to Section Above">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddElementToSectionAbove(item.id);
                            }}
                          >
                            <VerticalAlignTopIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleMoveItem(displayIndex, -1);
                      }} disabled={displayIndex === 0} title="Move Up">
                        <ArrowUpwardIcon fontSize="inherit"/>
                      </IconButton>
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleMoveItem(displayIndex, 1);
                      }} disabled={displayIndex === topLevelDisplayItems.length - 1} title="Move Down">
                        <ArrowDownwardIcon fontSize="inherit"/>
                      </IconButton>
                      {/* Conditionally render Remove from Section button for top-level items */}
                      {item.parent_uuid && (
                        <Tooltip title="Remove from Section">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveElementFromSection(item.id, item.parent_uuid);
                            }}
                          >
                            <UnlinkIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }} color="secondary" title="Delete Element">
                        <DeleteIcon fontSize="inherit"/>
                      </IconButton>
                    </Box>
                  </Box>

                  <Collapse in={!collapsedElements[item.id]}>
                    <Box className={classes.elementContent} onClick={(e) => e.stopPropagation()}>
                      <Box className={classes.elementControls}>
                        <ButtonGroup className={classes.typeToggleButtonGroup} size="small" aria-label="element type toggle">
                          <Button
                            className={classes.typeToggleButton}
                            variant={item.type === 'explicit' ? 'contained' : 'outlined'}
                            color={item.type === 'explicit' ? 'primary' : 'default'}
                            onClick={() => handleElementChange(item.id, 'type', 'explicit')}
                          >
                            Explicit
                          </Button>
                          <Button
                            className={classes.typeToggleButton}
                            variant={item.type === 'generative' ? 'contained' : 'outlined'}
                            color={item.type === 'generative' ? 'primary' : 'default'}
                            onClick={() => handleElementChange(item.id, 'type', 'generative')}
                          >
                            AI Gen
                          </Button>
                        </ButtonGroup>

                        {item.type === 'explicit' && (
                          <ButtonGroup className={classes.formatButtonGroup} size="small" aria-label="format options">
                            {formatOptions.map(opt => {
                              const isSelected = item.format === opt.value;
                              const FormatIcon = opt.icon;
                              return (
                                FormatIcon ? (
                                  <Tooltip title={opt.label} key={opt.value}>
                                    <IconButton
                                      className={classes.formatIconButton}
                                      size="small"
                                      color={'primary'} 
                                      onClick={() => handleElementChange(item.id, 'format', opt.value)}
                                      style={{
                                        border: `1px solid ${theme.palette.primary.main}`,
                                        borderRadius: '4px',
                                        color: isSelected ? theme.palette.primary.contrastText : theme.palette.primary.main,
                                        backgroundColor: isSelected ? theme.palette.primary.main : 'transparent',
                                      }}
                                    >
                                      <FormatIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Button 
                                    key={opt.value}
                                    className={classes.formatButton}
                                    variant={isSelected ? 'contained' : 'outlined'}
                                    color={isSelected ? 'primary' : 'default'}
                                    onClick={() => handleElementChange(item.id, 'format', opt.value)}
                                  >
                                    {opt.label}
                                  </Button>
                                )
                              );
                            })}
                          </ButtonGroup>
                        )}

                        {item.type === 'generative' && onRegenerateSection && (
                          <Tooltip 
                            title={
                              isNewReport ? "Please save the document before AI generation." :
                              !definition?.id ? "Please save the document before AI generation." : (
                                <Typography variant="body2">
                                  {item.ai_generated_content ? 
                                    "Regenerate this section's content. The AI will analyze the full report context to ensure the new content maintains consistency with all other sections." :
                                    "Generate this section's content. The AI will analyze the full report context to ensure content is consistent with all other sections."}
                                </Typography>
                              )
                            }
                            classes={{ tooltip: classes.regenerateTooltip }}
                            placement="top"
                          >
                            <span>
                              <Button
                                variant="contained"
                                disabled={isGenerating || isNewReport || !definition?.id}
                                className={classes.regenerateButton}
                                size="small"
                                onClick={() => onRegenerateSection(item.id)}
                                startIcon={generatingElements[item.id]?.status === 'generating' ? <CircularProgress size={16} color="inherit" /> : null}
                              >
                                {item.ai_generated_content ? 'Regenerate' : 'Generate'}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                      
                      {item.type === 'explicit' ? (
                        <Box className={classes.textFieldContainer}>
                          <TextField
                            multiline
                            rows={2}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            size="small"
                            value={isBulletFormat(item) ? getBulletItems(item).join('\n') : item.content || ''}
                            onChange={(e) => {
                              if (isBulletFormat(item)) {
                                handleBulletChange(item.id, e.target.value, item);
                              } else {
                                handleElementChange(item.id, 'content', e.target.value);
                              }
                            }}
                            label={
                              isBulletFormat(item) ? 
                              'Content: Use line breaks for new items.' : 
                              item.format === 'numberedList' ? 
                              'Content: Use line breaks for new numbered items. Indent with spaces for sub-lists.' : 
                              item.format === 'paragraph' ? 
                              'Content: Line breaks will be preserved.' : 
                              'Content: Formatting is controlled by the buttons above.'
                            }
                          />
                          <Tooltip title="Open Fullscreen Editor">
                            <IconButton
                              size="small"
                              className={classes.expandButton}
                              onClick={() => handleOpenReportTextEditor(
                                item.id,
                                'content',
                                item.content || '',
                                `Edit Content for ${item.title || 'Element ' + (displayIndex + 1)}`,
                                isBulletFormat(item) ? 'Enter bullet items (one item per line)...': 'Enter element content...'
                              )}
                            >
                              <FullscreenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box className={classes.textFieldContainer}>
                          <TextField
                            label="AI Prompt - Provide instructions for MAGE to generate this element."
                            multiline
                            rows={2}
                            fullWidth
                            variant="outlined"
                            margin="dense"
                            size="small"
                            value={item.instructions || ''}
                            onChange={(e) => handleElementChange(item.id, 'instructions', e.target.value)}
                          />
                          <Tooltip title="Open Fullscreen Editor">
                            <IconButton
                              size="small"
                              className={classes.expandButton}
                              onClick={() => handleOpenReportTextEditor(
                                item.id,
                                'instructions',
                                item.instructions || '',
                                `Edit AI Prompt for ${item.title || 'Element ' + (displayIndex + 1)}`,
                                'Enter AI prompt instructions...'
                              )}
                            >
                              <FullscreenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Collapse>

                  {/* Top-Level Element Bottom Actions */}
                  <Box className={classes.itemBottomActionsContainer} style={{ justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      variant="text"
                      color="default"
                      startIcon={<AddIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        const globalItemIndex = allItems.findIndex(i => i.id === item.id);
                        if (globalItemIndex !== -1) {
                          handleInsertSectionBelow(globalItemIndex);
                        }
                      }}
                      title="Insert a new section directly below this element"
                    >
                      Insert Section Below
                    </Button>
                    <Button 
                      size="small"
                      variant="text"
                      color="primary" 
                      startIcon={<AddIcon />} 
                      onClick={(e) => { 
                        e.stopPropagation();
                        const globalItemIndex = allItems.findIndex(i => i.id === item.id);
                        if (globalItemIndex !== -1) {
                          handleInsertElementBelow(globalItemIndex);
                        }
                      }}
                    >
                      Insert Element Below
                    </Button>
                  </Box>
                </SubtleGlowPaper>
              );
            }
            return null; // Should not be reached if logic is correct
          });
        })()}
        {(definition?.items || []).filter(i => !i.parent_uuid).length === 0 && (
          <Typography align="center" color="textSecondary" style={{ padding: '16px' }}>
            No items added yet. Use the buttons below to add the first section or element.
          </Typography>
        )}
      </Box>
      <Box display="flex" justifyContent="space-between" gap={theme.spacing(2)} style={{ marginTop: '16px' }}>
        <Button 
          variant="outlined"
          color="default" 
          startIcon={<AddIcon />} 
          onClick={handleAddSection} // New handler
          // style={{ alignSelf: 'flex-start' }} // For left alignment as per plan, might need parent Box adjustments
        >
          Add Section to End
        </Button>
        <Button 
          variant="contained"
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleAddElement}
          // style={{ alignSelf: 'center' }} // Current style
        >
          Add Element to End
        </Button>
      </Box>

      <ReportTextEditorModal
        open={isReportTextEditorOpen}
        onClose={handleCloseReportTextEditor}
        title={reportTextEditorConfig.title}
        value={reportTextEditorConfig.value}
        onChange={handleReportTextEditorSave}
        placeholder={reportTextEditorConfig.placeholder}
      />
    </Box>
  );
}

export default ReportConfigPanel; 