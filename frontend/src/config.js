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
  if (service === 'DIRECT_CHAT') {
    return `${baseUrl}/api/v1${endpoint}`;
  }
  return `${baseUrl}${endpoint}`;
};
