import axios from 'axios';
import { getApiUrl } from '../config';

/**
 * Get all vector stores with optional filtering and pagination
 * @param {Object} params - Query parameters for filtering and pagination
 * @returns {Promise} - Response with vector stores data
 */
export const getVectorStores = async (params = {}) => {
  try {
    const response = await axios.get(getApiUrl('EMBEDDING', '/api/embedding/vectorstores'), { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching vector stores:', error);
    throw error;
  }
};

/**
 * Get details of a specific vector store
 * @param {string} id - Vector store ID
 * @returns {Promise} - Response with vector store details
 */
export const getVectorStoreById = async (id) => {
  try {
    const response = await axios.get(getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${id}`));
    return response.data;
  } catch (error) {
    console.error(`Error fetching vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Update an existing vector store
 * @param {string} id - Vector store ID
 * @param {Object} data - Vector store update data
 * @returns {Promise} - Response with updated vector store
 */
export const updateVectorStore = async (id, data) => {
  try {
    const response = await axios.put(getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${id}`), data);
    return response.data;
  } catch (error) {
    console.error(`Error updating vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a vector store
 * @param {string} id - Vector store ID
 * @returns {Promise} - Response with deletion status
 */
export const deleteVectorStore = async (id) => {
  try {
    const response = await axios.delete(getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${id}`));
    return response.data;
  } catch (error) {
    console.error(`Error deleting vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Test a query against a vector store
 * @param {string} id - Vector store ID
 * @param {string} query - Query text
 * @param {Object} options - Additional query options like top_k
 * @returns {Promise} - Response with query results
 */
export const testVectorStoreQuery = async (id, query, options = {}) => {
  try {
    const response = await axios.post(
      getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${id}/query`), 
      { query, ...options }
    );
    return response.data;
  } catch (error) {
    console.error(`Error querying vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Get the status of a long-running job
 * @param {string} jobId - Job ID
 * @returns {Promise} - Response with job status
 */
export const getJobStatus = async (jobId) => {
  try {
    const response = await axios.get(getApiUrl('EMBEDDING', `/api/embedding/status/${jobId}`));
    return response.data;
  } catch (error) {
    console.error(`Error getting job status for ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get available embedding models
 * @returns {Promise} - Response with list of available models
 */
export const getEmbeddingModels = async () => {
  try {
    const response = await axios.get(getApiUrl('EMBEDDING', '/api/embedding/models'));
    return response.data;
  } catch (error) {
    console.error('Error fetching embedding models:', error);
    throw error;
  }
};

/**
 * Add documents to an existing vector store
 * @param {string} id - Vector store ID
 * @param {Array} files - Array of file paths to add
 * @returns {Promise} - Response with job details
 */
export const addDocumentsToVectorStore = async (id, files) => {
  try {
    const response = await axios.post(
      getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${id}/documents`),
      { files }
    );
    return response.data;
  } catch (error) {
    console.error(`Error adding documents to vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Remove documents from a vector store
 * @param {string} id - Vector store ID
 * @param {Array} documentIds - Array of document IDs to remove
 * @returns {Promise} - Response with operation status
 */
export const removeDocumentsFromVectorStore = async (id, documentIds) => {
  try {
    const response = await axios.delete(
      getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${id}/documents`),
      { data: { document_ids: documentIds } }
    );
    return response.data;
  } catch (error) {
    console.error(`Error removing documents from vector store ${id}:`, error);
    throw error;
  }
}; 