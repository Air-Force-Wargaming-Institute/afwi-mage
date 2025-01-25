import React, { useState, useRef, useEffect, useCallback } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  Tooltip,
  Typography,
  Snackbar,
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
import FileCopyIcon from '@material-ui/icons/FileCopy';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import axios from 'axios';
import { getApiUrl } from '../config';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    height: 'calc(80vh - 64px)',
    marginTop: '10px',
    backgroundColor: theme.palette.background.default,
  },
  chatContainer: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
    borderRadius: '12px',
    height: '100%',
    gap: theme.spacing(2),
  },
  chatLog: {
    width: '30%',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  chatArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    position: 'relative',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  messageArea: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    textAlign: 'left',
    fontSize: '0.9rem',
    backgroundColor: theme.palette.background.default,
  },
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2, 3),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
  },
  input: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
      borderRadius: '24px',
      backgroundColor: theme.palette.background.default,
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
      '&.Mui-focused': {
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 0 0 2px ${theme.palette.primary.main}',
      },
    },
  },
  newChatButton: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    width: '80%',
    alignSelf: 'center',
    borderRadius: '24px',
    padding: theme.spacing(1.5),
    textTransform: 'none',
    fontWeight: 500,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  message: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(2, 2.5),
    borderRadius: '16px',
    maxWidth: '85%',
    wordBreak: 'break-word',
    position: 'relative',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
    },
    '& p': {
      margin: '0.5em 0',
      lineHeight: 1.6,
    },
    '& pre': {
      margin: theme.spacing(1.5, 0),
      padding: theme.spacing(2),
      borderRadius: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      overflow: 'auto',
    },
    '& .syntax-highlighter': {
      margin: 0,
      borderRadius: '6px',
      fontSize: '0.85rem !important',
    },
    '& code': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      padding: '0.2em 0.4em',
      borderRadius: '4px',
      fontSize: '0.85rem',
      fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
    },
    '& ul, & ol': {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      paddingLeft: theme.spacing(3),
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      marginTop: theme.spacing(1.5),
      marginBottom: theme.spacing(1.5),
      borderRadius: '6px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    '& th, & td': {
      border: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1),
      backgroundColor: theme.palette.background.paper,
    },
    '& th': {
      backgroundColor: theme.palette.action.hover,
      fontWeight: 600,
    },
    '& blockquote': {
      borderLeft: `4px solid ${theme.palette.primary.light}`,
      margin: theme.spacing(1.5, 0),
      padding: theme.spacing(0.5, 2),
      color: theme.palette.text.secondary,
      backgroundColor: 'rgba(0, 0, 0, 0.02)',
      borderRadius: '4px',
    },
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.primary.main,
    color: '#fff !important',
    '& *': {
      color: '#fff !important',
    },
    '& code, & pre': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '8px',
      right: '-6px',
      width: '12px',
      height: '12px',
      backgroundColor: theme.palette.primary.main,
      transform: 'rotate(45deg)',
      borderRadius: '2px',
    },
    '& .MuiTypography-caption': {
      color: 'rgba(255, 255, 255, 0.7) !important',
    },
    '& .copyButton': {
      color: '#fff',
    },
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.background.paper,
    '& pre, & code': {
      backgroundColor: theme.palette.action.hover,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: '8px',
      left: '-6px',
      width: '12px',
      height: '12px',
      backgroundColor: theme.palette.background.paper,
      transform: 'rotate(45deg)',
      borderRadius: '2px',
    },
    '& .copyButton': {
      color: theme.palette.text.primary,
    },
  },
  agentHeader: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    '&::before': {
      content: '""',
      width: '8px',
      height: '8px',
      backgroundColor: theme.palette.info.main,
      borderRadius: '50%',
      display: 'inline-block',
    },
  },
  synthesisHeader: {
    fontSize: '0.8rem',
    color: theme.palette.secondary.main,
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    '&::before': {
      content: '""',
      width: '8px',
      height: '8px',
      backgroundColor: theme.palette.secondary.main,
      borderRadius: '50%',
      display: 'inline-block',
    },
  },
  chatSessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.action.selected,
      '&:hover': {
        backgroundColor: theme.palette.action.selected,
      },
    },
  },
  sessionActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
    '&:hover': {
      opacity: 1,
    },
  },
  buttonBar: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.75, 2),
    minHeight: '40px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  },
  messageTimestamp: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing(0.5),
    fontSize: '0.7rem',
    opacity: 0.8,
  },
  userMessageTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiMessageTimestamp: {
    color: theme.palette.text.secondary,
  },
  fullscreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1300,
    margin: 0,
    borderRadius: 0,
  },
  fullscreenButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1000,
  },
  buttonBarButton: {
    position: 'relative',
    marginLeft: 'auto',
  },
  copyButton: {
    padding: theme.spacing(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  },
  agentTeamInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexGrow: 1,
    flexWrap: 'wrap',
  },
  agentTeamLabel: {
    display: 'inline',
    color: theme.palette.text.primary,
    fontWeight: 500,
  },
  agentList: {
    display: 'inline',
    paddingLeft: '4px',
  },
  agentName: {
    display: 'inline',
    color: '#1a237e',
    fontWeight: 500,
    fontSize: '0.9rem',
  },
  helpDialog: {
    '& .MuiDialog-paper': {
      maxWidth: '600px',
      padding: theme.spacing(2),
    },
  },
  dialogSection: {
    marginBottom: theme.spacing(3),
  },
  dialogSubtitle: {
    color: theme.palette.primary.main,
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  systemAgentItem: {
    marginBottom: theme.spacing(1),
    '& span': {
      fontWeight: 500,
    },
  },
}));

