import axios from 'axios';
import { getApiUrl } from '../config';

// Send a message to the direct chat service
export const sendMessage = async (message, sessionId) => {
  try {
    const response = await axios.post(
      getApiUrl('DIRECT_CHAT', '/api/direct_chat/chat/message'),
      { message, session_id: sessionId }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get chat history for a specific session
export const getChatHistory = async (sessionId) => {
  try {
    const response = await axios.get(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/history/${sessionId}`)
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

// Create a new chat session
export const createChatSession = async () => {
  try {
    const response = await axios.post(
      getApiUrl('DIRECT_CHAT', '/api/direct_chat/chat/session')
    );
    return response.data;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

// Delete a chat session
export const deleteChatSession = async (sessionId) => {
  try {
    await axios.delete(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}`)
    );
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
};

// Get all chat sessions
export const getAllChatSessions = async () => {
  try {
    const response = await axios.get(
      getApiUrl('DIRECT_CHAT', '/api/direct_chat/chat/sessions')
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    throw error;
  }
};

// Upload a document to a specific session
export const uploadDocument = async (sessionId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/documents/upload`),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

// Get document states for a session
export const getDocumentStates = async (sessionId) => {
  try {
    const response = await axios.get(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/documents/states`)
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching document states:', error);
    throw error;
  }
};

// Get status of a specific document
export const getDocumentStatus = async (sessionId, docId) => {
  try {
    const response = await axios.get(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/documents/${docId}/status`)
    );
    return response.data;
  } catch (error) {
    console.error('Error checking document status:', error);
    throw error;
  }
};

// Delete a document from a session
export const deleteDocument = async (sessionId, docId) => {
  try {
    await axios.delete(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/documents/${docId}`)
    );
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Toggle document selection state
export const toggleDocumentState = async (sessionId, docId) => {
  try {
    const response = await axios.put(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/documents/${docId}/toggle`)
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling document state:', error);
    throw error;
  }
};

// Update session name
export const updateSessionName = async (sessionId, newName) => {
  try {
    const response = await axios.put(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/name`),
      { new_name: newName }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating session name:', error);
    throw error;
  }
};

export const updateDocumentClassification = async (sessionId, docId, classification) => {
  try {
    const response = await fetch(
      `${getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/documents/${docId}/classification`)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classification }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update document classification: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating document classification:', error);
    throw error;
  }
};

// Get available vectorstores
export const getVectorstores = async () => {
  try {
    const response = await axios.get(
      getApiUrl('DIRECT_CHAT', '/vectorstores')
    );
    return response.data.vectorstores;
  } catch (error) {
    console.error('Error fetching vectorstores:', error);
    throw error;
  }
};

// Get session metadata
export const getChatSessionMetadata = async (sessionId) => {
  try {
    const response = await axios.get(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/metadata`)
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching session metadata:', error);
    throw error;
  }
};

// Set the vectorstore for a session
export const setSessionVectorstore = async (sessionId, vectorstore) => {
  try {
    const response = await axios.put(
      getApiUrl('DIRECT_CHAT', `/api/direct_chat/chat/session/${sessionId}/vectorstore`),
      { vectorstore }
    );
    return response.data;
  } catch (error) {
    console.error('Error setting session vectorstore:', error);
    throw error;
  }
}; 