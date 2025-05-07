import React, { useState, useEffect, useRef, useCallback, memo, useReducer, useContext, forwardRef, useMemo } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Box,
  IconButton,
  Divider,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControl,
  FormControlLabel,
  Fade,
  Link,
  InputAdornment,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
} from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import SendIcon from '@material-ui/icons/Send';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
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
import { useDirectChat, ACTIONS } from '../../contexts/DirectChatContext';
import { AuthContext } from '../../contexts/AuthContext';
import ReplayIcon from '@mui/icons-material/Replay';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight'; // Import ChevronRightIcon
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
} from '../../services/directChatService';
import { useMarkdownComponents } from '../../styles/markdownStyles';
import Slider from '@material-ui/core/Slider';
import rehypeRaw from 'rehype-raw';
import { GradientText } from '../../styles/StyledComponents';
import DirectChatHistoryPanel from './DirectChatHistoryPanel'; // Import the new component
import DirectChatKnowledgeSourcesPanel from './DirectChatKnowledgeSourcesPanel'; // Import the new component
import { Alert } from '@material-ui/lab'; // Import Alert for error display

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
    padding: theme.spacing(0, 2, 2, 2), // Removed top padding
    height: 'calc(100vh)',
    maxHeight: 'calc(100vh)',
    overflow: 'hidden',
    marginTop: '0px', // Removed top margin
  },
  chatContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    gap: theme.spacing(2),
  },
  chatArea: {
    width: '60%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
    transition: 'opacity 0.3s ease',
    borderTop: `${theme.custom.borderWidth.extraThick}px solid transparent`,
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    borderRight: `3px solid ${theme.palette.primary.main}`,
    borderBottom: `${theme.custom.borderWidth.extraThick}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.7)',
    animation: '$pulseBorder 2s infinite',
    '&.disabled': {
      opacity: 0.5,
      pointerEvents: 'none',
      '& .MuiInputBase-root': {
        backgroundColor: theme.palette.action.disabledBackground,
      }
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.vibrant,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.extraThick,
      left: theme.custom.borderWidth.extraThick,
      right: theme.custom.borderWidth.extraThick,
      bottom: theme.custom.borderWidth.extraThick,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.extraThick/2,
      background: theme.palette.background.paper,
      zIndex: -1,
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
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    overflow: 'hidden', // Ensure no overflow outside container
    transition: 'opacity 0.3s ease',
    position: 'relative',
    border: `${theme.custom.borderWidth.regular}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    '&.disabled': {
      opacity: 0.5,
      pointerEvents: 'none',
      filter: 'grayscale(50%)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient2,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.regular,
      left: theme.custom.borderWidth.regular,
      right: theme.custom.borderWidth.regular,
      bottom: theme.custom.borderWidth.regular,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.regular/2,
      background: theme.palette.background.paper,
      zIndex: -1,
    },
    '& > *': {
      position: 'relative',
      zIndex: 1
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
    transition: theme.custom.transition,
    width: '100%',
    boxSizing: 'border-box',
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
    width: '100%',
    overflowY: 'auto',
    paddingRight: theme.spacing(1),
    height: '100%', // Use full height of parent container
    paddingBottom: theme.spacing(3), // Add padding at bottom to ensure space before border
    position: 'relative',
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[500],
      borderRadius: '4px',
    },
  },
  fileItem: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    transition: theme.custom.transition,
    width: '100%',
    boxSizing: 'border-box',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateY(-1px)',
      boxShadow: theme.custom.boxShadow,
    },
    '&:last-child': {
      marginBottom: theme.spacing(4), // Add extra margin to the last file item
    },
  },
  fileItemRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
    width: '100%',
    overflow: 'hidden',
  },
  classificationSelect: {
    marginTop: theme.spacing(0.5),
    width: '100%',
    '& .MuiOutlinedInput-input': {
      padding: theme.spacing(1),
    },
    '& .MuiSelect-select': {
      padding: theme.spacing(0.75, 1),
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.shape.borderRadius,
    },
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
    borderTop: `1px solid ${theme.palette.primary.main}`,
    borderLeft: `3px solid ${theme.palette.primary.main}`, // Added left border
    borderRight: `3px solid ${theme.palette.primary.main}`, // Added right border
    borderBottom: `3px solid ${theme.palette.primary.main}`, // Added bottom border
    // Consider adding border-radius if the main chatArea has rounded corners at the bottom
    // borderBottomLeftRadius: theme.shape.borderRadius, 
    // borderBottomRightRadius: theme.shape.borderRadius,
    minHeight: '76px',
    position: 'relative',
    zIndex: 2,
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
      overflow: 'hidden',
    },
    '& textarea': {
      overflow: 'auto !important',
      paddingTop: '8px !important',
      paddingBottom: '8px !important',
    },
  },
  newChatButton: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    width: '90%',
    alignSelf: 'center',
    background: theme.custom.gradients.gradient1,
    transition: theme.custom.transition,
    position: 'relative',
    zIndex: 2,
    '&:hover': {
      background: theme.custom.gradients.vibrant,
      transform: 'translateY(-2px)',
      boxShadow: theme.custom.boxShadowLarge,
    },
  },
  message: {
    padding: theme.spacing(2),
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    wordBreak: 'break-word',
    position: 'relative',
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
    backgroundColor: theme.custom.gradients.vibrant,
    maxWidth: '85%',
    '&:hover': {
      boxShadow: theme.custom.boxShadowLarge,
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
    backgroundColor: 'rgb(46, 46, 46)',
    color: '#ffffff !important',
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
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      '& .MuiSvgIcon-root': {
        color: theme.palette.primary.dark,
      },
    },
  },
  aiMessage: {
    backgroundColor: 'rgba(5, 0, 44, 0.23)',
    color: theme.palette.text.primary,
    borderRadius: '18px 18px 18px 4px',
    padding: theme.spacing(1.5, 2),
    position: 'relative',
    marginBottom: theme.spacing(1),
    maxWidth: '80%',
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
    transition: theme.custom.transition,
    position: 'relative',
    zIndex: 2,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateY(-1px)',
      boxShadow: theme.custom.boxShadow,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
      '& .MuiTypography-root': {
        color: theme.palette.common.white,
      },
      '& .MuiSvgIcon-root': {
        color: theme.palette.common.white,
      },
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
    '&:last-child': {
      marginBottom: theme.spacing(4), // Add extra margin to the last chat session item
    },
  },
  sessionsList: {
    padding: theme.spacing(1),
    paddingBottom: theme.spacing(3),
    position: 'relative',
    zIndex: 2,
    overflowY: 'auto',
    height: '100%',
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[500],
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.grey[600],
      },
    },
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
    zIndex: 2,
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
    position: 'relative',
    zIndex: 1,
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
    opacity: 0.85,
    transition: theme.custom.transition,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      opacity: 1,
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '20px',
      margin: 'auto',
      color: theme.palette.primary.main,
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
      backgroundColor: theme.palette.background.paper,
      borderRadius: '10px',
      boxShadow: theme.custom.boxShadowLarge,
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
      maxWidth: 700,
      padding: theme.spacing(2),
      backgroundColor: theme.palette.background.paper,
      borderRadius: '10px',
      boxShadow: theme.custom.boxShadowLarge,
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
  '@keyframes borderGlow': {
    '0%': {
      opacity: 1,
      background: 'linear-gradient(135deg, #4285f4, #34a853, #ea4335)',
      backgroundSize: '200% 200%',
      backgroundPosition: '0% 0%',
      filter: 'brightness(1.2) contrast(1.3)',
    },
    '25%': {
      opacity: 1,
      background: 'linear-gradient(to right, #4285f4, #34a853, #fbbc05)',
      backgroundSize: '200% 200%',
      backgroundPosition: '50% 0%',
      filter: 'brightness(1.3) contrast(1.4)',
    },
    '50%': {
      opacity: 1,
      background: 'linear-gradient(45deg, #ea4335, #4285f4, #34a853)',
      backgroundSize: '200% 200%',
      backgroundPosition: '100% 50%',
      filter: 'brightness(1.4) contrast(1.5)',
    },
    '75%': {
      opacity: 1,
      background: 'linear-gradient(to bottom, #fbbc05, #ea4335, #4285f4)',
      backgroundSize: '200% 200%',
      backgroundPosition: '50% 100%',
      filter: 'brightness(1.3) contrast(1.4)',
    },
    '100%': {
      opacity: 1,
      background: 'linear-gradient(to left, #34a853, #fbbc05, #ea4335)',
      backgroundSize: '200% 200%',
      backgroundPosition: '0% 100%',
      filter: 'brightness(1.2) contrast(1.3)',
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
    transition: theme.custom.transition,
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
    opacity: 0.85,
    transition: theme.custom.transition,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      opacity: 1,
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '20px',
      margin: 'auto',
      color: theme.palette.primary.main,
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
    opacity: 0.2,
    transition: theme.custom.transition,
    zIndex: 10,
  },
  topActions: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    bottom: 'auto',
    display: 'flex',
    gap: theme.spacing(1),
    opacity: 0.2,
    transition: theme.custom.transition,
    zIndex: 10,
    pointerEvents: 'auto',
  },
  userMessageActions: {
    position: 'absolute',
    right: theme.spacing(1),
    bottom: theme.spacing(1),
    top: 'auto',
    display: 'flex',
    gap: theme.spacing(1),
    opacity: 0.2,
    transition: theme.custom.transition,
    zIndex: 3,
  },
  userMessageText: {
    fontSize: '0.95rem',
    color: '#FFFFFF !important',
    whiteSpace: 'pre-wrap',
    textAlign: 'left',
    wordBreak: 'break-word',
    paddingRight: '40px',
    '& *': {
      color: '#FFFFFF !important'
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
  '@keyframes dropRibbon': {
    from: {
      opacity: 0,
      transform: 'scaleY(0)',
    },
    to: {
      opacity: 1,
      transform: 'scaleY(1)',
    },
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
    transition: theme.custom.transition,
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
    textAlign: 'left',
    '& p, & ul, & ol, & li, & blockquote': {
      textAlign: 'left',
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
    transition: theme.custom.transition,
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
    backgroundColor: 'transparent',
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
    position: 'relative',
    zIndex: 2,
  },
  panelHeader: {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  vectorstoreSection: {
    marginBottom: theme.spacing(2),
    width: '100%',
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
    width: '100%',
    textAlign: 'left',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  docUploadHeader: {
    fontSize: '1.2rem',
    fontWeight: 500,
    marginBottom: theme.spacing(1),
  },
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
    boxSizing: 'border-box',
    '&:focus': {
      outline: 'none',
      border: `1px solid ${theme.palette.primary.main}`,
    },
    '&:disabled': {
      opacity: 0.7,
      backgroundColor: theme.palette.action.disabledBackground,
    }
  },
  // Add a style for an uploadPaneContent container
  uploadPaneContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden', // Prevent overall overflow
  },

  // Add a style for the fileListContainer to control flex behavior
  fileListContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: '100px',
  },

  // Add styles for chat log content container
  chatLogContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  
  chatSessionsContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: '100px',
    paddingBottom: theme.spacing(2), // Ensure content doesn't touch bottom border
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
  const isThinkingExpanded = expandedSections ? expandedSections[`message-${messageId}-think`] : false;

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
            color="primary"
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
            {/* Thinking sections FIRST */}
            {thinkSections.length > 0 && (
              <div className={classes.thinkingProcess} style={{ marginBottom: '16px' }}>
                <details 
                  className={classes.markdownDetails}
                  open={isThinkingExpanded}
                  onClick={(e) => {
                    if (e.target.tagName.toLowerCase() === 'summary') {
                      e.preventDefault();
                      handleToggle(`message-${messageId}-think`);
                    }
                  }}
                >
                  {/* Modified Summary with ChevronRight/ExpandMore Icons */}
                  <summary style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    {isThinkingExpanded ? 
                      <ExpandMoreIcon style={{ marginRight: 8 }} /> : // Down arrow when expanded
                      <ChevronRightIcon style={{ marginRight: 8 }} /> // Right arrow when collapsed
                    }
                    AI Pre-Reasoning
                  </summary>
                  <div style={{ padding: '8px 0' }}>
                    {thinkSections.map((section, index) => (
                      <div key={`section-${messageId}-${index}`} style={{ marginBottom: index < thinkSections.length - 1 ? '12px' : 0 }}>
                        <ReactMarkdown
                          rehypePlugins={[rehypeRaw]}
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: CodeBlock,
                            ol: (props) => {
                              const { ordered, ...sanitizedProps } = props;
                              return <ol {...sanitizedProps} style={{ margin: '8px 0', paddingLeft: '20px', textAlign: 'left' }} />;
                            },
                            li: (props) => {
                              const { ordered, ...sanitizedProps } = props;
                              return <li {...sanitizedProps} style={{ textAlign: 'left' }} />;
                            }
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

            {/* Main content AFTER thinking process */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code: CodeBlock,
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
                ol: (props) => {
                  const { ordered, ...sanitizedProps } = props;
                  return <ol {...sanitizedProps} style={{ margin: '8px 0', paddingLeft: '20px', textAlign: 'left' }} />;
                },
                li: (props) => {
                  const { ordered, ...sanitizedProps } = props;
                  return <li {...sanitizedProps} style={{ textAlign: 'left' }} />;
                },
              }}
              className={classes.markdown}
              skipHtml={false}
            >
              {mainContent}
            </ReactMarkdown>
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
              color="primary"
            >
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
            {!isUser && (
              <IconButton
                className={classes.bookmarkButton}
                onClick={onBookmark}
                size="small"
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                color="primary"
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
            color="primary"
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
    // Ensure message has an ID, fallback to index + timestamp if undefined
    const messageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <Box 
        sx={isUserMessage ? stableMessageStyles.userWrapper : stableMessageStyles.aiWrapper}
        key={`message-wrapper-${messageId}`}
      >
        <Box 
          id={`message-${messageId}`}
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
            messageId={messageId}
            onBookmark={() => handleBookmark({...message, id: messageId})}
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

const DirectChat = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { state, dispatch } = useDirectChat();
  const { token } = useContext(AuthContext);
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const [messages, setMessages] = useState({}); 
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sendingSessions, setSendingSessions] = useState(new Set()); 
  const [promptHelpOpen, setPromptHelpOpen] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState([]);
  const [error, setError] = useState(null); // General error state
  const [editingSession, setEditingSession] = useState(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [classificationLevel, setClassificationLevel] = useState(0);
  
  const [vectorstores, setVectorstores] = useState([]);
  const [selectedVectorstore, setSelectedVectorstore] = useState('');
  const [isLoadingVectorstores, setIsLoadingVectorstores] = useState(false);
  const [vectorstoreError, setVectorstoreError] = useState(null); // New state for VS specific errors

  const [caveatStates, setCaveatStates] = useState({
    NOFORN: false, FVEY: false, USA: false, UK: false, AUS: false, NZ: false, CAN: false, NATO: false, HCS: false, SAP: false, TK: false
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [deleteSessionName, setDeleteSessionName] = useState('');

  const [sortCriteria, setSortCriteria] = useState('createdAt_desc');

  // Load chat sessions on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        setError(null); // Clear general errors
        const sessions = await getAllChatSessions(token);
        setChatSessions(sessions); 
        if (sessions.length > 0 && !currentSessionId) {
          // Don't automatically select first session, let user choose or handle initial load logic elsewhere
          // setCurrentSessionId(sessions[0].id); 
        }
      } catch (error) {
        setError('Failed to load chat sessions');
        console.error('Error loading chat sessions:', error);
      }
    };
    loadChatSessions();
  }, [token]); // Removed currentSessionId dependency

  // Load available vectorstores on mount (or when needed)
  useEffect(() => {
    const loadVectorstores = async () => {
      setIsLoadingVectorstores(true);
      setVectorstoreError(null); // Clear VS errors
      try {
        const stores = await getVectorstores(token);
        console.log("Loaded available vectorstores:", stores);
        setVectorstores(stores || []); // Ensure it's an array
      } catch (error) {
        console.error('Error loading vectorstores:', error);
        setVectorstoreError('Failed to load available databases.'); // Set VS specific error
      } finally {
        setIsLoadingVectorstores(false);
      }
    };
    loadVectorstores();
  }, [token]); // Only depends on token

  // Memoized sorted chat sessions
  const sortedChatSessions = useMemo(() => {
    if (!chatSessions) return [];
    return [...chatSessions].sort((a, b) => {
      const [field, direction] = sortCriteria.split('_');
      // Adjust field names if needed based on actual session object properties
      const dateA = new Date(a[field === 'createdAt' ? 'created_at' : 'updated_at']); 
      const dateB = new Date(b[field === 'createdAt' ? 'created_at' : 'updated_at']);

      if (isNaN(dateA) || isNaN(dateB)) {
        // Handle cases where dates might be invalid
        return 0; 
      }

      if (direction === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  }, [chatSessions, sortCriteria]);

  const handleSortChange = (event) => {
    setSortCriteria(event.target.value);
  };

  // Load chat history ONLY when session ID changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentSessionId && token) {
        // Only load if messages for this session aren't already loaded
        if (!messages[currentSessionId]) { 
           try {
            setError(null); // Clear general errors
            const history = await getChatHistory(currentSessionId, token);
            const validatedHistory = history.map(msg => ({
              ...msg,
              id: msg.id || `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }));
            setMessages(prev => ({ ...prev, [currentSessionId]: validatedHistory }));
          } catch (error) {
            setError('Failed to load chat history');
            console.error(`Error loading history for ${currentSessionId}:`, error);
            setMessages(prev => ({ ...prev, [currentSessionId]: [] }));
          }
        }
      }
    };
    loadChatHistory();
  }, [currentSessionId, token]); // Dependencies: session ID and token

  // Scroll to bottom effect
  useEffect(() => {
    // Logic to scroll based on messages[currentSessionId]
    // This remains unchanged
    // if (messages[currentSessionId]?.length > 0) {
    //   messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }
  }, [messages, currentSessionId]); // Depend on current session's messages

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const messageText = state.input.trim();
    
    // Check if this specific session is already loading
    if (!messageText || !currentSessionId || sendingSessions.has(currentSessionId)) return;

    // Generate a unique ID for the message
    const userMessageId = `user-${Date.now()}`;
    
    // Add user message to UI immediately
    const userMessage = {
      id: userMessageId,
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Update messages for current session only
    setMessages(prev => ({
      ...prev,
      [currentSessionId]: [...(prev[currentSessionId] || []), userMessage]
    }));
    
    dispatch({ type: ACTIONS.SET_INPUT, payload: '' });
    
    // Set loading state for this session only
    setSendingSessions(prev => new Set(prev).add(currentSessionId));
    setError(null); // Clear errors on new message send

    try {
      // Send message to backend with session ID
      const response = await sendMessage(messageText, currentSessionId, token);
      
      // Add AI response to UI for current session only
      const aiMessage = {
        id: `ai-${Date.now()}`,
        // Ensure we handle potential nested structures in response
        text: typeof response.message === 'object' ? JSON.stringify(response.message) : response.message, 
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => ({
        ...prev,
        [currentSessionId]: [...(prev[currentSessionId] || []), aiMessage]
      }));
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessageText = `Error: Failed to send message. ${error.response?.data?.detail || error.message || 'Please try again.'}`;
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: errorMessageText,
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      
      // Add error message to current session only
      setMessages(prev => ({
        ...prev,
        [currentSessionId]: [...(prev[currentSessionId] || []), errorMessage]
      }));
      
      setError('Failed to send message'); // Set general error
    } finally {
      // Clear loading state for this session only
      setSendingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentSessionId);
        return newSet;
      });
    }
  };

  const handleNewChat = async () => {
    try {
      setError(null);
      setVectorstoreError(null);
      const newSession = await createChatSession(token);
      setChatSessions(prev => [newSession, ...prev]); 
      setCurrentSessionId(newSession.id);
      setMessages(prev => ({ ...prev, [newSession.id]: [] }));
      setClassificationLevel(0);
      resetCaveats();
      setSelectedVectorstore(''); // Explicitly reset VS on new chat
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      setError('Failed to create new chat');
      console.error('Error creating new chat:', error);
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
      setError(null);
      await deleteChatSession(deleteSessionId, token);
      
      // Remove from chatSessions state
      setChatSessions(prev => prev.filter(session => session.id !== deleteSessionId));
      
      // Remove messages from state
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[deleteSessionId];
        return newMessages;
      });
      
      // If the deleted session was the current one, select another or none
      if (deleteSessionId === currentSessionId) {
        const remainingSessions = sortedChatSessions.filter(s => s.id !== deleteSessionId); // Use sorted for consistent next selection
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id); // Select the "next" one based on current sort
        } else {
          setCurrentSessionId(null);
          setSelectedVectorstore(''); // Clear VS selection if no sessions left
        }
      }
      
    } catch (error) {
      setError('Failed to delete chat session');
      console.error(`Error deleting session ${deleteSessionId}:`, error);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteSessionId(null);
      setDeleteSessionName('');
    }
  };

  // **MODIFIED**: Load associated vector store on session select
  const handleSelectSession = async (sessionId) => {
    if (sessionId === currentSessionId) return; // Don't re-process if already selected

    setCurrentSessionId(sessionId);
    setError(null); // Clear general errors
    setVectorstoreError(null); // Clear previous VS errors
    setSelectedVectorstore(''); // Reset VS selection first
    
    setClassificationLevel(0); // Reset classification
    resetCaveats(); // Reset caveats
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);

    // Fetch metadata to get associated vectorstore
    try {
      console.log(`Fetching metadata for session: ${sessionId}`);
      const metadata = await getChatSessionMetadata(sessionId, token);
      console.log(`Metadata received for ${sessionId}:`, metadata);
      
      const associatedVectorstoreId = metadata?.vectorstore; // Get the ID from metadata

      if (associatedVectorstoreId) {
        // Check if the associated VS ID exists in the loaded list
        // Ensure vectorstores is an array before using find
        const storeExists = Array.isArray(vectorstores) && vectorstores.find(vs => vs.id === associatedVectorstoreId);
        
        if (storeExists) {
          console.log(`Setting selected vectorstore for session ${sessionId} to: ${associatedVectorstoreId}`);
          setSelectedVectorstore(associatedVectorstoreId);
        } else {
          console.warn(`Vectorstore ${associatedVectorstoreId} from session ${sessionId} metadata not found in available list.`);
          setVectorstoreError("Previously associated database is unavailable. Please select a new one.");
          setSelectedVectorstore(''); // Keep selection empty
        }
      } else {
        console.log(`No vectorstore associated with session ${sessionId} in metadata.`);
        setSelectedVectorstore(''); // No VS associated
      }
    } catch (error) {
      console.error(`Error fetching metadata for session ${sessionId}:`, error);
      // Don't set a general error, maybe a VS specific one? Or just log it.
      // setError('Failed to load session metadata.'); // Avoid setting general error here
      setVectorstoreError("Could not load previously associated database information."); // Set VS specific error
      setSelectedVectorstore(''); // Keep selection empty on error
    }
    
    // Note: Chat history loading is handled by the separate useEffect hook that depends on currentSessionId
  };

  const handleInputChange = (event) => {
    dispatch({ type: ACTIONS.SET_INPUT, payload: event.target.value });
  };

  const handleKeyPress = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSendMessage(event);
    }
  };

  // Empty scroll handlers - keep as is
  const handleScroll = useCallback(() => {}, []);
  const scrollToTop = () => {};
  const scrollToBottom = () => {};

  const handleRetry = useCallback(async (failedMessage) => {
    // Only allow retry if this session isn't already sending
    if (!currentSessionId || sendingSessions.has(currentSessionId) || !failedMessage) return;
    
    // Set loading state for this session only
    setSendingSessions(prev => new Set(prev).add(currentSessionId));
    setError(null); // Clear errors on retry
    
    try {
      const response = await sendMessage(failedMessage, currentSessionId, token);
      
      setMessages(prev => ({
        ...prev,
        [currentSessionId]: [...(prev[currentSessionId] || []), {
          id: `ai-retry-${Date.now()}`, // Use a unique ID for retry responses
          text: typeof response.message === 'object' ? JSON.stringify(response.message) : response.message,
          sender: 'ai',
          timestamp: new Date().toISOString()
        }]
      }));
    } catch (error) {
      console.error('Error retrying message:', error);
      const errorMessageText = `Error: Failed to retry message. ${error.response?.data?.detail || error.message || 'Please try again.'}`;
      setMessages(prev => ({
        ...prev,
        [currentSessionId]: [...(prev[currentSessionId] || []), {
          id: `error-retry-${Date.now()}`,
          text: errorMessageText,
          sender: 'system',
          timestamp: new Date().toISOString()
        }]
      }));
      setError('Failed to retry message'); // Set general error
    } finally {
      setSendingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentSessionId);
        return newSet;
      });
    }
  }, [currentSessionId, token, sendingSessions]); // Added sendingSessions dependency

  const handleBookmark = useCallback((message) => {
    setBookmarkedMessages(prev => {
      const exists = prev.some(msg => msg.messageId === message.id);
      if (exists) {
        return prev.filter(msg => msg.messageId !== message.id);
      }
      // Ensure message text exists before adding
      if (message.text) {
        return [...prev, { messageId: message.id, text: message.text, timestamp: message.timestamp }];
      }
      return prev; // Don't add if text is missing
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
      setError(null);
      const response = await updateSessionName(editingSession.id, editSessionName.trim(), token);
      
      // Ensure response exists and has expected structure
      const updatedSessionData = response?.session || { ...editingSession, name: editSessionName.trim(), updated_at: new Date().toISOString() };
      
      setChatSessions(prev => prev.map(session => 
        session.id === editingSession.id 
          ? updatedSessionData 
          : session
      ));
      handleEditDialogClose();
    } catch (error) {
      setError('Failed to update session name');
      console.error('Error updating session name:', error);
    }
  };

  const handleDownloadSession = async (sessionId) => {
    try {
      setError(null);
      const history = await getChatHistory(sessionId, token);
      const session = chatSessions.find(s => s.id === sessionId);
      const sessionName = session ? session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : sessionId;
      
      const chatData = JSON.stringify(history, null, 2);
      const blob = new Blob([chatData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${sessionName}-${sessionId.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download chat session');
      console.error(`Error downloading session ${sessionId}:`, error);
    }
  };

  const toggleFullscreen = () => {
    dispatch({ type: ACTIONS.SET_FULLSCREEN, payload: !state.isFullscreen });
  };

  const handlePromptHelpOpen = () => setPromptHelpOpen(true);
  const handlePromptHelpClose = () => setPromptHelpOpen(false);

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

  // Handle vectorstore selection change and update backend
  const handleVectorstoreChange = async (event) => {
    if (!currentSessionId) {
      console.log("No current session selected");
      setVectorstoreError("Please select a chat session first."); // User-friendly error
      return;
    }
    
    const newVectorstoreId = event.target.value;
    console.log("User selected vectorstore:", newVectorstoreId);
    
    // Optimistically update UI
    setSelectedVectorstore(newVectorstoreId);
    setVectorstoreError(null); // Clear errors on user selection change
    
    try {
      // Update backend - ensure ID is passed correctly (even if empty string for 'None')
      await setSessionVectorstore(currentSessionId, newVectorstoreId || null, token); // Send null if empty string
      console.log(`Vectorstore set successfully for session ${currentSessionId} to: ${newVectorstoreId || 'None'}`);
      // Optional: Show a success snackbar/message
    } catch (error) {
      console.error('Error setting session vectorstore:', error);
      setVectorstoreError('Failed to save database selection. Please try again.'); // Specific error
      // Optionally revert UI state, though optimistic update is usually preferred
      // setSelectedVectorstore(previousValue); // Need to store previous value if reverting
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      setMessages({});
      setChatSessions([]);
      setBookmarkedMessages([]);
      setCurrentSessionId(null);
      setError(null);
      setSendingSessions(new Set());
      setVectorstoreError(null);
      setSelectedVectorstore('');
    };
  }, []);

  // Get current session's messages
  const currentMessages = messages[currentSessionId] || [];
  
  // Check if current session is loading
  const isCurrentSessionLoading = sendingSessions.has(currentSessionId);

  // ForwardRef for TooltipIconButton
  const TooltipIconButton = forwardRef((props, ref) => (
    <IconButton {...props} ref={ref} />
  ));

  // Ensure resetCaveats is defined
  const resetCaveats = () => {
    setCaveatStates({
      NOFORN: false, FVEY: false, USA: false, UK: false, AUS: false, NZ: false, CAN: false, NATO: false, HCS: false, SAP: false, TK: false
    });
  };

  return (
    <Container className={classes.root} maxWidth="xl">
      {/* Display general errors at the top */}
      {error && (
        <Box mb={2}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Box>
      )}
      <div className={classes.chatContainer}>
        <DirectChatHistoryPanel 
          chatSessions={sortedChatSessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onEditSession={handleEditSession} 
          onDeleteSessionConfirmation={handleDeleteConfirmation}
          onDownloadSession={handleDownloadSession}
          currentSortCriteria={sortCriteria}
          onSortChange={handleSortChange}
        />
        <Paper className={`${classes.chatArea} ${!currentSessionId ? 'disabled' : ''} ${state.isFullscreen ? classes.fullscreen : ''}`} elevation={3}>
          {!currentSessionId && (
            <div className={classes.noSessionsOverlay}>
              <Typography variant="h6" color="textSecondary">
                Select a chat or create a new one to begin
              </Typography>
            </div>
          )}
          <div className={classes.buttonBar}>
            <Typography className={classes.sessionName}>
              {/* Show current session name */}
              {currentSessionId && chatSessions.find(session => session.id === currentSessionId)?.name}
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
          <MessageArea 
            messages={currentMessages}
            handleRetry={handleRetry}
            handleBookmark={handleBookmark}
            bookmarkedMessages={bookmarkedMessages}
            isLoading={isCurrentSessionLoading}
            classes={classes}
          />
          
          <form onSubmit={handleSendMessage} className={classes.inputArea}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <TooltipIconButton
                onClick={handlePromptHelpOpen}
                size="small"
                className={classes.inputHelpIcon}
                title="Prompt Engineering Tips"
              >
                <HelpOutlineIcon />
              </TooltipIconButton>
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
                // Disable only if current session is loading or no session selected
                disabled={isCurrentSessionLoading || !currentSessionId}
                InputProps={{
                  style: { 
                    maxHeight: '300px',
                    border: `1px solid ${theme.palette.primary.main}`,
                    overflow: 'hidden' // Hide overflow on the Input component wrapper
                  },
                  endAdornment: isCurrentSessionLoading ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : null
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                // Disable only if current session is loading, input is empty, or no session selected
                disabled={isCurrentSessionLoading || !state.input.trim() || !currentSessionId}
                endIcon={isCurrentSessionLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              >
                {isCurrentSessionLoading ? 'Sending...' : 'Send'}
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
                   {/* Map through caveatStates keys to generate checkboxes */}
                   {Object.keys(caveatStates).map(caveat => (
                     <FormControlLabel
                       key={caveat}
                       control={
                         <Checkbox 
                           size="small" 
                           checked={caveatStates[caveat]}
                           onChange={handleCaveatChange(caveat)}
                         />
                       }
                       label={<Typography className={classes.checkboxLabel}>{caveat}</Typography>}
                     />
                   ))}
                 </div>
              </div>
            </div>
          </form>
        </Paper>
        
        <DirectChatKnowledgeSourcesPanel 
          currentSessionId={currentSessionId}
          token={token}
          vectorstores={vectorstores} // Pass loaded vectorstores
          selectedVectorstore={selectedVectorstore} // Pass selected ID
          isLoadingVectorstores={isLoadingVectorstores}
          onVectorstoreChange={handleVectorstoreChange} // Pass the handler
          vectorstoreError={vectorstoreError} // Pass the error state
        />
      </div>
      
      {/* ... (Dialogs: PromptHelp, Edit Session, Delete Session) ... */}
       <Dialog
        open={promptHelpOpen}
        onClose={handlePromptHelpClose}
        className={classes.promptHelpDialog}
        aria-labelledby="prompt-help-dialog-title"
      >
        {/* Content as before */}
         <DialogTitle id="prompt-help-dialog-title" className={classes.dialogTitle}>
          <Typography variant="h6">Effective Prompt Engineering Tips</Typography>
          <TooltipIconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={handlePromptHelpClose}
          >
            <CloseIcon />
          </TooltipIconButton>
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
         {/* Content as before */}
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
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteSessionId(null);
          setDeleteSessionName('');
        }}
      >
         {/* Content as before */}
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
            variant="contained"
            startIcon={<DeleteIcon />}
            style={{ backgroundColor: theme.palette.error.main, color: 'white' }} // Use theme error color
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default React.memo(DirectChat);