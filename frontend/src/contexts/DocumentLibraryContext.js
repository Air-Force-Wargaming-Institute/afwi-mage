import React, { createContext, useContext, useReducer } from 'react';

// Helper function to ensure array values
const ensureArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export const ACTIONS = {
  SET_DOCUMENTS: 'SET_DOCUMENTS',
  SET_SELECTED_DOCS: 'SET_SELECTED_DOCS',
  SET_PREVIEW_FILE: 'SET_PREVIEW_FILE',
  SET_DRAG_OVER: 'SET_DRAG_OVER',
  SET_LOADING: 'SET_LOADING',
  SET_IS_REFRESHING: 'SET_IS_REFRESHING',
  SET_OPERATION_PROGRESS: 'SET_OPERATION_PROGRESS',
  SET_ERROR: 'SET_ERROR',
  SET_OPEN_CONFIRM_DIALOG: 'SET_OPEN_CONFIRM_DIALOG',
  SET_CURRENT_PATH: 'SET_CURRENT_PATH',
  SET_CREATE_FOLDER_DIALOG_OPEN: 'SET_CREATE_FOLDER_DIALOG_OPEN',
  SET_NEW_FOLDER_NAME: 'SET_NEW_FOLDER_NAME',
  SET_BREADCRUMBS: 'SET_BREADCRUMBS',
  SET_RENAME_DIALOG_OPEN: 'SET_RENAME_DIALOG_OPEN',
  SET_ITEM_TO_RENAME: 'SET_ITEM_TO_RENAME',
  SET_NEW_NAME: 'SET_NEW_NAME',
  SET_DRAGGED_ITEM: 'SET_DRAGGED_ITEM',
  SET_DROP_TARGET: 'SET_DROP_TARGET',
  RESET_STATE: 'RESET_STATE'
};

const initialState = {
  documents: [],
  selectedDocs: [],
  previewFile: null,
  dragOver: false,
  isLoading: false,
  isRefreshing: false,
  operationProgress: null,
  error: null,
  openConfirmDialog: false,
  currentPath: '',
  newFolderDialogOpen: false,
  newFolderName: '',
  breadcrumbs: [{ name: "Root", path: "" }],
  renameDialogOpen: false,
  itemToRename: null,
  newName: '',
  draggedItem: null,
  dropTarget: null
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_DOCUMENTS:
      return {
        ...state,
        documents: ensureArray(action.payload)
      };
    case ACTIONS.SET_SELECTED_DOCS:
      return {
        ...state,
        selectedDocs: ensureArray(action.payload)
      };
    case ACTIONS.SET_PREVIEW_FILE:
      return {
        ...state,
        previewFile: action.payload
      };
    case ACTIONS.SET_DRAG_OVER:
      return {
        ...state,
        dragOver: Boolean(action.payload)
      };
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: Boolean(action.payload)
      };
    case ACTIONS.SET_IS_REFRESHING:
      return {
        ...state,
        isRefreshing: Boolean(action.payload)
      };
    case ACTIONS.SET_OPERATION_PROGRESS:
      return {
        ...state,
        operationProgress: action.payload
      };
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
    case ACTIONS.SET_OPEN_CONFIRM_DIALOG:
      return {
        ...state,
        openConfirmDialog: Boolean(action.payload)
      };
    case ACTIONS.SET_CURRENT_PATH:
      return {
        ...state,
        currentPath: action.payload || ''
      };
    case ACTIONS.SET_CREATE_FOLDER_DIALOG_OPEN:
      return {
        ...state,
        newFolderDialogOpen: Boolean(action.payload)
      };
    case ACTIONS.SET_NEW_FOLDER_NAME:
      return {
        ...state,
        newFolderName: action.payload || ''
      };
    case ACTIONS.SET_BREADCRUMBS:
      return {
        ...state,
        breadcrumbs: ensureArray(action.payload)
      };
    case ACTIONS.SET_RENAME_DIALOG_OPEN:
      return {
        ...state,
        renameDialogOpen: Boolean(action.payload)
      };
    case ACTIONS.SET_ITEM_TO_RENAME:
      return {
        ...state,
        itemToRename: action.payload
      };
    case ACTIONS.SET_NEW_NAME:
      return {
        ...state,
        newName: action.payload || ''
      };
    case ACTIONS.SET_DRAGGED_ITEM:
      return {
        ...state,
        draggedItem: action.payload
      };
    case ACTIONS.SET_DROP_TARGET:
      return {
        ...state,
        dropTarget: action.payload
      };
    case ACTIONS.RESET_STATE:
      return initialState;
    default:
      return state;
  }
}

const DocumentLibraryContext = createContext();

export function DocumentLibraryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <DocumentLibraryContext.Provider value={{ state, dispatch }}>
      {children}
    </DocumentLibraryContext.Provider>
  );
}

export function useDocumentLibrary() {
  const context = useContext(DocumentLibraryContext);
  if (!context) {
    throw new Error('useDocumentLibrary must be used within a DocumentLibraryProvider');
  }
  return context;
} 