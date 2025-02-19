import React, { createContext, useContext, useReducer } from 'react';

// Create context
const DirectChatContext = createContext();

// Simplified initial state
const getInitialState = () => ({
  input: ''
});

// Simplified actions
const ACTIONS = {
  SET_INPUT: 'SET_INPUT'
};

// Simplified reducer
function directChatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_INPUT:
      return { ...state, input: action.payload };
    default:
      return state;
  }
}

export function DirectChatProvider({ children }) {
  const [state, dispatch] = useReducer(directChatReducer, getInitialState());

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