import axios from 'axios';
import { getGatewayUrl } from '../config';

// Send a message to the direct chat service
export const sendMessage = async (message, sessionId, token) => {
  try {
    const response = await axios.post(
      getGatewayUrl('/api/direct_chat/chat/message'),
      { message, session_id: sessionId },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get chat history for a specific session
export const getChatHistory = async (sessionId, token) => {
  try {
    const response = await axios.get(
      getGatewayUrl(`/api/direct_chat/chat/history/${sessionId}`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

// Create a new chat session
export const createChatSession = async (token) => {
  try {
    const response = await axios.post(
      getGatewayUrl('/api/direct_chat/chat/session'),
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

// Delete a chat session
export const deleteChatSession = async (sessionId, token) => {
  try {
    await axios.delete(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
};

// Get all chat sessions
export const getAllChatSessions = async (token) => {
  try {
    const response = await axios.get(
      getGatewayUrl('/api/direct_chat/chat/sessions'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    throw error;
  }
};

// Upload a document to a specific session
export const uploadDocument = async (sessionId, file, token) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/documents/upload`),
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
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
export const getDocumentStates = async (sessionId, token) => {
  try {
    const response = await axios.get(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/documents/states`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching document states:', error);
    throw error;
  }
};

// Get status of a specific document
export const getDocumentStatus = async (sessionId, docId, token) => {
  try {
    const response = await axios.get(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/documents/${docId}/status`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error checking document status:', error);
    throw error;
  }
};

// Delete a document from a session
export const deleteDocument = async (sessionId, docId, token) => {
  try {
    await axios.delete(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/documents/${docId}`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Toggle document selection state
export const toggleDocumentState = async (sessionId, docId, token) => {
  try {
    const response = await axios.put(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/documents/${docId}/toggle`),
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling document state:', error);
    throw error;
  }
};

// Update session name
export const updateSessionName = async (sessionId, newName, token) => {
  try {
    const response = await axios.put(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/name`),
      { new_name: newName },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating session name:', error);
    throw error;
  }
};

export const updateDocumentClassification = async (sessionId, docId, classification, token) => {
  try {
    const response = await axios.put(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/documents/${docId}/classification`),
      { classification },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating document classification:', error);
    throw error;
  }
};

// Get available vectorstores
export const getVectorstores = async (token) => {
  try {
    const response = await axios.get(
      getGatewayUrl('/api/direct_chat/vectorstores'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data.vectorstores;
  } catch (error) {
    console.error('Error fetching vectorstores:', error);
    throw error;
  }
};

// Get session metadata
export const getChatSessionMetadata = async (sessionId, token) => {
  try {
    const response = await axios.get(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/metadata`),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching session metadata:', error);
    throw error;
  }
};

// Set the vectorstore for a session
export const setSessionVectorstore = async (sessionId, vectorstore, token) => {
  try {
    const response = await axios.put(
      getGatewayUrl(`/api/direct_chat/chat/session/${sessionId}/vectorstore`),
      { vectorstore },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error setting session vectorstore:', error);
    throw error;
  }
}; 