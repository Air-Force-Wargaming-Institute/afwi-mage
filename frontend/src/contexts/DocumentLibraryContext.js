import React, { createContext, useContext, useReducer } from 'react';

const DocumentLibraryContext = createContext();

// Initial state
const initialState = {
  documents: [],
  currentPath: '',
  breadcrumbs: [{ name: "Root", path: "" }],
  selectedDocs: [],
  draggedItem: null,
  isLoading: false,
  error: null,
  operationProgress: null,
  previewFile: null,
  fileToDelete: null,
  deleteContents: [],
  deleteConfirmOpen: false,
  itemToRename: null,
  newName: '',
  renameDialogOpen: false,
  uploadDialogOpen: false,
  createFolderDialogOpen: false,
  newFolderName: '',
  uploadProgress: 0,
  uploadStatus: '',
  uploadError: null,
  sortConfig: {
    key: 'name',
    direction: 'asc'
  }
};

// Action types
const ACTIONS = {
  SET_DOCUMENTS: 'SET_DOCUMENTS',
  SET_CURRENT_PATH: 'SET_CURRENT_PATH',
  SET_BREADCRUMBS: 'SET_BREADCRUMBS',
  SET_SELECTED_DOCS: 'SET_SELECTED_DOCS',
  SET_DRAGGED_ITEM: 'SET_DRAGGED_ITEM',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_OPERATION_PROGRESS: 'SET_OPERATION_PROGRESS',
  SET_PREVIEW_FILE: 'SET_PREVIEW_FILE',
  SET_FILE_TO_DELETE: 'SET_FILE_TO_DELETE',
  SET_DELETE_CONTENTS: 'SET_DELETE_CONTENTS',
  SET_DELETE_CONFIRM_OPEN: 'SET_DELETE_CONFIRM_OPEN',
  SET_ITEM_TO_RENAME: 'SET_ITEM_TO_RENAME',
  SET_NEW_NAME: 'SET_NEW_NAME',
  SET_RENAME_DIALOG_OPEN: 'SET_RENAME_DIALOG_OPEN',
  SET_UPLOAD_DIALOG_OPEN: 'SET_UPLOAD_DIALOG_OPEN',
  SET_CREATE_FOLDER_DIALOG_OPEN: 'SET_CREATE_FOLDER_DIALOG_OPEN',
  SET_NEW_FOLDER_NAME: 'SET_NEW_FOLDER_NAME',
  SET_UPLOAD_PROGRESS: 'SET_UPLOAD_PROGRESS',
  SET_UPLOAD_STATUS: 'SET_UPLOAD_STATUS',
  SET_UPLOAD_ERROR: 'SET_UPLOAD_ERROR',
  SET_SORT_CONFIG: 'SET_SORT_CONFIG',
  RESET_STATE: 'RESET_STATE'
};

// Reducer
function documentLibraryReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_DOCUMENTS:
      return { ...state, documents: action.payload };
    case ACTIONS.SET_CURRENT_PATH:
      return { ...state, currentPath: action.payload };
    case ACTIONS.SET_BREADCRUMBS:
      return { ...state, breadcrumbs: action.payload };
    case ACTIONS.SET_SELECTED_DOCS:
      return { ...state, selectedDocs: action.payload };
    case ACTIONS.SET_DRAGGED_ITEM:
      return { ...state, draggedItem: action.payload };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_OPERATION_PROGRESS:
      return { ...state, operationProgress: action.payload };
    case ACTIONS.SET_PREVIEW_FILE:
      return { ...state, previewFile: action.payload };
    case ACTIONS.SET_FILE_TO_DELETE:
      return { ...state, fileToDelete: action.payload };
    case ACTIONS.SET_DELETE_CONTENTS:
      return { ...state, deleteContents: action.payload };
    case ACTIONS.SET_DELETE_CONFIRM_OPEN:
      return { ...state, deleteConfirmOpen: action.payload };
    case ACTIONS.SET_ITEM_TO_RENAME:
      return { ...state, itemToRename: action.payload };
    case ACTIONS.SET_NEW_NAME:
      return { ...state, newName: action.payload };
    case ACTIONS.SET_RENAME_DIALOG_OPEN:
      return { ...state, renameDialogOpen: action.payload };
    case ACTIONS.SET_UPLOAD_DIALOG_OPEN:
      return { ...state, uploadDialogOpen: action.payload };
    case ACTIONS.SET_CREATE_FOLDER_DIALOG_OPEN:
      return { ...state, createFolderDialogOpen: action.payload };
    case ACTIONS.SET_NEW_FOLDER_NAME:
      return { ...state, newFolderName: action.payload };
    case ACTIONS.SET_UPLOAD_PROGRESS:
      return { ...state, uploadProgress: action.payload };
    case ACTIONS.SET_UPLOAD_STATUS:
      return { ...state, uploadStatus: action.payload };
    case ACTIONS.SET_UPLOAD_ERROR:
      return { ...state, uploadError: action.payload };
    case ACTIONS.SET_SORT_CONFIG:
      return { ...state, sortConfig: action.payload };
    case ACTIONS.RESET_STATE:
      return initialState;
    default:
      return state;
  }
}

// Provider component
export function DocumentLibraryProvider({ children }) {
  const [state, dispatch] = useReducer(documentLibraryReducer, initialState);

  return (
    <DocumentLibraryContext.Provider value={{ state, dispatch }}>
      {children}
    </DocumentLibraryContext.Provider>
  );
}

// Custom hook
export function useDocumentLibrary() {
  const context = useContext(DocumentLibraryContext);
  if (!context) {
    throw new Error('useDocumentLibrary must be used within a DocumentLibraryProvider');
  }
  return context;
}

export { ACTIONS }; 