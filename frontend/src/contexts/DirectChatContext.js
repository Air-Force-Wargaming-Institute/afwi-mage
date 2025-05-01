import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Create context
const DirectChatContext = createContext();

// Function to get initial state, reading from localStorage
const getInitialState = () => {
  let initialIsFullscreen = false;
  try {
    const storedFullscreen = localStorage.getItem('directChatIsFullscreen');
    if (storedFullscreen !== null) {
      initialIsFullscreen = JSON.parse(storedFullscreen);
    }
  } catch (error) {
    console.error('Error reading fullscreen state from localStorage:', error);
  }
  return {
    input: '',
    isFullscreen: initialIsFullscreen // Initialize from localStorage or default
  };
};

// Simplified actions
const ACTIONS = {
  SET_INPUT: 'SET_INPUT',
  SET_FULLSCREEN: 'SET_FULLSCREEN'
};

// Simplified reducer
function directChatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_INPUT:
      return { ...state, input: action.payload };
    case ACTIONS.SET_FULLSCREEN:
      return { ...state, isFullscreen: action.payload };
    default:
      return state;
  }
}

export function DirectChatProvider({ children }) {
  const [state, dispatch] = useReducer(directChatReducer, getInitialState());

  // Effect to persist isFullscreen state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('directChatIsFullscreen', JSON.stringify(state.isFullscreen));
    } catch (error) {
      console.error('Error writing fullscreen state to localStorage:', error);
    }
  }, [state.isFullscreen]); // Run effect only when isFullscreen changes

  return (
    <DirectChatContext.Provider value={{ state, dispatch }}>
      {children}
    </DirectChatContext.Provider>
  );
}

export function useDirectChat() {
  const context = useContext(DirectChatContext);
  if (!context) {
    throw new Error('useDirectChat must be used within a DirectChatProvider');
  }
  return context;
}

export { ACTIONS }; 