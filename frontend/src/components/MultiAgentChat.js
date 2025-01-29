import React, { useRef, useEffect, useState, useCallback } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SchoolIcon from '@mui/icons-material/School';
import TuneIcon from '@mui/icons-material/Tune';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Fade from '@material-ui/core/Fade';
import axios from 'axios';
import { getApiUrl } from '../config';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import robotIcon from '../assets/robot-icon.png';
import { useChat, ACTIONS } from '../contexts/ChatContext';
import ReplayIcon from '@mui/icons-material/Replay';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { debounce } from 'lodash';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    height: 'calc(80vh - 64px)',
    marginTop: '10px',
  },
  chatContainer: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
    borderRadius: '10px',
    height: '100%',
  },
  chatLog: {
    width: '30%',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    marginRight: theme.spacing(2),
  },
  chatArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
  },
  messageArea: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
      padding: theme.spacing(1.5, 2),
    },
    '& .MuiOutlinedInput-input': {
      lineHeight: '1.5',
      padding: theme.spacing(0.5, 1),
      marginLeft: theme.spacing(0.5),
    },
    '& .MuiOutlinedInput-multiline': {
      padding: theme.spacing(0.5),
    },
    '& textarea': {
      overflow: 'hidden !important',
    },
  },
  newChatButton: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    width: '60%',
    alignSelf: 'center',
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
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
    borderBottomRightRadius: '4px',
    '& .copyButton': {
      color: '#ffffff',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    '& .messageContent': {
      color: '#ffffff !important',
    },
    '& div': {
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
  chatSessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
  },
  sessionActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fullscreenButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1000,
  },
  fullscreen: {
    position: 'fixed',
    top: '0px',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1300,
    maxHeight: 'calc(100vh)',
  },
  buttonBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  agentsText: {
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: '1.1rem',
  },
  markdown: {
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      margin: '0.5em 0 0.3em',
      lineHeight: 1,
      color: theme.palette.text.primary,
      fontSize: '1.1rem',
    },
    '& p': {
      margin: '0.3em 0',
      color: theme.palette.text.primary,
      lineHeight: 1.3,
      fontSize: '1rem',
    },
    '& ul, & ol': {
      margin: '0.3em 0',
      paddingLeft: theme.spacing(3),
      color: theme.palette.text.primary,
      '& li': {
        marginTop: '0em',
        marginBottom: '0.1em',
        lineHeight: 1.3,
      },
      '& li:last-child': {
        marginBottom: 0,
      },
    },
    '& blockquote': {
      margin: '0.8em 0',
      padding: '0.4em 1em',
      borderLeft: `4px solid ${theme.palette.grey[300]}`,
      backgroundColor: theme.palette.grey[50],
      color: theme.palette.text.secondary,
    },
    '& hr': {
      margin: '.5em 0',
    },
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    '& code': {
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
      padding: '0.2em 0.4em',
      borderRadius: 3,
      fontSize: '85%',
      color: theme.palette.text.primary,
    },
    '& pre': {
      margin: '0.5em 0',
      padding: theme.spacing(1),
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      overflow: 'auto',
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      margin: '0.5em 0',
      color: theme.palette.text.primary,
    },
    '& th, & td': {
      border: `1px solid ${theme.palette.grey[300]}`,
      padding: '0.4em',
    },
    '& a': {
      color: theme.palette.primary.main,
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  },
  messageContent: {
    fontSize: '1rem',
    lineHeight: 1.5,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
    '.userMessage & ': {
      color: '#ffffff !important',
    },
  },
  messageWrapper: {
    position: 'relative',
    width: '100%',
  },
  messageContainer: {
    position: 'relative',
    width: '100%',
    padding: theme.spacing(1),
    '&:hover .copyButton': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(0.5),
    gap: theme.spacing(0.5),
  },
  timestamp: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    opacity: 0.8,
    marginRight: 'auto',
  },
  userMessageTimestamp: {
    color: '#ffffff !important',
    opacity: 0.7,
  },
  copyButton: {
    padding: 0,
    minWidth: '32px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      opacity: 1,
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '18px',
      margin: 'auto',
    },
  },
  agentsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  helpIcon: {
    color: theme.palette.text.secondary,
    fontSize: '1.1rem',
    cursor: 'pointer',
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  tooltip: {
    maxWidth: 450,
    fontSize: '0.9rem',
    padding: theme.spacing(2),
    '& h6': {
      marginBottom: theme.spacing(1),
      fontWeight: 600,
    },
    '& ul': {
      margin: theme.spacing(1, 0),
      paddingLeft: theme.spacing(2),
    },
    '& li': {
      marginBottom: theme.spacing(1),
    },
  },
  helpDialog: {
    '& .MuiDialog-paper': {
      maxWidth: 600,
      padding: theme.spacing(2),
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(2),
    color: theme.palette.primary.main,
    '& h6': {
      fontWeight: 600,
      fontSize: '1.2rem',
    },
  },
  dialogContent: {
    padding: theme.spacing(2),
    '& ul': {
      paddingLeft: theme.spacing(2),
      marginTop: theme.spacing(1),
    },
    '& li': {
      marginBottom: theme.spacing(2),
    },
    '& .MuiTypography-root': {
      color: theme.palette.text.primary,
      lineHeight: 1.6,
    },
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
    '&:hover': {
      color: theme.palette.primary.main,
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  agentListItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    borderRadius: '8px',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
  },
  robotIcon: {
    width: '24px',
    height: '30px',
    marginTop: '3px',
    filter: 'invert(1)',
  },
  agentDescription: {
    flex: 1,
    '& strong': {
      color: theme.palette.primary.main,
      fontWeight: 600,
    },
  },
  inputHelpIcon: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(1),
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  promptHelpDialog: {
    '& .MuiDialog-paper': {
      maxWidth: 700,  // Slightly wider for prompt guidance
      padding: theme.spacing(2),
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
  },
  promptTip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: '8px',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  tipIcon: {
    color: theme.palette.primary.main,
    marginTop: '2px',
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[100],
    borderRadius: '30px',
    margin: theme.spacing(1, 0),
    maxWidth: '410px',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: '30px',
      background: `linear-gradient(90deg, 
        transparent 0%,
        ${theme.palette.primary.main} 50%,
        transparent 100%)`,
      backgroundSize: '200% 100%',
      backgroundRepeat: 'no-repeat',
      animation: '$borderZip 3s linear infinite',
      opacity: 0.1,
      clipPath: `
        polygon(
          30px 0,
          calc(100% - 30px) 0,
          100% 0,
          100% 30px,
          100% calc(100% - 30px),
          100% 100%,
          calc(100% - 30px) 100%,
          30px 100%,
          0 100%,
          0 calc(100% - 30px),
          0 30px,
          0 0
        )
      `,
      border: '2px solid',
    },
    '& .loading-text': {
      color: theme.palette.text.secondary,
      fontSize: '1rem',
      lineHeight: 1.4,
      textAlign: 'center',
      fontWeight: 500,
      marginBottom: theme.spacing(1),
    },
    '& .loading-header': {
      color: theme.palette.text.primary,
      fontSize: '1.2rem',
      fontWeight: 600,
      textAlign: 'center',
      marginBottom: theme.spacing(1),
    },
    '& .dots': {
      display: 'flex',
      gap: '4px',
      justifyContent: 'center',
    },
    '& .dot': {
      width: '8px',
      height: '8px',
      backgroundColor: theme.palette.grey[400],
      borderRadius: '50%',
      animation: '$bounce 3s infinite ease-in-out both',
      '&:nth-child(1)': {
        animationDelay: '-0.32s',
      },
      '&:nth-child(2)': {
        animationDelay: '-0.16s',
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
  '@keyframes pulseBorder': {
    '0%': {
      borderColor: 'rgba(0, 0, 0, 0.05)',
      boxShadow: '0 0 0 0 rgba(0, 0, 0, 0.05)',
    },
    '50%': {
      borderColor: 'rgba(0, 0, 0, 0.15)',
      boxShadow: '0 0 0 4px rgba(0, 0, 0, 0.05)',
    },
    '100%': {
      borderColor: 'rgba(0, 0, 0, 0.05)',
      boxShadow: '0 0 0 0 rgba(0, 0, 0, 0.05)',
    },
  },
  '@keyframes borderZip': {
    '0%': {
      backgroundPosition: '200% 0',
    },
    '100%': {
      backgroundPosition: '-200% 0',
    },
  },
  scrollTopButton: {
    position: 'absolute',
    right: theme.spacing(2),
    bottom: theme.spacing(16),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
    width: '40px',
    height: '40px',
    padding: 0,
    border: '1px solid rgba(0, 0, 0, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
    },
    zIndex: 1000,
    '& .MuiSvgIcon-root': {
      fontSize: '24px',
      margin: 0,
      padding: 0,
    },
  },
  scrollBottomButton: {
    position: 'absolute',
    right: theme.spacing(2),
    bottom: theme.spacing(10),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
    width: '40px',
    height: '40px',
    padding: 0,
    border: '1px solid rgba(0, 0, 0, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: theme.palette.grey[100],
    },
    zIndex: 1000,
    '& .MuiSvgIcon-root': {
      fontSize: '24px',
      margin: 0,
      padding: 0,
    },
  },
  retryButton: {
    marginRight: theme.spacing(1),
    '&:hover': {
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
  },
  bookmarkTrack: {
    position: 'absolute',
    right: 0,
    top: '64px',
    height: 'calc(100% - 64px)',
    width: '10px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderLeft: '1px solid rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  bookmarkTick: {
    position: 'absolute',
    right: 0,
    width: '20px',
    height: '8px',
    backgroundColor: theme.palette.primary.main,
    cursor: 'pointer',
    transform: 'translateY(-50%)',
    transition: 'all 0.2s ease',
    '&:hover': {
      width: '32px',
      backgroundColor: theme.palette.primary.dark,
      height: '12px',
      borderRadius: '4px 0 0 4px',
    },
  },
  bookmarkButton: {
    padding: 0,
    minWidth: '32px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      opacity: 1,
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '18px',
      margin: 'auto',
    },
  },
  bookmarkTooltip: {
    maxWidth: 300,
    fontSize: '0.875rem',
  },
}));

const MessageContent = ({ content, isUser, timestamp, sender, onRetry, messageId, onBookmark, isBookmarked }) => {
  const classes = useStyles();
  const contentRef = useRef(null);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    if (contentRef.current) {
      navigator.clipboard.writeText(contentRef.current.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  const isError = sender === 'system' && textContent.includes('Error:');

  const renderedContent = isUser ? (
    <div ref={contentRef} className={classes.messageContent}>{textContent}</div>
  ) : (
    <div ref={contentRef}>
      <ReactMarkdown
        className={`${classes.markdown} ${classes.messageContent}`}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language) {
              return (
                <SyntaxHighlighter
                  style={materialDark}
                  language={language}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          }
        }}
      >
        {textContent}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className={classes.messageContainer}>
      {renderedContent}
      <div className={classes.messageFooter}>
        <Typography 
          variant="caption" 
          className={`${classes.timestamp} ${isUser ? classes.userMessageTimestamp : ''}`}
        >
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </Typography>
        {isError && onRetry && (
          <Tooltip title="Retry query">
            <IconButton
              className={classes.retryButton}
              size="small"
              onClick={onRetry}
              color="secondary"
            >
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        )}
        {!isError && (
          <>
            <Tooltip title={copied ? "Copied!" : "Copy message"}>
              <IconButton 
                className={`${classes.copyButton} copyButton`}
                size="small"
                onClick={handleCopy}
                centerRipple
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            {!isUser && (
              <Tooltip title={isBookmarked ? "Remove bookmark" : "Add bookmark"}>
                <IconButton
                  className={classes.bookmarkButton}
                  size="small"
                  onClick={() => onBookmark(messageId)}
                >
                  {isBookmarked ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function MultiAgentChat() {
  const classes = useStyles();
  const { state, dispatch } = useChat();
  console.log('MultiAgentChat - Current State:', state);

  const {
    input,
    messages,
    chatSessions,
    isLoading,
    isFullscreen,
    helpDialogOpen,
    promptHelpOpen,
    showScrollTop,
    showScrollBottom
  } = state;

  const messageEndRef = useRef(null);
  const messageAreaRef = useRef(null);

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
    if (!input.trim()) return;

    dispatch({ 
      type: ACTIONS.ADD_MESSAGE, 
      payload: { 
        id: Date.now(),
        text: input.trim(), 
        sender: 'user', 
        timestamp: new Date() 
      }
    });
    
    dispatch({ type: ACTIONS.SET_INPUT, payload: '' });
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

    try {
      const response = await axios.post(getApiUrl('CHAT', '/chat'), { message: input.trim() });

      const aiResponse = Array.isArray(response.data.response) 
        ? response.data.response[0] 
        : (typeof response.data.response === 'string' 
            ? response.data.response 
            : JSON.stringify(response.data.response));

      dispatch({ 
        type: ACTIONS.SET_MESSAGES, 
        payload: messages.filter(msg => 
          !(msg.sender === 'system' && msg.text.includes('Error:'))
        ) 
      });

      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: Date.now(),
          text: aiResponse, 
          sender: 'ai', 
          timestamp: new Date() 
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: Date.now(),
          text: 'Error: Failed to get response from AI', 
          sender: 'system', 
          timestamp: new Date() 
        }
      });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  const handleNewChat = () => {
    const newSession = { id: chatSessions.length + 1, name: `New Chat ${chatSessions.length + 1}` };
    dispatch({ type: ACTIONS.ADD_CHAT_SESSION, payload: newSession });
    dispatch({ type: ACTIONS.SET_MESSAGES, payload: [] });
  };

  const handleEditSession = (sessionId) => {
    // TODO: Implement edit functionality
    console.log(`Edit session ${sessionId}`);
  };

  const handleDeleteSession = (sessionId) => {
    // TODO: Implement delete functionality
    console.log(`Delete session ${sessionId}`);
  };

  const handleDownloadSession = (sessionId) => {
    // TODO: Implement download functionality
    console.log(`Download session ${sessionId}`);
  };

  const toggleFullscreen = () => {
    dispatch({ type: ACTIONS.SET_FULLSCREEN, payload: !isFullscreen });
  };

  const handleHelpOpen = () => {
    dispatch({ type: ACTIONS.SET_HELP_DIALOG, payload: true });
  };

  const handleHelpClose = () => {
    dispatch({ type: ACTIONS.SET_HELP_DIALOG, payload: false });
  };

  const handlePromptHelpOpen = () => {
    dispatch({ type: ACTIONS.SET_PROMPT_HELP, payload: true });
  };

  const handlePromptHelpClose = () => {
    dispatch({ type: ACTIONS.SET_PROMPT_HELP, payload: false });
  };

  const handleScroll = (event) => {
    const element = event.target;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    dispatch({ type: ACTIONS.SET_SCROLL_TOP, payload: scrollTop > 500 });
    dispatch({ type: ACTIONS.SET_SCROLL_BOTTOM, payload: scrollTop < scrollHeight - clientHeight - 100 });
  };

  const scrollToTop = () => {
    messageAreaRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRetry = async (failedMessage) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

    try {
      const response = await axios.post(getApiUrl('CHAT', '/chat'), { 
        message: failedMessage 
      });

      const aiResponse = Array.isArray(response.data.response) 
        ? response.data.response[0] 
        : (typeof response.data.response === 'string' 
            ? response.data.response 
            : JSON.stringify(response.data.response));

      dispatch({ 
        type: ACTIONS.SET_MESSAGES, 
        payload: messages.filter(msg => 
          !(msg.sender === 'system' && msg.text.includes('Error:'))
        ) 
      });

      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: Date.now(),
          text: aiResponse, 
          sender: 'ai', 
          timestamp: new Date() 
        }
      });
    } catch (error) {
      console.error('Error retrying message:', error);
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  const calculateBookmarkPositions = useCallback(() => {
    if (!messageAreaRef.current) return;
    
    const container = messageAreaRef.current;
    const containerHeight = container.scrollHeight;
    
    const positions = {};
    let hasChanges = false;

    (state.bookmarkedMessages || []).forEach(bookmark => {
      const element = document.getElementById(`message-${bookmark.messageId}`);
      if (element) {
        const elementTop = element.offsetTop;
        const newPosition = elementTop / containerHeight;
        
        if (newPosition !== bookmark.position) {
          positions[bookmark.messageId] = newPosition;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      dispatch({ type: ACTIONS.UPDATE_BOOKMARK_POSITIONS, payload: positions });
    }
  }, [dispatch, state.bookmarkedMessages, messageAreaRef]);

  // Create a debounced version of the calculation
  const debouncedCalculatePositions = useCallback(
    debounce(() => calculateBookmarkPositions(), 100),
    [calculateBookmarkPositions]
  );

  useEffect(() => {
    if (state.bookmarkedMessages?.length > 0) {
      debouncedCalculatePositions();
    }
    
    const handleResize = () => {
      if (state.bookmarkedMessages?.length > 0) {
        debouncedCalculatePositions();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedCalculatePositions.cancel();
    };
  }, [state.bookmarkedMessages, debouncedCalculatePositions]);

  const handleBookmark = (message) => {
    const container = messageAreaRef.current;
    const element = document.getElementById(`message-${message.id}`);
    
    if (container && element) {
      const position = element.offsetTop / container.scrollHeight;
      
      dispatch({ 
        type: ACTIONS.TOGGLE_BOOKMARK, 
        payload: { 
          messageId: message.id,
          text: message.text,
          timestamp: message.timestamp,
          position: position
        } 
      });
    }
  };

  useEffect(() => {
    messageEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Container className={classes.root} maxWidth="xl">
      <div className={classes.chatContainer}>
        {!isFullscreen && (
          <Paper className={classes.chatLog} elevation={3}>
            <Button 
              variant="contained" 
              color="primary" 
              className={classes.newChatButton}
              onClick={handleNewChat}
            >
              Start New Chat Session
            </Button>
            <List>
              {chatSessions.map((session) => (
                <React.Fragment key={session.id}>
                  <ListItem button className={classes.chatSessionItem}>
                    <ListItemText primary={session.name} />
                    <div className={classes.sessionActions}>
                      <Tooltip title="Edit">
                        <IconButton edge="end" aria-label="edit" onClick={() => handleEditSession(session.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton edge="end" aria-label="download" onClick={() => handleDownloadSession(session.id)}>
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
        <Paper className={`${classes.chatArea} ${isFullscreen ? classes.fullscreen : ''}`} elevation={3}>
          <div className={classes.buttonBar}>
            <div className={classes.agentsHeader}>
              <IconButton onClick={handleHelpOpen} size="small">
                <HelpOutlineIcon className={classes.helpIcon} />
              </IconButton>
              <Typography className={classes.agentsText}>
                Agents in this Chat:
              </Typography>
            </div>
              <IconButton
              className={classes.fullscreenButton}
                onClick={toggleFullscreen}
                size="small"
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
          </div>
          <Box 
            ref={messageAreaRef}
            className={classes.messageArea}
            onScroll={handleScroll}
          >
            <div className={classes.bookmarkTrack}>
              {(state.bookmarkedMessages || []).map((bookmark) => (
                <Tooltip
                  key={bookmark.messageId}
                  title={bookmark.text.substring(0, 100) + (bookmark.text.length > 100 ? '...' : '')}
                  placement="left"
                  classes={{ tooltip: classes.bookmarkTooltip }}
                >
                  <div
                    className={classes.bookmarkTick}
                    style={{ top: `${bookmark.position * 100}%` }}
                    onClick={() => {
                      const element = document.getElementById(`message-${bookmark.messageId}`);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </Tooltip>
              ))}
            </div>
            
            {messages.map((message, index) => (
              <Box 
                key={index}
                id={`message-${message.id}`}
                className={`${classes.message} ${
                  message.sender === 'user' ? classes.userMessage : classes.aiMessage
                }`}
                style={{ maxWidth: message.sender === 'user' ? '70%' : '85%' }}
              >
                <div className={classes.messageWrapper}>
                  <MessageContent 
                    content={message.text} 
                    isUser={message.sender === 'user'} 
                    timestamp={message.timestamp}
                    sender={message.sender}
                    onRetry={
                      message.sender === 'system' && message.text.includes('Error:') 
                        ? () => handleRetry(messages[messages.length - 2]?.text) 
                        : undefined
                    }
                    messageId={message.id}
                    onBookmark={() => handleBookmark(message)}
                    isBookmarked={(state.bookmarkedMessages || []).some(msg => msg.messageId === message.id)}
                  />
                </div>
              </Box>
            ))}
            {isLoading && (
              <div className={classes.typingIndicator}>
                <Typography className="loading-header">
                  One moment...
                </Typography>
                <Typography className="loading-text">
                  The team is gathering data, processing, reflecting, and collaborating to address your query. Depending on the complexity of your query, this may take a few moments...
                </Typography>
                <div className="dots">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
            <Fade in={showScrollTop}>
              <IconButton
                className={classes.scrollTopButton}
                onClick={scrollToTop}
                size="medium"
                title="Scroll to top"
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </Fade>
            <Fade in={showScrollBottom}>
              <IconButton
                className={classes.scrollBottomButton}
                onClick={scrollToBottom}
                size="medium"
                title="Scroll to bottom"
              >
                <KeyboardArrowDownIcon />
              </IconButton>
            </Fade>
          </Box>
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
              className={classes.input}
              variant="outlined"
              placeholder="Type your message here... (Ctrl+Enter to send)"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              multiline
              minRows={1}
              maxRows={5}
              fullWidth
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
      <Dialog
        open={helpDialogOpen}
        onClose={handleHelpClose}
        className={classes.helpDialog}
        aria-labelledby="help-dialog-title"
      >
        <DialogTitle id="help-dialog-title" className={classes.dialogTitle}>
          <Typography variant="h6">Multi-Agent Team System</Typography>
          <IconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={handleHelpClose}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <Typography>
            In addition to the team's expert agents, all multi-agent teams come with the following system agents:
          </Typography>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li className={classes.agentListItem}>
              <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
              <div className={classes.agentDescription}>
                <Typography>
                  <strong>Agent Moderator</strong> - Identifies which agents are needed and creates tailored guidance to help agents think more deeply to address the user's query
                </Typography>
              </div>
            </li>
            <li className={classes.agentListItem}>
              <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
              <div className={classes.agentDescription}>
                <Typography>
                  <strong>The Librarian</strong> - Runs advanced database information retrieval at the request of agents to help find the most relevant information to address the user's query
                </Typography>
              </div>
            </li>
            <li className={classes.agentListItem}>
              <img src={robotIcon} alt="Robot" className={classes.robotIcon} />
              <div className={classes.agentDescription}>
                <Typography>
                  <strong>Synthesis Agent</strong> - Consolidates agent collaborations, reports, and research results for final output to the user
                </Typography>
              </div>
            </li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleHelpClose} 
            color="primary"
            variant="contained"
            style={{ borderRadius: '20px', textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
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
    </Container>
  );
}

export default MultiAgentChat;