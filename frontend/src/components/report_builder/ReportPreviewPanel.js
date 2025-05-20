import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  makeStyles,
  Button,
  CircularProgress,
  LinearProgress,
  TextField,
  Snackbar,
  Divider,
  IconButton,
  Link
} from '@material-ui/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Use a simple textarea or a dedicated editor for direct editing
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText
import RefreshIcon from '@material-ui/icons/Refresh';
import CachedIcon from '@material-ui/icons/Cached';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import ScheduleIcon from '@material-ui/icons/Schedule';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'; // For the details/summary icon
import ChevronRightIcon from '@material-ui/icons/ChevronRight'; // Import ChevronRightIcon for think blocks
import { CopyToClipboard } from 'react-copy-to-clipboard'; // For CodeBlock
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // For CodeBlock
import CheckIcon from '@mui/icons-material/Check'; // For CodeBlock
import { useTheme } from '@material-ui/core/styles'; // For CodeBlock

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  previewArea: {
    flexGrow: 1,
    overflowY: 'auto',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    position: 'relative', // For positioning edit/save buttons
  },
  stickyButtonWrapper: { // New style for the sticky container
    position: 'sticky',
    top: -theme.spacing(1), // Adjust for parent padding to be ts(1) from border
    left: 0,
    width: '100%',
    zIndex: 10, // Ensure it's above other content
    display: 'flex',
    justifyContent: 'flex-end', // Push buttons to the right
    paddingRight: theme.spacing(1), // Position buttons ts(1) from the visual right border
    pointerEvents: 'none', // Allow clicks to pass through empty areas
    marginBottom: theme.spacing(1), // Add some space below the sticky bar if needed
  },
  editorArea: { // Style for the editing mode
    width: '100%',
    fontFamily: theme.typography.fontFamily,
    fontSize: '1rem',
    lineHeight: 1.5,
    border: 'none',
    outline: 'none',
    resize: 'none',
    backgroundColor: theme.palette.background.paper, // Slightly different bg for editor
    color: theme.palette.text.primary,
    padding: theme.spacing(1),
  },
  editButton: {
    // Position styles removed, handled by stickyButtonWrapper
    // top: theme.spacing(1),
    // right: theme.spacing(1),
    // zIndex: 1,
    pointerEvents: 'auto', // Ensure the button itself is clickable
  },
  saveCancelContainer: {
    // Position styles removed, handled by stickyButtonWrapper
    // top: theme.spacing(1),
    // right: theme.spacing(1),
    // zIndex: 1,
    display: 'flex',
    gap: theme.spacing(1),
    pointerEvents: 'auto', // Ensure the container (and its buttons) are clickable
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
  },
  progressContainer: {
    width: '100%',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  progress: {
    flexGrow: 1,
  },
  error: {
    marginTop: theme.spacing(1),
  },
  content: {
    flexGrow: 1,
    overflowY: 'auto',
  },
  editor: {
    marginTop: theme.spacing(1),
  },
  markdown: {
    '& h1': {
      fontSize: '2em',
      marginBottom: '0.5em',
    },
    '& h2': {
      fontSize: '1.5em',
      marginBottom: '0.5em',
    },
    '& h3': {
      fontSize: '1.17em',
      marginBottom: '0.5em',
    },
    '& p': {
      marginBottom: '1em',
    },
    '& ul, & ol': {
      marginBottom: '1em',
      paddingLeft: '2em',
    },
    '& li': {
      marginBottom: '0.5em',
    },
  },
  instructionsSection: {
    background: theme.palette.action.hover,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1, 2),
    marginBottom: theme.spacing(2),
  },
  outputSection: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1, 2),
    marginBottom: theme.spacing(2),
    background: theme.palette.background.paper,
  },
  generativeSectionHeader: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  pendingGeneration: {
    fontStyle: 'italic',
    color: theme.palette.text.disabled,
  },
  generatingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: theme.shape.borderRadius,
  },
  generatingText: {
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
  sectionStatus: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  statusIcon: {
    marginRight: theme.spacing(1),
  },
  errorText: {
    color: theme.palette.error.main,
    fontStyle: 'italic',
  },
  waitingStatus: {
    color: theme.palette.text.secondary,
  },
  processingStatus: {
    color: theme.palette.primary.main,
  },
  completedStatus: {
    color: theme.palette.success.main,
  },
  errorStatus: {
    color: theme.palette.error.main,
  },
  sectionActions: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
  },
  regenerateButton: {
    marginLeft: theme.spacing(1),
  },
  newlyGeneratedHighlight: { // CSS class for highlighting
    transition: 'background-color 0.5s ease-out',
    backgroundColor: theme.palette.action.selected, // Or a custom color like yellow/light green briefly
  },
  thinkBlockDetails: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    backgroundColor: 'rgba(0,0,0,0.02)', // Slight background to differentiate
  },
  thinkBlockSummary: {
    padding: theme.spacing(0.5, 1),
    cursor: 'pointer',
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.palette.text.secondary,
    display: 'flex', // To align icon and text
    alignItems: 'center', // To align icon and text
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
  },
  thinkBlockContent: {
    padding: theme.spacing(0, 1, 1, 1), // Add some padding to the content
  },
  // Add styles for the new think block similar to DirectChat
  thinkingProcess: { // From DirectChat for consistency
    // marginBottom: theme.spacing(2), // Adjust as needed
  },
  markdownDetails: { // From DirectChat for consistency
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    backgroundColor: 'rgba(0,0,0,0.02)', 
    '& summary': {
      padding: theme.spacing(0.5, 1),
      cursor: 'pointer',
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.palette.text.secondary,
      display: 'flex',
      alignItems: 'center',
      '&:hover': {
        backgroundColor: 'rgba(0,0,0,0.05)',
      },
    }
  },
  codeBlockContainer: { // Style for the CodeBlock wrapper
    position: 'relative',
    margin: theme.spacing(1, 0),
    backgroundColor: '#1e1e1e', // Default from markdownStyles, can be themed
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden', // Important for child elements
  },
  codeBlockLanguageLabel: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(5), // Space for copy button
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  codeBlockCopyButton: {
    position: 'absolute',
    top: theme.spacing(0.5),
    right: theme.spacing(0.5),
    color: 'rgba(255, 255, 255, 0.7)',
    '&:hover': {
      color: 'rgba(255, 255, 255, 0.9)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
}));

