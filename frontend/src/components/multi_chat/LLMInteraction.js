import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { Typography, TextField, Button, Paper, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@material-ui/core';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

function LLMInteraction() {
  const { user, token } = useContext(AuthContext);
  const [modelName, setModelName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      console.log('Fetching available models...');
      const result = await axios.get(getGatewayUrl('/api/generate/available-models'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Available models:', result.data);
      setAvailableModels(result.data);
    } catch (error) {
      console.error('Error fetching available models:', error);
      console.error('Error response:', error.response);
    }
  };

  const initializeModel = async () => {
    setIsInitializing(true);
    try {
      await axios.post(getGatewayUrl(`/api/generate/initialize-model/${modelName}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      alert(`Model ${modelName} initialized successfully`);
    } catch (error) {
      console.error('Error initializing model:', error);
      alert('Error initializing model');
    } finally {
      setIsInitializing(false);
    }
  };

  const generateText = async () => { //I think this post isn't quite right
    setIsLoading(true);
    setResponse('');
    try {
      const response = await axios.post(getGatewayUrl(`/api/generate/generate-text/${modelName}`), { prompt }, { 
        params: { stream: true },
        responseType: 'stream'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const reader = response.data.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setResponse(prev => prev + chunk);
      }
    } catch (error) {
      console.error('Error generating text:', error);
      setResponse('Error generating text');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper className="llm-interaction-container" style={{ padding: '20px', margin: '20px' }}>
      <Typography variant="h5" gutterBottom>LLM Interaction</Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel id="model-select-label">Select Model</InputLabel>
        <Select
          labelId="model-select-label"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
        >
          {availableModels.map((model) => (
            <MenuItem key={model} value={model}>{model}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button 
        onClick={initializeModel} 
        variant="contained" 
        color="primary" 
        disabled={!modelName || isInitializing}
        style={{ marginTop: '10px', marginBottom: '20px' }}
      >
        {isInitializing ? <CircularProgress size={24} /> : 'Initialize Model'}
      </Button>
      <TextField
        label="Prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        fullWidth
        margin="normal"
        multiline
        rows={4}
        variant="outlined"
      />
      <Button 
        onClick={generateText} 
        variant="contained" 
        color="primary" 
        disabled={!modelName || !prompt || isLoading}
        style={{ marginTop: '10px', marginBottom: '20px' }}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Generate Text'}
      </Button>
      <Typography variant="h6" gutterBottom>Response:</Typography>
      <Paper 
        elevation={3} 
        style={{ 
          padding: '15px', 
          maxHeight: '300px', 
          overflowY: 'auto', 
          backgroundColor: '#f5f5f5',
          whiteSpace: 'pre-wrap'
        }}
      >
        <Typography>{response}</Typography>
      </Paper>
    </Paper>
  );
}

export default LLMInteraction;
