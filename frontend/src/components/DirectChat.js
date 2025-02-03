import React, { useRef, useEffect, useState, useCallback } from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
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
import { useDirectChat, ACTIONS } from '../contexts/DirectChatContext';
import ReplayIcon from '@mui/icons-material/Replay';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { debounce } from 'lodash';
import CheckIcon from '@mui/icons-material/Check';
import { 
  sendMessage, 
  getChatHistory, 
  createChatSession, 
  deleteChatSession, 
  getAllChatSessions 
} from '../services/directChatService';
import Link from '@mui/material/Link';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypePrism from 'rehype-prism-plus';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useInView } from 'react-intersection-observer';
import { List as VirtualizedList, AutoSizer } from 'react-virtualized';
import Mermaid from 'mermaid';
import { useMarkdownComponents } from '../styles/markdownStyles';

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
    flexShrink: 0,
  },
  chatArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    width: '70%',
  },
  messageArea: {
    flexGrow: 1,
    width: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
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
    textAlign: 'left',
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
    '& .MuiTypography-root': {
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
    width: '100%',
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
  messageContent: {
    fontSize: '1rem',
    color: theme.palette.text.primary,
    width: '100%',
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    '.userMessage & ': {
      color: '#ffffff !important',
      '& *': {
        color: 'inherit',
      },
    },
  },
  messageWrapper: {
    position: 'relative',
    width: '100%',
    '&:hover $topActions': {
      opacity: 1,
    },
    '&:hover $messageActions': {
      opacity: 1,
    },
  },
  messageContainer: {
    position: 'relative',
    width: '100%',
    padding: theme.spacing(1),
    '&:hover .copyButton': {
      opacity: 1,
      transform: 'translateY(0)',
    },
    overflow: 'visible',
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
    left: 0,
    top: 44,
    bottom: 70,
    width: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '4px',
    cursor: 'pointer',
    '&:hover $bookmarkTick': {
      width: '24px',
      height: '10px',
      left: 0,
    },
    '&:hover $bookmarkPreviewContainer': {
      opacity: 1,
    },
  },
  bookmarkTick: {
    position: 'absolute',
    width: '15px',
    height: '4px',
    backgroundColor: theme.palette.primary.main,
    left: '0px',
    transform: 'translateY(-50%)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    zIndex: 1000,
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
  messageActions: {
    position: 'absolute',
    right: theme.spacing(1),
    bottom: theme.spacing(1),
    display: 'flex',
    gap: theme.spacing(1),
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  topActions: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    display: 'flex',
    gap: theme.spacing(1),
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  bookmarkRibbon: {
    position: 'absolute',
    width: 12,
    height: 20,
    backgroundColor: theme.palette.primary.main,
    borderRadius: '0 0 4px 4px',
    animation: '$dropRibbon 0.3s ease-out',
    zIndex: 2,
  },
  topRibbon: {
    top: -17,
    right: 18,
    transformOrigin: 'top center',
    animation: '$dropRibbonDown 0.3s ease-out',
  },
  bottomRibbon: {
    bottom: 4,
    right: 18,
    transform: 'rotate(180deg)',
    transformOrigin: 'bottom center',
    animation: '$dropRibbonUp 0.3s ease-out',
  },
  '@keyframes dropRibbonDown': {
    from: {
      transform: 'scaleY(0)',
    },
    to: {
      transform: 'scaleY(1)',
    },
  },
  '@keyframes dropRibbonUp': {
    from: {
      transform: 'rotate(180deg) scaleY(0)',
    },
    to: {
      transform: 'rotate(180deg) scaleY(1)',
    },
  },
  bookmarkPreviewContainer: {
    position: 'absolute',
    left: '24px',
    top: 0,
    bottom: 0,
    width: '300px',
    pointerEvents: 'auto',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  bookmarkPreview: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2],
    maxWidth: '280px',
    fontSize: '0.875rem',
    transform: 'translateY(-50%)',
    zIndex: 2,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
  },
}));

