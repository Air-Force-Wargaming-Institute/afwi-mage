const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const API_URLS = {
  CORE: `${API_BASE_URL}:${process.env.REACT_APP_CORE_SERVICE_PORT}`,
  CHAT: `${API_BASE_URL}:${process.env.REACT_APP_CHAT_SERVICE_PORT}`,
  AGENT: `${API_BASE_URL}:${process.env.REACT_APP_AGENT_SERVICE_PORT}`,
  EXTRACTION: `${API_BASE_URL}:${process.env.REACT_APP_EXTRACTION_SERVICE_PORT}`,
  GENERATION: `${API_BASE_URL}:${process.env.REACT_APP_GENERATION_SERVICE_PORT}`,
  REVIEW: `${API_BASE_URL}:${process.env.REACT_APP_REVIEW_SERVICE_PORT}`,
  UPLOAD: `${API_BASE_URL}:${process.env.REACT_APP_UPLOAD_SERVICE_PORT}`,
  EMBEDDING: `${API_BASE_URL}:${process.env.REACT_APP_EMBEDDING_SERVICE_PORT}`,
  AUTH: `${API_BASE_URL}:${process.env.REACT_APP_AUTH_SERVICE_PORT}`,
  DIRECT_CHAT: `${API_BASE_URL}:${process.env.REACT_APP_DIRECT_CHAT_SERVICE_PORT}`,
};

export const getApiUrl = (service, endpoint) => {
  const baseUrl = API_URLS[service];
  // Ensure endpoint starts with / if it doesn't already
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // For DIRECT_CHAT, we prepend /api/v1, for other services we use the endpoint as is
  const url = service === 'DIRECT_CHAT' ? 
    `${baseUrl}/api/v1${formattedEndpoint}` : 
    `${baseUrl}${formattedEndpoint}`;
  
  console.log('API URL:', url); // Debug log
  return url;
};

// Add direct API endpoints export
export const API_ENDPOINTS = {
  CORE: API_URLS.CORE,
  CHAT: API_URLS.CHAT,
  AGENT: API_URLS.AGENT,
  EXTRACTION: API_URLS.EXTRACTION,
  GENERATION: API_URLS.GENERATION,
  REVIEW: API_URLS.REVIEW,
  UPLOAD: API_URLS.UPLOAD,
  EMBEDDING: API_URLS.EMBEDDING,
  AUTH: API_URLS.AUTH,
  DIRECT_CHAT: API_URLS.DIRECT_CHAT
};
