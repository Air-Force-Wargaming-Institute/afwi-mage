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
    fontSize: '0.7rem',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.grey[300],
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

      setMessages([...newMessages, { text: response.data.response, sender: 'ai' }]);
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
                dangerouslySetInnerHTML={{ __html: message.text }}
              />
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