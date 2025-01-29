import React, { createContext, useContext, useReducer, useEffect } from 'react';

const ChatContext = createContext();

// Get initial state from localStorage or use default
const getInitialState = () => {
  const savedState = localStorage.getItem('chatState');
  if (savedState) {
    return JSON.parse(savedState);
  }
  return {
    messages: [],
    chatSessions: [{ id: 1, name: 'New Chat' }],
    currentSessionId: 1,
    input: '',
    isLoading: false,
    isFullscreen: false,
    helpDialogOpen: false,
    promptHelpOpen: false,
    showScrollTop: false,
    showScrollBottom: false,
    bookmarkedMessages: [],
  };
};

const ACTIONS = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_CHAT_SESSIONS: 'SET_CHAT_SESSIONS',
  ADD_CHAT_SESSION: 'ADD_CHAT_SESSION',
  DELETE_CHAT_SESSION: 'DELETE_CHAT_SESSION',
  SET_CURRENT_SESSION: 'SET_CURRENT_SESSION',
  SET_INPUT: 'SET_INPUT',
  SET_LOADING: 'SET_LOADING',
  SET_FULLSCREEN: 'SET_FULLSCREEN',
  SET_HELP_DIALOG: 'SET_HELP_DIALOG',
  SET_PROMPT_HELP: 'SET_PROMPT_HELP',
  SET_SCROLL_TOP: 'SET_SCROLL_TOP',
  SET_SCROLL_BOTTOM: 'SET_SCROLL_BOTTOM',
  RESET_STATE: 'RESET_STATE',
  TOGGLE_BOOKMARK: 'TOGGLE_BOOKMARK',
  UPDATE_BOOKMARK_POSITIONS: 'UPDATE_BOOKMARK_POSITIONS',
  REMOVE_ERROR_MESSAGES: 'REMOVE_ERROR_MESSAGES',
};

function chatReducer(state, action) {
  console.log('ChatReducer - Current State:', state);
  console.log('ChatReducer - Action:', action);
  
  let newState;
  
  switch (action.type) {
    case ACTIONS.SET_MESSAGES:
      newState = { ...state, messages: action.payload };
      break;
    case ACTIONS.ADD_MESSAGE:
      newState = { ...state, messages: [...state.messages, action.payload] };
      break;
    case ACTIONS.SET_CHAT_SESSIONS:
      newState = { ...state, chatSessions: action.payload };
      break;
    case ACTIONS.ADD_CHAT_SESSION:
      newState = { 
        ...state, 
        chatSessions: [action.payload, ...state.chatSessions],
        currentSessionId: action.payload.id
      };
      break;
    case ACTIONS.DELETE_CHAT_SESSION:
      newState = { 
        ...state, 
        chatSessions: state.chatSessions.filter(session => session.id !== action.payload) 
      };
      break;
    case ACTIONS.SET_CURRENT_SESSION:
      newState = { ...state, currentSessionId: action.payload };
      break;
    case ACTIONS.SET_INPUT:
      newState = { ...state, input: action.payload };
      break;
    case ACTIONS.SET_LOADING:
      newState = { ...state, isLoading: action.payload };
      break;
    case ACTIONS.SET_FULLSCREEN:
      newState = { ...state, isFullscreen: action.payload };
      break;
    case ACTIONS.SET_HELP_DIALOG:
      newState = { ...state, helpDialogOpen: action.payload };
      break;
    case ACTIONS.SET_PROMPT_HELP:
      newState = { ...state, promptHelpOpen: action.payload };
      break;
    case ACTIONS.SET_SCROLL_TOP:
      newState = { ...state, showScrollTop: action.payload };
      break;
    case ACTIONS.SET_SCROLL_BOTTOM:
      newState = { ...state, showScrollBottom: action.payload };
      break;
    case ACTIONS.RESET_STATE:
      newState = getInitialState();
      break;
    case ACTIONS.TOGGLE_BOOKMARK:
      console.log('TOGGLE_BOOKMARK - bookmarkedMessages:', state.bookmarkedMessages);
      const messageExists = state.bookmarkedMessages?.some(
        msg => msg.messageId === action.payload.messageId
      );
      console.log('TOGGLE_BOOKMARK - messageExists:', messageExists);
      
      newState = {
        ...state,
        bookmarkedMessages: messageExists
          ? state.bookmarkedMessages.filter(msg => msg.messageId !== action.payload.messageId)
          : [...(state.bookmarkedMessages || []), action.payload]
      };
      console.log('TOGGLE_BOOKMARK - New State:', newState);
      break;
    case ACTIONS.UPDATE_BOOKMARK_POSITIONS:
      newState = {
        ...state,
        bookmarkedMessages: state.bookmarkedMessages.map(msg => ({
          ...msg,
          position: action.payload[msg.messageId] || msg.position
        }))
      };
      break;
    case ACTIONS.REMOVE_ERROR_MESSAGES:
      newState = {
        ...state,
        messages: state.messages.filter(msg => 
          !(msg.sender === 'system' && msg.text.includes('Error:'))
        )
      };
      break;
    default:
      newState = state;
  }
  
  // Save state to localStorage after every action
  localStorage.setItem('chatState', JSON.stringify(newState));
  return newState;
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, getInitialState());

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatState', JSON.stringify(state));
  }, [state]);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export { ACTIONS }; 