const MessageContent = ({ content, isUser, timestamp, sender, onRetry, messageId, onBookmark, isBookmarked }) => {
  const classes = useStyles();
  const [copied, setCopied] = useState(false);
  const isErrorMessage = !isUser && content.includes('Error:');
  const markdownComponents = useMarkdownComponents();

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={classes.messageContainer}>
      {isBookmarked && (
        <>
          <div className={`${classes.bookmarkRibbon} ${classes.topRibbon}`} />
          <div className={`${classes.bookmarkRibbon} ${classes.bottomRibbon}`} />
        </>
      )}
      
      {!isUser && !isErrorMessage && (
        <div className={`${classes.messageActions} ${classes.topActions}`}>
          <IconButton
            className={classes.copyButton}
            onClick={() => handleCopy(content)}
            size="small"
            title="Copy message"
          >
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
          <IconButton
            className={classes.copyButton}
            onClick={onBookmark}
            size="small"
            title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isBookmarked ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
          </IconButton>
        </div>
      )}

      <Box 
        className={classes.messageContent}
        sx={{
          '& > *:first-child': { mt: 0 },
          '& > *:last-child': { mb: 0 }
        }}
      >
        {isUser ? (
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'inherit',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.2,
              my: 0,
              textAlign: 'left',
              width: '100%'
            }}
          >
            {content}
          </Typography>
        ) : (
          <ReactMarkdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
            skipHtml={true}
            unwrapDisallowed={true}
          >
            {content.replace(/\n\s*\n/g, '\n\n').trim()}
          </ReactMarkdown>
        )}
      </Box>

      <div className={classes.messageFooter}>
        <Typography 
          className={`${classes.timestamp} ${isUser ? classes.userMessageTimestamp : ''}`}
          sx={{ fontSize: '0.75rem', opacity: 0.8 }}
        >
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </Typography>
        
        {(!isErrorMessage || isUser) && (
          <div className={classes.messageActions}>
            <IconButton
              className={classes.copyButton}
              onClick={() => handleCopy(content)}
              size="small"
              title="Copy message"
            >
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
            {!isUser && (
              <IconButton
                className={classes.copyButton}
                onClick={onBookmark}
                size="small"
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              >
                {isBookmarked ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
              </IconButton>
            )}
          </div>
        )}
        
        {onRetry && isErrorMessage && (
          <IconButton
            className={classes.copyButton}
            onClick={onRetry}
            size="small"
            title="Retry"
          >
            <ReplayIcon fontSize="small" />
          </IconButton>
        )}
      </div>
    </div>
  );
};

const calculateBookmarkPositions = (messageAreaRef, bookmarkedMessages) => {
  const messageArea = messageAreaRef.current;
  if (!messageArea) return bookmarkedMessages;
  
  const totalHeight = messageArea.scrollHeight;
  
  return bookmarkedMessages.map(bookmark => {
    const messageElement = document.getElementById(`message-${bookmark.messageId}`);
    if (messageElement) {
      const messageTop = messageElement.offsetTop;
      const position = (messageTop / totalHeight) * 100;
      return { ...bookmark, position };
    }
    return bookmark;
  });
};

