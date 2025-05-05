import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  makeStyles,
  Button
} from '@material-ui/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Use a simple textarea or a dedicated editor for direct editing
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText

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
}));

// Placeholder for generated content - replace with actual API call result
const generateMockContent = (instructions) => {
  return `<!-- AI Generated Content -->\nBased on your instruction: "${instructions}", here is some generated content.\n\n*   This is point one.\n*   This is point two.\n\n\`\`\`javascript\nconsole.log("Mock generated code block");\n\`\`\`\n<!-- End AI Generated Content -->`;
};

// Updated function to format explicit content
const formatExplicitContent = (content = '', format = 'paragraph') => {
  // Don't trim here, preserve leading/trailing spaces for potential indentation/breaks
  if (!content) return '';

  switch (format) {
    case 'h1':
      return `# ${content.trim()}`; // Trim only for headings to avoid awkward space after #
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
    // For paragraph, bullet, numbered: return raw content.
    // ReactMarkdown with remark-gfm and remark-breaks will handle lists and line breaks.
    case 'paragraph':
    case 'bullet':
    case 'numbered':
    default:
      return content;
  }
};

function ReportPreviewPanel({ definition, onContentChange }) {
  const classes = useStyles();
  const [generatedReport, setGeneratedReport] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Effect to regenerate the preview when the definition changes
  useEffect(() => {
    if (definition?.elements) {
      let reportMarkdown = '';

      if (definition.title) {
        reportMarkdown += `# ${definition.title}\n\n`;
      }
      if (definition.description) {
        reportMarkdown += `${definition.description}\n\n`;
      }

      definition.elements.forEach((element) => {
        let elementMarkdown = '';
        if (element.type === 'explicit') {
          elementMarkdown = formatExplicitContent(element.content, element.format);
        } else if (element.type === 'generative') {
          elementMarkdown = generateMockContent(element.instructions || 'No instructions provided');
        }
        
        if (elementMarkdown) {
          if (reportMarkdown !== '') {
            // Add separation - use two newlines which Markdown interprets as paragraph break
            reportMarkdown += '\n\n';
          }
          reportMarkdown += elementMarkdown;
        }
      });

      setGeneratedReport(reportMarkdown);
      setEditText(reportMarkdown);
    } else {
      let initialContent = '';
      if (definition?.title) initialContent += `# ${definition.title}\n\n`;
      if (definition?.description) initialContent += `${definition.description}\n\n`;
      if (!definition?.elements || definition.elements.length === 0) {
        initialContent += initialContent ? '\n\n*No elements defined yet.*' : '*No elements defined yet.*';
      }
      setGeneratedReport(initialContent || 'Report preview appears here.');
      setEditText(initialContent || 'Report preview appears here.');
    }
    setIsEditing(false);
  }, [definition]);

  const handleEditClick = () => {
    setEditText(generatedReport); // Load current report into editor
    setIsEditing(true);
  };

  const handleSaveClick = () => {
    setGeneratedReport(editText); // Update the displayed report
    setIsEditing(false);
    // TODO: Define how saving edited markdown reconciles with the element structure.
    // This currently only updates the local preview state.
    // Passing `editText` back via onContentChange might be one way, but the parent
    // needs to know how to handle raw markdown vs the structured definition.
    console.log("Saved edited content locally (preview only).");
    // Example: onContentChange({ ...definition, rawMarkdownOverride: editText }); 
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditText(generatedReport); // Revert changes
  };

  const handleEditorChange = (e) => {
    setEditText(e.target.value);
  };

  return (
    <Box className={classes.root}>
      <GradientText variant="h6" component="h2" gutterBottom>
        Report Preview / Editor
      </GradientText>
      <Paper className={classes.previewArea} elevation={1}>
        {!isEditing && (
          <Button
            variant="outlined"
            size="small"
            className={classes.editButton}
            onClick={handleEditClick}
            disabled={!generatedReport || generatedReport === 'Report preview appears here.' || generatedReport.includes('*No elements defined yet.*')} // Disable if no content
          >
            Edit Full Report
          </Button>
        )}
        {isEditing && (
          <Box className={classes.saveCancelContainer}>
            <Button variant="contained" color="primary" size="small" onClick={handleSaveClick}>
              Save Changes
            </Button>
            <Button variant="outlined" size="small" onClick={handleCancelClick}>
              Cancel
            </Button>
          </Box>
        )}

        {isEditing ? (
          <TextareaAutosize
            className={classes.editorArea}
            value={editText}
            onChange={handleEditorChange}
            aria-label="report editor"
            minRows={20} // Adjust as needed
          />
        ) : (
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
                    {String(children).replace(/^\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {generatedReport}
          </ReactMarkdown>
        )}
      </Paper>
    </Box>
  );
}

export default ReportPreviewPanel; 