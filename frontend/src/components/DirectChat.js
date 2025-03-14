import React, { useState, useEffect, useRef, useCallback, memo, useReducer } from 'react';
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
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Fade,
  InputLabel,
  Link,
} from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
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
import memoize from 'memoize-one';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import robotIcon from '../assets/robot-icon.png';
import { useDirectChat, ACTIONS } from '../contexts/DirectChatContext';
import ReplayIcon from '@mui/icons-material/Replay';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CheckIcon from '@mui/icons-material/Check';
import { 
  sendMessage, 
  getChatHistory, 
  createChatSession, 
  deleteChatSession, 
  getAllChatSessions,
  uploadDocument,
  getDocumentStatus,
  getDocumentStates,
  deleteDocument,
  toggleDocumentState,
  updateSessionName,
  updateDocumentClassification,
  getVectorstores,
  setSessionVectorstore,
  getChatSessionMetadata
} from '../services/directChatService';
import { useMarkdownComponents } from '../styles/markdownStyles';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import Slider from '@material-ui/core/Slider';
import rehypeRaw from 'rehype-raw';

// Suppress ResizeObserver errors
// This is a workaround for the "ResizeObserver loop completed with undelivered notifications" error
// that can occur when using virtualized lists with dynamic content
const originalConsoleError = console.error;
console.error = function(msg, ...args) {
  if (typeof msg === 'string' && (
    msg.includes('ResizeObserver loop') || 
    msg.includes('ResizeObserver loop completed with undelivered notifications')
  )) {
    // Ignore ResizeObserver loop errors completely
    return;
  }
  originalConsoleError(msg, ...args);
};

