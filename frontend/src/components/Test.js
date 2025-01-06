import React, { useState } from 'react';
import SendIcon from '@material-ui/icons/Send';

function Test() {
  const [selectedModel, setSelectedModel] = useState('');
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([]);

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSubmit = () => {
    if (input.trim() && selectedModel) {
      // TODO: Implement API call to selected model
      const newMessage = { role: 'user', content: input };
      setConversation([...conversation, newMessage]);
      setInput('');
      // Simulated response
      setTimeout(() => {
        const response = { role: 'assistant', content: `Response from ${selectedModel}: This is a simulated response.` };
        setConversation(prev => [...prev, response]);
      }, 1000);
    }
  };

  return (
    <div className="container">
      <h2>Test Fine-Tuned Models</h2>
      <p>
        This page allows you to interact with your fine-tuned models. Here's how to use it:
      </p>
      <ol className="list-item-text">
        <li>Select a fine-tuned model from the dropdown menu.</li>
        <li>Type your message in the input field.</li>
        <li>Click the "Send" button or press Enter to send your message.</li>
        <li>View the model's response in the conversation area.</li>
      </ol>
      <select
        value={selectedModel}
        onChange={handleModelChange}
        className="model-select"
      >
        <option value="" disabled>Select a model</option>
        <option value="model1">Fine-Tuned Model 1</option>
        <option value="model2">Fine-Tuned Model 2</option>
      </select>
      <div className="conversation-area">
        {conversation.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message here"
          className="message-input"
        />
        <button 
          onClick={handleSubmit}
          disabled={!selectedModel || !input.trim()}
          className={`app-button ${!selectedModel || !input.trim() ? 'disabled' : ''}`}
        >
          <SendIcon /> Send
        </button>
      </div>
    </div>
  );
}

export default Test;