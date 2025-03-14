import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Container,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress,
  Box,
  IconButton,
  Fade,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  ListItemIcon,
  Checkbox
} from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';
import { useHILChat, ACTIONS } from '../contexts/HILChatContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import axios from 'axios';
import { getApiUrl } from '../config';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SchoolIcon from '@mui/icons-material/School';
import TuneIcon from '@mui/icons-material/Tune';
import PersonIcon from '@mui/icons-material/Person';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    height: 'calc(100vh - 215px)',
    maxHeight: 'calc(100vh - 128px)',
    overflow: 'hidden',
    marginTop: '10px',
    width: '100%',
    maxWidth: '100%',
  },
  chatContainer: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
    borderRadius: '10px',
    height: '100%',
    width: '100%',
    gap: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  sessionsList: {
    width: '16%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
    '& > *:not(:first-child)': {
      overflow: 'auto',
    },
  },
  chatArea: {
    width: '84%',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: theme.palette.background.default,
    position: 'relative',
    borderRadius: '12px',
    transition: 'opacity 0.3s ease',
  },
  messageArea: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    paddingRight: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    textAlign: 'left',
    fontSize: '0.7rem',
    scrollBehavior: 'smooth',
    width: '100%',
    boxSizing: 'border-box',
    '&::-webkit-scrollbar': {
      width: '8px',
      zIndex: 2,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
      zIndex: 2,
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[300],
      borderRadius: '4px',
      zIndex: 2,
      '&:hover': {
        background: theme.palette.grey[400],
      },
    },
    // Improve container for handling expanded content
    '& > div': {
      width: 'fit-content',
      maxWidth: '80%',
      alignSelf: props => props.sender === 'user' ? 'flex-end' : 'flex-start',
      [theme.breakpoints.down('sm')]: {
        maxWidth: '95%',
      },
    },
  },
  message: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    borderRadius: '30px',
    border: '1px solid #e0e0e0',
    maxWidth: '80%',
    wordBreak: 'break-word',
    display: 'inline-block',
    whiteSpace: 'pre-wrap',
    position: 'relative',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    overflow: 'visible',
    width: 'auto',
    willChange: 'transform',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch', // Ensure children stretch to fill container width
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      transform: 'translateY(-1px)',
    },
    [theme.breakpoints.down('sm')]: {
      maxWidth: '95%',
    },
  },
  userMessage: {
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
    marginLeft: 'auto',
    borderRadius: '20px 20px 0 20px',
    '& $messageContent': {
      color: '#ffffff',
    },
    '& p, & div': {
      color: '#ffffff !important',
    },
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.text.primary,
    borderBottomLeftRadius: '4px',
    minWidth: '300px',
    width: 'fit-content',
    display: 'flex',          // Add flex display to ensure proper content alignment
    flexDirection: 'column',  // Stack children vertically
    alignItems: 'flex-start', // Align children at the start
    '& pre': {
      margin: '8px 0',
      borderRadius: '4px',
      overflow: 'auto',
      maxWidth: 'calc(100% - 16px)',
    },
    '& code': {
      fontFamily: 'monospace',
      maxWidth: '100%',
      overflowX: 'auto',
      display: 'inline-block',
    },
    '& details': {
      margin: '0.5em 0',
      padding: '0.5em',
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[1],
      width: '100%',
      
      '& details': {
        margin: '0.5em 0',
        padding: '0.5em',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderLeft: '3px solid rgba(0, 0, 0, 0.1)',
        width: '100%',
      }
    },
    '& summary': {
      cursor: 'pointer',
      fontWeight: 500,
      marginBottom: '0.3em',
      padding: '0.3em',
      '&:hover': {
        color: theme.palette.primary.main,
      }
    },
    '& details[open] > summary': {
      marginBottom: '0.5em',
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
    // Handle multiple expert analyses sections more elegantly
    '& .customDetails + .customDetails': {
      marginTop: theme.spacing(2),
    },
  },
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  input: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
    '& .MuiInputBase-root': {
      maxHeight: '150px',
      overflowY: 'auto',
    },
  },
  inputHelpIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  typingIndicator: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(1),
    '& .loading-header': {
      fontWeight: 600,
    },
    '& .loading-text': {
      color: theme.palette.text.secondary,
      fontSize: '0.9rem',
      textAlign: 'center',
    },
    '& .dots': {
      display: 'flex',
      gap: '8px',
      marginTop: theme.spacing(1),
      '& .dot': {
        width: '8px',
        height: '8px',
        backgroundColor: theme.palette.primary.main,
        borderRadius: '50%',
        animation: '$bounce 1.4s infinite ease-in-out both',
        '&:nth-child(1)': {
          animationDelay: '-0.32s',
        },
        '&:nth-child(2)': {
          animationDelay: '-0.16s',
        },
      },
    },
  },
  '@keyframes bounce': {
    '0%, 80%, 100%': {
      transform: 'scale(0)',
    },
    '40%': {
      transform: 'scale(1)',
    },
  },
  improvementDialog: {
    '& .MuiDialog-paper': {
      width: '600px',
      maxWidth: '90vw',
    },
  },
  feedbackField: {
    marginTop: theme.spacing(2),
  },
  sessionButton: {
    marginBottom: theme.spacing(2),
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
  improvementBox: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  chatLog: {
    width: '30%',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    marginRight: theme.spacing(2),
    minWidth: '30%',
  },
  newChatButton: {
    margin: theme.spacing(2),
  },
  chatSessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
  },
  sessionActions: {
    display: 'flex',
    gap: theme.spacing(0.25),
    opacity: 0.7,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
  },
  sessionActionButton: {
    padding: 5,
    '& .MuiSvgIcon-root': {
      fontSize: '1.5rem',
    },
  },
  promptHelpDialog: {
    '& .MuiDialog-paper': {
      width: '600px',
      maxWidth: '90vw',
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogContent: {
    padding: theme.spacing(2),
  },
  promptTip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  tipIcon: {
    color: theme.palette.primary.main,
    marginTop: theme.spacing(0.5),
  },
  planBox: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  modifiedQuestionBox: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
  },
  agentsBox: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  agentIcon: {
    marginRight: theme.spacing(2),
  },
  markdown: {
    width: '100%', // Ensure markdown takes full width of parent 
    '& details': {
      margin: '1em 0',
      padding: '0.5em',
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[1],
      
      '& summary': {
        cursor: 'pointer',
        fontWeight: 500,
        marginBottom: '0.5em',
        padding: '0.5em',
        
        '&:hover': {
          color: theme.palette.primary.main,
        },
      },
      
      '& details': {
        margin: '0.5em 0',
        padding: '0.5em',
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
      },
    },
    '& p, & li, & h1, & h2, & h3, & h4, & h5, & h6': {
      overflowWrap: 'break-word',
      wordBreak: 'break-word', 
      maxWidth: '100%',
    },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
    },
    '& table': {
      maxWidth: '100%',
      overflow: 'auto',
      display: 'block',
    },
  },
  markdownDetails: {
    // Reset all potentially problematic properties 
    listStyle: 'none',
    display: 'block',
    margin: '1em 0',
    padding: 0,
    borderRadius: theme.shape.borderRadius,
    transition: 'all 0.3s ease',
  },
  // New container for our custom implementation
  customDetails: {
    margin: '1em 0',
    borderRadius: theme.shape.borderRadius,
    overflow: 'visible',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '250px',
    flexGrow: 1,
    alignSelf: 'stretch',
    // Better handle multiple expanded sections
    '&:not(:last-child)': {
      marginBottom: theme.spacing(2),
    },
  },
  analysisDetailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: theme.spacing(1, 1.5),
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    backgroundColor: 'rgba(92, 107, 192, 0.08)',
    '&:hover': {
      backgroundColor: 'rgba(92, 107, 192, 0.15)',
    },
  },
  analysisTitle: {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: theme.palette.text.primary,
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  analysisExpandToggle: {
    transition: 'transform 0.3s ease',
    color: theme.palette.primary.main,
  },
  analysisExpanded: {
    transform: 'rotate(180deg)',
  },
  // Expert Analysis gets a slightly different color to visually distinguish it
  expertAnalysisHeader: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    '&:hover': {
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
    },
  },
  // Inner details content container
  analysisContent: {
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
    transition: 'max-height 0.3s ease, opacity 0.3s ease',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  // Hidden content for collapsed sections
  collapsedContent: {
    maxHeight: 0,
    padding: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: 'max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease',
  },
  // Visible content for expanded sections
  expandedContent: {
    maxHeight: '15000px', // Increased from 5000px to handle multiple expanded sections
    opacity: 1,
    overflow: 'visible',
    padding: theme.spacing(2),
    transition: 'max-height 1s ease-in-out, opacity 0.5s ease, padding 0.4s ease',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    '& img, & video': {
      maxWidth: '100%',
      height: 'auto',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      overflowX: 'auto',
      display: 'block',
    },
    '& p': {
      margin: '0.5em 0',
      maxWidth: '100%',
    },
    '& ul, & ol': {
      paddingLeft: '2em',
      margin: '0.5em 0',
      maxWidth: '100%',
    },
    '& > .customDetails': {
      width: '100%',
      marginLeft: 0,
      marginRight: 0,
    },
    '& > *': {
      maxWidth: '100%',
      boxSizing: 'border-box',
    },
    // Nested expanded sections need special handling
    '& .expandedContent': {
      maxHeight: '6000px', // Slightly smaller for nested sections
      width: '100%',
    },
  },
  messageTimestamp: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    opacity: 0.8,
    marginTop: theme.spacing(1),
  },
  fullscreenButton: {
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  fullscreen: {
    position: 'fixed',
    top: '0px',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1300,
    width: '100vw',
    height: '100vh',
    maxHeight: '100vh',
    maxWidth: '100vw',
    borderRadius: 0,
    padding: theme.spacing(2),
  },
  fullscreenText: {
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    marginRight: theme.spacing(1),
    fontWeight: 'bold',
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  buttonBar: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    position: 'relative',
  },
  sessionName: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: '1rem',
    textAlign: 'center',
  },
  buttonBarActions: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
  },
  systemMessage: {
    alignSelf: 'center',
    width: '95%',
    backgroundColor: '#f5f5f5',
    border: `1px solid ${theme.palette.primary.light}`,
    borderRadius: '8px',
    '& p, & li': {
      margin: '4px 0',
    },
    '& strong': {
      color: theme.palette.primary.dark,
    },
  },
  planCollapsedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: theme.spacing(1, 1.5),
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    backgroundColor: 'rgba(92, 107, 192, 0.08)',
    '&:hover': {
      backgroundColor: 'rgba(92, 107, 192, 0.15)',
    },
  },
  planExpandToggle: {
    transition: 'transform 0.3s ease',
    color: theme.palette.primary.main,
  },
  planContent: {
    padding: theme.spacing(2),
    transition: 'max-height 0.4s cubic-bezier(0, 1, 0, 1), opacity 0.3s ease, padding 0.3s ease',
    overflow: 'hidden',
  },
  planCollapsed: {
    maxHeight: 0,
    opacity: 0,
    padding: '0 16px',
    pointerEvents: 'none',
  },
  planExpanded: {
    maxHeight: '2000px', // Large enough to fit content
    opacity: 1,
    transition: 'max-height 0.4s ease-in-out, opacity 0.5s ease',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: '80px',
    right: '20px',
    zIndex: 1000,
    backgroundColor: '#3f51b5', // Fixed: use direct color instead of theme => theme.palette.primary.main
    color: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  },
}));

