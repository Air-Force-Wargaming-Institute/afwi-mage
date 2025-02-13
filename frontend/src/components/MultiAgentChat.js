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
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress
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
import CheckIcon from '@mui/icons-material/Check';
import rehypeRaw from 'rehype-raw';

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
    },
    '& blockquote': {
      margin: '0.8em 0',
      padding: '0.4em 1em',
      borderLeft: `4px solid ${theme.palette.grey[300]}`,
      backgroundColor: theme.palette.grey[50],
      color: theme.palette.text.secondary,
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
    paddingTop: theme.spacing(2),
  },
  formControl: {
    marginTop: theme.spacing(2),
    minWidth: 200,
  },
  errorText: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(1),
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
  expertAnalyses: {
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
  },
  expertAnalysis: {
    margin: '0.5em 0',
    padding: '0.5em',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: theme.shape.borderRadius,
    
    '& summary': {
      cursor: 'pointer',
      fontWeight: 500,
      marginBottom: '0.5em',
      padding: '0.5em',
      
      '&:hover': {
        color: theme.palette.primary.main,
      },
    },
  },
}));

const CodeBlock = ({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  if (!inline && language) {
    return (
      <SyntaxHighlighter
        style={materialDark}
        language={language}
        PreTag="div"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  }
  return <code className={className}>{children}</code>;
};

const MessageContent = ({ content, isUser, timestamp, sender, onRetry, messageId, onBookmark, isBookmarked }) => {
  const classes = useStyles();
  const [copied, setCopied] = useState(false);
  
  // Add null check and ensure content is a string
  const safeContent = content || '';
  const isErrorMessage = sender === 'system' && safeContent.includes('Error:');

  const parseContent = () => {
    if (!safeContent) {
      return { mainContent: '', experts: [] };
    }

    try {
      // First check if it's a JSON string that needs parsing
      let processedContent = safeContent;
      if (typeof safeContent === 'string' && safeContent.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(safeContent);
          processedContent = parsed.response || parsed.message || safeContent;
        } catch (e) {
          console.log('Not JSON content');
        }
      }

      // Extract expert analyses if present
      const parts = processedContent.split('<details><summary>Expert Analyses</summary>');
      if (parts.length !== 2) {
        return { mainContent: processedContent, experts: [] };
      }

      const mainContent = parts[0].trim();
      const expertsSection = parts[1];

      // Extract individual expert analyses
      const experts = [];
      const expertMatches = expertsSection.matchAll(/<details><summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g);
      
      for (const match of expertMatches) {
        if (match[1] && match[2]) {
          experts.push({
            title: match[1].trim(),
            content: match[2].trim()
          });
        }
      }

      return { mainContent, experts };
    } catch (error) {
      console.error('Error parsing content:', error);
      return { mainContent: safeContent, experts: [] };
    }
  };

  const { mainContent, experts } = parseContent();

  return (
    <div className={classes.messageContent}>
      <ReactMarkdown 
        rehypePlugins={[rehypeRaw]}
        components={{
          code: CodeBlock
        }}
        className={classes.markdown}
      >
        {mainContent}
      </ReactMarkdown>

      {experts.length > 0 && (
        <div className={classes.expertAnalyses}>
          <details>
            <summary>Expert Analyses</summary>
            {experts.map((expert, index) => (
              <details key={index} className={classes.expertAnalysis}>
                <summary>{expert.title}</summary>
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code: CodeBlock
                  }}
                  className={classes.markdown}
                >
                  {expert.content}
                </ReactMarkdown>
              </details>
            ))}
          </details>
        </div>
      )}

      <div className={classes.messageFooter}>
        {timestamp && (
          <Typography 
            className={`${classes.timestamp} ${isUser ? classes.userMessageTimestamp : ''}`}
            variant="caption"
          >
            {new Date(timestamp).toLocaleTimeString()}
          </Typography>
        )}
        {!isUser && (
          <>
            <IconButton
              className={classes.copyButton}
              onClick={() => {
                navigator.clipboard.writeText(content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              size="small"
            >
              {copied ? <CheckIcon /> : <ContentCopyIcon />}
            </IconButton>
            <IconButton
              className={classes.copyButton}
              onClick={() => onBookmark()}
              size="small"
            >
              {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
            {isErrorMessage && onRetry && (
              <IconButton
                className={classes.copyButton}
                onClick={onRetry}
                size="small"
              >
                <ReplayIcon />
              </IconButton>
            )}
          </>
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

function MultiAgentChat() {
  const classes = useStyles();
  const { state, dispatch } = useChat();
  
  // Add new state variables for the dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState('');

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

  // Add a ref to track if we need to update positions
  const shouldUpdatePositions = useRef(false);
  
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
      const currentSession = chatSessions.find(session => session.id === state.currentSessionId);
      const teamName = currentSession?.team || 'PRC_Team';
      const teamId = currentSession?.teamId;

      const response = await axios.post(getApiUrl('CHAT', '/chat'), { 
        message: input.trim(), 
        team_name: teamName,
        team_id: teamId
      });

      // Handle the response properly
      let aiResponse = '';
      const responseData = response.data;

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      // Check if we have a synthesized report with expert analyses
      if (responseData.response) {
        aiResponse = responseData.response;
      } else if (responseData.synthesized_report) {
        // Build the response with expert analyses if available
        aiResponse = responseData.synthesized_report;
        if (responseData.expert_final_analysis) {
          aiResponse += '\n\n<details><summary>Expert Analyses</summary>\n';
          Object.entries(responseData.expert_final_analysis).forEach(([expert, analysis]) => {
            aiResponse += `<details><summary>${expert}</summary>${analysis}</details>\n`;
          });
          aiResponse += '</details>';
        }
      }

      dispatch({ type: ACTIONS.REMOVE_ERROR_MESSAGES });
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: Date.now(),
          text: aiResponse, 
          sender: 'ai', 
          timestamp: new Date(),
          sessionId: responseData.session_id
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: Date.now(),
          text: `Error: Failed to get response from AI - ${error.message}`, 
          sender: 'system', 
          timestamp: new Date() 
        }
      });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  const handleNewChat = async () => {
    setIsLoadingTeams(true);
    setTeamError('');
    try {
      const response = await axios.get(getApiUrl('AGENT', '/api/agents/available_teams/'));  // Update path to include /agents
      setAvailableTeams(response.data.teams);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeamError('Failed to load available teams. Please try again.');
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleCreateNewChat = () => {
    if (!selectedTeam || !newSessionName.trim()) {
      setTeamError('Please select a team and enter a session name');
      return;
    }
    
    // Find the selected team object from availableTeams to get its ID
    const selectedTeamObj = availableTeams.find(team => team.name === selectedTeam);
    
    const newSession = { 
      id: chatSessions.length + 1, 
      name: newSessionName.trim(),
      team: selectedTeam,
      teamId: selectedTeamObj?.id // Store the team's unique_id
    };
    
    dispatch({ type: ACTIONS.ADD_CHAT_SESSION, payload: newSession });
    dispatch({ type: ACTIONS.SET_MESSAGES, payload: [] });
    
    setDialogOpen(false);
    setNewSessionName('');
    setSelectedTeam('');
    setTeamError('');
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

  const handleBookmark = useCallback((message) => {
    const messageArea = messageAreaRef.current;
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
      shouldUpdatePositions.current = true;
    }
  }, [dispatch]);

  // Create a debounced update function
  const debouncedUpdate = useCallback(
    debounce(() => {
      if (shouldUpdatePositions.current) {
        const updatedBookmarks = calculateBookmarkPositions(messageAreaRef, state.bookmarkedMessages);
        dispatch({ type: ACTIONS.UPDATE_BOOKMARK_POSITIONS, payload: updatedBookmarks });
        shouldUpdatePositions.current = false;
      }
    }, 100),
    [state.bookmarkedMessages]
  );

  // Update positions when necessary
  useEffect(() => {
    if (shouldUpdatePositions.current) {
      debouncedUpdate();
    }
  }, [debouncedUpdate]);

  // Handle initial load and new messages
  useEffect(() => {
    shouldUpdatePositions.current = true;
    debouncedUpdate();
  }, [messages, debouncedUpdate]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      shouldUpdatePositions.current = true;
      debouncedUpdate();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = debounce(() => {
      shouldUpdatePositions.current = true;
      debouncedUpdate();
    }, 100);

    const messageArea = messageAreaRef.current;
    if (messageArea) {
      messageArea.addEventListener('scroll', handleScroll);
      return () => {
        messageArea.removeEventListener('scroll', handleScroll);
        handleScroll.cancel();
      };
    }
  }, [debouncedUpdate]);

  useEffect(() => {
    messageEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Container className={classes.root} maxWidth="xl">
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Chat Session</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Session Name"
              fullWidth
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              error={teamError && !newSessionName.trim()}
              helperText={teamError && !newSessionName.trim() ? 'Session name is required' : ''}
            />
            <FormControl fullWidth>
              <InputLabel>Select Team</InputLabel>
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