import axios from 'axios';
import { getApiUrl } from '../config';

// Send a message to the direct chat service
export const sendMessage = async (message) => {
  try {
    const response = await axios.post(
      getApiUrl('DIRECT_CHAT', '/chat/message'),
      { message }
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
      getApiUrl('DIRECT_CHAT', `/chat/history/${sessionId}`)
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
      getApiUrl('DIRECT_CHAT', '/chat/session')
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
      getApiUrl('DIRECT_CHAT', `/chat/session/${sessionId}`)
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
      getApiUrl('DIRECT_CHAT', '/chat/sessions')
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    throw error;
  }
}; 