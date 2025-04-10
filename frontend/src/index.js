import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

// Add error handler for ResizeObserver errors
const originalConsoleError = console.error;
console.error = function(msg, ...args) {
  if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) {
    // Ignore ResizeObserver loop errors
    return;
  }
  originalConsoleError(msg, ...args);
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
