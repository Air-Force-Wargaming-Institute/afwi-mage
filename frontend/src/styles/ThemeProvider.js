import React from 'react';
import { ThemeProvider as MuiThemeProvider, StylesProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import theme from './theme';

// Create a styled JSS for global styles including animations
const GlobalStyles = () => {
  // Inject global styles for animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes borderGlow {
        0% {
          opacity: 1;
          background: linear-gradient(135deg, #4285f4, #34a853, #ea4335);
          background-size: 200% 200%;
          background-position: 0% 0%;
          filter: brightness(1.2) contrast(1.3);
        }
        25% {
          opacity: 1;
          background: linear-gradient(to right, #4285f4, #34a853, #fbbc05);
          background-size: 200% 200%;
          background-position: 50% 0%;
          filter: brightness(1.3) contrast(1.4);
        }
        50% {
          opacity: 1;
          background: linear-gradient(45deg, #ea4335, #4285f4, #34a853);
          background-size: 200% 200%;
          background-position: 100% 50%;
          filter: brightness(1.4) contrast(1.5);
        }
        75% {
          opacity: 1;
          background: linear-gradient(to bottom, #fbbc05, #ea4335, #4285f4);
          background-size: 200% 200%;
          background-position: 50% 100%;
          filter: brightness(1.3) contrast(1.4);
        }
        100% {
          opacity: 1;
          background: linear-gradient(to left, #34a853, #fbbc05, #ea4335);
          background-size: 200% 200%;
          background-position: 0% 100%;
          filter: brightness(1.2) contrast(1.3);
        }
      }
      
      @keyframes textGlow {
        0% {
          filter: brightness(0.9);
        }
        50% {
          filter: brightness(1.4);
        }
        100% {
          filter: brightness(0.9);
        }
      }
      
      @keyframes pulseBorder {
        0% {
          box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(66, 133, 244, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(66, 133, 244, 0);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};

const ThemeProvider = ({ children }) => {
  return (
    <StylesProvider injectFirst>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        {children}
      </MuiThemeProvider>
    </StylesProvider>
  );
};

export default ThemeProvider; 