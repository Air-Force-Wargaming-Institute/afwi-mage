import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
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
  DialogActions,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
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
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import memoize from 'memoize-one';
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
} from '../services/directChatService';
import { useMarkdownComponents } from '../styles/markdownStyles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';
import Slider from '@material-ui/core/Slider';

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
    flex: 1,
    minHeight: '75px',
    maxHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    margin: theme.spacing(2),
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: '10px',
    backgroundColor: theme.palette.background.default,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderColor: theme.palette.primary.dark,
    },
  },
  uploadIcon: {
    fontSize: '48px',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2),
  },
  uploadText: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  fileList: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  fileItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  fileItemRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  classificationSelect: {
    marginTop: theme.spacing(1),
    minWidth: '100%',
    '& .MuiSelect-select': {
      padding: theme.spacing(0.5, 1),
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
    padding: theme.spacing(2),
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    wordBreak: 'break-word',
    position: 'relative',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      transform: 'translateY(-1px)',
    },
  },
  userMessage: {
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
    alignSelf: 'flex-end',
    borderRadius: '12px 12px 0 12px',
    border: 'none',
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
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: '12px 12px 12px 0',
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
    backgroundColor: theme.palette.grey[100],
    borderRadius: '30px',
    maxWidth: '410px',
    zIndex: 1000,
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

// Memoize the MessageContent component
const MemoizedMessageContent = React.memo(MessageContent);

// Create a memoized item renderer for the virtualized list
const createItemData = memoize((messages, handleRetry, handleBookmark, bookmarkedMessages) => ({
  messages,
  handleRetry,
  handleBookmark,
  bookmarkedMessages
}));

// Row renderer for virtualized list
const Row = React.memo(({ index, style, data }) => {
  const message = data.messages[index];
  const classes = useStyles();
  const isBookmarked = data.bookmarkedMessages.some(msg => msg.messageId === message.id);

  return (
    <div style={{
      ...style,
      paddingTop: '8px',
      paddingBottom: '8px',
      paddingLeft: '16px',
      paddingRight: '16px',
    }}>
      <Box 
        id={`message-${message.id}`}
        className={`${classes.message} ${
          message.sender === 'user' ? classes.userMessage : classes.aiMessage
        }`}
        style={{ 
          maxWidth: message.sender === 'user' ? '70%' : '85%',
          margin: message.sender === 'user' ? '0 0 0 auto' : '0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className={classes.messageWrapper}>
          <MemoizedMessageContent 
            content={message.text} 
            isUser={message.sender === 'user'} 
            timestamp={message.timestamp}
            sender={message.sender}
            onRetry={
              message.sender === 'system' && message.text.includes('Error:') 
                ? () => data.handleRetry(data.messages[data.messages.length - 2]?.text) 
                : undefined
            }
            messageId={message.id}
            onBookmark={() => data.handleBookmark(message)}
            isBookmarked={isBookmarked}
          />
        </div>
      </Box>
    </div>
  );
});

// Update the message area in the DirectChat component
const MessageArea = memo(({ messages, handleRetry, handleBookmark, bookmarkedMessages, isLoading, classes }) => {
  const messageEndRef = useRef(null);
  const listRef = useRef(null);
  const [scrollToIndex, setScrollToIndex] = useState(undefined);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  
  const getItemSize = useCallback((index) => {
    const message = messages[index];
    let height = 80; // Base height
    const lines = message.text.split('\n').length;
    height += lines * 20; // Add height for each line
    if (message.text.includes('```')) {
      height += 100; // Extra height for code blocks
    }
    return height;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const renderMessage = useCallback(({ index, style }) => {
    const message = messages[index];
    const isBookmarked = bookmarkedMessages.some(msg => msg.messageId === message.id);

    return (
      <ListItem 
        style={{
          ...style,
          display: 'flex',
          padding: '8px 0',
          width: '100%',
          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
          alignItems: 'flex-start'
        }}
        disableGutters
      >
        <Box 
          id={`message-${message.id}`}
          className={`${classes.message} ${
            message.sender === 'user' ? classes.userMessage : classes.aiMessage
          }`}
          style={{ 
            width: 'auto',
            maxWidth: '80%',
            marginLeft: message.sender === 'user' ? 'auto' : '0',
            marginRight: message.sender === 'user' ? '0' : 'auto'
          }}
        >
          <MemoizedMessageContent 
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
            isBookmarked={isBookmarked}
          />
        </Box>
      </ListItem>
    );
  }, [classes, handleRetry, handleBookmark, bookmarkedMessages, messages]);

  return (
    <Box className={classes.messageArea}>
      <AutoSizer>
        {({ height, width }) => (
          <VariableSizeList
            ref={listRef}
            height={height - (isLoading ? 100 : 0)}
            width={width}
            itemCount={messages.length}
            itemSize={getItemSize}
            overscanCount={5}
            onItemsRendered={({ visibleStartIndex }) => {
              const isAtTop = visibleStartIndex === 0;
              const isAtBottom = visibleStartIndex + 10 >= messages.length;
              setShowScrollTop(!isAtTop);
              setShowScrollBottom(!isAtBottom);
            }}
          >
            {renderMessage}
          </VariableSizeList>
        )}
      </AutoSizer>

      {isLoading && (
        <div className={classes.typingIndicator}>
          <Typography className="loading-header">
            One moment...
          </Typography>
          <Typography className="loading-text">
            Response is being generated...
          </Typography>
          <div className="dots">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        </div>
      )}

      {showScrollBottom && (
        <Button
          className={classes.scrollBottomButton}
          onClick={scrollToBottom}
          variant="contained"
          size="small"
        >
          <KeyboardArrowDownIcon />
        </Button>
      )}

      <div ref={messageEndRef} />
    </Box>
  );
});

const DocumentUploadPane = ({ currentSessionId }) => {
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
            updatedPollingIds.delete(docId);
            setUploadedFiles(prev => prev.map(file => 
              file.id === docId 
                ? { ...file, status: status.status } 
                : file
            ));
          }
        } catch (error) {
          console.error(`Error polling document ${docId}:`, error);
        }
      }
      
      if (updatedPollingIds.size !== pollingIds.size) {
        setPollingIds(updatedPollingIds);
      }
      
      if (updatedPollingIds.size === 0) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentSessionId, pollingIds]);
  
  const handleCheckboxChange = async (docId) => {
    try {
      // Use the service function instead of direct fetch
      const result = await toggleDocumentState(currentSessionId, docId);

      // Update local state
      setUploadedFiles(prev => prev.map(file => 
        file.id === docId 
          ? { ...file, isChecked: result.isChecked }
          : file
      ));
    } catch (error) {
      console.error('Error updating document state:', error);
      setUploadError('Failed to update document state');
    }
  };

  const handleClassificationChange = async (docId, newClassification) => {
    try {
      await updateDocumentClassification(currentSessionId, docId, newClassification);
      setUploadedFiles(prev => prev.map(file => 
        file.id === docId 
          ? { ...file, classification: newClassification }
          : file
      ));
    } catch (error) {
      console.error('Error updating classification:', error);
      setUploadError('Failed to update document classification');
    }
  };

  const handleUpload = useCallback(async (file) => {
    if (!currentSessionId) {
      setUploadError('No active session selected');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    try {
      const response = await uploadDocument(currentSessionId, file);
      setPollingIds(prev => new Set([...prev, response.docId]));
      return response;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(`Failed to upload ${file.name}: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [currentSessionId]);
  
  const onDrop = useCallback(async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      try {
        const response = await handleUpload(file);
        setUploadedFiles(prev => [...prev, {
          id: response.docId,
          name: file.name,
          size: file.size,
          status: response.metadata.status || 'pending'
        }]);
      } catch (error) {
        continue;
      }
    }
  }, [handleUpload]);

  const handleRemoveFile = useCallback(async (fileId) => {
    try {
      await deleteDocument(currentSessionId, fileId);
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      setPollingIds(prev => {
        const updated = new Set(prev);
        updated.delete(fileId);
        return updated;
      });
    } catch (error) {
      console.error('Error removing file:', error);
      setUploadError(`Failed to remove file: ${error.message}`);
    }
  }, [currentSessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: '.pdf,.txt,.doc,.docx, .xlsx, .csv',
    maxSize: 100 * 1024 * 1024,
    disabled: !currentSessionId || isUploading
  });

  return (
    <Paper className={`${classes.uploadPane} ${!currentSessionId ? 'disabled' : ''}`} elevation={3}>
      <Typography variant="h6" gutterBottom>
        Document Upload
      </Typography>
      {uploadError && (
        <Typography color="error" variant="body2" style={{ margin: '8px' }}>
          {uploadError}
        </Typography>
      )}
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
    
    if (!messageText || !currentSessionId) return;

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now(),
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
        id: Date.now() + 1,
        text: response.message,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error: Failed to send message. Please try again.',
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
    try {
      const newSession = await createChatSession();
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([]); // Clear messages for new session
      setClassificationLevel(0); // Reset classification to Unclassified
      resetCaveats(); // Reset all caveats checkboxes
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      setError('Failed to create new chat');
    }
  };

  const handleDeleteChat = async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (sessionId === currentSessionId) {
        const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      setError('Failed to delete chat');
    }
  };

  const handleSelectSession = async (sessionId) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    setMessages([]); // Clear messages before loading new ones
    setClassificationLevel(0); // Reset classification to Unclassified
    resetCaveats(); // Reset all caveats checkboxes
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

  const handleScroll = useCallback(({ target }) => {
    const { scrollTop, scrollHeight, clientHeight } = target;
    setShowScrollTop(scrollTop > 200);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

  const scrollToTop = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  useEffect(() => {
    return () => {
      setMessages([]);
      setChatSessions([]);
      setBookmarkedMessages([]);
    };
  }, []);

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
            <div className={classes.buttonBarActions}>
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
        <DocumentUploadPane currentSessionId={currentSessionId} />
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
    </Container>
  );
}

export default React.memo(DirectChat);