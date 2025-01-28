import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Tooltip
} from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';
import { getApiUrl } from '../config';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
    borderRadius: theme.shape.borderRadius,
    maxWidth: '80%',
    wordBreak: 'break-word',
    display: 'inline-block',
    whiteSpace: 'pre-wrap',
    fontSize: '0.7rem',
    position: 'relative',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
    '& .copyButton': {
      color: '#ffffff',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      },
    },
    '& .messageContent': {
      color: '#ffffff',
    },
    '& .markdown': {
      '& p, & h1, & h2, & h3, & h4, & h5, & h6, & ul, & ol, & li': {
        color: '#ffffff',
      },
    },
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.text.primary,
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
    justifyContent: 'flex-end',
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  markdown: {
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      margin: '0.5em 0 0.3em',
      lineHeight: 1,
      color: theme.palette.text.primary,
    },
    '& p': {
      margin: '0.3em 0',
      color: theme.palette.text.primary,
      lineHeight: 1.3,
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
    fontSize: '0.9rem',
    lineHeight: 1.5,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
  },
  messageWrapper: {
    position: 'relative',
    width: '100%',
  },
  copyButton: {
    position: 'absolute',
    right: theme.spacing(0.5),
    bottom: theme.spacing(-1),
    padding: 0,
    minWidth: '32px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
    },
    zIndex: 1,
    '& .MuiSvgIcon-root': {
      fontSize: '18px',
      margin: 'auto',
    },
  },
  messageContainer: {
    position: 'relative',
    width: '100%',
    padding: theme.spacing(1),
  },
}));

const MessageContent = ({ content, isUser }) => {
  const classes = useStyles();
  
  // Handle array responses and ensure content is a string
  let textContent = Array.isArray(content) 
    ? content[0] 
    : (typeof content === 'string' ? content : JSON.stringify(content));

  // Clean up the text formatting
  textContent = textContent
    // Replace multiple newlines with single newlines
    .replace(/\n{3,}/g, '\n')
    // Ensure proper spacing around headers (reduced spacing)
    .replace(/\n(#{1,6}\s.*)\n/g, '\n$1\n')
    // Remove newlines between headers and lists
    .replace(/(\*\*.*?\*\*)\n+([*-]\s)/g, '$1\n$2')  // For bold headers
    .replace(/(#{1,6}\s.*)\n+([*-]\s)/g, '$1\n$2')   // For markdown headers
    // Ensure proper spacing around lists
    .replace(/\n([*-]\s.*)\n/g, '\n$1\n')
    // Clean up extra spaces
    .trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // Optionally add a toast/snackbar notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const renderedContent = isUser ? (
    <div className={classes.messageContent}>{textContent}</div>
  ) : (
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
  );

  return (
    <div className={classes.messageContainer}>
      {renderedContent}
      <IconButton 
        className={`${classes.copyButton} copyButton`}
        size="small"
        onClick={handleCopy}
        title="Copy message"
        centerRipple
      >
        <ContentCopyIcon />
      </IconButton>
    </div>
  );
};

function MultiAgentChat() {
  const classes = useStyles();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([{ id: 1, name: 'New Chat' }]);
  const messageEndRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { text: input.trim(), sender: 'user' }];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await axios.post(getApiUrl('CHAT', '/chat'), { message: input.trim() });
      
      // Handle array responses
      const aiResponse = Array.isArray(response.data.response) 
        ? response.data.response[0] 
        : (typeof response.data.response === 'string' 
            ? response.data.response 
            : JSON.stringify(response.data.response));

      setMessages([...newMessages, { text: aiResponse, sender: 'ai' }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...newMessages, { text: 'Error: Failed to get response from AI', sender: 'system' }]);
    }
  };

  const handleNewChat = () => {
    const newSession = { id: chatSessions.length + 1, name: `New Chat ${chatSessions.length + 1}` };
    setChatSessions([newSession, ...chatSessions]);
    setMessages([]);
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
    setIsFullscreen(!isFullscreen);
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
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton
                className={classes.buttonBarButton}
                onClick={toggleFullscreen}
                color="primary"
                size="small"
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </div>
          <Box className={classes.messageArea}>
            {messages.map((message, index) => (
              <Box 
                key={index} 
                className={`${classes.message} ${
                  message.sender === 'user' ? classes.userMessage : classes.aiMessage
                }`}
                style={{ maxWidth: message.sender === 'user' ? '70%' : '85%' }}
              >
                <div className={classes.messageWrapper}>
                  <MessageContent 
                    content={message.text} 
                    isUser={message.sender === 'user'} 
                  />
                </div>
              </Box>
            ))}
            <div ref={messageEndRef} />
          </Box>
          <form onSubmit={handleSubmit} className={classes.inputArea}>
            <TextField
              className={classes.input}
              variant="outlined"
              placeholder="Type your message here..."
              value={input}
              onChange={handleInputChange}
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
    </Container>
  );
}

export default MultiAgentChat;