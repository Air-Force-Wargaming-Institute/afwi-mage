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
  Divider
} from '@material-ui/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
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
import websocketService from '../../services/websocketService';

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
  editorArea: { // Style for the editing mode
    width: '100%',
    height: '100%', // Take full height when editing
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
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1,
  },
  saveCancelContainer: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1,
    display: 'flex',
    gap: theme.spacing(1),
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
}));

// Updated function to format generative content
const formatGenerativeContent = (element) => {
  const instructions = element.instructions || '';
  const content = element.content || '';
  
  // Return both instructions and content
  return {
    instructions,
    content
  };
};

// Updated function to format explicit content
const formatExplicitContent = (contentInput, format = 'paragraph') => {
  // Ensure content is a string; if contentInput is null or undefined, default to empty string.
  // Otherwise, convert to string. This handles numbers, booleans, objects (e.g. "[object Object]"), and arrays (e.g. "item1,item2").
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
      return content; // Return content without modifications
    case 'bulletList':
      return lines.map(line => `- ${line}`).join('\n'); // No need to trim here, preserve indentation if any
    case 'numberedList':
      return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    default:
      return content; // Treat as paragraph by default
  }
};

function ReportPreviewPanel({ definition, onContentChange, isGenerating, generatingElements = {}, scrollToElementId, setScrollToElementId, highlightElementId, setHighlightElementId }) {
  const classes = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [originalDefinition, setOriginalDefinition] = useState(null);
  const [elementsMetadata, setElementsMetadata] = useState([]);
  const elementRefs = useRef({}); // To store refs for each element

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

  const handleEditClick = () => {
    // Store the original definition for cancellation
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
          // For explicit elements, get the content directly
          let cleanedContent = cleanSection;
          
          // Remove markdown formatting if it exists for headings
          if (element.format && element.format.match(/^h[1-6]$/)) {
            const headingLevel = parseInt(element.format.substring(1));
            const hashPrefix = '#'.repeat(headingLevel) + ' ';
            if (cleanedContent.startsWith(hashPrefix)) {
              cleanedContent = cleanedContent.substring(hashPrefix.length);
            }
          }
          
          element.content = cleanedContent;
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
        // Check if this element is currently being generated
        const elementStatus = generatingElements[element.id] || {};
        const status = elementStatus.status || 'not_started';
        
        // Render generative content with instructions and output
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
                
                {isGenerating && status === 'pending' && (
                  <Box ml={2} display="flex" alignItems="center" className={classes.waitingStatus}>
                    <ScheduleIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Waiting...</Typography>
                  </Box>
                )}
                
                {isGenerating && status === 'processing' && (
                  <Box ml={2} display="flex" alignItems="center" className={classes.processingStatus}>
                    <CachedIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Processing...</Typography>
                  </Box>
                )}
                
                {isGenerating && status === 'generating' && (
                  <Box ml={2} display="flex" alignItems="center" className={classes.processingStatus}>
                    <CircularProgress size={16} className={classes.statusIcon} />
                    <Typography variant="caption">Generating...</Typography>
                  </Box>
                )}
                
                {status === 'completed' && (
                  <Box ml={2} display="flex" alignItems="center" className={classes.completedStatus}>
                    <CheckCircleOutlineIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Completed</Typography>
                  </Box>
                )}
                
                {status === 'error' && (
                  <Box ml={2} display="flex" alignItems="center" className={classes.errorStatus}>
                    <ErrorOutlineIcon className={classes.statusIcon} fontSize="small" />
                    <Typography variant="caption">Error</Typography>
                  </Box>
                )}
              </Box>
              
              {isGenerating && (status === 'pending' || status === 'processing' || status === 'generating') ? (
                <Box className={classes.generatingContent}>
                  {status === 'pending' ? (
                    <ScheduleIcon color="disabled" />
                  ) : status === 'processing' ? (
                    <CachedIcon color="primary" />
                  ) : (
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
              ) : status === 'error' ? (
                <Box p={2} className={classes.errorText}>
                  <Typography variant="body2" className={classes.errorText}>
                    <ErrorOutlineIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Error generating content: {elementStatus.error || 'Unknown error'}
                  </Typography>
                </Box>
              ) : element.ai_generated_content ? (
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
                  {element.ai_generated_content}
                </ReactMarkdown>
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
        {isEditing ? (
          <>
            <TextareaAutosize
              className={classes.editorArea}
              value={editText}
              onChange={handleEditorChange}
              placeholder="Edit report content..."
            />
            <Box className={classes.saveCancelContainer}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveClick}
                size="small"
              >
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelClick}
                size="small"
              >
                Cancel
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Button
              className={classes.editButton}
              variant="outlined"
              size="small"
              onClick={handleEditClick}
            >
              Edit
            </Button>
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