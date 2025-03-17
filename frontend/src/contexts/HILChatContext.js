import React, { createContext, useContext, useReducer, useEffect } from 'react';

const HILChatContext = createContext();

// Get initial state from localStorage or use default
const getInitialState = () => {
  const savedState = localStorage.getItem('hilChatState');
  if (savedState) {
    return JSON.parse(savedState);
  }
  return {
    messages: [],
    chatSessions: [],
    currentSessionId: null,
    input: '',
    isLoading: false,
    // Improvement dialog states
    improvementDialogOpen: false,
    suggestedImprovement: '',
    improvementChoice: '',
    rejectionFeedback: '',
    // Session states
    sessionDialogOpen: false,
    sessionName: '',
    selectedTeam: '',
    availableTeams: [],
    // UI states
    isFullscreen: false,
    showScrollTop: false,
    showScrollBottom: false,
    helpDialogOpen: false,
    promptHelpOpen: false,
    // Error handling
    error: null,
  };
};

const ACTIONS = {
  // Message Actions
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  REMOVE_ERROR_MESSAGES: 'REMOVE_ERROR_MESSAGES',
  
  // Session Actions
  SET_CHAT_SESSIONS: 'SET_CHAT_SESSIONS',
  ADD_CHAT_SESSION: 'ADD_CHAT_SESSION',
  DELETE_CHAT_SESSION: 'DELETE_CHAT_SESSION',
  SET_CURRENT_SESSION: 'SET_CURRENT_SESSION',
  UPDATE_CHAT_SESSION: 'UPDATE_CHAT_SESSION',
  SET_SESSION_DIALOG: 'SET_SESSION_DIALOG',
  SET_SESSION_NAME: 'SET_SESSION_NAME',
  SET_SELECTED_TEAM: 'SET_SELECTED_TEAM',
  SET_AVAILABLE_TEAMS: 'SET_AVAILABLE_TEAMS',
  
  // Improvement Dialog Actions
  SET_IMPROVEMENT_DIALOG: 'SET_IMPROVEMENT_DIALOG',
  SET_SUGGESTED_IMPROVEMENT: 'SET_SUGGESTED_IMPROVEMENT',
  SET_IMPROVEMENT_CHOICE: 'SET_IMPROVEMENT_CHOICE',
  SET_REJECTION_FEEDBACK: 'SET_REJECTION_FEEDBACK',
  
  // UI Actions
  SET_INPUT: 'SET_INPUT',
  SET_LOADING: 'SET_LOADING',
  SET_FULLSCREEN: 'SET_FULLSCREEN',
  SET_SCROLL_TOP: 'SET_SCROLL_TOP',
  SET_SCROLL_BOTTOM: 'SET_SCROLL_BOTTOM',
  SET_HELP_DIALOG: 'SET_HELP_DIALOG',
  SET_PROMPT_HELP: 'SET_PROMPT_HELP',
  
  // Error Actions
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Reset Action
  RESET_STATE: 'RESET_STATE',
};

function hilChatReducer(state, action) {
  console.log('HILChatReducer - Current State:', state);
  console.log('HILChatReducer - Action:', action);
  
  let newState;
  
  switch (action.type) {
    // Message Actions
    case ACTIONS.SET_MESSAGES:
      newState = { ...state, messages: action.payload };
      break;
    case ACTIONS.ADD_MESSAGE:
      newState = { ...state, messages: [...state.messages, action.payload] };
      break;
    case ACTIONS.UPDATE_MESSAGE:
      newState = { 
        ...state, 
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ) 
      };
      break;
    case ACTIONS.REMOVE_ERROR_MESSAGES:
      newState = {
        ...state,
        messages: state.messages.filter(msg => msg.sender !== 'system')
      };
      break;
      
    // Session Actions
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
    case ACTIONS.SET_SESSION_DIALOG:
      newState = { ...state, sessionDialogOpen: action.payload };
      break;
    case ACTIONS.SET_SESSION_NAME:
      newState = { ...state, sessionName: action.payload };
      break;
    case ACTIONS.SET_SELECTED_TEAM:
      newState = { ...state, selectedTeam: action.payload };
      break;
    case ACTIONS.SET_AVAILABLE_TEAMS:
      newState = { ...state, availableTeams: action.payload };
      break;
      
    // Improvement Dialog Actions
    case ACTIONS.SET_IMPROVEMENT_DIALOG:
      newState = { ...state, improvementDialogOpen: action.payload };
      break;
    case ACTIONS.SET_SUGGESTED_IMPROVEMENT:
      newState = { ...state, suggestedImprovement: action.payload };
      break;
    case ACTIONS.SET_IMPROVEMENT_CHOICE:
      newState = { ...state, improvementChoice: action.payload };
      break;
    case ACTIONS.SET_REJECTION_FEEDBACK:
      newState = { ...state, rejectionFeedback: action.payload };
      break;
      
    // UI Actions
    case ACTIONS.SET_INPUT:
      newState = { ...state, input: action.payload };
      break;
    case ACTIONS.SET_LOADING:
      newState = { ...state, isLoading: action.payload };
      break;
    case ACTIONS.SET_FULLSCREEN:
      newState = { ...state, isFullscreen: action.payload };
      break;
    case ACTIONS.SET_SCROLL_TOP:
      newState = { ...state, showScrollTop: action.payload };
      break;
    case ACTIONS.SET_SCROLL_BOTTOM:
      newState = { ...state, showScrollBottom: action.payload };
      break;
    case ACTIONS.SET_HELP_DIALOG:
      newState = { ...state, helpDialogOpen: action.payload };
      break;
    case ACTIONS.SET_PROMPT_HELP:
      newState = { ...state, promptHelpOpen: action.payload };
      break;
      
    // Error Actions
    case ACTIONS.SET_ERROR:
      newState = { ...state, error: action.payload };
      break;
    case ACTIONS.CLEAR_ERROR:
      newState = { ...state, error: null };
      break;
      
    // Reset Action
    case ACTIONS.RESET_STATE:
      newState = getInitialState();
      break;
      
    // New action for updating chat session
    case ACTIONS.UPDATE_CHAT_SESSION:
      newState = {
        ...state,
        chatSessions: state.chatSessions.map(session =>
          session.id === action.payload.id
            ? { ...session, ...action.payload }
            : session
        ),
      };
      break;
      
    default:
      newState = state;
  }
  
  // Save state to localStorage after every action
  localStorage.setItem('hilChatState', JSON.stringify(newState));
  return newState;
}

export function HILChatProvider({ children }) {
  const [state, dispatch] = useReducer(hilChatReducer, getInitialState());

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('hilChatState', JSON.stringify(state));
  }, [state]);

  return (
    <HILChatContext.Provider value={{ state, dispatch }}>
      {children}
    </HILChatContext.Provider>
  );
}

export function useHILChat() {
  const context = useContext(HILChatContext);
  if (!context) {
    throw new Error('useHILChat must be used within a HILChatProvider');
  }
  return context;
}

export { ACTIONS }; 