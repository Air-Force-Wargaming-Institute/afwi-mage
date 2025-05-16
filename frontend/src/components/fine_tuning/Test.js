import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Box,
  Divider,
  Grid,
  Tooltip
} from '@material-ui/core';
import {
  Send as SendIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Info as InfoIcon
} from '@material-ui/icons';
import '../../App.css';

function Test() {
  const [selectedModel, setSelectedModel] = useState('');
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (input.trim() && selectedModel) {
      const userMessage = { role: 'user', content: input.trim() };
      setConversation(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      // Simulated API call - replace with actual API call
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = {
          role: 'assistant',
          content: `This is a simulated response from ${selectedModel}. In the actual implementation, this will be replaced with real responses from your fine-tuned model.`
        };
        setConversation(prev => [...prev, response]);
      } catch (error) {
        console.error('Error getting model response:', error);
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
          error: true
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Container maxWidth="xl" className="main-content">
      <Typography variant="h4" className="section-title" gutterBottom>
        Test Fine-Tuned Models
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          {/* Model Selection and Info Panel */}
          <Paper className="paper" elevation={3}>
            <Typography variant="h6" className="section-subtitle" gutterBottom>
              Select Model
            </Typography>
            <Typography variant="body2" className="text-secondary" paragraph>
              Choose a fine-tuned model to test its responses.
            </Typography>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Select Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={handleModelChange}
                label="Select Model"
              >
                <MenuItem value="" disabled>
                  <em>Select a model</em>
                </MenuItem>
                <MenuItem value="model1">Fine-Tuned Model 1</MenuItem>
                <MenuItem value="model2">Fine-Tuned Model 2</MenuItem>
              </Select>
            </FormControl>

            <Box mt={3}>
              <Typography variant="h6" className="section-subtitle" gutterBottom>
                Testing Guidelines
              </Typography>
              <Typography variant="body2" className="text-secondary" component="div">
                <Box component="ul" pl={2} m={0}>
                  <li>Select your fine-tuned model above</li>
                  <li>Type your test queries in the chat</li>
                  <li>Press Enter or click Send to submit</li>
                  <li>Review the model's responses</li>
                  <li>Try various inputs to test model behavior</li>
                </Box>
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          {/* Chat Interface */}
          <Paper className="paper" elevation={3} style={{ height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
            {/* Conversation Display */}
            <Box 
              flex={1} 
              overflow="auto" 
              p={2} 
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: '4px'
              }}
            >
              {conversation.length === 0 ? (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  height="100%"
                  flexDirection="column"
                  color="text.secondary"
                >
                  <InfoIcon style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }} />
                  <Typography variant="body1" className="text-secondary">
                    Select a model and start a conversation to test its responses
                  </Typography>
                </Box>
              ) : (
                conversation.map((message, index) => (
                  <Box
                    key={index}
                    mb={2}
                    display="flex"
                    alignItems="flex-start"
                    justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
                  >
                    <Box
                      maxWidth="80%"
                      style={{
                        backgroundColor: message.role === 'user' 
                          ? 'var(--primary-color)' 
                          : message.error 
                            ? '#ffebee'
                            : '#f5f5f5',
                        color: message.role === 'user' ? 'white' : 'inherit',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        position: 'relative',
                        marginLeft: message.role === 'user' ? 0 : '40px',
                        marginRight: message.role === 'user' ? '40px' : 0,
                      }}
                    >
                      {message.role === 'user' ? (
                        <PersonIcon 
                          style={{
                            position: 'absolute',
                            right: '-40px',
                            top: 0,
                            color: 'var(--primary-color)'
                          }}
                        />
                      ) : (
                        <ComputerIcon 
                          style={{
                            position: 'absolute',
                            left: '-40px',
                            top: 0,
                            color: message.error ? '#f44336' : '#666'
                          }}
                        />
                      )}
                      <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {/* Input Area */}
            <Box p={2} style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs>
                  <TextField
                    fullWidth
                    multiline
                    rows={1}
                    rowsMax={4}
                    variant="outlined"
                    placeholder="Type your message here..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={!selectedModel}
                    size="small"
                  />
                </Grid>
                <Grid item>
                  <Tooltip title={!selectedModel ? "Please select a model first" : ""}>
                    <span>
                      <IconButton
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!selectedModel || !input.trim() || isLoading}
                        style={{
                          backgroundColor: 'var(--primary-color)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'var(--secondary-color)'
                          }
                        }}
                      >
                        <SendIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Test;