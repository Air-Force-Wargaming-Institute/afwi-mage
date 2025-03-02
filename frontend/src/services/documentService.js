import axios from 'axios';
import { getApiUrl } from '../config';

/**
 * Get all documents in the specified path
 * @param {string} path - The path to list documents from
 * @returns {Promise} - Response with document list
 */
export const getDocuments = async (path = '') => {
  try {
    const response = await axios.get(
      getApiUrl('CORE', `/api/documents?path=${encodeURIComponent(path)}`)
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Download a document
 * @param {string} path - Path to the document
 * @returns {Promise} - Response with document blob
 */
export const downloadDocument = async (path) => {
  try {
    const encodedPath = path.split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    
    const response = await axios.get(
      getApiUrl('CORE', `/api/documents/${encodedPath}/download`),
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error(`Error downloading document ${path}:`, error);
    throw error;
  }
};

/**
 * Get documents that are already in a vector store
 * @param {string} vectorStoreId - The ID of the vector store
 * @returns {Promise} - Response with documents in the vector store
 */
export const getVectorStoreDocuments = async (vectorStoreId) => {
  try {
    const response = await axios.get(
      getApiUrl('EMBEDDING', `/api/embedding/vectorstores/${vectorStoreId}`)
    );
    return response.data.files || [];
  } catch (error) {
    console.error(`Error fetching vector store documents for ${vectorStoreId}:`, error);
    throw error;
  }
};

/**
 * Check if documents are compatible with a vector store
 * Helper function to determine if a document can be added to a vector store
 * @param {Object} document - Document object with metadata
 * @param {Object} vectorStore - Vector store object with metadata
 * @returns {Object} - Compatibility status with reason if incompatible
 */
export const checkDocumentCompatibility = (document, vectorStore) => {
  // List of supported file extensions (lowercase)
  const supportedTypes = ['pdf', 'txt', 'docx', 'doc', 'md', 'html'];
  
  // Default result is compatible
  const result = {
    isCompatible: true,
    reason: null
  };
  
  // Check file type
  const fileType = document.type ? document.type.toLowerCase() : '';
  if (!supportedTypes.includes(fileType)) {
    result.isCompatible = false;
    result.reason = `Unsupported file type: ${fileType}. Supported types: ${supportedTypes.join(', ')}`;
    return result;
  }
  
  // Check if document is a folder
  if (document.isFolder) {
    result.isCompatible = false;
    result.reason = 'Folders cannot be added directly. Please select individual files.';
    return result;
  }
  
  // Check security classification (if vector store has a specific classification)
  if (vectorStore.securityClassification && 
      document.securityClassification !== vectorStore.securityClassification) {
    result.isCompatible = false;
    result.reason = `Security classification mismatch. Vector store: ${vectorStore.securityClassification}, Document: ${document.securityClassification}`;
    return result;
  }
  
  return result;
}; 