function MultiAgentChat() {
  const classes = useStyles();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageEndRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      // Include conversation_id in the WebSocket URL if we have one
      const wsUrl = currentSessionId 
        ? `ws://localhost:8009/ws/chat?conversation_id=${currentSessionId}`
        : 'ws://localhost:8009/ws/chat';
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        switch(data.type) {
          case 'conversation_id':
            // Store the conversation ID when received
            setCurrentSessionId(data.content);
            // Add new session to the list if it doesn't exist
            setChatSessions(prev => {
              if (!prev.find(session => session.id === data.content)) {
                return [...prev, { 
                  id: data.content, 
                  name: `Chat ${prev.length + 1}`,
                  timestamp: new Date().toISOString()
                }];
              }
              return prev;
            });
            break;
          case 'agent_update':
            setMessages(prev => [...prev, {
              text: data.content,
              sender: `Agent: ${data.agent}`,
              timestamp: new Date().toISOString()
            }]);
            break;
          case 'final_synthesis':
            setMessages(prev => [...prev, {
              text: data.content,
              sender: 'Synthesis',
              timestamp: new Date().toISOString()
            }]);
            break;
          case 'error':
            setMessages(prev => [...prev, {
              text: `Error: ${data.content}`,
              sender: 'system',
              timestamp: new Date().toISOString()
            }]);
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      setWsConnection(ws);
    };

    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [currentSessionId]); // Reconnect when currentSessionId changes

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const newMessage = { 
      text: input.trim(), 
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    
    if (isConnected && wsConnection) {
      // Send via WebSocket
      wsConnection.send(input.trim());
    } else {
      // Fallback to REST API
      try {
        const response = await axios.post(getApiUrl('CHAT', '/chat'), { 
          message: input.trim(),
          conversation_id: currentSessionId
        });
        setMessages(prev => [...prev, { 
          text: response.data.response, 
          sender: 'ai',
          timestamp: new Date().toISOString()
        }]);
        // Update conversation ID if provided in response
        if (response.data.conversation_id) {
          setCurrentSessionId(response.data.conversation_id);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, { 
          text: 'Error: Failed to get response', 
          sender: 'system',
          timestamp: new Date().toISOString()
        }]);
      }
    }
    
    setInput('');
  };

  const handleNewChat = () => {
    // Close existing WebSocket connection to start a new one
    if (wsConnection) {
      wsConnection.close();
    }
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSelectSession = (sessionId) => {
    // Close existing WebSocket connection
    if (wsConnection) {
      wsConnection.close();
    }
    setCurrentSessionId(sessionId);
    // Messages will be loaded when the new WebSocket connection is established
    setMessages([]);
  };

  const handleEditSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const newName = prompt('Enter new name for the chat session:', session.name);
    if (newName && newName.trim()) {
      setChatSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, name: newName.trim() } : s
      ));
    }
  };

  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    }
  };

  const handleDownloadSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const sessionMessages = messages.map(msg => ({
      timestamp: msg.timestamp,
      role: msg.sender,
      content: msg.text
    }));
    
    const data = {
      session_id: session.id,
      session_name: session.name,
      timestamp: session.timestamp,
      messages: sessionMessages
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_session_${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbarOpen(true);
    });
  };

  const handleHelpOpen = () => {
    setHelpDialogOpen(true);
  };

  const handleHelpClose = () => {
    setHelpDialogOpen(false);
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
                  <ListItem 
                    button 
                    className={classes.chatSessionItem}
                    selected={session.id === currentSessionId}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <ListItemText 
                      primary={session.name} 
                      secondary={
                        <>
                          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                          <br />
                          {new Date(session.timestamp).toLocaleString()}
                        </>
                      }
                    />
                    <div className={classes.sessionActions}>
                      <Tooltip title="Edit">
                        <IconButton edge="end" aria-label="edit" onClick={(e) => {
                          e.stopPropagation();
                          handleEditSession(session.id);
                        }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton edge="end" aria-label="delete" onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton edge="end" aria-label="download" onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSession(session.id);
                        }}>
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
            <div className={classes.agentTeamInfo}>
              <Tooltip title="Help">
                <IconButton
                  onClick={handleHelpOpen}
                  color="primary"
                  size="small"
                >
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
              <Typography component="span" className={classes.agentTeamLabel}>
                Agents on this Team:
              </Typography>
              {['PRC Domestic Stability Expert', 'PRC Economics Expert', 'PRC Global Influence Expert', 'PRC Government Expert', 'PRC Military Expert', 'PRC Regional Dynamics', 'PRC Technology and Innovation Expert'].map((agent, index) => (
                <Typography key={index} component="span" className={classes.agentName}>
                  {index === 0 ? ' ' : ''}{agent}{index < 6 ? ', ' : ''}
                </Typography>
              ))}
            </div>
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
              >
                {message.sender !== 'user' && (
                  <Typography 
                    className={message.sender === 'Synthesis' ? classes.synthesisHeader : classes.agentHeader}
                  >
                    {message.sender}
                  </Typography>
                )}
                {message.sender === 'user' ? (
                  <Typography style={{ color: '#fff' }}>{message.text}</Typography>
                ) : (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({node, inline, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        return !inline ? (
                          <SyntaxHighlighter
                            className="syntax-highlighter"
                            language={language}
                            style={tomorrow}
                            PreTag="div"
                            showLineNumbers={true}
                            wrapLines={true}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                )}
                <Typography 
                  variant="caption" 
                  className={`${classes.messageTimestamp} ${
                    message.sender === 'user' ? classes.userMessageTimestamp : classes.aiMessageTimestamp
                  }`}
                >
                  <span>{new Date(message.timestamp).toLocaleString()}</span>
                  <Tooltip title="Copy message">
                    <IconButton
                      className={`${classes.copyButton} copyButton`}
                      size="small"
                      onClick={() => handleCopyMessage(message.text)}
                    >
                      <FileCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Typography>
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
              disabled={!isConnected}
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
        <DialogTitle id="help-dialog-title">
          How to Interact with Multi-Agent Teams
        </DialogTitle>
        <DialogContent>
          <div className={classes.dialogSection}>
            <Typography variant="h6" className={classes.dialogSubtitle}>
              System Agents
            </Typography>
            <Typography paragraph className={classes.systemAgentItem}>
              <span>Agent Moderator:</span> Coordinates the conversation flow and ensures all relevant agents contribute their expertise at the appropriate time.
            </Typography>
            <Typography paragraph className={classes.systemAgentItem}>
              <span>Librarian:</span> Manages information retrieval and helps maintain context throughout the conversation.
            </Typography>
            <Typography paragraph className={classes.systemAgentItem}>
              <span>Synthesis Agent:</span> Combines insights from all agents to provide comprehensive, unified responses.
            </Typography>
          </div>
          
          <div className={classes.dialogSection}>
            <Typography variant="h6" className={classes.dialogSubtitle}>
              How It Works
            </Typography>
            <Typography paragraph>
              When you send a message, the Agent Moderator analyzes your query and coordinates with the appropriate domain expert agents. The Librarian assists by providing relevant context and information, while the Synthesis Agent combines all insights into a coherent response.
            </Typography>
          </div>

          <div className={classes.dialogSection}>
            <Typography variant="h6" className={classes.dialogSubtitle}>
              Tips for Effective Interaction
            </Typography>
            <Typography paragraph>
              • Be specific in your questions to help the Agent Moderator direct them to the most relevant experts<br/>
              • Feel free to ask follow-up questions - the Librarian maintains context throughout the conversation<br/>
              • Complex questions are welcome - the system is designed to coordinate multiple experts for comprehensive answers
            </Typography>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHelpClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="Message copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}

export default MultiAgentChat;