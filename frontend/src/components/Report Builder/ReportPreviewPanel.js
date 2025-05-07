import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  makeStyles,
  Button,
  CircularProgress,
  LinearProgress,
  TextField,
  Snackbar
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
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
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
}));

// Placeholder for generated content - replace with actual API call result
const generateMockContent = (instructions) => {
  return `<!-- START MAGE GENERATED CONTENT -->\nInstructions for MAGE: "${instructions}"\n<!-- END MAGE GENERATED CONTENT -->`;
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
      return content; // ReactMarkdown with remarkBreaks will handle line breaks within paragraphs
    case 'bulletList':
      return lines.map(line => `- ${line}`).join('\n'); // No need to trim here, preserve indentation if any
    case 'numberedList':
      return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    default:
      return content; // Treat as paragraph by default
  }
};

function ReportPreviewPanel({ definition, onContentChange }) {
  const classes = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (definition && definition.elements) {
      const markdown = definition.elements.map(element => {
        if (element.type === 'explicit') {
          // For headings, if content is empty, consider using element.title.
          // However, ReportConfigPanel is now designed to place heading text in element.content.
          // So, we primarily rely on element.content.
          let contentToFormat = element.content || '';
          if (!element.content && element.title && element.format && element.format.match(/^h[1-6]$/)) {
            // Fallback for headings if content is truly empty but title exists
            contentToFormat = element.title;
          }
          return formatExplicitContent(contentToFormat, element.format);
        } else if (element.type === 'generative') {
          return generateMockContent(element.instructions || `Generate content for: ${element.title || 'this element'}`);
        }
        return ''; // Should not happen if elements always have a valid type
      }).filter(Boolean).join('\n\n'); // Join elements with double newline for markdown paragraph spacing
      
      setEditText(markdown);
    } else {
      setEditText('');
    }
  }, [definition]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    if (onContentChange) {
      // Parse the markdown back into the mockReports structure
      const lines = editText.split('\n');
      const elements = [];
      let currentElement = null;
      let currentSection = null;

      lines.forEach(line => {
        if (line.startsWith('# ')) {
          if (currentElement) elements.push(currentElement);
          currentElement = {
            type: 'header',
            content: line.slice(2)
          };
        } else if (line.startsWith('## ')) {
          if (currentSection) elements.push(currentSection);
          currentSection = {
            type: 'section',
            title: line.slice(3),
            elements: []
          };
        } else if (line.startsWith('- ')) {
          if (!currentSection) {
            currentSection = {
              type: 'section',
              title: 'Unnamed Section',
              elements: []
            };
          }
          const bulletList = currentSection.elements.find(e => e.type === 'bulletList');
          if (bulletList) {
            bulletList.items.push(line.slice(2));
          } else {
            currentSection.elements.push({
              type: 'bulletList',
              items: [line.slice(2)]
            });
          }
        } else if (line.trim()) {
          if (!currentSection) {
            currentSection = {
              type: 'section',
              title: 'Unnamed Section',
              elements: []
            };
          }
          const paragraph = currentSection.elements.find(e => e.type === 'paragraph');
          if (paragraph) {
            paragraph.content += '\n' + line;
          } else {
            currentSection.elements.push({
              type: 'paragraph',
              content: line
            });
          }
        }
      });

      if (currentElement) elements.push(currentElement);
      if (currentSection) elements.push(currentSection);

      onContentChange({
        ...definition,
        elements
      });
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditText(definition ? definition.elements.map(element => {
      switch (element.type) {
        case 'header':
          return `# ${element.content}`;
        case 'section':
          return [
            `## ${element.title}`,
            ...element.elements.map(subElement => {
              switch (subElement.type) {
                case 'bulletList':
                  return subElement.items.map(item => `- ${item}`).join('\n');
                case 'paragraph':
                  return subElement.content;
                default:
                  return '';
              }
            }).filter(Boolean)
          ].join('\n\n');
        default:
          return '';
      }
    }).filter(Boolean).join('\n\n') : '');
  };

  const handleEditorChange = (e) => {
    setEditText(e.target.value);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
                {editText}
              </ReactMarkdown>
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