import React, { createContext, useContext, useReducer } from 'react';

const GenerationContext = createContext();

// Initial state
const initialState = {
  csvFiles: [],
  selectedCsv: '',
  datasetName: '',
  finalDatasetName: '',
  trainingDatasets: [],
  selectedTrainingDataset: '',
  selectedFile: null,
  message: '',
  error: null,
  isLoading: false,
};

// Action types
const ACTIONS = {
  SET_CSV_FILES: 'SET_CSV_FILES',
  SET_SELECTED_CSV: 'SET_SELECTED_CSV',
  SET_DATASET_NAME: 'SET_DATASET_NAME',
  SET_FINAL_DATASET_NAME: 'SET_FINAL_DATASET_NAME',
  SET_TRAINING_DATASETS: 'SET_TRAINING_DATASETS',
  SET_SELECTED_TRAINING_DATASET: 'SET_SELECTED_TRAINING_DATASET',
  SET_SELECTED_FILE: 'SET_SELECTED_FILE',
  SET_MESSAGE: 'SET_MESSAGE',
  SET_ERROR: 'SET_ERROR',
  SET_LOADING: 'SET_LOADING',
  RESET_STATE: 'RESET_STATE',
};

// Reducer
function generationReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CSV_FILES:
      return { ...state, csvFiles: action.payload };
    case ACTIONS.SET_SELECTED_CSV:
      return { ...state, selectedCsv: action.payload };
    case ACTIONS.SET_DATASET_NAME:
      return { ...state, datasetName: action.payload };
    case ACTIONS.SET_FINAL_DATASET_NAME:
      return { ...state, finalDatasetName: action.payload };
    case ACTIONS.SET_TRAINING_DATASETS:
      return { ...state, trainingDatasets: action.payload };
    case ACTIONS.SET_SELECTED_TRAINING_DATASET:
      return { ...state, selectedTrainingDataset: action.payload };
    case ACTIONS.SET_SELECTED_FILE:
      return { ...state, selectedFile: action.payload };
    case ACTIONS.SET_MESSAGE:
      return { ...state, message: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.RESET_STATE:
      return initialState;
    default:
      return state;
  }
}

// Provider component
export function GenerationProvider({ children }) {
  const [state, dispatch] = useReducer(generationReducer, initialState);

  return (
    <GenerationContext.Provider value={{ state, dispatch }}>
      {children}
    </GenerationContext.Provider>
  );
}

// Custom hook
export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}

export { ACTIONS }; 