import React, { useState, useRef, useEffect, useCallback, useContext,useMemo, memo } from 'react';
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
import { useTheme } from '@material-ui/core/styles';
import SendIcon from '@material-ui/icons/Send';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import { v4 as uuidv4 } from 'uuid';
import { debounce } from 'lodash';
import { useHILChat, ACTIONS } from '../../contexts/HILChatContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import axios from 'axios';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SchoolIcon from '@mui/icons-material/School';
import TuneIcon from '@mui/icons-material/Tune';
import PersonIcon from '@mui/icons-material/Person';
import LoadingScreen from './GameOfLifeLoadingScreen';
import { GradientText } from '../../styles/StyledComponents';
import robotIcon from '../../assets/robot-icon.png';
import agentTeamIcon from '../../assets/agent-team.png';

// Simple function to replace triple backticks with spaces
const removeTripleBackticks = (text) => {
  if (!text) return '';
  // Replace triple backticks followed by markdown
  let processedText = text.replace(/```markdown/g, ' ');
  // Replace any remaining triple backticks
  return processedText.replace(/```/g, ' ');
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    height: '100%', // Changed from fixed calculation to use 100% of parent
    maxHeight: '100%', // Changed to use full parent height
    overflow: 'hidden',
    marginTop: 0, // Removed top margin to use full height
    width: '100%',
    maxWidth: '100%',
    backgroundColor: 'transparent', // Add transparency to main container
    backgroundImage: 'none', // Remove any background image
    position: 'relative', // Add relative positioning for correct layering
    zIndex: 1, // Add z-index for proper stacking
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
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 2,
  },
  sessionsList: {
    padding: theme.spacing(1),
    paddingBottom: theme.spacing(3),
    position: 'relative',
    zIndex: 2,
    overflowY: 'auto',
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: theme.shape.borderRadius,
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
  chatLogContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  innerSessionsContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  chatSessionsContainer: {
    width: '16%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
    padding: theme.spacing(3),
    background: `${theme.custom.gradients.gradient1}`,
    border: `${theme.custom.borderWidth.hairline}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxSizing: 'border-box',
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.hairline,
      left: theme.custom.borderWidth.hairline,
      right: theme.custom.borderWidth.hairline,
      bottom: theme.custom.borderWidth.hairline,
      background: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
      zIndex: 0,
    },
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },
    '&:hover': {
      boxShadow: theme.custom.boxShadowLarge,
    }
  },
  chatArea: {
    width: '84%',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%', 
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    position: 'relative',
    borderTop: `${theme.custom.borderWidth.extraThick}px solid transparent`,
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    borderRight: `3px solid ${theme.palette.primary.main}`,
    borderBottom: `${theme.custom.borderWidth.extraThick}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.7)',
    animation: '$pulseBorder 2s infinite',
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
    transition: 'opacity 0.3s ease',
  },
  messageArea: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 0, // Added to ensure proper flex behavior
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.palette.grey[300]} transparent`,
    '& > div[class*="userMessage"]': {
      alignSelf: 'flex-end !important',
      marginLeft: 'auto !important',
      marginRight: '0 !important',
    },
    '& > div[class*="systemMessage"]': {
      alignSelf: 'center !important',
      margin: '0 auto !important',
    },
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
  message: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    borderRadius: '30px',
    border: '1px solid #e0e0e0',
    maxWidth: '80%',
    wordBreak: 'break-word',
    position: 'relative',
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
    overflow: 'visible',
    width: 'auto',
    willChange: 'transform',
    display: 'block', // Change to block to work with float
    flexDirection: 'column',
    alignItems: 'stretch', // Ensure children stretch to fill container width
    '&:hover': {
      boxShadow: theme.custom.boxShadowLarge,
      transform: 'translateY(-1px)',
    },
    [theme.breakpoints.down('sm')]: {
      maxWidth: '95%',
    },
  },
  userMessage: {
    backgroundColor: 'rgb(46, 46, 46)',
    color: '#ffffff',
    marginLeft: 'auto', // Push to the right side
    marginRight: '0', // Ensure it stays on the right
    borderRadius: '18px 18px 4px 18px',
    textAlign: 'right', // Set base text alignment for user messages
    alignSelf: 'flex-end', // Align to the end of the flex container
    '& $messageContent': {
      color: '#ffffff',
    },
    '& p, & div, & h1, & h2, & h3, & h4, & h5, & h6, & span, & li': {
      color: '#ffffff !important',
      textAlign: 'right !important', // Force right-align with !important
    },
    '& .ReactMarkdown': {
      textAlign: 'right !important', // Target the ReactMarkdown component
    },
    '& code, & pre, & table, & ul, & ol': {
      textAlign: 'right !important', // Force right-align for code and lists
    },
    '& .$messageTimestamp': {
      textAlign: 'right !important', // Force right-align for timestamp
      marginLeft: 'auto',
    }
  },
  // Add specific classes for user message markdown and timestamp
  '& .user-markdown': {
    textAlign: 'right !important',
    '& p, & li, & h1, & h2, & h3, & h4, & h5, & h6': {
      textAlign: 'right !important',
    },
    '& code, & pre': {
      textAlign: 'right !important',
    },
    '& table': {
      marginLeft: 'auto',
    },
  },
  '& .user-timestamp': {
    textAlign: 'right !important',
    width: '100%',
    display: 'block',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(5, 0, 44, 0.23)',
    color: theme.palette.text.primary,
    borderRadius: '18px 18px 18px 4px',
    minWidth: '300px',
    width: 'fit-content',
    display: 'flex',          // Add flex display to ensure proper content alignment
    flexDirection: 'column',  // Stack children vertically
    alignItems: 'flex-start', // Align children at the start
    '& p, & div, & h1, & h2, & h3, & h4, & h5, & h6, & span, & li': {
      textAlign: 'left !important', // Force left-align text for AI messages
    },
    '& .ReactMarkdown': {
      textAlign: 'left !important', // Target the ReactMarkdown component
    },
    '& code, & pre, & table, & ul, & ol': {
      textAlign: 'left !important', // Force left-align for code and lists
    },
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
    flexDirection: 'column',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.primary.main}`,
    borderLeft: `3px solid ${theme.palette.primary.main}`, // Added left border
    borderRight: `3px solid ${theme.palette.primary.main}`, // Added right border
    borderBottom: `3px solid ${theme.palette.primary.main}`, // Added bottom border
    position: 'relative', // Added to ensure proper placement
    minHeight: '64px', // Set minimum height to ensure it's always visible
    zIndex: 5, // Added to keep above other elements
  },
  input: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
    '& .MuiInputBase-root': {
      maxHeight: '150px',
      overflowY: 'auto',
      padding: theme.spacing(1.5, 2),
      border: `1px solid ${theme.palette.primary.main}`,
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
  inputHelpIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
    '&:hover': {
      color: theme.palette.primary.main,
    },
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
    margin: theme.spacing(1, 0, 2),
    width: '100%',
    alignSelf: 'center',
    background: theme.custom.gradients.gradient1,
    transition: theme.custom.transition,
    position: 'relative',
    zIndex: 2,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    fontWeight: 500,
    '&:hover': {
      background: theme.custom.gradients.vibrant,
      transform: 'translateY(-2px)',
      boxShadow: theme.custom.boxShadowLarge,
    },
  },
  chatSessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    transition: theme.custom.transition,
    position: 'relative',
    zIndex: 2,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    backgroundColor: 'rgba(30, 30, 30, 0.4)',
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
  sessionActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
    padding: theme.spacing(2),
    color: theme.palette.primary.main,
    '& h6': {
      fontWeight: 600,
      fontSize: '1.2rem',
    },
  },
  planDialogTitle: {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '1.5rem',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
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
  planBox: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    maxHeight: '400px',
    overflowY: 'auto',
    position: 'relative',
    border: `${theme.custom.borderWidth.hairline}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient1,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.hairline,
      left: theme.custom.borderWidth.hairline,
      right: theme.custom.borderWidth.hairline,
      bottom: theme.custom.borderWidth.hairline,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
      background: theme.palette.background.default,
      zIndex: -1,
    },
    '&:hover': {
      boxShadow: theme.custom.boxShadowLarge,
    }
  },
  modifiedQuestionBox: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    position: 'relative',
    border: `${theme.custom.borderWidth.hairline}px solid transparent`,
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
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
      top: theme.custom.borderWidth.hairline,
      left: theme.custom.borderWidth.hairline,
      right: theme.custom.borderWidth.hairline,
      bottom: theme.custom.borderWidth.hairline,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
      background: theme.palette.background.default,
      zIndex: -1,
    },
    '&:hover': {
      boxShadow: theme.custom.boxShadowLarge,
    }
  },
  agentsBox: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    position: 'relative',
    border: `${theme.custom.borderWidth.hairline}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient1,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.hairline,
      left: theme.custom.borderWidth.hairline,
      right: theme.custom.borderWidth.hairline,
      bottom: theme.custom.borderWidth.hairline,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
      background: theme.palette.background.default,
      zIndex: -1,
    },
    '&:hover': {
      boxShadow: theme.custom.boxShadowLarge,
    }
  },
  sectionHeader: {
    background: theme.custom.gradients.vibrant,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textFillColor: 'transparent',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  agentIcon: {
    marginRight: theme.spacing(2),
  },
  robotIcon: {
    width: '40px',
    height: '40px',
    marginBottom: '8px',
    transition: 'all 0.3s ease',
    '&.selected': {
      filter: 'brightness(1.2) drop-shadow(0 0 4px rgba(33, 150, 243, 0.7))',
      transform: 'scale(1.05)',
    },
    '&.unselected': {
      filter: 'grayscale(0.3)',
      opacity: 0.85,
    },
    '&:hover': {
      filter: 'brightness(1.1) drop-shadow(0 0 3px rgba(33, 150, 243, 0.4))',
      transform: 'scale(1.03)',
      opacity: 1,
    }
  },
  agentCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '120px',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(33, 150, 243, 0.05)',
    },
    '&.selected': {
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }
  },
  markdown: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body1.fontSize,
    lineHeight: '1.5',
    width: '100%',
    overflowX: 'hidden',
    wordBreak: 'break-word',
    // Add text alignment based on parent - by default left-align
    textAlign: 'left',
    // Reduce spacing between elements
    '& p, & h1, & h2, & h3, & h4, & h5, & h6': {
      marginTop: '0.5em',
      marginBottom: '0.5em',
      overflowWrap: 'break-word',
      wordBreak: 'break-word', 
      maxWidth: '100%',
      textAlign: 'inherit', // Inherit text alignment from parent
    },
    // Remove margin from first child and last child
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    // Remove empty paragraphs that often result from blank lines
    '& p:empty': {
      display: 'none',
      margin: 0,
      padding: 0,
      height: 0,
    },
    // Reduce spacing between consecutive elements
    '& p + p, & ul + p, & ol + p, & p + ul, & p + ol': {
      marginTop: '0.5em',
    },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
    },
    '& table': {
      maxWidth: '100%',
      overflow: 'auto',
      display: 'block',
      textAlign: 'inherit', // Inherit text alignment from parent
    },
    '& details': {
      margin: '0.75em 0',
      padding: '0.5em',
      backgroundColor: 'rgba(0, 0, 0, 0.03)',
      textAlign: 'left',
    },
    '& ul, & ol': {
      paddingLeft: '1.5em',
      marginTop: '0.5em',
      marginBottom: '0.5em',
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
    cursor: 'pointer',
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
    textAlign: 'left', // Ensure details content is left-aligned
    // Better handle multiple expanded sections
    '&:not(:last-child)': {
      marginBottom: theme.spacing(2),
    },
    '&.expert-section': {
      borderLeft: '4px solid #4CAF50',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      background: 'linear-gradient(to right, rgba(76, 175, 80, 0.05), rgba(30, 30, 30, 0))',
      '&:hover': {
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)',
      }
    },
    '&.expert-report': {
      borderLeft: '3px solid #2196F3',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
      background: 'linear-gradient(to right, rgba(33, 150, 243, 0.05), rgba(30, 30, 30, 0))',
      marginLeft: theme.spacing(1),
      marginTop: theme.spacing(1.5),
      '&:hover': {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.18)',
      }
    }
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
    fontWeight: 800,
    fontSize: '1.05rem',
    color: '#4CAF50',
    flexGrow: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textShadow: '0px 1px 1px rgba(0, 0, 0, 0.1)',
    letterSpacing: '0.01em',
    position: 'relative',
    paddingLeft: '5px',
    '&.expert-analysis': {
      background: 'linear-gradient(90deg, #43A047, #66BB6A)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textFillColor: 'transparent',
    },
    '&.expert-report': {
      color: '#2196F3',
      fontWeight: 700,
      fontSize: '1rem',
      background: 'linear-gradient(90deg, #1976D2, #42A5F5)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textFillColor: 'transparent',
    }
  },
  analysisExpandToggle: {
    transition: 'transform 0.3s ease',
    color: theme.palette.primary.main,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    '&:hover': {
      backgroundColor: 'rgba(66, 133, 244, 0.2)',
    },
  },
  analysisExpanded: {
    transform: 'rotate(180deg)',
  },
  // Expert Analysis gets a slightly different color to visually distinguish it
  expertAnalysisHeader: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    fontWeight: 1000,
    fontSize: '1.2rem',
    borderLeft: '4px solid #4CAF50',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
    '&:hover': {
      backgroundColor: 'rgba(76, 175, 80, 0.25)',
    },
  },
  // Individual expert report headers get a blue styling
  expertReportHeader: {
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
    fontWeight: 600,
    fontSize: '1.1rem',
    borderLeft: '3px solid #2196F3',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(33, 150, 243, 0.2)',
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
    textAlign: 'left', // Ensure analysis content is left-aligned
    // Add markdown styling for consistent formatting
    '& p, & h1, & h2, & h3, & h4, & h5, & h6': {
      marginTop: '0.5em',
      marginBottom: '0.5em',
      overflowWrap: 'break-word',
      wordBreak: 'break-word', 
      maxWidth: '100%',
      textAlign: 'inherit',
    },
    // Remove margin from first child and last child
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    // Remove empty paragraphs that often result from blank lines
    '& p:empty': {
      display: 'none',
      margin: 0,
      padding: 0,
      height: 0,
    },
    // Reduce spacing between consecutive elements
    '& p + p, & ul + p, & ol + p, & p + ul, & p + ol': {
      marginTop: '0.5em',
    },
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
    maxHeight: '21000px', // Increased from 5000px to handle multiple expanded sections
    opacity: 1,
    overflow: 'visible',
    padding: theme.spacing(2),
    transition: 'max-height 1s ease-in-out, opacity 0.5s ease, padding 0.4s ease',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    textAlign: 'left', // Ensure expanded content is left-aligned by default
    '.expert-section &': {
      paddingLeft: theme.spacing(2.5),
      borderLeft: '1px solid rgba(76, 175, 80, 0.2)',
      background: 'linear-gradient(to right, rgba(76, 175, 80, 0.03), transparent)',
    },
    '.expert-report &': {
      paddingLeft: theme.spacing(2),
      borderLeft: '1px solid rgba(33, 150, 243, 0.15)',
      background: 'linear-gradient(to right, rgba(33, 150, 243, 0.025), transparent)',
    },
    '& img, & video': {
      maxWidth: '100%',
      height: 'auto',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      overflowX: 'auto',
      display: 'block',
      textAlign: 'left', // Ensure tables are left-aligned
    },
    '& p': {
      margin: '0.5em 0',
      maxWidth: '100%',
      textAlign: 'left', // Ensure paragraphs are left-aligned
    },
    '& ul, & ol': {
      paddingLeft: '2em',
      margin: '0.5em 0',
      maxWidth: '100%',
      textAlign: 'left', // Ensure lists are left-aligned
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
      textAlign: 'left', // Ensure nested expanded content is left-aligned
    },
    // Make sure empty paragraphs are removed in expanded content too
    '& p:empty': {
      display: 'none',
      margin: 0,
      padding: 0,
      height: 0,
    },
  },
  messageTimestamp: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    opacity: 0.8,
    marginTop: theme.spacing(1),
    display: 'block',
    width: '100%',
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
    zIndex: 2000, // Increased zIndex substantially to ensure it's above other elements
    width: '100vw',
    height: '100vh',
    maxHeight: '100vh',
    maxWidth: '100vw',
    borderRadius: 0,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper, // Use theme background color
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  buttonBarActions: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto', // Push to the right
  },
  sessionName: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: '1rem',
    textAlign: 'center',
    pointerEvents: 'none', // Prevent it from interfering with clicks
  },
  systemMessage: {
    alignSelf: 'center',
    width: '95%',
    marginLeft: 'auto',
    marginRight: 'auto',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    border: '1px solid transparent',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.custom.boxShadow,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient1,
      opacity: 0.8,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 1,
      left: 1,
      right: 1,
      bottom: 1,
      borderRadius: theme.shape.borderRadius - 1,
      background: 'rgba(30, 30, 30, 0.95)',
      zIndex: -1,
    },
    '& p, & div, & h1, & h2, & h3, & h4, & h5, & h6, & span, & li': {
      margin: '4px 0',
      textAlign: 'left !important', // Force left-align text for system messages
    },
    '& .ReactMarkdown': {
      textAlign: 'left !important', // Target the ReactMarkdown component
    },
    '& code, & pre, & table, & ul, & ol': {
      textAlign: 'left !important', // Force left-align for code and lists
    },
    '& strong': {
      color: theme.palette.primary.main,
    },
  },
  planCollapsedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: theme.spacing(1.5, 2),
    cursor: 'pointer',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    transition: theme.custom.transition,
    '&:hover': {
      backgroundColor: 'rgba(66, 133, 244, 0.25)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    },
  },
  planExpandToggle: {
    transition: 'transform 0.3s ease',
    color: theme.palette.primary.main,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    '&:hover': {
      backgroundColor: 'rgba(66, 133, 244, 0.2)',
    },
  },
  planContent: {
    padding: theme.spacing(2),
    transition: 'max-height 0.4s cubic-bezier(0, 1, 0, 1), opacity 0.3s ease, padding 0.3s ease',
    overflow: 'hidden',
    textAlign: 'left',
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    borderBottomLeftRadius: theme.shape.borderRadius,
    borderBottomRightRadius: theme.shape.borderRadius,
  },
  planCollapsed: {
    maxHeight: 0,
    opacity: 0,
    padding: '0 16px',
    pointerEvents: 'none',
  },
  planExpanded: {
    maxHeight: '5000px', // Large enough to fit content
    opacity: 1,
    transition: 'max-height 0.4s ease-in-out, opacity 0.5s ease',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: '165px',
    right: '60px',
    zIndex: 1000,
    backgroundColor: '#3f51b5', // Fixed: use direct color instead of theme => theme.palette.primary.main
    color: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  },
  processingButton: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(0.5, 1.5),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
  },
  processingText: {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    animation: '$pulse 1.5s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 0.6,
    },
    '50%': {
      opacity: 1,
    },
    '100%': {
      opacity: 0.6,
    }
  },
  hiddenIndicator: {
    opacity: 0,
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
  },
  userMarkdown: {
    textAlign: 'right !important',
    '& p, & li, & h1, & h2, & h3, & h4, & h5, & h6': {
      textAlign: 'right !important',
    },
    '& code, & pre': {
      textAlign: 'right !important',
    },
    '& table': {
      marginLeft: 'auto',
    },
  },
  userTimestamp: {
    textAlign: 'right !important',
    width: '100%',
    display: 'block',
  },
  userMessageText: {
    fontSize: '0.95rem',
    color: '#FFFFFF !important',
    whiteSpace: 'pre-wrap',
    textAlign: 'right', // Changed to right
    wordBreak: 'break-word',
    paddingRight: '40px',
    width: '100%',
    display: 'block',
    '& *': {
      color: '#FFFFFF !important',
      textAlign: 'right !important'
    }
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
  selectedMessageContainer: {
    padding: '12px',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
    position: 'relative',
    border: '1px solid transparent',
    marginBottom: theme.spacing(2),
  },
  selectedMessage: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    border: '1px solid rgba(33, 150, 243, 0.3)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  messageRadioLabel: {
    fontWeight: 600,
    fontSize: '1rem',
    color: theme.palette.text.primary,
  },
  dialogButton: {
    borderRadius: '20px',
    padding: theme.spacing(1, 3),
    transition: 'all 0.3s ease',
    fontWeight: 500,
  },
  submitButton: {
    background: theme.custom.gradients.gradient1,
    color: theme.palette.common.white,
    '&:hover': {
      background: theme.custom.gradients.vibrant,
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
      transform: 'translateY(-2px)',
    },
    '&.Mui-disabled': {
      background: 'rgba(0, 0, 0, 0.12)',
      color: 'rgba(255, 255, 255, 0.7)',
    }
  },
  cancelButton: {
    borderRadius: '20px',
    color: theme.palette.text.secondary,
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      color: theme.palette.text.primary,
    }
  },
  agentsContainer: {
    padding: theme.spacing(2),
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
  },
  agentName: {
    marginBottom: theme.spacing(0.5),
    fontWeight: 500,
    fontSize: '0.85rem',
    textAlign: 'center',
    lineHeight: 1.2,
    height: '40px', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  editDialogTitle: {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '1.5rem',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
  },
  teamDisplay: {
    position: 'relative',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    border: `${theme.custom.borderWidth.hairline}px solid transparent`,
    boxShadow: theme.custom.boxShadow,
    transition: theme.custom.transition,
    display: 'flex',
    alignItems: 'center',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient1,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.hairline,
      left: theme.custom.borderWidth.hairline,
      right: theme.custom.borderWidth.hairline,
      bottom: theme.custom.borderWidth.hairline,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
      background: theme.palette.background.default,
      zIndex: -1,
    },
  },
  teamName: {
    fontWeight: 600,
    fontSize: '1rem',
    color: theme.palette.primary.main,
    marginLeft: theme.spacing(1),
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
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState({});
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectingSectionId, setSelectingSectionId] = useState(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef(null);
  const selectionTimeoutRef = useRef(null);
  const detailsRefs = useRef({});
  const messageRef = useRef(null); // Add ref for the message container
  const reasoningRefs = useRef({}); // Add refs for reasoning sections

  // Remove all think tags from text and extract their content
  const extractThinkTags = useCallback((text) => {
    if (!text || message.sender !== 'ai') return { processedText: text, thinkContents: [] };
    
    const thinkContents = [];
    let processedText = text;
    
    // Extract content between <think> tags
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let match;
    
    while ((match = thinkRegex.exec(text)) !== null) {
      // Record the position - is this at the start or after a closing summary tag?
      const position = match.index === 0 ? 'beginning' : 
                      text.substring(0, match.index).trimEnd().endsWith('</summary>') ? 'after-summary' : 'other';
      
      thinkContents.push({
        content: match[1].trim(),
        fullMatch: match[0],
        startIndex: match.index,
        position: position
      });
    }
    
    // Remove all think tags from the text
    processedText = text.replace(thinkRegex, '');
    
    // Clean up any empty lines that might be left after removing think tags
    processedText = processedText.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return { processedText, thinkContents };
  }, [message.sender]);
  
  // Extract think content
  const { processedText, thinkContents } = useMemo(() => {
    const result = extractThinkTags(message.text);
    // Filter out empty think tags
    result.thinkContents = result.thinkContents.filter(thinkItem => 
      thinkItem.content && thinkItem.content.trim() !== ''
    );
    return result;
  }, [message.text, extractThinkTags]);

  // Create a ref callback function at the component level
  const createRefCallback = useCallback((id) => (node) => {
    if (node !== null) {
      detailsRefs.current[id] = node;
    }
  }, []);

  // Similar callback for reasoning sections
  const createReasoningRefCallback = useCallback((id) => (node) => {
    if (node !== null) {
      reasoningRefs.current[id] = node;
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

  // Handle reasoning toggle
  const handleReasoningToggle = (id) => (e) => {
    // Don't toggle if user is selecting text
    if (window.getSelection().toString() || isSelecting) {
      return;
    }
    
    setExpandedSections(prev => ({
      ...prev,
      [`reasoning-${id}`]: !prev[`reasoning-${id}`]
    }));
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

  // Handle copy for messages
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render an AI reasoning section
  const renderReasoningSection = (reasoningText, reasoningId, position = 'beginning') => {
    if (!reasoningText || reasoningText.trim() === '') return null;
    
    const isExpanded = expandedSections[`reasoning-${reasoningId}`] || false;
    
    // Apply slightly different styling for after-summary reasoning sections to make them appear as children
    const isAfterSummary = position === 'after-summary';
    
    return (
      <div 
        className={classes.customDetails} 
        style={{ 
          marginBottom: '12px',
          ...(isAfterSummary ? {
            marginLeft: '12px',
            marginTop: '8px',
            borderLeft: '3px solid rgba(33, 150, 243, 0.3)'
          } : {})
        }}
      >
        {/* Custom header for reasoning section */}
        <div 
          className={`${classes.analysisDetailsHeader}`}
          style={{ 
            backgroundColor: 'rgba(33, 150, 243, 0.08)',
            ...(isAfterSummary ? {
              borderTopLeftRadius: '0',
              paddingLeft: '12px'
            } : {})
          }}
          onClick={handleReasoningToggle(reasoningId)}
        >
          <Typography className={classes.analysisTitle} title="AI Reasoning">
            AI Reasoning{isAfterSummary ? ' for this section' : ''}
          </Typography>
          <IconButton 
            className={`${classes.analysisExpandToggle} ${isExpanded ? classes.analysisExpanded : ''}`}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleReasoningToggle(reasoningId)(e);
            }}
          >
            <KeyboardArrowDownIcon />
          </IconButton>
        </div>
        
        {/* Content area for reasoning */}
        <div 
          ref={createReasoningRefCallback(reasoningId)}
          className={`${classes.analysisContent} ${isExpanded ? classes.expandedContent : classes.collapsedContent}`}
          onClick={(e) => e.stopPropagation()}
          style={isExpanded ? { height: 'auto' } : {}}
        >
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
              code: CodeBlock,
            }}
            className={classes.markdown}
          >
            {reasoningText}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  // Enhanced details renderer with custom header to match plan experience
  function renderEnhancedDetails({ node, children, ...props }) {
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
    
    // Detect individual expert reports using a more generic approach
    const isExpertReport = typeof title === 'string' && (
      // First check if it's the main "Expert Analyses" container - if so, it's not an individual report
      title !== "Expert Analyses" && 
      // Then check if it contains common expert report patterns
      (title.includes("Expert") || 
       title.includes("Report") ||
       // Check for any agent/expert name pattern (Name followed by number)
       /[A-Za-z]+\s*\d+/.test(title) || // Matches patterns like "Economics1" or "Global Influence1"
       // Or check if it mentions "Analysis" but is not the main container
       (title.includes("Analysis") && !title.includes("Expert Analyses")))
    );

    // Different styling for main Expert Analyses vs individual expert reports
    const containerClass = isExpertAnalysis 
      ? 'expert-section' 
      : isExpertReport 
        ? 'expert-report' 
        : '';

    const headerClass = isExpertAnalysis 
      ? classes.expertAnalysisHeader 
      : isExpertReport 
        ? classes.expertReportHeader 
        : '';
    
    const titleClass = isExpertAnalysis 
      ? 'expert-analysis' 
      : isExpertReport 
        ? 'expert-report' 
        : '';
    
    // Get current expanded state
    const isExpanded = expandedSections[id] || false;

    // Use the ref callback function created at the component level
    const detailsContentRef = createRefCallback(id);

    // Check if any think tags should be associated with this details section
    // They would follow immediately after the closing </summary> tag
    const associatedThinkContent = thinkContents.find(think => {
      // Only consider think tags that are positioned after a summary
      if (think.position !== 'after-summary') return false;
      
      // Get the text before the think tag
      const textBeforeThink = message.text.substring(0, think.startIndex);
      
      // Check if this text ends with a summary tag containing our title
      // First, find the last </summary> tag position
      const lastSummaryClosePos = textBeforeThink.lastIndexOf('</summary>');
      if (lastSummaryClosePos === -1) return false;
      
      // Find the corresponding opening summary tag
      const openingSummaryPos = textBeforeThink.lastIndexOf('<summary>', lastSummaryClosePos);
      if (openingSummaryPos === -1) return false;
      
      // Extract the content of the summary tag
      const summaryContent = textBeforeThink.substring(
        openingSummaryPos + 9, // length of <summary>
        lastSummaryClosePos
      ).trim();
      
      // Check if this summary content matches our title or contains it
      return summaryContent === title || summaryContent.includes(title);
    });

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
      <div className={`${classes.customDetails} ${containerClass}`}>
        {/* Custom header with toggle button - using exactly what was in the summary tag */}
        <div 
          className={`${classes.analysisDetailsHeader} ${headerClass}`}
          onClick={(e) => toggleSection(id, e)}
        >
          <Typography className={`${classes.analysisTitle} ${titleClass}`} title={title}>
            {isExpertAnalysis && (
              <img 
                src={agentTeamIcon} 
                alt="Expert Analysis Team" 
                style={{ 
                  width: '22px', 
                  height: '22px', 
                  marginRight: '8px', 
                  verticalAlign: 'middle',
                  filter: 'invert(1) drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.3))'
                }} 
              />
            )}
            {isExpertReport && !isExpertAnalysis && (
              <img 
                src={robotIcon} 
                alt="Robot Expert" 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  marginRight: '8px', 
                  verticalAlign: 'middle',
                  filter: 'drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.3))'
                }} 
              />
            )}
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
          {/* Wrap content in a div with markdown class to ensure consistent styling */}
          <div className={classes.markdown}>
            {filteredContent}
          </div>
          
          {/* If a think tag follows this details section, add an AI Reasoning section */}
          {associatedThinkContent && (
            renderReasoningSection(associatedThinkContent.content, `detail-${detailsIndex}`, 'after-summary')
          )}
        </div>
      </div>
    );
  }

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
    if (message.role === 'user') {
      return classes.userMessage;
    } else if (message.role === 'system') {
      return classes.systemMessage;
    } else {
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
          <FormatListBulletedIcon style={{ 
            marginRight: 8, 
            color: theme.palette.primary.main 
          }} />
          <Typography variant="subtitle2" style={{ 
            fontWeight: 600, 
            color: theme.palette.primary.main
          }}>
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
  
  // Process content with think tags after markdown rendering
  const processContentWithThinkTags = (content) => {
    // First, check if this is an AI message that might have think tags
    if (message.sender !== 'ai' || thinkContents.length === 0) {
      return content;
    }
    
    // Sort think contents by their position in the original text
    // This helps ensure we process them in the correct order
    const sortedThinkContents = [...thinkContents].sort((a, b) => a.startIndex - b.startIndex);
    
    // Process the first think tag separately if it appears at the beginning
    const firstThink = sortedThinkContents[0];
    const processedContent = [];
    
    // If the first think tag is at the beginning of the message
    if (firstThink && firstThink.startIndex === 0) {
      // Add the reasoning section for this think tag
      processedContent.push(
        renderReasoningSection(firstThink.content, `intro-reasoning`)
      );
      
      // Remove this think tag from the list to process
      sortedThinkContents.shift();
    }
    
    // Add the main content
    processedContent.push(content);
    
    // Process any remaining think tags
    // Note: This implementation will not inject think tags within the markdown-rendered content
    // as that would require more complex DOM manipulation after rendering
    
    return processedContent;
  };

  // If this is a system message (plan), render it as collapsible
  if (message.sender === 'system') {
    const planInfo = getPlanInfo();
    
    return (
      <div 
        className={`${classes.message} ${classes.systemMessage}`}
        ref={messageRef} // Add ref to message container
        style={{ 
          margin: '0 auto', 
          float: 'none',
          display: 'block',
          alignSelf: 'center'
        }}
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

  // For AI messages with think tags, prepare reasoning sections at the appropriate locations
  const renderMessageWithReasoningSections = () => {
    if (message.sender !== 'ai' || thinkContents.length === 0) {
      // No think tags to process, render normally
      return (
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            code: CodeBlock,
            details: renderEnhancedDetails,
          }}
          className={classes.markdown}
        >
          {message.text}
        </ReactMarkdown>
      );
    }

    // This message has think tags to transform into reasoning sections
    const components = [];
    
    // First, add reasoning sections for tags at the beginning
    const beginningThinkTags = thinkContents.filter(think => 
      think.position === 'beginning' && think.content.trim() !== ''
    );
    
    // Add reasoning sections for beginning think tags
    for (const thinkItem of beginningThinkTags) {
      components.push(
        <React.Fragment key={`reasoning-beginning-${thinkItem.startIndex}`}>
          {renderReasoningSection(thinkItem.content, `msg-${thinkItem.startIndex}`, 'beginning')}
        </React.Fragment>
      );
    }
    
    // Then add the main content with think tags removed
    components.push(
      <ReactMarkdown
        key="main-content"
        rehypePlugins={[rehypeRaw]}
        components={{
          code: CodeBlock,
          details: renderEnhancedDetails, // This will handle after-summary think tags
        }}
        className={classes.markdown}
      >
        {processedText}
      </ReactMarkdown>
    );
    
    return components;
  };

  // Regular non-system messages
  return (
    <div
      className={`${classes.message} ${getMessageClass()}`}
      ref={messageRef} // Add ref to message container
      style={{
        ...(message.role === 'user' || message.sender === 'user' ? {
          alignSelf: 'flex-end !important',
          marginLeft: 'auto !important', 
          marginRight: '0 !important',
          textAlign: 'right !important',
          float: 'right',
          clear: 'both'
        } : {
          alignSelf: 'flex-start',
          marginRight: 'auto',
          marginLeft: '0',
          textAlign: 'left',
          float: 'left',
          clear: 'both'
        })
      }}
    >
      {renderModificationIndicator()}
      
      {message.role === 'user' ? (
        <div className={classes.userMessageText}>
          {message.text}
        </div>
      ) : message.sender === 'ai' && thinkContents.length > 0 ? (
        // For AI messages with think content, use our custom rendering
        <>
          {/* Use our renderMessageWithReasoningSections function */}
          {renderMessageWithReasoningSections()}
        </>
      ) : (
        // For regular messages, render normally
        <ReactMarkdown
          rehypePlugins={[rehypeRaw]}
          components={{
            code: CodeBlock,
            details: renderEnhancedDetails,
          }}
          className={`${classes.markdown} ${message.role === 'user' ? classes.userMarkdown : ''}`}
        >
          {message.text}
        </ReactMarkdown>
      )}
      
      <Typography variant="caption" className={`${classes.messageTimestamp} ${message.role === 'user' ? classes.userTimestamp : ''}`}>
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
  const { user, token } = useContext(AuthContext);
  const theme = useTheme(); // Add theme variable for the component

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
  
  // Add state for loading indicator visibility
  const [loadingIndicatorVisible, setLoadingIndicatorVisible] = useState(true);
  
  // Add function to toggle loading indicator visibility
  const toggleLoadingIndicator = () => {
    setLoadingIndicatorVisible(prev => !prev);
  };
  
  // Loading indicator component
  const TypingIndicator = () => (
    <div className={`${classes.typingIndicator} ${loadingIndicatorVisible ? '' : classes.hiddenIndicator}`}>
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
        const response = await axios.get(getGatewayUrl('/api/chat/sessions'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
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
      const response = await axios.get(`${getGatewayUrl(`/api/chat/sessions/${sessionId}`)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.conversation_history) {
        const formattedMessages = response.data.conversation_history.flatMap(entry => {
          const messages = [];
          
          // Add user message
          if (entry.question) {
            messages.push({
              id: uuidv4(),
              text: entry.question,
              sender: 'user',
              role: 'user',
              timestamp: new Date(entry.timestamp),
              sessionId: sessionId
            });
          }
          
          // Add plan as system message if it exists and is accepted
          if (entry.plan && entry.plan.accepted) {
            // Determine if modified message is different from original
            const showModifiedMessage = entry.plan.modified_message !== entry.plan.original_message;
            
            // Original message section
            const originalMessageSection = `### Original Message\n${entry.plan.original_message}`;
            
            // Modified message section (only if different from original)
            const modifiedMessageSection = showModifiedMessage 
              ? `\n\n### Modified Message\n${entry.plan.modified_message}` 
              : '';
            
            // Plan details section
            const planDetailsSection = `\n\n### Plan Details\n${entry.plan.content}`;
            
            // Selected agents section
            const selectedAgentsSection = entry.plan.selected_agents && entry.plan.selected_agents.length > 0 
              ? `\n\n### Selected Agents\n${entry.plan.selected_agents.map(agent => `- ${agent}`).join('\n')}` 
              : '';
            
            // Plan notes section
            const notesSection = entry.plan.notes
              ? `\n\n### Plan Notes\n${entry.plan.notes}` 
              : '';
            
            // Construct full plan text with all sections in the requested order
            const planText = `## Execution Plan\n\n${originalMessageSection}${modifiedMessageSection}${planDetailsSection}${selectedAgentsSection}${notesSection}`;
            
            messages.push({
              id: uuidv4(),
              text: planText,
              sender: 'system',
              role: 'system',
              timestamp: new Date(entry.timestamp),
              sessionId: sessionId,
              originalText: entry.plan.original_message,
              modifiedText: showModifiedMessage ? entry.plan.modified_message : null
            });
          }
          
          // Add AI response
          if (entry.response) {
            messages.push({
              id: uuidv4(),
              text: removeTripleBackticks(entry.response),
              sender: 'ai',
              role: 'assistant',
              timestamp: new Date(entry.timestamp),
              sessionId: sessionId
            });
          }
          
          return messages;
        });
        
        dispatch({ type: ACTIONS.SET_MESSAGES, payload: formattedMessages });
      }
      
      // Update active session
      dispatch({ 
        type: ACTIONS.SET_CURRENT_SESSION, 
        payload: sessionId 
      });
      
      // Update session name if available
      if (response.data && response.data.session_name) {
        dispatch({
          type: ACTIONS.SET_SESSION_NAME,
          payload: response.data.session_name
        });
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
      const response = await axios.get(getGatewayUrl('/api/agent/available_teams/'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
        
        // Check if we have the teamId and need to fetch the team name
        if (currentSession.teamId) {
          try {
            // Try to get updated team information from the server
            const response = await axios.get(getApiUrl('AGENT', '/api/agents/available_teams/'));
            const teams = response.data.teams || [];
            const teamInfo = teams.find(team => team.id === currentSession.teamId);
            
            // Use the team name if found, otherwise fallback to stored team value 
            setEditSessionTeam(teamInfo ? teamInfo.name : currentSession.team);
          } catch (error) {
            console.error('Error fetching team details:', error);
            // Fallback to the stored team name
            setEditSessionTeam(currentSession.team);
          }
        } else {
          // If no teamId, use the team name directly (might be the teamId in older sessions)
          setEditSessionTeam(currentSession.team);
        }
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
      
      await axios.put(getGatewayUrl(`/api/chat/sessions/${editSessionId}`), {
        session_name: editSessionName.trim(),
        team_id: currentSession.teamId,
        team_name: currentSession.team
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      await axios.delete(getGatewayUrl(`/api/chat/sessions/${deleteSessionId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
        team: defaultTeam?.name || 'Default_Team',
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
      let response = await axios.post(getGatewayUrl('/api/chat/refine'), messageData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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
      const teamsListResponse = await axios.get(getGatewayUrl('/api/agent/list_teams/'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      const agentsResponse = await axios.get(getGatewayUrl('/api/agent/list_agents/'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      comments: rejectionText.trim(),
      is_plan_accepted: planChoice === 'accept', // Add explicit flag for plan acceptance
      message_choice: messageChoice // Track whether original or modified message was used
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
      const originalMessageSection = `### Original Message\n${originalMessage}`;
      
      // Only add modified message section if it was selected and is different from original
      const showModifiedMessage = messageChoice === 'modified' && modifiedQuestion !== originalMessage;
      const modifiedMessageSection = showModifiedMessage 
        ? `\n\n### Modified Message\n${modifiedQuestion}` 
        : '';
      
      // Plan details section
      const planDetailsSection = `\n\n### Plan Details\n${planContent}`;
      
      // Selected agents section
      const selectedAgentsSection = selectedAgents.length > 0 
        ? `\n\n### Selected Agents\n${selectedAgents.map(agent => `- ${agent}`).join('\n')}` 
        : '';
      
      // Plan notes section
      const notesSection = planNotes 
        ? `\n\n### Plan Notes\n${planNotes}` 
        : '';
      
      const planText = `## Execution Plan\n\n${originalMessageSection}${modifiedMessageSection}${planDetailsSection}${selectedAgentsSection}${notesSection}`;
      
      // Add the plan to the chat as a system message
      dispatch({ 
        type: ACTIONS.ADD_MESSAGE, 
        payload: { 
          id: uuidv4(),
          text: planText, 
          sender: 'system', 
          role: 'system',
          timestamp: new Date(),
          sessionId: currentSession.id,
          originalText: originalMessage,
          modifiedText: showModifiedMessage ? modifiedQuestion : null
        }
      });
    }

    try {
      const endpoint = planChoice === 'accept' ? '/api/chat/process' : '/api/chat/refine';
      const response = await axios.post(getGatewayUrl(endpoint), 
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

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
          text: removeTripleBackticks(response.data.response || response.data.message), 
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
      const response = await axios.post(getGatewayUrl('/api/chat/generate_session_id'), {
        team_id: teamId,
        session_name: sessionName
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        style={{ backgroundColor: 'transparent' }}
      >
        <div className={classes.chatContainer}>
          {!state.isFullscreen && (
            <Paper className={classes.chatSessionsContainer} elevation={3}>
              <div className={classes.chatLogContent}>
                <Box mb={3}>
                  <GradientText variant="h2" fontWeight="600" gutterBottom>
                    Chat History
                  </GradientText>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  className={classes.newChatButton}
                  onClick={handleNewChat}
                >
                  Start New Chat Session
                </Button>
                <div className={classes.innerSessionsContainer}>
                  <List className={classes.sessionsList}>
                    {state.chatSessions.map((session) => (
                      <React.Fragment key={session.id}>
                        <ListItem 
                          button 
                          className={classes.chatSessionItem}
                          selected={session.id === state.currentSessionId}
                          onClick={() => handleSessionClick(session.id)}
                        >
                          <div style={{ flex: 1 }}>
                            <ListItemText 
                              primary={session.name} 
                              secondary={
                                <Typography 
                                  variant="caption" 
                                  color="textSecondary"
                                  style={{ paddingTop: '0.25rem', display: 'block', fontSize: '0.75rem' }}
                                >
                                  {new Date(session.timestamp || Date.now()).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} {new Date(session.timestamp || Date.now()).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  })}    •••    ID: {(session.id || '').split('-')[0]}
                                </Typography>
                              }
                            />
                          </div>
                          <div className={classes.sessionActions}>
                            <Tooltip title="Edit">
                              <IconButton 
                                edge="end" 
                                aria-label="edit" 
                                onClick={(e) => handleEditSession(e, session.id)}
                                className={classes.sessionActionButton}
                                color="primary"
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
                                style={{ color: '#ea4335' }}
                              >
                                <DeleteIcon style={{ color: '#ea4335' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download">
                              <IconButton 
                                edge="end" 
                                aria-label="download" 
                                onClick={() => handleDownloadSession(session.id)} 
                                className={classes.sessionActionButton}
                                color="primary"
                              >
                                <GetAppIcon />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                </div>
              </div>
            </Paper>
          )}
          
          <Paper className={`${classes.chatArea} ${state.isFullscreen ? classes.fullscreen : ''}`} elevation={3}>
            <div className={classes.buttonBar}>
              <Typography className={classes.sessionName}>
                {state.isFullscreen && state.chatSessions.find(session => session.id === state.currentSessionId)?.name}
              </Typography>
              
              {/* Add Processing indicator button in the middle */}
              {state.isLoading && (
                <div className={classes.processingButton} onClick={toggleLoadingIndicator}>
                  <span className={classes.processingText}>The agent team is retrieving information, reflecting, collaborating, revising, and drafting reports to address your query...</span>
                </div>
              )}
              
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
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {state.messages.map(message => (
                  <div key={message.id} style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: message.role === 'user' || message.sender === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <Message message={message} onSectionExpanded={handleSectionExpanded} />
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
            </div>

            {state.isLoading && <TypingIndicator />}

            <form onSubmit={handleSubmit} className={classes.inputArea}>
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
          <DialogTitle>
            <Typography className={classes.planDialogTitle}>
              Review Plan
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom className={classes.sectionHeader}>Agents</Typography>
              <Paper elevation={1} className={classes.agentsBox}>
                <Box className={classes.agentsContainer}>
                  {availableAgents.length > 0 ? (
                    availableAgents.map((agent) => (
                      <Box 
                        key={agent.id} 
                        className={`${classes.agentCard} ${selectedAgents.includes(agent.name) ? 'selected' : ''}`}
                        onClick={() => {
                          if (selectedAgents.includes(agent.name)) {
                            setSelectedAgents(prev => prev.filter(name => name !== agent.name));
                          } else {
                            setSelectedAgents(prev => [...prev, agent.name]);
                          }
                        }}
                      >
                        <img 
                          src={robotIcon} 
                          alt="Agent"
                          className={`${classes.robotIcon} ${selectedAgents.includes(agent.name) ? 'selected' : 'unselected'}`}
                        />
                        <Typography variant="body2" className={classes.agentName}>
                          {agent.name || agent.agent_name || "Unnamed Agent"}
                        </Typography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAgents.includes(agent.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAgents(prev => [...prev, agent.name]);
                                } else {
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
              <Typography variant="h6" gutterBottom className={classes.sectionHeader}>Proposed Plan</Typography>
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
                <Typography variant="h6" gutterBottom className={classes.sectionHeader}>Plan Notes</Typography>
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
              <Typography variant="h6" gutterBottom className={classes.sectionHeader}>Message Selection</Typography>
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
                    label={<span className={classes.messageRadioLabel}>Original Message</span>}
                  />
                  <div 
                    className={`${classes.selectedMessageContainer} ${messageChoice === 'original' ? classes.selectedMessage : ''}`}
                  >
                    <Typography 
                      variant="body1" 
                    >
                      {originalMessage}
                    </Typography>
                  </div>
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
                      label={<span className={classes.messageRadioLabel}>Modified Message</span>}
                    />
                    <div 
                      className={`${classes.selectedMessageContainer} ${messageChoice === 'modified' ? classes.selectedMessage : ''}`}
                    >
                      <Typography 
                        variant="body1" 
                      >
                        {modifiedQuestion}
                      </Typography>
                    </div>
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
            <Button 
              onClick={() => setPlanDialogOpen(false)}
              className={classes.cancelButton}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePlanSubmit}
              className={`${classes.dialogButton} ${classes.submitButton}`}
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
          <DialogTitle>
            <Typography className={classes.editDialogTitle}>
              Edit Chat Session
            </Typography>
          </DialogTitle>
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
              <div className={classes.teamDisplay}>
                <img 
                  src={robotIcon} 
                  alt="Team Icon" 
                  style={{ 
                    width: '24px', 
                    height: '24px',
                    filter: 'brightness(1.2) drop-shadow(0 0 3px rgba(33, 150, 243, 0.5))'
                  }} 
                />
                <Typography className={classes.teamName}>
                  {editSessionTeam}
                </Typography>
              </div>
              {teamError && (
                <Typography color="error" variant="body2">
                  {teamError}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setEditDialogOpen(false);
                setEditSessionId(null);
                setEditSessionName('');
                setTeamError('');
              }}
              className={classes.cancelButton}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              className={`${classes.dialogButton} ${classes.submitButton}`}
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