// Custom markdown renderer for code blocks
const CodeBlock = ({ node, inline, className, children, ...props }) => {
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
};

// Memoized Message Component with collapsible system messages
const Message = memo(({ message, onSectionExpanded }) => {
  const classes = useStyles();
  const [expandedSections, setExpandedSections] = useState({});
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectingSectionId, setSelectingSectionId] = useState(null);
  const contentRef = useRef(null);
  const selectionTimeoutRef = useRef(null);
  const detailsRefs = useRef({});
  const messageRef = useRef(null); // Add ref for the message container

  // Create a ref callback function at the component level
  const createRefCallback = useCallback((id) => (node) => {
    if (node !== null) {
      detailsRefs.current[id] = node;
    }
  }, []);

  // Add a useEffect to update container size when sections are expanded/collapsed
  useEffect(() => {
    // Force a reflow/repaint when expansion state changes to ensure proper sizing
    if (messageRef.current) {
      // Apply a transform to force a reflow so the content expands properly
      requestAnimationFrame(() => {
        messageRef.current.style.transform = 'translateZ(0)';
        
        // Remove the transform in the next frame to complete the reflow
        requestAnimationFrame(() => {
          if (messageRef.current) {
            messageRef.current.style.transform = '';
          }
        });
      });
    }
  }, [expandedSections, isPlanExpanded]);

  // Handle mousedown/up to track text selection
  const handleMouseDown = (e) => {
    // Only track mousedown within the content area
    if (contentRef.current && contentRef.current.contains(e.target)) {
      setIsSelecting(true);

      // Check if mousedown happened in a details section
      const detailsEl = e.target.closest('details');
      if (detailsEl && detailsEl.id) {
        setSelectingSectionId(detailsEl.id);
      }
    }
  };

  const handleMouseUp = () => {
    // Use setTimeout to ensure click handlers fire first
    selectionTimeoutRef.current = setTimeout(() => {
      // Only clear selection if no text is actually selected
      if (!window.getSelection().toString()) {
        setIsSelecting(false);
        setSelectingSectionId(null);
      } else {
        // If text is selected, set another timeout to clear the selecting state
        // after user has had time to copy
        selectionTimeoutRef.current = setTimeout(() => {
          setIsSelecting(false);
          setSelectingSectionId(null);
        }, 3000); // 3 seconds should be plenty of time to copy
      }
    }, 150);
  };

  // Determine if a click should toggle plan expansion
  const handlePlanToggle = (e) => {
    // Only proceed if click was on the header itself or the toggle button
    if (!e.target.closest(`.${classes.planCollapsedHeader}`) && 
        !e.target.closest(`.${classes.planExpandToggle}`)) {
      return;
    }
    
    // Don't toggle if user is selecting text
    if (window.getSelection().toString() || isSelecting) {
      return;
    }
    
    setIsPlanExpanded(!isPlanExpanded);
  };

  // Update setExpandedSections to notify parent component
  const handleExpandSection = useCallback((id, isExpanded) => {
    setExpandedSections(prev => {
      const newState = {
        ...prev,
        [id]: !prev[id]
      };
      
      // Notify parent component of change
      if (onSectionExpanded) {
        onSectionExpanded(message.id, id, !prev[id]);
      }
      
      return newState;
    });
  }, [message.id, onSectionExpanded]);
  
  // Toggle this section only with proper container updates
  const toggleSection = (id, e) => {
    // Stop event propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Don't toggle if user is selecting text
    if (window.getSelection().toString() || isSelecting) {
      return;
    }
    
    // Find the closest scrollable parent - typically the message area
    const scrollableParent = findScrollableParent(e.target);
    const scrollTop = scrollableParent ? scrollableParent.scrollTop : 0;
    
    // Toggle this section's expanded state
    handleExpandSection(id);
    
    // Simply force a re-render of our container without any scroll changing behavior
    if (messageRef.current) {
      // Trigger a reflow to ensure content renders properly
      requestAnimationFrame(() => {
        messageRef.current.style.transform = 'translateZ(0)';
        
        // In the next frame, reset transform and restore scroll position
        requestAnimationFrame(() => {
          messageRef.current.style.transform = '';
          
          // Explicitly restore original scroll position
          if (scrollableParent) {
            scrollableParent.scrollTop = scrollTop;
          }
        });
      });
    }
    
    return false;
  };
  
  // Helper function to find the closest scrollable parent
  const findScrollableParent = (element) => {
    if (!element) return null;
    
    // Check if the element itself is scrollable
    if (
      element.scrollHeight > element.clientHeight ||
      element.scrollWidth > element.clientWidth
    ) {
      return element;
    }
    
    // Recursively check parent elements
    return findScrollableParent(element.parentElement);
  };

  // Enhanced details renderer with custom header to match plan experience
  const renderEnhancedDetails = ({ node, children, ...props }) => {
    // Generate a stable ID using message ID and detail index
    const detailsIndex = node.position ? node.position.start.line : Math.random();
    const id = `message-${message.id}-details-${detailsIndex}`;

    // Extract the exact text content
    let title = "Expert Analyses"; // Default fallback
    let summaryContent = null;
    let detailsContent = [];
    
    // Find the summary element and get its exact text
    React.Children.forEach(children, child => {
      // Try multiple possible properties to identify summary elements
      const isSummary = 
        child?.props?.originalType === 'summary' || 
        child?.props?.node?.type === 'element' && child?.props?.node?.tagName === 'summary' ||
        child?.props?.node?.type === 'summary' ||
        child?.type === 'summary';
      
      if (isSummary) {
        summaryContent = child;
        
        // Extract the exact text content
        if (typeof child.props.children === 'string') {
          title = child.props.children; // Use exactly what's in the summary tag
        } else if (Array.isArray(child.props.children)) {
          // For complex content, join all text parts
          title = child.props.children
            .filter(c => typeof c === 'string')
            .join('');
        } else if (child.props.children && typeof child.props.children === 'object') {
          // Handle React element objects (might contain value or props.children)
          
          if (child.props.children.props && child.props.children.props.children) {
            // Try to extract from nested props
            if (typeof child.props.children.props.children === 'string') {
              title = child.props.children.props.children;
            } else if (Array.isArray(child.props.children.props.children)) {
              title = child.props.children.props.children
                .filter(c => typeof c === 'string')
                .join('');
            }
          } else if (child.props.children.value) {
            // Some markdown parsers use a 'value' property
            title = child.props.children.value;
          }
        }
      } else {
        detailsContent.push(child);
      }
    });

    // Style differently only if this is an expert analysis
    // This doesn't change the title, just the visual appearance
    const isExpertAnalysis = typeof title === 'string' && 
      (title === "Expert Analyses" || title.includes("Expert Analysis"));
    
    // Get current expanded state
    const isExpanded = expandedSections[id] || false;

    // Use the ref callback function created at the component level
    // No more useCallback here - fixes the React hooks rule violation
    const detailsContentRef = createRefCallback(id);

    // Filter out any redundant "Expert Analyses" text paragraphs
    const filteredContent = detailsContent.map(child => {
      if (child?.props?.children && typeof child?.props?.children === 'string') {
        const text = child.props.children;
        if (text.trim() === 'Expert Analyses:' || 
            text.trim() === 'Expert Analysis:') {
          return null; // Skip this redundant text
        }
      }
      return child;
    }).filter(Boolean); // Remove null items

    // Return a completely custom div-based implementation that doesn't use native details/summary
    return (
      <div className={classes.customDetails}>
        {/* Custom header with toggle button - using exactly what was in the summary tag */}
        <div 
          className={`${classes.analysisDetailsHeader} ${isExpertAnalysis ? classes.expertAnalysisHeader : ''}`}
          onClick={(e) => toggleSection(id, e)}
        >
          <Typography className={classes.analysisTitle} title={title}>
            {title}
          </Typography>
          <IconButton 
            className={`${classes.analysisExpandToggle} ${isExpanded ? classes.analysisExpanded : ''}`}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleSection(id, e);
            }}
          >
            <KeyboardArrowDownIcon />
          </IconButton>
        </div>
        
        {/* Content area - shown/hidden based on expanded state */}
        <div 
          ref={detailsContentRef}
          className={`${classes.analysisContent} ${isExpanded ? classes.expandedContent : classes.collapsedContent}`}
          onClick={(e) => e.stopPropagation()}
          style={isExpanded ? { height: 'auto' } : {}} // Ensure height is auto when expanded
        >
          {filteredContent}
        </div>
      </div>
    );
  };

  // When mounted, add selection listeners to document
  useEffect(() => {
    if (message.sender === 'system') {
      // When plan is first added, set it as expanded for better visibility
      setIsPlanExpanded(true);

      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('selectstart', () => setIsSelecting(true));
      
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('selectstart', () => setIsSelecting(true));
        
        // Clear any pending timeouts on unmount
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
      };
    }
  }, [message.sender]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  // Determine message class based on sender
  const getMessageClass = () => {
    switch(message.sender) {
      case 'user':
        return classes.userMessage;
      case 'ai':
        return classes.aiMessage;
      case 'system':
        return classes.systemMessage;
      default:
        return classes.aiMessage;
    }
  };

  // Extract plan type info from system message (if it exists)
  const getPlanInfo = () => {
    if (message.sender !== 'system') return null;
    
    // Try to extract plan type from the message text
    const planTypeMatch = message.text.match(/Execution Plan \((.*?)\)/);
    if (planTypeMatch && planTypeMatch[1]) {
      return planTypeMatch[1]; // "Original user message" or "AI-modified message"
    }
    return "Plan";
  };

  // Add sender icon based on message type
  const renderSenderIcon = () => {
    if (message.sender === 'system') {
      return (
        <Box display="flex" alignItems="center">
          <FormatListBulletedIcon style={{ marginRight: 8, color: '#5c6bc0' }} />
          <Typography variant="subtitle2" style={{ fontWeight: 'bold', color: '#5c6bc0' }}>
            Plan Accepted
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Add modification indicator if message was modified
  const renderModificationIndicator = () => {
    if (message.sender === 'user' && message.originalText) {
      return (
        <Tooltip title={`Original message: "${message.originalText}"`}>
          <Box display="flex" alignItems="center" justifyContent="flex-end" mt={1} mb={-1}>
            <Typography variant="caption" style={{ marginRight: 4, fontStyle: 'italic', color: '#ffffff80' }}>
              Modified by AI
            </Typography>
            <EditIcon style={{ fontSize: 12, color: '#ffffff80' }} />
          </Box>
        </Tooltip>
      );
    }
    return null;
  };

  // If this is a system message (plan), render it as collapsible
  if (message.sender === 'system') {
    const planInfo = getPlanInfo();
    
    return (
      <div 
        className={`${classes.message} ${classes.systemMessage}`}
        ref={messageRef} // Add ref to message container
      >
        {/* Clickable header */}
        <div 
          className={classes.planCollapsedHeader}
          onClick={handlePlanToggle}
        >
          {renderSenderIcon()}
          <IconButton 
            className={`${classes.planExpandToggle} ${isPlanExpanded ? classes.expanded : ''}`}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlanExpanded(!isPlanExpanded);
            }}
          >
            {isPlanExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </div>
        
        {/* Expandable plan content */}
        <div 
          ref={contentRef}
          className={`${classes.planContent} ${isPlanExpanded ? classes.planExpanded : classes.planCollapsed}`}
          onMouseDown={handleMouseDown}
        >
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
              code: CodeBlock,
              // Use our enhanced details renderer for collapsible sections in the plan
              details: renderEnhancedDetails,
            }}
            className={classes.markdown}
          >
            {message.text}
          </ReactMarkdown>
        </div>
        <Typography variant="caption" className={classes.messageTimestamp}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Typography>
      </div>
    );
  }

  // Regular non-system messages
  return (
    <div
      className={`${classes.message} ${getMessageClass()}`}
      ref={messageRef} // Add ref to message container
    >
      {renderModificationIndicator()}
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          code: CodeBlock,
          // Use our enhanced details renderer for all collapsible sections
          details: renderEnhancedDetails,
        }}
        className={classes.markdown}
      >
        {message.text}
      </ReactMarkdown>
      <Typography variant="caption" className={classes.messageTimestamp}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Typography>
    </div>
  );
}, (prevProps, nextProps) => {
  // Prevent re-render if message hasn't changed
  return prevProps.message === nextProps.message;
});