const DirectChat = () => {
  const classes = useStyles();
  const { state, dispatch } = useDirectChat();
  const messageEndRef = useRef(null);
  const [error, setError] = useState(null);

  // Load chat sessions on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const sessions = await getAllChatSessions();
        dispatch({ type: ACTIONS.SET_CHAT_SESSIONS, payload: sessions });
      } catch (error) {
        setError('Failed to load chat sessions');
      }
    };
    loadChatSessions();
  }, [dispatch]);

  // Load chat history when session changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (state.currentSessionId) {
        try {
          const history = await getChatHistory(state.currentSessionId);
          dispatch({ type: ACTIONS.SET_MESSAGES, payload: history });
        } catch (error) {
          setError('Failed to load chat history');
        }
      }
    };
    loadChatHistory();
  }, [state.currentSessionId, dispatch]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const messageText = state.input.trim();
    
    if (!messageText) return;

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: userMessage });
    dispatch({ type: ACTIONS.SET_INPUT, payload: '' });
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });

    try {
      // Send message to backend
      const response = await sendMessage(messageText);
      
      // Add AI response to UI
      const aiMessage = {
        id: Date.now() + 1,
        text: response.message,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      dispatch({ type: ACTIONS.ADD_MESSAGE, payload: aiMessage });
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error: Failed to send message. Please try again.',
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      dispatch({ type: ACTIONS.ADD_MESSAGE, payload: errorMessage });
      setError('Failed to send message');
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  const handleNewChat = async () => {
    try {
      const newSession = await createChatSession();
      dispatch({ type: ACTIONS.ADD_CHAT_SESSION, payload: newSession });
    } catch (error) {
      setError('Failed to create new chat');
    }
  };

  const handleDeleteChat = async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      dispatch({ type: ACTIONS.DELETE_CHAT_SESSION, payload: sessionId });
      
      // If we deleted the current session, switch to the first available session
      if (sessionId === state.currentSessionId && state.chatSessions.length > 0) {
        const nextSession = state.chatSessions.find(s => s.id !== sessionId);
        if (nextSession) {
          dispatch({ type: ACTIONS.SET_CURRENT_SESSION, payload: nextSession.id });
        }
      }
    } catch (error) {
      setError('Failed to delete chat');
    }
  };

  const handleInputChange = (event) => {
    dispatch({ type: ACTIONS.SET_INPUT, payload: event.target.value });
  };

  const handleKeyPress = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSendMessage(event);
    }
  };

  const handleScroll = useCallback(({ target }) => {
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    dispatch({ 
      type: ACTIONS.SET_SCROLL_TOP, 
      payload: scrollTop > 200 
    });
    
    dispatch({ 
      type: ACTIONS.SET_SCROLL_BOTTOM, 
      payload: scrollHeight - scrollTop - clientHeight > 200 
    });
  }, [dispatch]);

  const scrollToTop = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        payload: state.messages.filter(msg => 
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

  const handleBookmark = useCallback((message) => {
    const messageArea = messageEndRef.current;
    const messageElement = document.getElementById(`message-${message.id}`);
    
    if (messageArea && messageElement) {
      const totalHeight = messageArea.scrollHeight;
      const messageTop = messageElement.offsetTop;
      const position = (messageTop / totalHeight) * 100;
      
      const bookmarkData = {
        messageId: message.id,
        text: message.text,
        position: position
      };
      
      dispatch({ 
        type: ACTIONS.TOGGLE_BOOKMARK, 
        payload: bookmarkData
      });
    }
  }, [dispatch]);

  const handleEditSession = (sessionId) => {
    // TODO: Implement session editing functionality
    console.log('Edit session:', sessionId);
  };

  const handleDownloadSession = async (sessionId) => {
    try {
      const history = await getChatHistory(sessionId);
      const chatData = JSON.stringify(history, null, 2);
      const blob = new Blob([chatData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download chat session');
      console.error('Error downloading session:', error);
    }
  };

  const toggleFullscreen = () => {
    dispatch({ type: ACTIONS.SET_FULLSCREEN, payload: !state.isFullscreen });
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

  return (
    <Container className={classes.root} maxWidth="xl">
      <div className={classes.chatContainer}>
        {!state.isFullscreen && (
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
              {state.chatSessions.map((session) => (
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
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteChat(session.id)}>
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
        <Paper className={`${classes.chatArea} ${state.isFullscreen ? classes.fullscreen : ''}`} elevation={3}>
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
                {state.isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
          </div>
          <Box 
            ref={messageEndRef}
            className={classes.messageArea}
            onScroll={handleScroll}
          >
            <div className={classes.bookmarkTrack}>
              {state.bookmarkedMessages.map((bookmark, index) => (
                <React.Fragment key={index}>
                  <div
                    className={classes.bookmarkTick}
                    style={{ top: `${bookmark.position}%` }}
                    onClick={() => {
                      const element = document.getElementById(`message-${bookmark.messageId}`);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </React.Fragment>
              ))}
              <div className={classes.bookmarkPreviewContainer}>
                {state.bookmarkedMessages.map((bookmark, index) => (
                  <div
                    key={index}
                    className={classes.bookmarkPreview}
                    style={{ top: `${bookmark.position}%` }}
                    onClick={() => {
                      const element = document.getElementById(`message-${bookmark.messageId}`);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {bookmark.text.substring(0, 100) + (bookmark.text.length > 100 ? '...' : '')}
                  </div>
                ))}
              </div>
            </div>
            
            {state.messages.map((message, index) => (
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
                        ? () => handleRetry(state.messages[state.messages.length - 2]?.text) 
                        : undefined
                    }
                    messageId={message.id}
                    onBookmark={() => handleBookmark(message)}
                    isBookmarked={(state.bookmarkedMessages || []).some(msg => msg.messageId === message.id)}
                  />
                </div>
              </Box>
            ))}
            {state.isLoading && (
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
            <Fade in={state.showScrollTop}>
              <IconButton
                className={classes.scrollTopButton}
                onClick={scrollToTop}
                size="medium"
                title="Scroll to top"
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </Fade>
            <Fade in={state.showScrollBottom}>
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
          <form onSubmit={handleSendMessage} className={classes.inputArea}>
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
              value={state.input}
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
        open={state.helpDialogOpen}
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
        open={state.promptHelpOpen}
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

export default DirectChat;