// Also suppress at window error level to prevent React error boundary triggers
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (message.includes('ResizeObserver loop') || (error && error.message && error.message.includes('ResizeObserver loop'))) {
    // Prevent the error from being reported in the console
    return true;
  }
  return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    height: 'calc(100vh - 215px)',
    maxHeight: 'calc(100vh - 128px)',
    overflow: 'hidden',
    marginTop: '10px',
  },
  chatContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    gap: theme.spacing(2),
  },
  chatLog: {
    width: '20%',
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
    width: '60%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: theme.palette.background.default,
    position: 'relative',
    transition: 'opacity 0.3s ease',
    '&.disabled': {
      opacity: 0.5,
      pointerEvents: 'none',
      '& .MuiInputBase-root': {
        backgroundColor: theme.palette.action.disabledBackground,
      }
    },
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
  uploadPane: {
    width: '20%',
    height: '100%',
    paddingTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    overflow: 'hidden',
    transition: 'opacity 0.3s ease',
    '&.disabled': {
      opacity: 0.5,
      pointerEvents: 'none',
      filter: 'grayscale(50%)',
    }
  },
  dropzone: {
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
  },
  uploadIcon: {
    fontSize: '2rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  uploadText: {
    marginBottom: theme.spacing(0.5),
  },
  fileList: {
    marginTop: theme.spacing(2),
  },
  fileItem: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
  },
  fileItemRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  classificationSelect: {
    marginTop: theme.spacing(0.5),
    width: '100%',
  },
  messageArea: {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    position: 'relative',
    '& .ReactVirtualized__List': {
      outline: 'none',
    }
  },
  messagesContainer: {
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.grey[300]} transparent`,
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[300],
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.grey[400],
      },
    },
  },
  inputArea: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    minHeight: '76px',
  },
  classificationSection: {
    marginTop: theme.spacing(0.25),
    padding: theme.spacing(0.25),
    borderTop: `1px solid ${theme.palette.divider}`,
    '& .MuiTypography-subtitle2': {
      fontSize: '0.7rem',
      marginBottom: '2px',
    },
  },
  classificationRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(0.25),
    '& .MuiFormControlLabel-root': {
      marginRight: theme.spacing(0.25),
      marginLeft: 0,
      marginY: 0,
    },
    '& .MuiCheckbox-root': {
      padding: '2px',
    },
  },
  classificationLabel: {
    minWidth: '80px',
    fontWeight: 500,
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(0.5),
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0,
    '& .MuiFormControlLabel-label': {
      fontSize: '0.75rem',
      lineHeight: 1,
    },
  },
  checkboxLabel: {
    fontSize: '0.75rem',
    marginRight: 0,
    lineHeight: 1,
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
      overflow: 'hidden', // Hide overflow on the outer container
    },
    '& textarea': {
      overflow: 'auto !important',  // Keep scrolling only on the textarea itself
      paddingTop: '8px !important',    // Add padding to prevent text clipping at top
      paddingBottom: '8px !important', // Add padding to prevent text clipping at bottom
    },
  },
  newChatButton: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    width: '60%',
    alignSelf: 'center',
  },
  message: {
    padding: theme.spacing(2),
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    wordBreak: 'break-word',
    position: 'relative',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    backgroundColor: theme.palette.background.paper,
    animation: '$messageAppear 0.3s ease-out',
    maxWidth: '85%',
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      transform: 'translateY(-1px)',
    },
  },
  '@keyframes messageAppear': {
    '0%': {
      opacity: 0,
      transform: 'translateY(10px)',
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  userMessage: {
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff !important', // Add !important to force white color
    borderRadius: '18px 18px 4px 18px',
    padding: theme.spacing(1.5, 2),
    position: 'relative',
    marginBottom: theme.spacing(1),
    maxWidth: '75%',
    boxShadow: theme.shadows[1],
    '&:hover $messageActions, &:hover $topActions': {
      opacity: 1,
    },
    '& $copyButton, & $bookmarkButton': {
      backgroundColor: 'rgba(255, 255, 255, 0.95)', // Higher contrast against dark backgrounds
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)', // Stronger shadow against dark backgrounds
      '& .MuiSvgIcon-root': {
        color: theme.palette.primary.dark, // Dark icon for better contrast on white button
      },
    },
  },
  aiMessage: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: '18px 18px 18px 4px',
    padding: theme.spacing(1.5, 2),
    position: 'relative',
    marginBottom: theme.spacing(1),
    maxWidth: '75%',
    boxShadow: theme.shadows[1],
    '&:hover $messageActions, &:hover $topActions': {
      opacity: 1,
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
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.primary.main,
    },
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
  fullscreen: {
    position: 'fixed',
    top: '0px',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1300,
    width: '100%',
    maxHeight: 'calc(100vh)',
    borderRadius: '12px',
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
  agentsText: {
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: '1.1rem',
  },
  messageWrapper: {
    width: '100%',
    position: 'relative',
    '&:hover $messageActions': {
      opacity: 1,
    },
  },
  messageContainer: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover .copyButton': {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  messageContent: {
    fontSize: '1rem',
    lineHeight: 1.6,
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    '& p': {
      margin: theme.spacing(1, 0),
    },
    position: 'relative', // Ensure proper positioning
    zIndex: 1, // Lower than the buttons
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
    opacity: 0.85, // Increased from 0.7 for better visibility
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Increased from 0.8 for better contrast
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', // Added shadow for better visibility
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      opacity: 1,
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)', // Enhanced shadow on hover
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '20px', // Increased from 18px for better visibility
      margin: 'auto',
      color: theme.palette.primary.main, // Setting icon color to primary for better visibility
    },
  },
  agentsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  helpIcon: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(1),
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
    position: 'absolute',
    bottom: theme.spacing(2),
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: '30px',
    maxWidth: '410px',
    zIndex: 1000,
    boxShadow: theme.shadows[3],
    animation: '$fadeIn 0.3s ease-in-out',
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
      animation: '$borderZip 2s linear infinite',
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
      gap: '6px',
      justifyContent: 'center',
    },
    '& .dot': {
      width: '10px',
      height: '10px',
      backgroundColor: theme.palette.primary.main,
      borderRadius: '50%',
      opacity: 0.7,
      animation: '$bounce 1.4s infinite ease-in-out both',
      '&:nth-child(1)': {
        animationDelay: '-0.32s',
      },
      '&:nth-child(2)': {
        animationDelay: '-0.16s',
      },
    },
  },
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translate(-50%, 20px)',
    },
    to: {
      opacity: 1,
      transform: 'translate(-50%, 0)',
    },
  },
  '@keyframes bounce': {
    '0%, 80%, 100%': {
      transform: 'scale(0.6)',
      opacity: 0.5,
    },
    '40%': {
      transform: 'scale(1)',
      opacity: 1,
    },
  },
  '@keyframes dotFadeInOut': {
    '0%, 80%, 100%': {
      opacity: 0.3,
    },
    '40%': {
      opacity: 1,
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
    opacity: 0.85, // Increased from 0.7 for better visibility
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Added background color for contrast
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', // Added shadow
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      opacity: 1,
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)', // Enhanced shadow on hover
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '20px', // Increased from 18px for better visibility
      margin: 'auto',
      color: theme.palette.primary.main, // Setting icon color to primary for better visibility
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
    opacity: 0.2, // Changed from 0 to have a slight visibility even when not hovering
    transition: 'opacity 0.2s ease',
    zIndex: 10, // Increase z-index to ensure buttons are clickable
  },
  topActions: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    bottom: 'auto', // Ensure it doesn't overlap with bottom positioning
    display: 'flex',
    gap: theme.spacing(1),
    opacity: 0.2, // Changed from 0 to have a slight visibility even when not hovering
    transition: 'opacity 0.2s ease',
    zIndex: 10, // Increase z-index to ensure buttons are clickable
    pointerEvents: 'auto', // Ensure clicks reach the buttons
  },
  userMessageActions: {
    position: 'absolute',
    right: theme.spacing(1),
    bottom: theme.spacing(1),
    top: 'auto', // Override any top positioning
    display: 'flex',
    gap: theme.spacing(1),
    opacity: 0.2,
    transition: 'opacity 0.2s ease',
    zIndex: 3, // Ensure buttons are above text
  },
  userMessageText: {
    fontSize: '0.95rem',
    color: '#FFFFFF !important', // White text with !important to override any conflicting styles
    whiteSpace: 'pre-wrap',
    textAlign: 'left', // Explicitly set left alignment
    wordBreak: 'break-word',
    paddingRight: '40px', // Prevent overlap with action buttons
    '& *': { // Apply to all child elements
      color: '#FFFFFF !important' // Ensure all child elements inherit white color
    }
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
  noSessionsOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  classificationSlider: {
    width: '100%',
    padding: '10px 0 0',
    marginTop: theme.spacing(0.8),
    '& .MuiSlider-rail': {
      height: 4,
      borderRadius: 2,
      backgroundColor: '#e0e0e0',
    },
    '& .MuiSlider-track': {
      height: 4,
      borderRadius: 2,
      transition: 'background-color 0.3s ease',
    },
    '& .MuiSlider-thumb': {
      width: 16,
      height: 16,
      marginTop: -6,
      marginLeft: -8,
      backgroundColor: '#fff',
      border: '2px solid',
      transition: 'border-color 0.3s ease',
      '&:hover, &.Mui-focusVisible': {
        boxShadow: '0 0 0 8px rgba(0, 0, 0, 0.1)',
      },
    },
    '& .MuiSlider-mark': {
      width: 2,
      height: 8,
      marginTop: -2,
      backgroundColor: '#bdbdbd',
    },
    '& .MuiSlider-markLabel': {
      fontSize: '0.7rem',
      fontWeight: 500,
      top: -10,
      transform: 'translate(-50%, 0)',
      color: theme.palette.text.secondary,
    },
  },
  sessionName: {
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: '1.1rem',
  },
  markdown: {
    textAlign: 'left', // Set markdown content to left-align by default
    '& p, & ul, & ol, & li, & blockquote': {
      textAlign: 'left', // Ensure all text elements are left-aligned
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
  thinkingProcess: {
    margin: '0 0 12px 0',
    padding: '8px',
    backgroundColor: 'rgba(25, 118, 210, 0.05)',
    borderRadius: theme.shape.borderRadius,
    border: '1px solid rgba(25, 118, 210, 0.1)',
    
    '& > details > summary': {
      color: theme.palette.primary.main,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      
      '&::before': {
        content: '""',
        display: 'inline-block',
        width: '16px',
        height: '16px',
        marginRight: '8px',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%231976d2\'%3E%3Cpath d=\'M5 12h14M12 5v14\'/%3E%3C/svg%3E")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        transition: 'transform 0.2s ease',
      },
    },
    
    '& > details[open] > summary::before': {
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%231976d2\'%3E%3Cpath d=\'M5 12h14\'/%3E%3C/svg%3E")',
    },
  },
  userMessageActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginRight: theme.spacing(1),
  },
  sessionSelect: {
    marginTop: theme.spacing(1),
    minWidth: '100%',
    '& .MuiSelect-select': {
      padding: theme.spacing(0.5, 1),
    },
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  vectorstoreSelect: {
    minWidth: 150,
    marginLeft: 16,
  },
  docUploadContainer: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    marginTop: theme.spacing(2),
  },
  panelHeader: {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  vectorstoreSection: {
    marginBottom: theme.spacing(2),
  },
  sectionLabel: {
    fontSize: '0.8rem',
    fontWeight: 500,
    marginBottom: theme.spacing(0.5),
  },
  formControl: {
    marginBottom: theme.spacing(1),
  },
  selectEmpty: {
    marginTop: theme.spacing(1),
  },
  menuItem: {
    // Style for menu items
  },
  buildDatabasesLink: {
    fontSize: '0.8rem',
    color: theme.palette.primary.main,
    textDecoration: 'none',
    display: 'block',
    marginTop: theme.spacing(0.5),
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  docUploadHeader: {
    fontSize: '1.2rem',
    fontWeight: 500,
    marginBottom: theme.spacing(1),
  },
  // Add styles for native select
  nativeSelect: {
    width: '100%', 
    padding: '8px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.9rem',
    color: theme.palette.text.primary,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    '&:focus': {
      outline: 'none',
      border: `1px solid ${theme.palette.primary.main}`,
    },
    '&:disabled': {
      opacity: 0.7,
      backgroundColor: theme.palette.action.disabledBackground,
    }
  },
}));

// CodeBlock component with memoization for better performance
const CodeBlock = memo(({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);
  
  if (!inline && language) {
    return (
      <div style={{ position: 'relative' }}>
        <Button 
          onClick={handleCopy} 
          size="small" 
          style={{ 
            position: 'absolute', 
            right: 8, 
            top: 8, 
            minWidth: 'auto',
            padding: '4px',
            color: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            zIndex: 1
          }}
        >
          {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </Button>
        <SyntaxHighlighter
          style={materialDark}
          language={language}
          PreTag="div"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={className}>{children}</code>;
});

const MessageContent = ({ 
  content, 
  isUser, 
  timestamp, 
  sender, 
  onRetry, 
  messageId, 
  onBookmark, 
  isBookmarked,
  expandedSections,
  onToggleExpand 
}) => {
  const classes = useStyles();
  const theme = useTheme(); // Get the current theme
  const [copied, setCopied] = useState(false);
  const isErrorMessage = !isUser && content.includes('Error:');
  const messageRef = useRef(null);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Use the parent's toggle function if provided, otherwise use local state
  const handleToggle = (id) => {
    if (onToggleExpand) {
      onToggleExpand(id, messageRef.current);
    }
  };

  const parseContent = () => {
    if (!content) {
      return { mainContent: '', thinkSections: [] };
    }

    try {
      // First check if it's a JSON string that needs parsing
      let processedContent = content;
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          processedContent = parsed.response || parsed.message || content;
        } catch (e) {
          // Not JSON content
        }
      }

      // Extract <think></think> sections
      const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
      const thinkMatches = [...processedContent.matchAll(thinkRegex)];
      const thinkSections = thinkMatches.map((match, index) => ({
        id: `thinking-${messageId}-${index}`,
        content: match[1].trim()
      }));
      
      // Remove <think></think> tags and their content from the main content
      let mainContent = processedContent;
      thinkMatches.forEach(match => {
        mainContent = mainContent.replace(match[0], '');
      });
      
      // Remove any <details><summary>Thinking Process</summary> sections from the main content
      const thinkingProcessRegex = /<details><summary>Thinking Process<\/summary>[\s\S]*?<\/details>/gi;
      mainContent = mainContent.replace(thinkingProcessRegex, '');
      
      // Clean up any extra whitespace caused by removal
      mainContent = mainContent.replace(/\n{3,}/g, '\n\n').trim();
      
      // Fix case where removal creates empty message
      if (!mainContent.trim()) {
        mainContent = "The AI provided only thinking content with no direct response.";
      }

      return { mainContent, thinkSections };
    } catch (error) {
      console.error('Error parsing content:', error);
      return { mainContent: content, thinkSections: [] };
    }
  };

  const { mainContent, thinkSections } = parseContent();

  return (
    <div className={classes.messageContainer} ref={messageRef}>
      {isBookmarked && (
        <>
          <div className={`${classes.bookmarkRibbon} ${classes.topRibbon}`} />
          <div className={`${classes.bookmarkRibbon} ${classes.bottomRibbon}`} />
        </>
      )}
      
      {!isUser && !isErrorMessage && (
        <div 
          className={`${classes.messageActions} ${classes.topActions}`}
          style={{ pointerEvents: 'auto' }} // Ensure container is clickable
        >
          <IconButton
            className={classes.copyButton}
            onClick={() => {
              navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            size="small"
            title="Copy message"
            style={{ pointerEvents: 'auto' }} // Ensure button is clickable
          >
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
          <IconButton
            className={classes.bookmarkButton} // Use proper bookmark button class
            onClick={() => {
              if (onBookmark) {
                onBookmark();
              }
            }}
            size="small"
            title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            style={{ pointerEvents: 'auto' }} // Ensure button is clickable
          >
            {isBookmarked ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
          </IconButton>
        </div>
      )}

      <Box className={classes.messageContent}>
        {isUser ? (
          <div className={classes.userMessageText}> {/* Use our dedicated class */}
            <Typography 
              variant="body1"
              className={classes.userMessageText}
              sx={{ 
                whiteSpace: 'pre-wrap',
                lineHeight: 1.2,
                my: 0,
                textAlign: 'left',
                width: '100%',
                paddingRight: '40px', // Add right padding to prevent button overlap
                wordBreak: 'break-word', // Ensure long words don't overflow
                color: 'white !important', // Use keyword 'white' with !important flag
              }}
              style={{ color: 'white' }} // Direct style override as additional safety
            >
              {mainContent}
            </Typography>
          </div>
        ) : (
          <>
            {/* Main content first (the answer) */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code: CodeBlock, // Restore the CodeBlock component
                details: ({ node, children, ...props }) => {
                  const detailsIndex = node.position ? node.position.start.line : Math.random();
                  const id = `message-${messageId}-details-${detailsIndex}`;
                  
                  return (
                    <details
                      {...props}
                      open={expandedSections[id] || false}
                      onClick={(e) => {
                        if (e.target.tagName.toLowerCase() === 'summary') {
                          e.preventDefault();
                          handleToggle(id);
                        }
                      }}
                      className={classes.markdownDetails}
                    >
                      {children}
                    </details>
                  );
                },
                pre: (props) => <pre {...props} style={{ margin: '16px 0', overflow: 'auto', maxWidth: '100%' }} />,
                p: (props) => <p {...props} style={{ margin: '8px 0', maxWidth: '100%', textAlign: 'left' }} />,
                h1: (props) => <h1 {...props} style={{ textAlign: 'left' }} />,
                h2: (props) => <h2 {...props} style={{ textAlign: 'left' }} />,
                h3: (props) => <h3 {...props} style={{ textAlign: 'left' }} />,
                h4: (props) => <h4 {...props} style={{ textAlign: 'left' }} />,
                h5: (props) => <h5 {...props} style={{ textAlign: 'left' }} />,
                h6: (props) => <h6 {...props} style={{ textAlign: 'left' }} />,
                blockquote: (props) => <blockquote {...props} style={{ textAlign: 'left' }} />,
                img: (props) => (
                  <img 
                    {...props} 
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto', 
                      display: 'block',
                      margin: '16px 0' 
                    }}
                    loading="lazy" 
                  />
                ),
                ul: (props) => <ul {...props} style={{ margin: '8px 0', paddingLeft: '20px', textAlign: 'left' }} />,
                ol: (props) => <ol {...props} style={{ margin: '8px 0', paddingLeft: '20px', textAlign: 'left' }} />,
                li: (props) => <li {...props} style={{ textAlign: 'left' }} />,
              }}
              className={classes.markdown}
              skipHtml={false}
            >
              {mainContent}
            </ReactMarkdown>
            
            {/* Display thinking sections at the bottom as a single collapsible element */}
            {thinkSections.length > 0 && (
              <div className={classes.thinkingProcess} style={{ marginTop: '16px' }}>
                <details 
                  className={classes.markdownDetails}
                  open={expandedSections ? expandedSections[`message-${messageId}-think`] : false}
                  onClick={(e) => {
                    // Prevent default toggling behavior
                    if (e.target.tagName.toLowerCase() === 'summary') {
                      e.preventDefault();
                      handleToggle(`message-${messageId}-think`);
                    }
                  }}
                >
                  <summary>AI Reasoning</summary>
                  <div style={{ padding: '8px 0' }}>
                    {thinkSections.map((section, index) => (
                      <div key={`section-${messageId}-${index}`} style={{ marginBottom: index < thinkSections.length - 1 ? '12px' : 0 }}>
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw]}
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: CodeBlock
                          }}
                          className={classes.markdown}
                        >
                          {section.content}
                        </ReactMarkdown>
                        {index < thinkSections.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </>
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
          <div 
            className={`${classes.messageActions} ${isUser ? classes.userMessageActions : ''}`}
            style={{ pointerEvents: 'auto' }} // Ensure container is clickable
          >
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
                className={classes.bookmarkButton}
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

// Calculate bookmark positions for the message track
const calculateBookmarkPositions = (scrollContainerRef, bookmarkedMessages) => {
  if (!scrollContainerRef.current || !bookmarkedMessages.length) return [];
  
  // Get the container element
  const containerElement = scrollContainerRef.current;
  
  // Calculate total height of scroll container
  const totalHeight = containerElement.scrollHeight;
  
  return bookmarkedMessages.map(bookmark => {
    // Find the actual message element
    const messageElement = document.getElementById(`message-${bookmark.messageId}`);
    
    if (!messageElement) return null;
    
    // Calculate relative position in container
    const messageTop = messageElement.offsetTop;
    const relativePosition = messageTop / totalHeight;
    
    return {
      id: bookmark.messageId,
      position: relativePosition,
      timestamp: bookmark.timestamp
    };
  }).filter(Boolean);
};

// Memoize the MessageContent component
const MemoizedMessageContent = React.memo(MessageContent);

// Create a memoized item renderer for the virtualized list
const createItemData = memoize((messages, handleRetry, handleBookmark, bookmarkedMessages, expandedSections, handleToggleExpand) => ({
  messages,
  handleRetry,
  handleBookmark,
  bookmarkedMessages,
  expandedSections,
  handleToggleExpand
}));

// Helper for debouncing
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Update the message area in the DirectChat component
const MessageArea = memo(({ messages, handleRetry, handleBookmark, bookmarkedMessages, isLoading, classes }) => {
  // Replace virtuosoRef with scrollContainerRef
  const scrollContainerRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [showMessageDetail, setShowMessageDetail] = useState(null);
  
  // Basic scroll tracking - we'll enhance this in Phase 2
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Simple scroll handler to track position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "at bottom" if within 20px of actual bottom
    const atBottom = distanceFromBottom < 20;
    
    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom);
  }, []);
  
  // Simple scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, []);
  
  // Simplified toggle expand handler with no scroll logic
  const handleToggleExpand = useCallback((id, elementRef) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);
  
  // Create a style stabilizer to prevent frequent style changes
  const stableMessageStyles = React.useMemo(() => ({
    userWrapper: {
      display: 'flex',
      padding: '12px 16px', // Increased top/bottom padding from 8px to 12px
      width: '100%',
      justifyContent: 'flex-end',
      alignItems: 'flex-start'
    },
    aiWrapper: {
      display: 'flex',
      padding: '12px 16px', // Increased top/bottom padding from 8px to 12px
      width: '100%',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    },
    userMessage: { 
      width: 'auto',
      maxWidth: '70%',
      marginLeft: 'auto',
      marginRight: '0'
    },
    aiMessage: { 
      width: 'auto',
      maxWidth: '85%',
      marginLeft: '0',
      marginRight: 'auto'
    }
  }), []);

  // Render a message item (adapted from the previous renderItem function)
  const renderMessage = useCallback((message) => {
    const isBookmarked = bookmarkedMessages.some(msg => msg.messageId === message.id);
    const isUserMessage = message.sender === 'user';

    return (
      <Box 
        sx={isUserMessage ? stableMessageStyles.userWrapper : stableMessageStyles.aiWrapper}
        key={`message-wrapper-${message.id}`}
      >
        <Box 
          id={`message-${message.id}`}
          className={`${classes.message} ${
            isUserMessage ? classes.userMessage : classes.aiMessage
          }`}
          style={isUserMessage ? stableMessageStyles.userMessage : stableMessageStyles.aiMessage}
        >
          <MemoizedMessageContent 
            content={message.text} 
            isUser={isUserMessage} 
            timestamp={message.timestamp}
            sender={message.sender}
            onRetry={
              message.sender === 'system' && message.text.includes('Error:') 
                ? () => handleRetry(messages[messages.length - 2]?.text) 
                : undefined
            }
            messageId={message.id}
            onBookmark={() => handleBookmark(message)}
            isBookmarked={isBookmarked}
            expandedSections={expandedSections}
            onToggleExpand={handleToggleExpand}
          />
        </Box>
      </Box>
    );
  }, [classes, handleRetry, handleBookmark, bookmarkedMessages, messages, expandedSections, handleToggleExpand, stableMessageStyles]);

  // Scroll to bottom on initial render and when messages change
  React.useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  return (
    <Box className={classes.messageArea}>
      <div 
        ref={scrollContainerRef}
        className={classes.messagesContainer}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 0',
          position: 'relative', // Add position relative for absolute positioning context
        }}
      >
        {messages.map(message => renderMessage(message))}
        
        {/* Show loading indicator at the bottom if isLoading */}
        {isLoading && (
          <div 
            className={classes.typingIndicator} 
            style={{ 
              position: 'sticky', // Use sticky instead of absolute to keep it visible when scrolling
              bottom: '16px',     // Distance from bottom of container
              left: '50%',        // Center horizontally
              transform: 'translateX(-50%)', // Center horizontally
              marginTop: '16px',  // Add some space after the last message
              alignSelf: 'center', // For flex alignment
              width: 'fit-content' // Ensure it's not taking full width
            }}
          >
            <Typography className="loading-header">
              One moment...
            </Typography>
            <Typography className="loading-text">
              Response is being generated...
            </Typography>
            <div className="dots" style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
              <span style={{ 
                fontSize: '24px', 
                lineHeight: '10px',
                marginRight: '4px',
                animation: 'dotFadeInOut 1.4s infinite',
                animationDelay: '0s'
              }}>.</span>
              <span style={{ 
                fontSize: '24px', 
                lineHeight: '10px',
                marginRight: '4px',
                animation: 'dotFadeInOut 1.4s infinite',
                animationDelay: '0.2s'
              }}>.</span>
              <span style={{ 
                fontSize: '24px', 
                lineHeight: '10px',
                animation: 'dotFadeInOut 1.4s infinite',
                animationDelay: '0.4s'
              }}>.</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Simple scroll to bottom button - will enhance in Phase 2 */}
      {showScrollToBottom && (
        <Button
          variant="contained"
          size="small"
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            zIndex: 10,
            minWidth: 'auto',
            borderRadius: '50%',
            padding: '8px',
          }}
        >
          ↓
        </Button>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Simple memoization check - we'll enhance this in Phase 3
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.bookmarkedMessages === nextProps.bookmarkedMessages &&
    prevProps.isLoading === nextProps.isLoading
  );
});

const DocumentUploadPane = ({ 
  currentSessionId, 
  vectorstores = [], 
  selectedVectorstore = '', 
  isLoadingVectorstores = false, 
  onVectorstoreChange
}) => {
  const classes = useStyles();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [pollingIds, setPollingIds] = useState(new Set());
  
  const CLASSIFICATION_LEVELS = {
    SELECT: "SELECT CLASSIFICATION",
    UNCLASSIFIED: "Unclassified",
    SECRET: "Secret",
    TOP_SECRET: "Top Secret"
  };

  useEffect(() => {
    const fetchDocumentStates = async () => {
      if (!currentSessionId) {
        setUploadedFiles([]);
        return;
      }
      
      try {
        setUploadError(null);
        const states = await getDocumentStates(currentSessionId);
        const files = Object.entries(states).map(([docId, state]) => ({
          id: docId,
          name: state.originalName,
          size: state.markdownSize,
          status: state.status || 'pending',
          isChecked: state.isChecked || false,
          classification: state.classification || CLASSIFICATION_LEVELS.SELECT
        }));
        setUploadedFiles(files);
        
        const pendingFiles = files.filter(file => file.status === 'pending');
        if (pendingFiles.length > 0) {
          setPollingIds(new Set(pendingFiles.map(file => file.id)));
        }
      } catch (error) {
        console.error('Error fetching document states:', error);
        setUploadError('Failed to load documents');
      }
    };

    fetchDocumentStates();
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId || pollingIds.size === 0) return;

    const pollInterval = setInterval(async () => {
      const updatedPollingIds = new Set(pollingIds);
      
      for (const docId of pollingIds) {
        try {
          const status = await getDocumentStatus(currentSessionId, docId);
          if (status.status !== 'pending') {
            // Update the file in the list
            setUploadedFiles(prev => prev.map(file => 
              file.id === docId ? { ...file, status: status.status } : file
            ));
            updatedPollingIds.delete(docId);
          }
        } catch (error) {
          console.error(`Error polling document status for ${docId}:`, error);
        }
      }
      
      setPollingIds(updatedPollingIds);
      
      if (updatedPollingIds.size === 0) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentSessionId, pollingIds]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!currentSessionId) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    for (const file of acceptedFiles) {
      try {
        const result = await uploadDocument(currentSessionId, file);
        setUploadedFiles(prev => [...prev, {
          id: result.docId,
          name: file.name,
          size: file.size,
          status: 'pending',
          isChecked: false,
          classification: CLASSIFICATION_LEVELS.SELECT
        }]);
        
        // Add to polling
        setPollingIds(prev => new Set([...prev, result.docId]));
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadError(`Failed to upload ${file.name}`);
      }
    }
    
    setIsUploading(false);
  }, [currentSessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    disabled: !currentSessionId || isUploading
  });

  const handleRemoveFile = async (docId) => {
    if (!currentSessionId) return;
    
    try {
      await deleteDocument(currentSessionId, docId);
      setUploadedFiles(prev => prev.filter(file => file.id !== docId));
      setPollingIds(prev => {
        const updated = new Set(prev);
        updated.delete(docId);
        return updated;
      });
    } catch (error) {
      console.error('Error removing file:', error);
      setUploadError('Failed to remove file');
    }
  };

  const handleCheckboxChange = async (docId) => {
    try {
      await toggleDocumentState(currentSessionId, docId);
      setUploadedFiles(prev => prev.map(file => 
        file.id === docId ? { ...file, isChecked: !file.isChecked } : file
      ));
    } catch (error) {
      console.error('Error toggling document state:', error);
      setUploadError('Failed to update document selection');
    }
  };

  const handleClassificationChange = async (docId, newClassification) => {
    try {
      await updateDocumentClassification(currentSessionId, docId, newClassification);
      setUploadedFiles(prev => prev.map(file => 
        file.id === docId ? { ...file, classification: newClassification } : file
      ));
    } catch (error) {
      console.error('Error updating classification:', error);
      setUploadError('Failed to update classification');
    }
  };

  // Add a useEffect to log props updates in DocumentUploadPane
  // At the beginning of the DocumentUploadPane component
  useEffect(() => {
    console.log("DocumentUploadPane rendered with props:", {
      currentSessionId,
      vectorstores,
      selectedVectorstore,
      isLoadingVectorstores
    });
  }, [currentSessionId, vectorstores, selectedVectorstore, isLoadingVectorstores]);

  return (
    <Paper className={classes.docUploadContainer} elevation={3}>
      <Typography variant="h6" className={classes.panelHeader}>
        Knowledge Sources
      </Typography>
      
      {/* Vectorstore Selection */}
      <div className={classes.vectorstoreSection}>
        <Typography variant="subtitle2" className={classes.sectionLabel}>
          MAGE Retrieval Databases
        </Typography>
        
        {/* Replace Material-UI Select with native select */}
        <select
          value={selectedVectorstore || ""}
          onChange={(e) => {
            console.log("Vectorstore selected:", e.target.value);
            if (onVectorstoreChange) {
              onVectorstoreChange(e);
            }
          }}
          disabled={!currentSessionId || isLoadingVectorstores}
          className={classes.nativeSelect}
        >
          <option value="">Select Vectorstore</option>
          {vectorstores && vectorstores.length > 0 ? (
            vectorstores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name || store.id}
              </option>
            ))
          ) : (
            <option value="" disabled>Loading vectorstores...</option>
          )}
        </select>
        
        <Link 
          href="/retrieval/build-databases" 
          className={classes.buildDatabasesLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Build Retrieval Databases
        </Link>
      </div>
      
      <Divider className={classes.divider} />
      
      {/* Document Upload */}
      <Typography variant="h6" className={classes.docUploadHeader}>
        Document Upload
      </Typography>
      
      <div {...getRootProps()} className={classes.dropzone}>
        <input {...getInputProps()} />
        <CloudUploadIcon className={classes.uploadIcon} />
        <Typography className={classes.uploadText}>
          {!currentSessionId
            ? 'Please select a chat session first'
            : isDragActive
              ? 'Drop the files here...'
              : isUploading
                ? 'Uploading...'
                : 'Drag & drop files here, or click to select files'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Supported formats: PDF, TXT, DOC, DOCX, XLSX, CSV
        </Typography>
      </div>
      <div className={classes.fileList}>
        {uploadedFiles.map(file => (
          <div key={file.id} className={classes.fileItem}>
            <div className={classes.fileItemRow}>
              <Checkbox
                checked={file.isChecked}
                onChange={() => handleCheckboxChange(file.id)}
                color="primary"
                size="small"
                style={{ padding: '4px', marginRight: '8px' }}
              />
              <Typography variant="body2" style={{ flex: 1 }}>
                {file.name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleRemoveFile(file.id)}
                disabled={isUploading}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </div>
            <FormControl className={classes.classificationSelect} size="small">
              <Select
                value={file.classification || CLASSIFICATION_LEVELS.SELECT}
                onChange={(e) => handleClassificationChange(file.id, e.target.value)}
                variant="outlined"
                disabled={file.status === 'pending'}
              >
                <MenuItem value={CLASSIFICATION_LEVELS.SELECT} disabled>
                  {CLASSIFICATION_LEVELS.SELECT}
                </MenuItem>
                <MenuItem value={CLASSIFICATION_LEVELS.UNCLASSIFIED}>
                  {CLASSIFICATION_LEVELS.UNCLASSIFIED}
                </MenuItem>
                <MenuItem value={CLASSIFICATION_LEVELS.SECRET}>
                  {CLASSIFICATION_LEVELS.SECRET}
                </MenuItem>
                <MenuItem value={CLASSIFICATION_LEVELS.TOP_SECRET}>
                  {CLASSIFICATION_LEVELS.TOP_SECRET}
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        ))}
      </div>
    </Paper>
  );
};

const DirectChat = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useDirectChat();
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Local state management
  const [messages, setMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [promptHelpOpen, setPromptHelpOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState([]);
  const [error, setError] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [classificationLevel, setClassificationLevel] = useState(0);
  
  // Add state for vectorstores
  const [vectorstores, setVectorstores] = useState([]);
  const [selectedVectorstore, setSelectedVectorstore] = useState('');
  const [isLoadingVectorstores, setIsLoadingVectorstores] = useState(false);
  
  // Add state for caveats checkboxes
  const [caveatStates, setCaveatStates] = useState({
    NOFORN: false,
    FVEY: false,
    USA: false,
    UK: false,
    AUS: false,
    NZ: false,
    CAN: false,
    NATO: false,
    HCS: false,
    SAP: false,
    TK: false
  });

  // Add delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [deleteSessionName, setDeleteSessionName] = useState('');

  // Function to reset all caveats
  const resetCaveats = () => {
    setCaveatStates({
      NOFORN: false,
      FVEY: false,
      USA: false,
      UK: false,
      AUS: false,
      NZ: false,
      CAN: false,
      NATO: false,
      HCS: false,
      SAP: false,
      TK: false
    });
  };

  // Load chat sessions on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const sessions = await getAllChatSessions();
        setChatSessions(sessions);
        // Set current session to the first one if none selected
        if (sessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessions[0].id);
        }
      } catch (error) {
        setError('Failed to load chat sessions');
      }
    };
    loadChatSessions();
  }, [currentSessionId]);

  // Load chat history when session changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentSessionId) {
        try {
          const history = await getChatHistory(currentSessionId);
          setMessages(history);
        } catch (error) {
          setError('Failed to load chat history');
        }
      }
    };
    loadChatHistory();
  }, [currentSessionId]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const messageText = state.input.trim();
    
    if (!messageText || !currentSessionId || isLoading) return;

    // Generate a unique ID for the message
    const userMessageId = `user-${Date.now()}`;
    
    // Add user message to UI immediately
    const userMessage = {
      id: userMessageId,
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    dispatch({ type: ACTIONS.SET_INPUT, payload: '' });
    setIsLoading(true);

    try {
      // Send message to backend with session ID
      const response = await sendMessage(messageText, currentSessionId);
      
      // Add AI response to UI
      const aiMessage = {
        id: `ai-${Date.now()}`,
        text: response.message,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: `Error: Failed to send message. ${error.message || 'Please try again.'}`,
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    // Restore original implementation that directly creates a new session
    try {
      const newSession = await createChatSession();
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]); // Clear messages for new session
      setClassificationLevel(0); // Reset classification to Unclassified
      resetCaveats(); // Reset all caveats checkboxes
      setSelectedVectorstore(''); // Reset vectorstore selection to default
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      setError('Failed to create new chat');
    }
  };
  
  const handleDeleteConfirmation = (event, sessionId) => {
    // Prevent the event from bubbling up to the ListItem
    event.stopPropagation();
    
    // Find session name for confirmation message
    const sessionToDelete = chatSessions.find(s => s.id === sessionId);
    
    if (sessionToDelete) {
      setDeleteSessionId(sessionId);
      setDeleteSessionName(sessionToDelete.name);
      setDeleteDialogOpen(true);
    }
  };
  
  const handleDeleteChat = async () => {
    try {
      await deleteChatSession(deleteSessionId);
      setChatSessions(prev => prev.filter(session => session.id !== deleteSessionId));
      
      if (deleteSessionId === currentSessionId) {
        const remainingSessions = chatSessions.filter(s => s.id !== deleteSessionId);
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      setError('Failed to delete chat');
    } finally {
      // Close the confirmation dialog
      setDeleteDialogOpen(false);
      setDeleteSessionId(null);
      setDeleteSessionName('');
    }
  };

  const handleSelectSession = async (sessionId) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    setMessages([]); // Clear messages before loading new ones
    setClassificationLevel(0); // Reset classification to Unclassified
    resetCaveats(); // Reset all caveats checkboxes
    
    // Always reset the vectorstore selection when switching sessions
    // to ensure users explicitly select a vectorstore
    setSelectedVectorstore('');
    console.log('Vectorstore selection reset when switching to session:', sessionId);
    
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputChange = (event) => {
    dispatch({ type: ACTIONS.SET_INPUT, payload: event.target.value });
  };

  const handleKeyPress = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSendMessage(event);
    }
  };

  // Removed interactive scroll functions and tracking
  const handleScroll = useCallback(() => {
    // Not tracking anything - giving full control to the user
  }, []);

  // Empty implementations - these were used by scroll buttons which are now removed
  const scrollToTop = () => {
    // Disabled - no auto-scrolling
  };

  const scrollToBottom = () => {
    // Disabled - no auto-scrolling
  };

  const handleRetry = useCallback(async (failedMessage) => {
    setIsLoading(true);
    try {
      const response = await sendMessage(failedMessage);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: response.message,
        sender: 'ai',
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error retrying message:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBookmark = useCallback((message) => {
    setBookmarkedMessages(prev => {
      const exists = prev.some(msg => msg.messageId === message.id);
      if (exists) {
        return prev.filter(msg => msg.messageId !== message.id);
      }
      return [...prev, { messageId: message.id, text: message.text }];
    });
  }, []);

  const handleEditSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setEditingSession(session);
      setEditSessionName(session.name);
      setEditDialogOpen(true);
    }
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingSession(null);
    setEditSessionName('');
  };

  const handleEditSessionSubmit = async () => {
    if (!editingSession || !editSessionName.trim()) return;

    try {
      const response = await updateSessionName(editingSession.id, editSessionName.trim());
      setChatSessions(prev => prev.map(session => 
        session.id === editingSession.id 
          ? response.session 
          : session
      ));
      handleEditDialogClose();
    } catch (error) {
      setError('Failed to update session name');
    }
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
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleHelpOpen = () => {
    setHelpDialogOpen(true);
  };

  const handleHelpClose = () => {
    setHelpDialogOpen(false);
  };

  const handlePromptHelpOpen = () => {
    setPromptHelpOpen(true);
  };

  const handlePromptHelpClose = () => {
    setPromptHelpOpen(false);
  };

  const handleClassificationChange = (event, newValue) => {
    setClassificationLevel(newValue);
  };

  // Add handler for checkbox changes
  const handleCaveatChange = (caveat) => (event) => {
    setCaveatStates(prev => ({
      ...prev,
      [caveat]: event.target.checked
    }));
  };

  // Load vectorstores
  useEffect(() => {
    const loadVectorstores = async () => {
      if (!isLoadingVectorstores) {
        setIsLoadingVectorstores(true);
        try {
          const stores = await getVectorstores();
          console.log("Loaded vectorstores:", stores);
          setVectorstores(stores);
          
          // We're intentionally NOT loading the previously selected vectorstore
          // so that users must explicitly select one each time they switch sessions
          
        } catch (error) {
          console.error('Error loading vectorstores:', error);
        } finally {
          setIsLoadingVectorstores(false);
        }
      }
    };
    
    loadVectorstores();
  }, [currentSessionId]); // Remove isLoadingVectorstores to prevent potential loops

  // Handle vectorstore change
  const handleVectorstoreChange = async (event) => {
    if (!currentSessionId) {
      console.log("No current session selected");
      return;
    }
    
    try {
      const newVectorstore = event.target.value;
      console.log("Vectorstore selected:", newVectorstore);
      
      // Update UI immediately
      setSelectedVectorstore(newVectorstore);
      
      // Then update backend
      console.log("Updating backend with vectorstore:", newVectorstore);
      await setSessionVectorstore(currentSessionId, newVectorstore);
      console.log("Vectorstore set successfully");
    } catch (error) {
      console.error('Error setting vectorstore:', error);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      setMessages([]);
      setChatSessions([]);
      setBookmarkedMessages([]);
      setCurrentSessionId(null);
      setError(null);
      setIsLoading(false);
    };
  }, []);

  // Add debugging logs before return
  console.log("Current vectorstore value:", selectedVectorstore);
  console.log("Available vectorstores:", vectorstores);

  return (
    <Container className={classes.root} maxWidth="xl">
      <div className={classes.chatContainer}>
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
                <ListItem 
                  button 
                  className={classes.chatSessionItem}
                  selected={session.id === currentSessionId}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div style={{ flex: 1 }}>
                    <ListItemText 
                      primary={session.name} 
                      secondary={
                        <Typography 
                          variant="caption" 
                          color="textSecondary" transparent
                          style={{ paddingTop: '0.25rem', display: 'block', fontSize: '0.75rem' }}
                        >
                          {new Date(session.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })} {new Date(session.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}    •••    ID: {session.id.split('-')[0]}
                        </Typography>
                      }
                    />
                  </div>
                  <div className={classes.sessionActions}>
                    <Tooltip title="Edit">
                      <IconButton edge="end" aria-label="edit" onClick={() => handleEditSession(session.id)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton edge="end" aria-label="delete" onClick={(e) => handleDeleteConfirmation(e, session.id)}>
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
        <Paper className={`${classes.chatArea} ${!currentSessionId ? 'disabled' : ''} ${isFullscreen ? classes.fullscreen : ''}`} elevation={3}>
          {!currentSessionId && (
            <div className={classes.noSessionsOverlay}>
              <Typography variant="h6" color="textSecondary">
                Please create a new chat session to begin
              </Typography>
            </div>
          )}
          <div className={classes.buttonBar}>
            <Typography className={classes.sessionName}>
              {isFullscreen && chatSessions.find(session => session.id === currentSessionId)?.name}
            </Typography>
            
            {/* Removed Vectorstore Dropdown */}
            
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
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </div>
          </div>
          <MessageArea 
            messages={messages}
            handleRetry={handleRetry}
            handleBookmark={handleBookmark}
            bookmarkedMessages={bookmarkedMessages}
            isLoading={isLoading}
            classes={classes}
          />
          <form onSubmit={handleSendMessage} className={classes.inputArea}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
            </div>
            
            <div className={classes.classificationSection}>
              <Typography variant="subtitle2" gutterBottom>
                Chat Classification & Caveats
              </Typography>
              
              <div className={classes.classificationRow}>
                <Typography className={classes.classificationLabel}>
                  Classification:
                </Typography>
                <div style={{ flex: .25, marginLeft: theme.spacing(1), marginRight: theme.spacing(2) }}>
                  <Slider
                    className={classes.classificationSlider}
                    value={classificationLevel}
                    onChange={handleClassificationChange}
                    step={null}
                    min={0}
                    max={2}
                    marks={[
                      { value: 0, label: 'Unclassified' },
                      { value: 1, label: 'Secret' },
                      { value: 2, label: 'Top Secret' },
                    ]}
                    style={{
                      color: classificationLevel === 0 ? '#4caf50' :
                            classificationLevel === 1 ? '#f44336' : '#ff9800'
                    }}
                  />
                </div>
              </div>
              
              <div className={classes.classificationRow}>
                <Typography className={classes.classificationLabel}>
                  Caveats:
                </Typography>
                <div className={classes.checkboxGroup}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.NOFORN}
                        onChange={handleCaveatChange('NOFORN')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>NOFORN</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.FVEY}
                        onChange={handleCaveatChange('FVEY')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>FVEY</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.USA}
                        onChange={handleCaveatChange('USA')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>USA</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.UK}
                        onChange={handleCaveatChange('UK')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>UK</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.AUS}
                        onChange={handleCaveatChange('AUS')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>AUS</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.NZ}
                        onChange={handleCaveatChange('NZ')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>NZ</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.CAN}
                        onChange={handleCaveatChange('CAN')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>CAN</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.NATO}
                        onChange={handleCaveatChange('NATO')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>NATO</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.HCS}
                        onChange={handleCaveatChange('HCS')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>HCS</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.SAP}
                        onChange={handleCaveatChange('SAP')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>SAP</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        size="small" 
                        checked={caveatStates.TK}
                        onChange={handleCaveatChange('TK')}
                      />
                    }
                    label={<Typography className={classes.checkboxLabel}>TK</Typography>}
                  />
                </div>
              </div>
            </div>
          </form>
        </Paper>
        <DocumentUploadPane 
          currentSessionId={currentSessionId}
          vectorstores={vectorstores}
          selectedVectorstore={selectedVectorstore}
          isLoadingVectorstores={isLoadingVectorstores}
          onVectorstoreChange={handleVectorstoreChange}
        />
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
      <Dialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        aria-labelledby="edit-session-dialog-title"
      >
        <DialogTitle id="edit-session-dialog-title">
          Edit Session Name
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Name"
            type="text"
            fullWidth
            value={editSessionName}
            onChange={(e) => setEditSessionName(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleEditSessionSubmit} 
            color="primary"
            disabled={!editSessionName.trim() || editSessionName === editingSession?.name}
          >
            Save
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
            onClick={handleDeleteChat}
            color="secondary"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default React.memo(DirectChat);