function MultiAgentHILChat() {
  const classes = useStyles();
  const { state, dispatch } = useHILChat();
  const messageEndRef = useRef(null);
  const messageAreaRef = useRef(null);
  const inputRef = useRef(null);
  const shouldUpdatePositions = useRef(false);

  // Add original message state
  const [originalMessage, setOriginalMessage] = useState('');
  
  // Track when sections are expanded/collapsed
  const [expandedSectionsTracker, setExpandedSectionsTracker] = useState({});
  
  // First, add a state to track if user is at bottom
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Update scroll handling to track if user is at bottom
  const handleScroll = useCallback(
    debounce(({ target }) => {
      const { scrollTop, scrollHeight, clientHeight } = target;
      
      // Check if user is at bottom (with a small threshold)
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
      
      dispatch({ 
        type: ACTIONS.SET_SCROLL_TOP, 
        payload: scrollTop > 200 
      });
      dispatch({ 
        type: ACTIONS.SET_SCROLL_BOTTOM, 
        payload: scrollHeight - scrollTop - clientHeight > 200 
      });
    }, 100),
    [dispatch]
  );

  // Add scroll position effect
  useEffect(() => {
    const messageArea = messageAreaRef.current;
    if (messageArea) {
      messageArea.addEventListener('scroll', handleScroll);
      return () => {
        messageArea.removeEventListener('scroll', handleScroll);
        handleScroll.cancel();
      };
    }
  }, [handleScroll]);

  // Keep the scrollToBottom function for optional use, but don't call it automatically
  const scrollToBottom = useCallback(() => {
    if (messageEndRef.current) {
      // First try scrollIntoView
      messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      // As a backup, also use scrollTop directly after a short delay
      // This helps with very large content that might not scroll properly with scrollIntoView
      setTimeout(() => {
        if (messageAreaRef.current) {
          const scrollHeight = messageAreaRef.current.scrollHeight;
          messageAreaRef.current.scrollTop = scrollHeight;
        }
      }, 100);
    }
  }, [messageEndRef, messageAreaRef]);

  // Make sure we handle even when new messages arrive - just update the isAtBottom state without auto-scrolling
  useEffect(() => {
    // When a new message is added, check if we need to show the scroll button
    if (messageAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageAreaRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
    }
  }, [state.messages.length]);
  
  // Add a CSS class for the scroll button through makeStyles instead of inline styles
  const scrollToBottomButton = (
    <Fade in={!isAtBottom}>
      <IconButton
        onClick={scrollToBottom}
        className={classes.scrollToBottomButton}
        size="small"
      >
        <KeyboardArrowDownIcon />
      </IconButton>
    </Fade>
  );
  
  // Simple tracking of expanded sections with no scrolling side effects
  const handleSectionExpanded = useCallback((messageId, sectionId, isExpanded) => {
    // Simply track which sections are expanded, no scrolling side effects
    setExpandedSectionsTracker(prev => ({
      ...prev,
      [`${messageId}-${sectionId}`]: isExpanded
    }));
  }, []);
  
  // Pass the handler to the Message component
  const renderMessage = useCallback((message) => {
    return (
      <Message 
        key={message.id} 
        message={message} 
        onSectionExpanded={handleSectionExpanded}
      />
    );
  }, [handleSectionExpanded]);
  
  // Loading indicator component
  const TypingIndicator = () => (
    <div className={classes.typingIndicator}>
      <Typography className="loading-header">Processing your message</Typography>
      <Typography className="loading-text">Please wait</Typography>
      <div className="dots">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    </div>
  );

  // Add these state variables at the start of the component
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [promptHelpOpen, setPromptHelpOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planChoice, setPlanChoice] = useState('');
  const [rejectionText, setRejectionText] = useState('');
  const [planContent, setPlanContent] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [modifiedQuestion, setModifiedQuestion] = useState('');
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [messageChoice, setMessageChoice] = useState('modified');

  // Add new state for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSessionId, setEditSessionId] = useState(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editSessionTeam, setEditSessionTeam] = useState('');
  
  // Add delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [deleteSessionName, setDeleteSessionName] = useState('');

  // Add this useEffect at the top level of the component
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get(getApiUrl('CHAT', '/sessions'));
        if (response.data && Array.isArray(response.data)) {
          // Transform the sessions data to include only necessary fields
          const formattedSessions = response.data.map(session => ({
            id: session.session_id,
            name: session.session_name,
            team: session.team_id,
            teamId: session.team_id
          }));
          
          dispatch({ 
            type: ACTIONS.SET_CHAT_SESSIONS, 
            payload: formattedSessions 
          });
        }
      } catch (error) {
        console.error('Error fetching chat sessions:', error);
        dispatch({ 
          type: ACTIONS.SET_ERROR, 
          payload: 'Failed to load chat sessions. Please try again later.' 
        });
      }
    };

    fetchSessions();
  }, []); // Empty dependency array means this runs once when component mounts

  // Add this handler for session clicks
  const handleSessionClick = async (sessionId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      // Fetch session data from the backend
      const response = await axios.get(getApiUrl('CHAT', `/sessions/${sessionId}`));
      
      // Update current session
      dispatch({ type: ACTIONS.SET_CURRENT_SESSION, payload: sessionId });
      
      // If the session has a conversation history, format and set the messages
      if (response.data && response.data.conversation_history) {
        const formattedMessages = response.data.conversation_history.flatMap(entry => {
          const messages = [];
          
          // Add user message
          if (entry.question) {
            messages.push({
              id: uuidv4(),
              text: entry.question,
              sender: 'user',
              timestamp: new Date(entry.timestamp),
              sessionId: sessionId
            });
          }
          
          // Add AI response
          if (entry.response) {
            messages.push({
              id: uuidv4(),
              text: entry.response,
              sender: 'ai',
              timestamp: new Date(entry.timestamp),
              sessionId: sessionId
            });
          }
          
          return messages;
        });
        
        dispatch({ type: ACTIONS.SET_MESSAGES, payload: formattedMessages });
      } else {
        // If no conversation history, clear messages
        dispatch({ type: ACTIONS.SET_MESSAGES, payload: [] });
      }

      // Focus on input field after state updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

    } catch (error) {
      console.error('Error fetching session messages:', error);
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: uuidv4(),
          text: 'Error loading session messages. Please try again.',
          sender: 'system',
          timestamp: new Date(),
          sessionId: sessionId
        }
      });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Modify the handleNewChat function to handle the new session ID
  const handleNewChat = async () => {
    setIsLoadingTeams(true);
    setTeamError('');
    // Reset selectedAgents when starting a new chat
    setSelectedAgents([]);
    try {
      const response = await axios.get(getApiUrl('AGENT', '/api/agents/available_teams/'));
      setAvailableTeams(response.data.teams);
      setDialogOpen(true);
      
      // Focus on input field after dialog closes and new chat is created
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeamError('Failed to load available teams. Please try again.');
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // Modify handleCreateNewChat to handle the session ID
  const handleCreateNewChat = async () => {
    if (!selectedTeam || !newSessionName.trim()) {
      setTeamError('Please select a team and enter a session name');
      return;
    }
    
    const selectedTeamObj = availableTeams.find(team => team.name === selectedTeam);

    try {
        // Get session ID from backend
        const sessionId = await generateSessionId(selectedTeamObj?.id, newSessionName.trim());
    
        if (!sessionId) {
          throw new Error('No session ID received from server');
        }
    
        const newSession = { 
            id: sessionId,
            name: newSessionName.trim(),
            team: selectedTeam,
            teamId: selectedTeamObj?.id
        };
    
        dispatch({ type: ACTIONS.SET_MESSAGES, payload: [] });
        dispatch({ type: ACTIONS.ADD_CHAT_SESSION, payload: newSession });
        dispatch({ type: ACTIONS.SET_CURRENT_SESSION, payload: newSession.id });
    
        setDialogOpen(false);
        setNewSessionName('');
        setSelectedTeam('');
        setTeamError('');
    } catch (error) {
        console.error('Error creating new chat:', error);
        setTeamError('Failed to create new chat session. Please try again.');
    }
  };

  // Modify handleEditSession
  const handleEditSession = async (event, sessionId) => {
    // Prevent event from bubbling up to ListItem
    event.stopPropagation();
    
    try {
      // Find current session
      const currentSession = state.chatSessions.find(s => s.id === sessionId);
      if (currentSession) {
        setEditSessionId(sessionId);
        setEditSessionName(currentSession.name);
        setEditSessionTeam(currentSession.team);
      }
      
      setEditDialogOpen(true);
    } catch (error) {
      console.error('Error preparing session edit:', error);
      setTeamError('Failed to prepare session for editing. Please try again.');
    }
  };

  // Add handler for edit submission
  const handleEditSubmit = async () => {
    if (!editSessionName.trim()) {
      setTeamError('Please enter a session name');
      return;
    }

    try {
      const currentSession = state.chatSessions.find(s => s.id === editSessionId);
      
      await axios.put(getApiUrl('CHAT', `/sessions/${editSessionId}`), {
        session_name: editSessionName.trim(),
        team_id: currentSession.teamId,
        team_name: currentSession.team
      });

      // Update local state
      dispatch({
        type: ACTIONS.UPDATE_CHAT_SESSION,
        payload: {
          id: editSessionId,
          name: editSessionName.trim(),
          team: currentSession.team,
          teamId: currentSession.teamId
        }
      });

      setEditDialogOpen(false);
      setEditSessionId(null);
      setEditSessionName('');
      setEditSessionTeam('');
      setTeamError('');
    } catch (error) {
      console.error('Error updating session:', error);
      setTeamError('Failed to update session. Please try again.');
    }
  };

  const handleDeleteConfirmation = (event, sessionId) => {
    // Stop the click event from bubbling up to the ListItem
    event.stopPropagation();
    
    // Find session name for confirmation message
    const sessionToDelete = state.chatSessions.find(s => s.id === sessionId);
    
    if (sessionToDelete) {
      setDeleteSessionId(sessionId);
      setDeleteSessionName(sessionToDelete.name);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteSession = async () => {
    try {
      console.log(`Attempting to delete session: ${deleteSessionId}`);
      
      // Send delete request to backend
      await axios.delete(getApiUrl('CHAT', `/sessions/${deleteSessionId}`));
      
      console.log(`Successfully deleted session: ${deleteSessionId}`);
      
      // Remove from local state
      dispatch({ 
        type: ACTIONS.DELETE_CHAT_SESSION,
        payload: deleteSessionId 
      });

      // If the deleted session was the current session, clear it
      if (state.currentSessionId === deleteSessionId) {
        dispatch({ 
          type: ACTIONS.SET_CURRENT_SESSION, 
          payload: null 
        });
        dispatch({ 
          type: ACTIONS.SET_MESSAGES, 
          payload: [] 
        });
      }
    } catch (error) {
      console.error(`Error deleting session ${deleteSessionId}:`, error);
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: 'Failed to delete chat session. Please try again later.' 
      });
    } finally {
      // Close the confirmation dialog
      setDeleteDialogOpen(false);
      setDeleteSessionId(null);
      setDeleteSessionName('');
    }
  };

  const handleDownloadSession = (sessionId) => {
    // TODO: Implement download functionality
    console.log(`Download session ${sessionId}`);
  };

  const handleInputChange = (event) => {
    dispatch({ type: ACTIONS.SET_INPUT, payload: event.target.value });
  };

  const handleKeyPress = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSubmit(event);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!state.input.trim()) return;

    // Get the current session - if none exists, create one
    let currentSession = state.chatSessions.find(session => session.id === state.currentSessionId);
    
    // If no current session exists, create one with default team
    if (!currentSession) {
      const defaultTeam = availableTeams[0];
      currentSession = {
        id: uuidv4(),
        name: 'New Chat',
        team: defaultTeam?.name || 'PRC_Team',
        teamId: defaultTeam?.id
      };
      dispatch({ type: ACTIONS.ADD_CHAT_SESSION, payload: currentSession });
      dispatch({ type: ACTIONS.SET_CURRENT_SESSION, payload: currentSession.id });
    }

    // Store the original message
    const userMessage = state.input.trim();
    setOriginalMessage(userMessage);

    // Reset selected agents and form state since this is a new query
    setSelectedAgents([]);
    setRejectionText('');
    setPlanChoice('');

    const messageData = { 
      message: userMessage, 
      team_name: currentSession.team,
      session_id: currentSession.id,
      team_id: currentSession.teamId
    };

    // Add user message to chat first
    dispatch({ 
      type: ACTIONS.ADD_MESSAGE, 
      payload: { 
        id: uuidv4(),
        text: userMessage, 
        sender: 'user', 
        timestamp: new Date(),
        sessionId: currentSession.id
      }
    });
    
    dispatch({ type: ACTIONS.SET_INPUT, payload: '' });
    
    try {
      // Start loading only when making the API call
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      // First, send to init endpoint
      let response = await axios.post(getApiUrl('CHAT', '/chat/refine'), messageData);

      // Handle any errors
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Clear loading before showing dialog
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        
      // Store plan, modified question, and selected agents
      setPlanContent(response.data.plan || response.data.response || response.data.message);
      setPlanNotes(response.data.plan_notes || '');
      setModifiedQuestion(response.data.modified_message || '');
      setMessageChoice('modified');
      
      // Get the selected agents from the response - check both possible field names
      const responseAgents = response.data.agents || response.data.selected_agents || [];
      console.log('Backend recommended agents:', responseAgents);
      setSelectedAgents(responseAgents);
      
      // Fetch all available agents for the team
      if (currentSession && currentSession.teamId) {
        const teamAgents = await fetchTeamAgents(currentSession.teamId);
        setAvailableAgents(teamAgents);
      }
      
      setPlanDialogOpen(true);
      return;

    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: uuidv4(),
          text: `Error: Failed to get response from AI - ${error.message}`, 
          sender: 'system', 
          timestamp: new Date() 
        }
      });
    } finally {
      // Clear loading state if we're not showing the dialog
      if (!planDialogOpen) {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    }
  };

  // Update the fetchTeamAgents function to filter only team agents
  const fetchTeamAgents = async (teamId) => {
    try {
      // First, get the complete team details with agent names using list_teams
      const teamsListResponse = await axios.get(getApiUrl('AGENT', '/api/agents/list_teams/'));
      if (!teamsListResponse.data || !teamsListResponse.data.teams) {
        throw new Error('Failed to retrieve teams data');
      }
      
      // Find our specific team with full details including agent names
      const teamDetails = teamsListResponse.data.teams.find(team => team.unique_id === teamId);
      if (!teamDetails) {
        console.error(`Team with ID ${teamId} not found in complete teams list`);
        return [];
      }
      
      // Get the agent names for this team
      const teamAgentNames = teamDetails.agents || [];
      console.log(`Team ${teamDetails.name} has ${teamAgentNames.length} agents:`, teamAgentNames);
      
      // Fetch all available agents
      const agentsResponse = await axios.get(getApiUrl('AGENT', '/api/agents/list_agents/'));
      if (!agentsResponse.data || !agentsResponse.data.agents) {
        throw new Error('Failed to retrieve agents data');
      }
      
      // Filter agents to only those in the team
      const teamAgents = agentsResponse.data.agents.filter(agent => 
        teamAgentNames.includes(agent.name)
      );
      
      console.log(`Filtered ${teamAgents.length} agents for team ${teamDetails.name}`);
      return teamAgents;
    } catch (error) {
      console.error('Error fetching team agents:', error);
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: 'Failed to load team agents. Please try again later.' 
      });
      return [];
    }
  };

  // Update the handlePlanSubmit function to modify the last user message if needed
  const handlePlanSubmit = async () => {
    if (planChoice === 'reject' && !rejectionText.trim()) {
      return;
    }

    //Maybe add the plan message to the chat if plan is accepted
    const currentSession = state.chatSessions.find(session => session.id === state.currentSessionId);
    
    // Determine which message to send based on user selection
    const messageToSend = messageChoice === 'original' ? originalMessage : modifiedQuestion;
    
    // Log the selected agents before sending to backend for debugging
    console.log('Submitting with user-selected agents:', selectedAgents);
    
    const messageData = {
      message: messageToSend,
      plan: planContent,
      plan_notes: planNotes,
      original_message: originalMessage,
      team_name: currentSession.team,
      session_id: currentSession.id,
      team_id: currentSession.teamId,
      selected_agents: selectedAgents,
      agents: selectedAgents, // Add this field as well for compatibility
      comments: rejectionText.trim()
    };

    // Close dialog and show loading first
    setPlanDialogOpen(false);
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

    // If accepting the plan, add it to the chat history
    if (planChoice === 'accept') {
      // If using modified question, update the last user message to reflect what was actually processed
      if (messageChoice === 'modified' && modifiedQuestion !== originalMessage) {
        // Find the last user message in the chat history
        const userMessages = state.messages.filter(msg => msg.sender === 'user');
        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1];
          
          // Update the message text to show the modified question
          dispatch({
            type: ACTIONS.UPDATE_MESSAGE,
            payload: {
              id: lastUserMessage.id,
              updates: { 
                text: modifiedQuestion,
                originalText: originalMessage // Store original text for reference if needed
              }
            }
          });
        }
      }
      
      // Create a formatted version of the plan for the chat
      const selectedAgentsText = selectedAgents.length > 0 
        ? `\n\n### Selected Agents\n${selectedAgents.map(agent => `- ${agent}`).join('\n')}` 
        : '';
      
      const messageTypeInfo = messageChoice === 'original' 
        ? '(Original user message)' 
        : '(AI-modified message)';
      
      const notesSection = planNotes 
        ? `\n\n### Plan Notes\n${planNotes}` 
        : '';
      
      const messageText = `## Execution Plan ${messageTypeInfo}\n\n### Question\n${messageToSend}${selectedAgentsText}\n\n### Plan Details\n${planContent}${notesSection}`;
      
      // Add the plan to the chat as a system message
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: uuidv4(),
          text: messageText, 
          sender: 'system', 
          timestamp: new Date(),
          sessionId: currentSession.id
        }
      });
    }

    try {
      const endpoint = planChoice === 'accept' ? '/chat/process' : '/chat/refine';
      const response = await axios.post(getApiUrl('CHAT', endpoint), messageData);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // If this is a refine response, show the plan dialog
      if (endpoint === '/chat/refine') {
        // Clear loading before showing dialog
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        
        setPlanContent(response.data.plan || response.data.response || response.data.message);
        setPlanNotes(response.data.plan_notes || '');
        setModifiedQuestion(response.data.modified_message || '');
        
        // Get the selected agents from the response - check both field names
        const responseAgents = response.data.agents || response.data.selected_agents || [];
        console.log('Backend responded with agents:', responseAgents);
        
        // If the user pressed "reject", we should use the backend's new recommendations
        // If the user pressed "accept", we leave the current selections
        if (planChoice === 'reject') {
          setSelectedAgents(responseAgents);
        }
        
        // Clear rejection text for the new plan dialog
        setRejectionText('');
        
        setPlanDialogOpen(true);
        return;
      }

      // Otherwise, display the response in chat
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: uuidv4(),
          text: response.data.response || response.data.message, 
          sender: 'ai', 
          timestamp: new Date(),
          sessionId: currentSession.id
        }
      });

      dispatch({ type: ACTIONS.SET_LOADING, payload: false });

    } catch (error) {
      console.error('Error submitting plan choice:', error);
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: uuidv4(),
          text: `Error: Failed to process plan - ${error.message}`, 
          sender: 'system', 
          timestamp: new Date() 
        }
      });
    } finally {
      if (!planDialogOpen) { // Only clean up if we're not showing the plan dialog
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        setPlanChoice('');
        setRejectionText('');
      }
    }
  };

  const handlePromptHelpOpen = () => {
    setPromptHelpOpen(true);
  };

  const handlePromptHelpClose = () => {
    setPromptHelpOpen(false);
  };

  const generateSessionId = async (teamId, sessionName) => {
    try {
      const response = await axios.post(getApiUrl('CHAT', '/chat/generate_session_id'), {
        team_id: teamId,
        session_name: sessionName
      });
      return response.data.session_id;
    } catch (error) {
      console.error('Error generating session ID:', error);
      throw error;
    }
  };

  const toggleFullscreen = () => {
    dispatch({ type: ACTIONS.SET_FULLSCREEN, payload: !state.isFullscreen });
  };

  return (
    <>
      <Container 
        className={`${classes.root} ${state.isFullscreen ? classes.fullscreen : ''}`}
        maxWidth={false}
      >
        <div className={classes.chatContainer}>
          {!state.isFullscreen && (
            <Paper className={classes.sessionsList} elevation={3}>
              <Button 
                variant="contained" 
                color="primary" 
                className={classes.newChatButton}
                onClick={handleNewChat}
              >
                Start New Chat Session
              </Button>
              <List>
                {state.chatSessions.map((session) => (
                  <React.Fragment key={session.id}>
                    <ListItem 
                      button 
                      className={classes.chatSessionItem}
                      selected={session.id === state.currentSessionId}
                      onClick={() => handleSessionClick(session.id)}
                    >
                      <ListItemText primary={session.name} />
                      <div className={classes.sessionActions}>
                        <Tooltip title="Edit">
                          <IconButton 
                            edge="end" 
                            aria-label="edit" 
                            onClick={(e) => handleEditSession(e, session.id)}
                            className={classes.sessionActionButton}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={(e) => handleDeleteConfirmation(e, session.id)}
                            className={classes.sessionActionButton}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton edge="end" aria-label="download" onClick={() => handleDownloadSession(session.id)} className={classes.sessionActionButton}>
                            <GetAppIcon />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          <Paper className={`${classes.chatArea} ${state.isFullscreen ? classes.fullscreen : ''}`} elevation={3}>
            <div className={classes.buttonBar}>
              <Typography className={classes.sessionName}>
                {state.isFullscreen && state.chatSessions.find(session => session.id === state.currentSessionId)?.name}
              </Typography>
              <div className={classes.buttonBarActions}>
                <Typography 
                  className={classes.fullscreenText}
                  onClick={toggleFullscreen}
                  variant="body2"
                >
                  FULLSCREEN
                </Typography>
                <IconButton
                  className={classes.fullscreenButton}
                  onClick={toggleFullscreen}
                  size="small"
                >
                  {state.isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </div>
            </div>
            <div className={classes.messageArea} ref={messageAreaRef} onScroll={handleScroll}>
              {state.messages.map(renderMessage)}
              <div ref={messageEndRef} />
            </div>

            {state.isLoading && <TypingIndicator />}

            <form onSubmit={handleSubmit} className={classes.inputArea}>
              <IconButton 
                onClick={handlePromptHelpOpen}
                size="small"
                className={classes.inputHelpIcon}
                title="Prompt Engineering Tips"
              >
                <HelpOutlineIcon />
              </IconButton>
              <TextField
                  inputRef={inputRef}
                  className={classes.input}
                  variant="outlined"
                  placeholder="Type your message here... (Ctrl+Enter to send)"
                  value={state.input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  multiline
                  minRows={1}
                  maxRows={15}
                  fullWidth
                  InputProps={{
                    style: { 
                      maxHeight: '300px',
                      overflow: 'hidden' // Hide overflow on the Input component wrapper
                    }
                  }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                endIcon={<SendIcon />}
              >
                Send
              </Button>
            </form>
          </Paper>
        </div>

        {/* Session Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        >
          <DialogTitle>Create New Chat Session</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                autoFocus
                margin="dense"
                label="Session Name*"
                fullWidth
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                error={teamError && !newSessionName.trim()}
                helperText={teamError && !newSessionName.trim() ? 'Session name is required' : ''}
              />
              <FormControl fullWidth>
                <InputLabel>Select Team*</InputLabel>
                <Select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  error={teamError && !selectedTeam}
                >
                  {isLoadingTeams ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} /> Loading teams...
                    </MenuItem>
                  ) : (
                    availableTeams.map(team => (
                      <MenuItem key={team.id} value={team.name}>
                        {team.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {teamError && !selectedTeam && (
                  <Typography color="error" variant="caption">
                    Please select a team
                  </Typography>
                )}
              </FormControl>
              {teamError && (
                <Typography color="error" variant="body2">
                  {teamError}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setDialogOpen(false);
              setTeamError('');
              setNewSessionName('');
              setSelectedTeam('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNewChat}
              color="primary"
              variant="contained"
              disabled={isLoadingTeams}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Plan Dialog */}
        <Dialog
          open={planDialogOpen}
          onClose={() => {}}
          maxWidth="md"
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle>Review Plan</DialogTitle>
          <DialogContent>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Agents</Typography>
              <Paper elevation={1} className={classes.agentsBox}>
                <Box 
                  display="flex" 
                  flexWrap="wrap" 
                  justifyContent="flex-start" 
                  alignItems="flex-start"
                  gap={2}
                  p={2}
                >
                  {availableAgents.length > 0 ? (
                    availableAgents.map((agent) => (
                      <Box 
                        key={agent.id} 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center"
                        width="120px"
                        mb={2}
                      >
                        <PersonIcon style={{ fontSize: 40, color: '#757575', marginBottom: '8px' }} />
                        <Typography variant="body2" align="center" style={{ marginBottom: '4px' }}>
                          {agent.name || agent.agent_name || "Unnamed Agent"}
                        </Typography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={
                                // Since selected agents is a string array of names, check if the current agent's name is in it
                                selectedAgents.includes(agent.name)
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add agent name (not ID) to selected agents
                                  setSelectedAgents(prev => [...prev, agent.name]);
                                } else {
                                  // Remove agent name from selected agents
                                  setSelectedAgents(prev => prev.filter(name => name !== agent.name));
                                }
                              }}
                              color="primary"
                              size="small"
                            />
                          }
                          label="Select"
                        />
                      </Box>
                    ))
                  ) : (
                    <Box p={2}>
                      <Typography variant="body2" color="textSecondary">
                        No agents available for this team
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>

            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Proposed Plan</Typography>
              <Paper elevation={1} className={classes.planBox}>
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code: CodeBlock
                  }}
                >
                  {planContent}
                </ReactMarkdown>
              </Paper>
            </Box>
            
            {planNotes && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>Plan Notes</Typography>
                <Paper elevation={1} className={classes.planBox}>
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      code: CodeBlock
                    }}
                  >
                    {planNotes}
                  </ReactMarkdown>
                </Paper>
              </Box>
            )}
            
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Message Selection</Typography>
              <Paper elevation={1} className={classes.modifiedQuestionBox}>
                <Box mb={2}>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={messageChoice === 'original'}
                        onChange={() => setMessageChoice('original')}
                        color="primary"
                      />
                    }
                    label="Original Message"
                  />
                  <Typography 
                    variant="body1" 
                    style={{ 
                      padding: '8px',
                      backgroundColor: messageChoice === 'original' ? '#f0f7ff' : 'transparent',
                      borderRadius: '4px'
                    }}
                  >
                    {originalMessage}
                  </Typography>
                </Box>
                
                {modifiedQuestion && (
                  <Box>
                    <FormControlLabel
                      control={
                        <Radio
                          checked={messageChoice === 'modified'}
                          onChange={() => setMessageChoice('modified')}
                          color="primary"
                        />
                      }
                      label="Modified Message"
                    />
                    <Typography 
                      variant="body1" 
                      style={{ 
                        padding: '8px',
                        backgroundColor: messageChoice === 'modified' ? '#f0f7ff' : 'transparent',
                        borderRadius: '4px'
                      }}
                    >
                      {modifiedQuestion}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>

            <RadioGroup
              value={planChoice}
              onChange={(e) => setPlanChoice(e.target.value)}
            >
              <FormControlLabel 
                value="accept" 
                control={<Radio color="primary" />} 
                label="Accept this plan" 
              />
              <FormControlLabel 
                value="reject" 
                control={<Radio color="primary" />} 
                label="Reject and provide feedback" 
              />
            </RadioGroup>
            <Fade in={planChoice === 'reject'}>
              <div>
                {planChoice === 'reject' && (
                  <TextField
                    className={classes.feedbackField}
                    multiline
                    minRows={3}
                    variant="outlined"
                    fullWidth
                    label="Please explain what you would like to improve"
                    value={rejectionText}
                    onChange={(e) => setRejectionText(e.target.value)}
                    error={planChoice === 'reject' && !rejectionText.trim()}
                    helperText={planChoice === 'reject' && !rejectionText.trim() ? 'Feedback is required when rejecting' : ''}
                  />
                )}
              </div>
            </Fade>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePlanSubmit}
              color="primary"
              variant="contained"
              disabled={!planChoice || (planChoice === 'reject' && !rejectionText.trim())}
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Prompt Help Dialog */}
        <Dialog
          open={promptHelpOpen}
          onClose={handlePromptHelpClose}
          className={classes.promptHelpDialog}
          aria-labelledby="prompt-help-dialog-title"
        >
          <DialogTitle id="prompt-help-dialog-title" className={classes.dialogTitle}>
            <Typography variant="h6">Effective Prompt Engineering Tips</Typography>
            <IconButton
              aria-label="close"
              className={classes.closeButton}
              onClick={handlePromptHelpClose}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent className={classes.dialogContent}>
            <div className={classes.promptTip}>
              <LightbulbIcon className={classes.tipIcon} />
              <div>
                <Typography><strong>Be Specific and Clear</strong></Typography>
                <Typography>
                  Instead of "How to make a website?", try "What are the key steps to create a responsive website using React and Material-UI for a small business?"
                </Typography>
              </div>
            </div>
            <div className={classes.promptTip}>
              <FormatListBulletedIcon className={classes.tipIcon} />
              <div>
                <Typography><strong>Break Down Complex Questions</strong></Typography>
                <Typography>
                  For complex topics, break your query into smaller, focused questions. This helps get more detailed and accurate responses.
                </Typography>
              </div>
            </div>
            <div className={classes.promptTip}>
              <SchoolIcon className={classes.tipIcon} />
              <div>
                <Typography><strong>Provide Context</strong></Typography>
                <Typography>
                  Include relevant background information and your level of expertise in the topic for more tailored responses.
                </Typography>
              </div>
            </div>
            <div className={classes.promptTip}>
              <TuneIcon className={classes.tipIcon} />
              <div>
                <Typography><strong>Iterate and Refine</strong></Typography>
                <Typography>
                  If the response isn't quite what you need, refine your question or ask for clarification on specific points.
                </Typography>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handlePromptHelpClose} 
              color="primary"
              variant="contained"
              style={{ borderRadius: '20px', textTransform: 'none' }}
            >
              Got it
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditSessionId(null);
            setEditSessionName('');
            setTeamError('');
          }}
        >
          <DialogTitle>Edit Chat Session</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                autoFocus
                margin="dense"
                label="Session Name"
                fullWidth
                value={editSessionName}
                onChange={(e) => setEditSessionName(e.target.value)}
                error={teamError && !editSessionName.trim()}
                helperText={teamError && !editSessionName.trim() ? 'Session name is required' : ''}
              />
              <Typography variant="body2" color="textSecondary">
                Note: The team associated with this session cannot be changed.
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                style={{ 
                  fontWeight: 600, 
                  marginTop: '4px', 
                  backgroundColor: '#f0f7ff', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  display: 'inline-block'
                }}
              >
                Current team: {editSessionTeam}
              </Typography>
              {teamError && (
                <Typography color="error" variant="body2">
                  {teamError}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setEditDialogOpen(false);
              setEditSessionId(null);
              setEditSessionName('');
              setTeamError('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              color="primary"
              variant="contained"
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeleteSessionId(null);
            setDeleteSessionName('');
          }}
        >
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete the chat session "{deleteSessionName}"?
            </Typography>
            <Typography variant="body2" color="error" style={{ marginTop: '12px' }}>
              This action cannot be undone. All chat history in this session will be permanently deleted.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteSessionId(null);
                setDeleteSessionName('');
              }}
              color="primary"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteSession}
              color="secondary"
              variant="contained"
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Snackbar */}
        <Snackbar
          open={Boolean(state.error)}
          autoHideDuration={6000}
          onClose={() => dispatch({ type: ACTIONS.SET_ERROR, payload: null })}
        >
          <Alert
            onClose={() => dispatch({ type: ACTIONS.SET_ERROR, payload: null })}
            severity="error"
            elevation={6}
            variant="filled"
          >
            {state.error}
          </Alert>
        </Snackbar>

        {/* Scroll-to-bottom Button */}
        {scrollToBottomButton}

      </Container>
    </>
  );
}

// Single export at the end
export default memo(MultiAgentHILChat);