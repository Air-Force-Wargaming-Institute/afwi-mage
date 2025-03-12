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
  ListItemIcon
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
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      transform: 'translateY(-1px)',
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
    '& pre': {
      margin: '8px 0',
      borderRadius: '4px',
      overflow: 'auto',
    },
    '& code': {
      fontFamily: 'monospace',
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
  },
  markdownDetails: {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '& summary': {
      fontWeight: 600,
      cursor: 'pointer',
      padding: '0.5em 0',
      outline: 'none',
      '&:hover': {
        color: theme.palette.primary.main,
      },
    },
    '& details[open] summary': {
      color: theme.palette.primary.main,
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

// Memoized Message Component
const Message = memo(({ message }) => {
  const classes = useStyles();
  const [expandedSections, setExpandedSections] = useState({});

  const handleToggle = (id) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div
      className={`${classes.message} ${
        message.sender === 'user' ? classes.userMessage : classes.aiMessage
      }`}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          code: CodeBlock,
          details: ({ node, children, ...props }) => {
            // Generate a stable ID using message ID and detail index
            const detailsIndex = node.position ? node.position.start.line : Math.random();
            const id = `message-${message.id}-details-${detailsIndex}`;

            return (
              <details
                {...props}
                open={expandedSections[id] || false}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  handleToggle(id);
                }}
                className={classes.markdownDetails}
              >
                {children}
              </details>
            );
          },
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
  
  // Update scroll handling to use useCallback with debounce
  const handleScroll = useCallback(
    debounce(({ target }) => {
      const { scrollTop, scrollHeight, clientHeight } = target;
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

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (state.messages.length > 0) {
      scrollToBottom();
    }
  }, [state.messages]);

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
      setSelectedAgents(response.data.selected_agents || []);
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

  // Add handler for plan dialog submission
  const handlePlanSubmit = async () => {
    if (planChoice === 'reject' && !rejectionText.trim()) {
      return;
    }

    //Maybe add the plan message to the chat if plan is accepted

    const currentSession = state.chatSessions.find(session => session.id === state.currentSessionId);
    
    // Determine which message to send based on user selection
    const messageToSend = messageChoice === 'original' ? originalMessage : modifiedQuestion;
    
    const messageData = {
      message: messageToSend,
      plan: planContent,
      plan_notes: planNotes,
      original_message: originalMessage,
      team_name: currentSession.team,
      session_id: currentSession.id,
      team_id: currentSession.teamId,
      selected_agents: selectedAgents,
      comments: rejectionText.trim()
    };

    // Close dialog and show loading first
    setPlanDialogOpen(false);
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

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
        setSelectedAgents(response.data.selected_agents || []);
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
              {state.messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
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
            {selectedAgents.length > 0 && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>Selected Agents</Typography>
                <Paper elevation={1} className={classes.agentsBox}>
                  <List dense>
                    {selectedAgents.map((agent, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <PersonIcon className={classes.agentIcon} />
                        </ListItemIcon>
                        <ListItemText primary={agent} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

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

      </Container>
    </>
  );
}

export default memo(MultiAgentHILChat); 