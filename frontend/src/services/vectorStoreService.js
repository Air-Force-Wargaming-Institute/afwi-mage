import axios from 'axios';
import { getApiUrl, getGatewayUrl } from '../config';

/**
 * Get all vector stores with optional filtering and pagination
 * @param {Object} params - Query parameters for filtering and pagination
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with vector stores data
 */
export const getVectorStores = async (params = {}, token) => {
  try {
    const response = await axios.get(getGatewayUrl('/api/embedding/vectorstores'), 
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching vector stores:', error);
    throw error;
  }
};

/**
 * Get details of a specific vector store
 * @param {string} id - Vector store ID
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with vector store details
 */
export const getVectorStoreById = async (id, token) => {
  try {
    const response = await axios.get(getGatewayUrl(`/api/embedding/vectorstores/${id}`), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
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
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with updated vector store
 */
export const updateVectorStore = async (id, data, token) => {
  try {
    const response = await axios.put(getGatewayUrl(`/api/embedding/vectorstores/${id}`), data, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a vector store
 * @param {string} id - Vector store ID
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with deletion status
 */
export const deleteVectorStore = async (id, token) => {
  try {
    const response = await axios.delete(getGatewayUrl(`/api/embedding/vectorstores/${id}`), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
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
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with query results
 */
export const testVectorStoreQuery = async (id, query, options = {}, token) => {
  try {
    const response = await axios.post(
      getGatewayUrl(`/api/embedding/vectorstores/${id}/query`), 
      { query, ...options },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Process and normalize the results to ensure consistent metadata structure
    const results = (response.data.results || response.data).map(result => ({
      ...result,
      metadata: normalizeMetadata(result.metadata),
      score: normalizeScore(result.score),
      original_score: result.original_score || result.score
    }));

    return results;
  } catch (error) {
    console.error(`Error querying vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Analyze a vector store's content using an LLM
 * @param {string} id - Vector store ID
 * @param {Object} options - Analysis options like sample_size and summary_length
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with analysis results
 */
export const analyzeVectorStore = async (id, options = {}, token) => {
  try {
    const response = await axios.post(
      getGatewayUrl(`/api/embedding/vectorstores/${id}/analyze`),
      options,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error analyzing vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Query a vector store and get an LLM-generated response
 * @param {string} id - Vector store ID
 * @param {string} query - Query text
 * @param {Object} options - Additional options like top_k, include_sources
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with LLM answer and optionally sources
 */
export const llmQueryVectorStore = async (id, query, options = {}, token) => {
  try {
    const response = await axios.post(
      getGatewayUrl(`/api/embedding/vectorstores/${id}/llm-query`),
      { query, ...options },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Process sources if they exist
    if (response.data.sources) {
      response.data.sources = response.data.sources.map(source => ({
        ...source,
        metadata: normalizeMetadata(source.metadata),
        score: normalizeScore(source.score),
        original_score: source.original_score || source.score
      }));
    }

    return response.data;
  } catch (error) {
    console.error(`Error performing LLM query on vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Get the status of a long-running job
 * @param {string} jobId - Job ID
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with job status
 */
export const getJobStatus = async (jobId, token) => {
  try {
    const response = await axios.get(getGatewayUrl(`/api/embedding/status/${jobId}`), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
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
export const getEmbeddingModels = async (token) => {
  try {
    const response = await axios.get(getGatewayUrl('/api/embedding/models'), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
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
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with job details
 */
export const addDocumentsToVectorStore = async (id, files, token) => {
  try {
    const response = await axios.post(
      getGatewayUrl(`/api/embedding/vectorstores/${id}/update`),
      { vectorstore_id: id, files },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error adding documents to vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Perform a batch update on a vector store - adding and/or removing documents in one operation
 * @param {string} id - Vector store ID
 * @param {Object} operations - Object containing add (file paths) and remove (document IDs) arrays
 * @returns {Promise} - Response with job details
 */
export const batchUpdateVectorStore = async (id, operations, token) => {
  try {
    const response = await axios.post(
      getGatewayUrl(`/api/embedding/vectorstores/${id}/batch_update`),
      operations,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error performing batch update on vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Remove documents from a vector store
 * @param {string} id - Vector store ID
 * @param {Array} documentIds - Array of document IDs to remove
 * @param {string} token - The authentication token
 * @returns {Promise} - Response with operation status
 */
export const removeDocumentsFromVectorStore = async (id, documentIds, token) => {
  try {
    const response = await axios.delete(
      getGatewayUrl(`/api/embedding/vectorstores/${id}/documents`),
      { data: { document_ids: documentIds },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error removing documents from vector store ${id}:`, error);
    throw error;
  }
};

/**
 * Clean up old vector store backups, keeping only the most recent ones.
 * @param {number} maxPerStore - Maximum number of backups to keep per vector store (optional)
 * @param {string} token - The authentication token
 * @returns {Promise<Object>} - Response indicating success and number of backups removed
 */
export const cleanupVectorStoreBackups = async (maxPerStore = 3, token) => {
  try {
    const response = await axios.post(getGatewayUrl('/api/embedding/cleanup-backups'), { max_per_store: maxPerStore }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error cleaning up vector store backups:', error);
    throw error;
  }
};

// Helper function to normalize metadata structure
const normalizeMetadata = (metadata = {}) => {
  // If metadata is null or undefined, return empty structure
  if (!metadata) {
    return createDefaultMetadata();
  }
  
  // Check if this is already in the expected format with all required fields
  const hasStructuredFormat = 
    metadata.page_info !== undefined &&
    metadata.chunk_info !== undefined &&
    metadata.document_context !== undefined;
    
  // If we already have the structured format, use it with minimal normalization
  if (hasStructuredFormat) {
    return {
      // Basic metadata
      document_id: metadata.document_id || 'unknown',
      source: metadata.source || 'unknown',
      file_path: metadata.file_path || '',
      security_classification: metadata.security_classification || 'UNCLASSIFIED',
      document_type: metadata.document_type || 'unknown',
      
      // Use existing structured metadata, with defaults for missing fields
      page_info: {
        ...metadata.page_info,
        page: metadata.page_info.page || 'N/A',
        total_pages: metadata.page_info.total_pages || 'N/A'
      },
      
      chunk_info: {
        ...metadata.chunk_info,
        index: metadata.chunk_info.index !== undefined ? metadata.chunk_info.index : 0,
        total_chunks: metadata.chunk_info.total_chunks || 1
      },
      
      document_context: {
        ...metadata.document_context,
        content_analysis: {
          ...metadata.document_context.content_analysis || {},
          language: metadata.document_context.content_analysis?.language || 'en'
        }
      },
      
      embedding_info: metadata.embedding_info || {
        timestamp: '',
        version: '1.0',
        model: 'unknown'
      }
    };
  }
  
  // Otherwise, handle flat structure by creating the nested format
  return {
    // Basic metadata
    document_id: metadata.document_id || 'unknown',
    source: metadata.source || 'unknown',
    file_path: metadata.file_path || '',
    security_classification: metadata.security_classification || 'UNCLASSIFIED',
    document_type: metadata.document_type || 'unknown',
    
    // Page information
    page_info: {
      page: metadata.page || 'N/A',
      total_pages: metadata.total_pages || 'N/A',
      is_first_page: metadata.is_first_page || false,
      is_last_page: metadata.is_last_page || false,
      page_percentage: metadata.page_percentage || 0,
      page_word_count: metadata.page_word_count || 0,
      page_has_images: metadata.page_has_images || false,
      page_has_tables: metadata.page_has_tables || false
    },
    
    // Chunk information
    chunk_info: {
      index: metadata.chunk_index !== undefined ? metadata.chunk_index : 0,
      total_chunks: metadata.total_chunks || 1,
      char_count: metadata.char_count || 0,
      word_count: metadata.word_count || 0,
      position: {
        chunk_number: metadata.chunk_number || 1,
        of_total: metadata.of_total || metadata.total_chunks || 1,
        percentage: metadata.chunk_percentage || 0
      }
    },
    
    // Document context
    document_context: {
      title: metadata.title || '',
      author: metadata.author || '',
      creation_date: metadata.creation_date || '',
      last_modified: metadata.last_modified || '',
      content_status: metadata.content_status || '',
      category: metadata.category || '',
      content_analysis: {
        has_images: metadata.has_images || false,
        has_tables: metadata.has_tables || false,
        total_words: metadata.total_words || 0,
        estimated_reading_time: metadata.estimated_reading_time || 0,
        language: metadata.language || 'en'
      }
    },
    
    // Embedding information
    embedding_info: {
      timestamp: metadata.embedding_timestamp || '',
      version: metadata.embedding_version || '1.0',
      model: metadata.embedding_model || 'unknown'
    }
  };
};

// Helper function to create default metadata structure
const createDefaultMetadata = () => {
  return {
    document_id: 'unknown',
    source: 'unknown',
    file_path: '',
    security_classification: 'UNCLASSIFIED',
    document_type: 'unknown',
    
    page_info: {
      page: 'N/A',
      total_pages: 'N/A',
      is_first_page: false,
      is_last_page: false,
      page_percentage: 0,
      page_word_count: 0,
      page_has_images: false,
      page_has_tables: false
    },
    
    chunk_info: {
      index: 0,
      total_chunks: 1, 
      char_count: 0,
      word_count: 0,
      position: {
        chunk_number: 1,
        of_total: 1,
        percentage: 0
      }
    },
    
    document_context: {
      title: '',
      author: '',
      creation_date: '',
      last_modified: '',
      content_status: '',
      category: '',
      content_analysis: {
        has_images: false,
        has_tables: false,
        total_words: 0,
        estimated_reading_time: 0,
        language: 'en'
      }
    },
    
    embedding_info: {
      timestamp: '',
      version: '1.0',
      model: 'unknown'
    }
  };
};

// Helper function to normalize relevance scores
const normalizeScore = (score) => {
  if (typeof score !== 'number') {
    return 0;
  }
  
  // Handle different score ranges
  if (score <= 2.0) {  // Cosine similarity range (-1 to 1) or distance (0 to 2)
    return score <= 1 ? (score + 1) / 2 : (2 - score) / 2;
  }
  
  // For larger scores, use logarithmic normalization
  return Math.min(1.0, 0.8 + (0.2 * Math.min(1.0, Math.log10(score/100))));
}; 