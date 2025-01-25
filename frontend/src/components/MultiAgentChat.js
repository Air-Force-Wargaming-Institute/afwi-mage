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
  Typography
} from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import axios from 'axios';
import { getApiUrl } from '../config';

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
    borderRadius: theme.shape.borderRadius,
    maxWidth: '80%',
    wordBreak: 'break-word',
    display: 'inline-block',
    whiteSpace: 'pre-wrap',
    fontSize: '0.9rem',
    '& p': {
      margin: 0,
    },
    '& pre': {
      margin: theme.spacing(1, 0),
      padding: 0,
      backgroundColor: 'transparent',
    },
    '& .syntax-highlighter': {
      margin: 0,
      borderRadius: theme.shape.borderRadius,
      fontSize: '0.8rem !important',
    },
    '& code': {
      backgroundColor: theme.palette.grey[100],
      padding: theme.spacing(0.5),
      borderRadius: '3px',
      fontSize: '0.8rem',
    },
    '& ul, & ol': {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      paddingLeft: theme.spacing(3),
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
    '& th, & td': {
      border: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(0.5),
    },
    '& blockquote': {
      borderLeft: `4px solid ${theme.palette.grey[300]}`,
      margin: theme.spacing(1, 0),
      padding: theme.spacing(0, 1),
      color: theme.palette.text.secondary,
    },
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    '& code, & pre': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.grey[100],
    '& pre, & code': {
      backgroundColor: theme.palette.grey[200],
    },
  },
  agentHeader: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
  },
  synthesisHeader: {
    fontSize: '0.8rem',
    color: theme.palette.secondary.main,
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
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
                  <Typography>{message.text}</Typography>
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
                <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: '4px' }}>
                  {new Date(message.timestamp).toLocaleString()}
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
    </Container>
  );
}

export default MultiAgentChat;