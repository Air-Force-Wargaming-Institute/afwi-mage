import React, { createContext, useContext, useReducer } from 'react';

const ExtractionContext = createContext();

// Initial state
const initialState = {
  files: [],
  selectedFiles: [],
  message: '',
  currentFolder: '',
  csvFilename: '',
  isLoading: false,
  isExtracting: false,
  csvFiles: [],
  selectedCsvFile: '',
  newlyCreatedCsvFile: '',
  editingCsvFile: null,
  newCsvFileName: '',
  error: null,
  previewOpen: false,
  previewData: [],
  metadataOpen: false,
  metadataContent: null,
};

// Action types
const ACTIONS = {
  SET_FILES: 'SET_FILES',
  SET_SELECTED_FILES: 'SET_SELECTED_FILES',
  SET_MESSAGE: 'SET_MESSAGE',
  SET_CURRENT_FOLDER: 'SET_CURRENT_FOLDER',
  SET_CSV_FILENAME: 'SET_CSV_FILENAME',
  SET_LOADING: 'SET_LOADING',
  SET_EXTRACTING: 'SET_EXTRACTING',
  SET_CSV_FILES: 'SET_CSV_FILES',
  SET_SELECTED_CSV_FILE: 'SET_SELECTED_CSV_FILE',
  SET_NEWLY_CREATED_CSV_FILE: 'SET_NEWLY_CREATED_CSV_FILE',
  SET_EDITING_CSV_FILE: 'SET_EDITING_CSV_FILE',
  SET_NEW_CSV_FILENAME: 'SET_NEW_CSV_FILENAME',
  SET_ERROR: 'SET_ERROR',
  SET_PREVIEW_OPEN: 'SET_PREVIEW_OPEN',
  SET_PREVIEW_DATA: 'SET_PREVIEW_DATA',
  SET_METADATA_OPEN: 'SET_METADATA_OPEN',
  SET_METADATA_CONTENT: 'SET_METADATA_CONTENT',
  RESET_STATE: 'RESET_STATE',
};

// Reducer
function extractionReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_FILES:
      return { ...state, files: action.payload };
    case ACTIONS.SET_SELECTED_FILES:
      return { ...state, selectedFiles: action.payload };
    case ACTIONS.SET_MESSAGE:
      return { ...state, message: action.payload };
    case ACTIONS.SET_CURRENT_FOLDER:
      return { ...state, currentFolder: action.payload };
    case ACTIONS.SET_CSV_FILENAME:
      return { ...state, csvFilename: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.SET_EXTRACTING:
      return { ...state, isExtracting: action.payload };
    case ACTIONS.SET_CSV_FILES:
      return { ...state, csvFiles: action.payload };
    case ACTIONS.SET_SELECTED_CSV_FILE:
      return { ...state, selectedCsvFile: action.payload };
    case ACTIONS.SET_NEWLY_CREATED_CSV_FILE:
      return { ...state, newlyCreatedCsvFile: action.payload };
    case ACTIONS.SET_EDITING_CSV_FILE:
      return { ...state, editingCsvFile: action.payload };
    case ACTIONS.SET_NEW_CSV_FILENAME:
      return { ...state, newCsvFileName: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_PREVIEW_OPEN:
      return { ...state, previewOpen: action.payload };
    case ACTIONS.SET_PREVIEW_DATA:
      return { ...state, previewData: action.payload };
    case ACTIONS.SET_METADATA_OPEN:
      return { ...state, metadataOpen: action.payload };
    case ACTIONS.SET_METADATA_CONTENT:
      return { ...state, metadataContent: action.payload };
    case ACTIONS.RESET_STATE:
      return initialState;
    default:
      return state;
  }
}

// Provider component
export function ExtractionProvider({ children }) {
  const [state, dispatch] = useReducer(extractionReducer, initialState);

  return (
    <ExtractionContext.Provider value={{ state, dispatch }}>
      {children}
    </ExtractionContext.Provider>
  );
}

// Custom hook for using the extraction context
export function useExtraction() {
  const context = useContext(ExtractionContext);
  if (!context) {
    throw new Error('useExtraction must be used within an ExtractionProvider');
  }
  return context;
}

export { ACTIONS }; 