// Enhanced CodeBlock component (adapted from markdownStyles.js)
const EnhancedCodeBlock = ({ className, children }) => {
  const theme = useTheme();
  const classes = useStyles();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const codeString = String(children).replace(/\n$/, '');

  // For non-language specific code (e.g. inline code passed to this block accidentally or ```text block)
  if (!language) {
    return (
      <Box component="pre" sx={{ my: 1, p: 1, backgroundColor: '#1e1e1e', color: 'white', borderRadius: theme.shape.borderRadius, overflowX: 'auto' }}>
        <code>{children}</code>
      </Box>
    );
  }

  return (
    <Box className={classes.codeBlockContainer}>
      {language && <Typography className={classes.codeBlockLanguageLabel}>{language}</Typography>}
      <CopyToClipboard text={codeString} onCopy={handleCopy}>
        <IconButton size="small" className={classes.codeBlockCopyButton}>
          {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </CopyToClipboard>
      <SyntaxHighlighter
        style={materialDark}
        language={language}
        PreTag="div"
        showLineNumbers={true}
        wrapLines={true}
        customStyle={{
          margin: 0,
          padding: theme.spacing(2),
          paddingTop: language ? theme.spacing(4) : theme.spacing(2), // Adjust padding if language label is present
          backgroundColor: 'transparent', // Container has background
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </Box>
  );
};

// START: Utility functions that were removed
const formatGenerativeContent = (element) => {
  const instructions = element.instructions || '';
  // Use element.content for generative elements as the source for display and parsing
  const content = element.content || element.ai_generated_content || ''; 
  return {
    instructions,
    content
  };
};

const formatExplicitContent = (contentInput, format = 'paragraph') => {
  const content = (contentInput === null || contentInput === undefined) ? '' : String(contentInput);
  const lines = content.split('\n');

  switch (format) {
    case 'h1':
      return `# ${content.trim()}`;
    case 'h2':
      return `## ${content.trim()}`;
    case 'h3':
      return `### ${content.trim()}`;
    case 'h4':
      return `#### ${content.trim()}`;
    case 'h5':
      return `##### ${content.trim()}`;
    case 'h6':
      return `###### ${content.trim()}`;
    case 'paragraph':
      return content;
    case 'bulletList':
      return lines.map(line => `- ${line}`).join('\n');
    case 'numberedList':
      return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    default:
      return content;
  }
};
// END: Utility functions that were removed

const parseReportContent = (content, elementId) => {
  if (!content || typeof content !== 'string') {
    return { mainContent: content || '', thinkSections: [] };
  }
  try {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const thinkMatches = [...content.matchAll(thinkRegex)];
    const thinkSections = thinkMatches.map((match, index) => ({
      id: `think-${elementId}-${index}`,
      content: match[1].trim()
    }));
    
    let mainContent = content;
    thinkMatches.forEach(match => {
      mainContent = mainContent.replace(match[0], '');
    });
    
    // Remove any <details><summary>Thinking Process</summary> sections from the main content
    // This might be redundant if we are already parsing <think> tags, but good for cleanup
    const thinkingProcessRegex = /<details><summary>Thinking Process<\/summary>[\s\S]*?<\/details>/gi;
    mainContent = mainContent.replace(thinkingProcessRegex, '');
    
    mainContent = mainContent.replace(/\n{3,}/g, '\n\n').trim();
    
    // if (!mainContent.trim() && thinkSections.length > 0) {
    //   mainContent = "The AI provided only thinking content with no direct response.";
    // }

    return { mainContent, thinkSections };
  } catch (error) {
    console.error('Error parsing report content:', error);
    return { mainContent: content, thinkSections: [] };
  }
};

function ReportPreviewPanel({ definition, onContentChange, isGenerating, generatingElements = {}, scrollToElementId, setScrollToElementId, highlightElementId, setHighlightElementId }) {
  const classes = useStyles();
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const elementRefs = useRef({});
  const newlyGeneratedRef = useRef(null);
  const [expandedThinkBlocks, setExpandedThinkBlocks] = useState({});
  
  // Restore missing state variables
  const [originalDefinition, setOriginalDefinition] = useState(null);
  const [elementsMetadata, setElementsMetadata] = useState([]);

  useEffect(() => {
    if (definition && definition.elements) {
      // We'll collect all formatted elements but handle Markdown differently for display vs. editing
      const formattedElements = definition.elements.map(element => {
        // Initialize ref for new elements
        if (!elementRefs.current[element.id]) {
          elementRefs.current[element.id] = React.createRef();
        }
        if (element.type === 'explicit') {
          // For headings, if content is empty, consider using element.title.
          // However, ReportConfigPanel is now designed to place heading text in element.content.
          // So, we primarily rely on element.content.
          let contentToFormat = element.content || '';
          if (!element.content && element.title && element.format && element.format.match(/^h[1-6]$/)) {
            // Fallback for headings if content is truly empty but title exists
            contentToFormat = element.title;
          }
          // Format the content for display in the editor
          return {
            type: 'explicit',
            id: element.id,
            markdown: formatExplicitContent(contentToFormat, element.format)
          };
        } else if (element.type === 'generative') {
          const { instructions, content } = formatGenerativeContent(element);
          return {
            type: 'generative',
            id: element.id,
            instructions,
            ai_generated_content: element.ai_generated_content || ''
          };
        }
        return null; // Should not happen if elements always have a valid type
      }).filter(Boolean);

      // For editing mode, just join everything with double newlines
      const editableMarkdown = formattedElements.map(elem => {
        if (elem.type === 'explicit') {
          return `<!-- SECTION START -->\n${elem.markdown}\n<!-- SECTION END -->`;
        } else {
          // For generative elements, include special markers to identify sections later
          return `<!-- SECTION START -->\n<!-- INSTRUCTIONS START -->\n${elem.instructions}\n<!-- INSTRUCTIONS END -->\n\n<!-- AI CONTENT START -->\n${elem.ai_generated_content || '[AI content not yet generated]'}\n<!-- AI CONTENT END -->\n<!-- SECTION END -->`;
        }
      }).join('\n\n');
      
      // Add hidden metadata that can be used when saving
      const elementsMetadata = formattedElements.map(elem => ({
        id: elem.id,
        type: elem.type
      }));
      
      // Store the metadata separately
      setEditText(editableMarkdown);
      setElementsMetadata(elementsMetadata);
    } else {
      setEditText('');
    }
  }, [definition]);

  // Effect for scrolling to the element
  useEffect(() => {
    if (scrollToElementId && elementRefs.current[scrollToElementId] && elementRefs.current[scrollToElementId].current) {
      elementRefs.current[scrollToElementId].current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest' // Can be 'start', 'center', 'end', or 'nearest'
      });
      // Reset the scroll trigger after scrolling to prevent re-scrolling on other updates
      setScrollToElementId(null); 
    }
    // Ensure dependencies are correctly listed. 
    // definition.elements is included to re-evaluate if elements change (e.g. new element added before current one finishes)
  }, [scrollToElementId, setScrollToElementId]); // Only depend on scrollToElementId and its setter

  // Effect for highlighting the element and then fading
  useEffect(() => {
    if (highlightElementId) {
      const timer = setTimeout(() => {
        setHighlightElementId(null);
      }, 2000); // Highlight for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [highlightElementId, setHighlightElementId]);

  const handleToggleThinkBlock = (thinkBlockId) => {
    setExpandedThinkBlocks(prev => ({ ...prev, [thinkBlockId]: !prev[thinkBlockId] }));
  };

  const handleEditClick = () => {
    setOriginalDefinition(JSON.parse(JSON.stringify(definition)));
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    if (!onContentChange || !definition) {
      setIsEditing(false);
      return;
    }

    try {
      // Make a deep copy of the original definition to modify
      const updatedDefinition = JSON.parse(JSON.stringify(definition));
      
      // Split the text by sections using the section markers
      const sections = editText.split('<!-- SECTION START -->').filter(Boolean);
      
      // Process each section
      sections.forEach((section, index) => {
        if (index >= updatedDefinition.elements.length) return;
        
        const element = updatedDefinition.elements[index];
        const cleanSection = section.split('<!-- SECTION END -->')[0].trim();
        
        if (element.type === 'explicit') {
          let contentToSave = cleanSection;
          
          if (element.format && element.format.match(/^h[1-6]$/)) {
            const headingLevel = parseInt(element.format.substring(1));
            const hashPrefix = '#'.repeat(headingLevel) + ' ';
            if (contentToSave.startsWith(hashPrefix)) {
              contentToSave = contentToSave.substring(hashPrefix.length);
            }
          } else if (element.format === 'bulletList') {
            contentToSave = contentToSave.split('\n').map(line => {
              return line.replace(/^\s*-\s*/, ''); // Remove leading bullet (e.g., "- ")
            }).join('\n');
          } else if (element.format === 'numberedList') {
            contentToSave = contentToSave.split('\n').map(line => {
              return line.replace(/^\s*\d+\.\s*/, ''); // Remove leading number (e.g., "1. ")
            }).join('\n');
          }
          
          element.content = contentToSave;
        } else if (element.type === 'generative') {
          // For generative elements, parse instructions and AI content
          const instructionsMatch = cleanSection.split('<!-- INSTRUCTIONS START -->')[1]?.split('<!-- INSTRUCTIONS END -->')[0]?.trim();
          const aiContentMatch = cleanSection.split('<!-- AI CONTENT START -->')[1]?.split('<!-- AI CONTENT END -->')[0]?.trim();
          
          if (instructionsMatch) {
            element.instructions = instructionsMatch;
          }
          
          if (aiContentMatch) {
            // Only update if not the placeholder and if content actually changed
            if (aiContentMatch !== '[AI content not yet generated]') {
              element.ai_generated_content = aiContentMatch;
              
              // Explicitly removing this flag ensures the backend treats this as a real content update
              if (element.hasOwnProperty('pendingGeneration')) {
                delete element.pendingGeneration;
              }
            }
          }
        }
      });
      
      onContentChange(updatedDefinition);
      setIsEditing(false);
    } catch (err) {
      console.error('Error parsing edited content:', err);
      setError('Error saving changes. Please check your edits and try again.');
      setSnackbarOpen(true);
    }
  };

  const handleCancelClick = () => {
    // Restore the original definition
    setIsEditing(false);
    
    if (originalDefinition) {
      // Regenerate the edit text from the original definition
      const formattedElements = originalDefinition.elements.map(element => {
        if (element.type === 'explicit') {
          let contentToFormat = element.content || '';
          if (!element.content && element.title && element.format && element.format.match(/^h[1-6]$/)) {
            contentToFormat = element.title;
          }
          // Format the content using the original definition's formatting
          return {
            type: 'explicit',
            id: element.id,
            markdown: formatExplicitContent(contentToFormat, element.format)
          };
        } else if (element.type === 'generative') {
          const { instructions, content } = formatGenerativeContent(element);
          return {
            type: 'generative',
            id: element.id,
            instructions,
            ai_generated_content: element.ai_generated_content || ''
          };
        }
        return null;
      }).filter(Boolean);

      const editableMarkdown = formattedElements.map(elem => {
        if (elem.type === 'explicit') {
          return `<!-- SECTION START -->\n${elem.markdown}\n<!-- SECTION END -->`;
        } else {
          return `<!-- SECTION START -->\n<!-- INSTRUCTIONS START -->\n${elem.instructions}\n<!-- INSTRUCTIONS END -->\n\n<!-- AI CONTENT START -->\n${elem.ai_generated_content || '[AI content not yet generated]'}\n<!-- AI CONTENT END -->\n<!-- SECTION END -->`;
        }
      }).join('\n\n');
      
      // Update metadata for proper saving
      const elementsMetadata = formattedElements.map(elem => ({
        id: elem.id,
        type: elem.type
      }));
      
      setEditText(editableMarkdown);
      setElementsMetadata(elementsMetadata);
    }
  };

  const handleEditorChange = (e) => {
    setEditText(e.target.value);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Render each element according to its type
  const renderElements = () => {
    if (!definition || !definition.elements || definition.elements.length === 0) {
      return <Typography variant="body2" color="textSecondary">No elements defined yet.</Typography>;
    }

    return definition.elements.map((element, index) => {
      // Ensure ref is created if it wasn't during the initial useEffect
      if (!elementRefs.current[element.id]) {
        elementRefs.current[element.id] = React.createRef();
      }
      const isHighlighted = element.id === highlightElementId;

      if (element.type === 'explicit') {
        // Render explicit content as before
        let contentToFormat = element.content || '';
        if (!element.content && element.title && element.format && element.format.match(/^h[1-6]$/)) {
          contentToFormat = element.title;
        }
        
        // Format the content for display purposes only
        const formattedContent = formatExplicitContent(contentToFormat, element.format);
        
        return (
          <Box 
            key={element.id || index} 
            mb={2} 
            ref={elementRefs.current[element.id]}
            className={isHighlighted ? classes.newlyGeneratedHighlight : ''} // Apply highlight class
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={materialDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {formattedContent}
            </ReactMarkdown>
          </Box>
        );
      } else if (element.type === 'generative') {
        // Correctly define elementStatus and status
        const elementStatus = generatingElements[element.id] || {};
        // Use element.ai_generated_content to determine initial completed status
        const status = elementStatus.status || (element.ai_generated_content ? 'completed' : 'not_started');

        const isCurrentlyGenerating = status === 'generating' || status === 'processing' || status === 'pending';
        const hasError = status === 'error';
        const errorMessage = hasError ? elementStatus.error : '';
        
        // When not editing, displayContent should be from element.ai_generated_content
        const displayContent = element.ai_generated_content || ''; 
        
        const { mainContent, thinkSections } = parseReportContent(displayContent, element.id);

        const sectionRef = element.id === highlightElementId ? newlyGeneratedRef : null;
        // const sectionId = `element-${element.id}`; // Already defined if needed, seems unused now

        return (
          <Box 
            key={element.id || index} 
            mb={3} 
            ref={elementRefs.current[element.id]}
            className={isHighlighted ? classes.newlyGeneratedHighlight : ''} // Apply highlight class
          >
            <Box className={classes.instructionsSection}>
              <Typography className={classes.generativeSectionHeader}>
                Instructions for MAGE:
              </Typography>
              <Typography variant="body2">{element.instructions || 'No instructions provided'}</Typography>
            </Box>
            
            <Box className={classes.outputSection} position="relative">
              <Box className={classes.sectionStatus}>
                <Typography className={classes.generativeSectionHeader}>
                  Output from MAGE:
                </Typography>
                
                {status === 'pending' && ( // Use corrected status
                  <Box ml={2} display="flex" alignItems="center" className={classes.waitingStatus}>
                    <ScheduleIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Waiting...</Typography>
                  </Box>
                )}
                
                {status === 'processing' && ( // Use corrected status
                  <Box ml={2} display="flex" alignItems="center" className={classes.processingStatus}>
                    <CachedIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Processing...</Typography>
                  </Box>
                )}
                
                {status === 'generating' && ( // Use corrected status
                  <Box ml={2} display="flex" alignItems="center" className={classes.processingStatus}>
                    <CircularProgress size={16} className={classes.statusIcon} />
                    <Typography variant="caption">Generating...</Typography>
                  </Box>
                )}
                
                {status === 'completed' && ( // Use corrected status
                  <Box ml={2} display="flex" alignItems="center" className={classes.completedStatus}>
                    <CheckCircleOutlineIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Completed</Typography>
                  </Box>
                )}
                
                {status === 'error' && ( // Use corrected status
                  <Box ml={2} display="flex" alignItems="center" className={classes.errorStatus}>
                    <ErrorOutlineIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Error</Typography>
                  </Box>
                )}
              </Box>
              
              {isCurrentlyGenerating ? ( // Use isCurrentlyGenerating based on corrected status
                <Box className={classes.generatingContent}>
                  {status === 'pending' ? (
                    <ScheduleIcon color="disabled" />
                  ) : status === 'processing' ? (
                    <CachedIcon color="primary" />
                  ) : ( // 'generating'
                    <CircularProgress size={30} />
                  )}
                  <Typography className={classes.generatingText}>
                    {status === 'pending' 
                      ? 'Waiting in queue...' 
                      : status === 'processing' 
                        ? 'Preparing to generate content...' 
                        : 'Generating content...'}
                  </Typography>
                </Box>
              ) : status === 'error' ? ( // Use corrected status
                <Box p={2} className={classes.errorText}>
                  <Typography variant="body2" className={classes.errorText}>
                    <ErrorOutlineIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Error generating content: {errorMessage || 'Unknown error'}
                  </Typography>
                </Box>
              ) : mainContent || thinkSections.length > 0 ? ( // Check if there's any content to render
                <>
                  {/* THINK SECTIONS FIRST */}
                  {thinkSections.length > 0 && (
                    <Box className={classes.thinkingProcess} sx={{ mb: mainContent ? 2 : 0 }}>
                      <details
                        className={classes.markdownDetails}
                        open={expandedThinkBlocks[`think-summary-${element.id}`] || false}
                        onClick={(e) => {
                          if (e.target.tagName.toLowerCase() === 'summary') {
                            e.preventDefault();
                            handleToggleThinkBlock(`think-summary-${element.id}`);
                          }
                        }}
                      >
                        <summary>
                          {expandedThinkBlocks[`think-summary-${element.id}`] ? 
                            <ExpandMoreIcon sx={{ mr: 1 }} /> : 
                            <ChevronRightIcon sx={{ mr: 1 }} />
                          }
                          AI Pre-Reasoning
                        </summary>
                        <Box sx={{ p: 1 }}>
                          {thinkSections.map((section, index) => (
                            <React.Fragment key={section.id}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  code: EnhancedCodeBlock,
                                  p: ({node, ...props}) => <Typography variant="body2" component="p" gutterBottom {...props} />,
                                  // Add other components as needed, similar to DirectChat's think section rendering
                                  // For now, keeping it simple
                                  table: ({node, ...props}) => <Paper elevation={0} sx={{my:1, overflowX: 'auto'}}><table className={classes.table} {...props} /></Paper>,
                                  thead: ({node, ...props}) => <thead className={classes.thead} {...props} /> ,
                                  tbody: ({node, ...props}) => <tbody {...props} /> ,
                                  tr: ({node, ...props}) => <tr {...props} /> ,
                                  th: ({node, ...props}) => <th className={classes.th} {...props} /> ,
                                  td: ({node, ...props}) => <td className={classes.td} {...props} /> ,
                                  ul: ({node, ...props}) => <ul style={{paddingLeft: '20px', textAlign: 'left'}} {...props} /> ,
                                  ol: ({node, ...props}) => <ol style={{paddingLeft: '20px', textAlign: 'left'}} {...props} /> ,
                                  li: ({node, ...props}) => <li style={{textAlign: 'left'}} {...props} /> ,
                                  a: ({node, ...props}) => <Link target="_blank" rel="noopener noreferrer" {...props} /> ,
                                  blockquote: ({node, ...props}) => <Paper elevation={0} sx={{borderLeft: `4px solid ${theme.palette.primary.light}`, pl:1, my:1, fontStyle: 'italic'}}><blockquote {...props} /></Paper> ,
                                }}
                              >
                                {section.content}
                              </ReactMarkdown>
                              {index < thinkSections.length - 1 && <Divider sx={{ my: 1 }} />}
                            </React.Fragment>
                          ))}
                        </Box>
                      </details>
                    </Box>
                  )}
                  {/* MAIN CONTENT AFTER THINKING */}
                  {mainContent && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        code: EnhancedCodeBlock,
                        // Removed CollapsibleThinkBlock from here
                        table: ({node, ...props}) => <Paper elevation={1} sx={{my:1, overflowX: 'auto'}}><table className={classes.table} {...props} /></Paper>,
                        thead: ({node, ...props}) => <thead className={classes.thead} {...props} /> ,
                        tbody: ({node, ...props}) => <tbody {...props} /> ,
                        tr: ({node, ...props}) => <tr {...props} /> ,
                        th: ({node, ...props}) => <th className={classes.th} {...props} /> ,
                        td: ({node, ...props}) => <td className={classes.td} {...props} /> ,
                        p: ({node, ...props}) => <Typography variant="body1" component="p" paragraph {...props} /> ,
                        h1: ({node, ...props}) => <Typography variant="h4" component="h1" gutterBottom {...props} /> ,
                        h2: ({node, ...props}) => <Typography variant="h5" component="h2" gutterBottom {...props} /> ,
                        h3: ({node, ...props}) => <Typography variant="h6" component="h3" gutterBottom {...props} /> ,
                        h4: ({node, ...props}) => <Typography variant="subtitle1" component="h4" gutterBottom {...props} /> ,
                        h5: ({node, ...props}) => <Typography variant="subtitle2" component="h5" gutterBottom {...props} /> ,
                        h6: ({node, ...props}) => <Typography variant="body2" component="h6" gutterBottom {...props} /> ,
                        ul: ({node, ...props}) => <ul className={classes.ul} {...props} /> ,
                        ol: ({node, ...props}) => <ol className={classes.ol} {...props} /> ,
                        li: ({node, ...props}) => <li className={classes.li} {...props} /> ,
                        a: ({node, ...props}) => <Link target="_blank" rel="noopener noreferrer" {...props} /> ,
                        blockquote: ({node, ...props}) => <Paper elevation={0} sx={{borderLeft: `4px solid ${theme.palette.primary.light}`, pl:1, my:1, fontStyle: 'italic'}}><blockquote {...props} /></Paper> ,
                      }}
                    >
                      {mainContent}
                    </ReactMarkdown>
                  )}
                </>
              ) : (
                <Typography className={classes.pendingGeneration}>
                  [AI content not yet generated]
                </Typography>
              )}
            </Box>
          </Box>
        );
      }
      return null;
    });
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.previewArea}>
        {/* Sticky container for buttons at the top */}
        <Box className={classes.stickyButtonWrapper}>
          {isEditing ? (
            <Box className={classes.saveCancelContainer}>
              <Button variant="contained" color="primary" onClick={handleSaveClick} size="small">
                Apply Changes
              </Button>
              <Button variant="outlined" onClick={handleCancelClick} size="small">
                Cancel
              </Button>
            </Box>
          ) : (
            <Button
              className={classes.editButton}
              variant="outlined"
              size="small"
              onClick={handleEditClick}
            >
              Edit
            </Button>
          )}
        </Box>

        {/* Actual content that scrolls */}
        {isEditing ? (
          <>
            <TextareaAutosize
              className={classes.editorArea}
              value={editText}
              onChange={handleEditorChange}
              placeholder="Edit report content..."
            />
          </>
        ) : (
          <>
            <Box className={classes.markdown}>
              {renderElements()}
            </Box>
          </>
        )}
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={error || 'Report updated successfully'}
      />
    </Box>
  );
}

export default ReportPreviewPanel; 