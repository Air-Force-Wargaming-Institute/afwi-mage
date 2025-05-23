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
  WORKBENCH: `${API_BASE_URL}:${process.env.REACT_APP_WORKBENCH_SERVICE_PORT || '8020'}`,
  REPORT_BUILDER: `${API_BASE_URL}:${process.env.REACT_APP_REPORT_BUILDER_SERVICE_PORT || '8019'}`,
  TRANSCRIPTION: `${API_BASE_URL}:${process.env.REACT_APP_TRANSCRIPTION_SERVICE_PORT || '8021'}`,
};

export const getApiUrl = (service, endpoint) => {
  const baseUrl = API_URLS[service];
  
  // Special handling for empty endpoints to avoid double slashes
  if (endpoint === '') {
    return baseUrl; // Return the base URL without adding any slashes
  }
  
  // Special handling for WORKBENCH service to ensure proper URL formation
  if (service === 'WORKBENCH') {
    // For local development, ensure we point to the correct port
    const localWorkbenchUrl = `http://localhost:${process.env.REACT_APP_WORKBENCH_SERVICE_PORT || '8020'}`;
    
    // Only use baseUrl if it's properly defined, otherwise fallback to local
    const workbenchBaseUrl = (API_BASE_URL && process.env.REACT_APP_WORKBENCH_SERVICE_PORT) 
      ? baseUrl 
      : localWorkbenchUrl;
    
    console.log('WORKBENCH service baseUrl:', workbenchBaseUrl);
    
    // Ensure endpoint starts with / if it doesn't already
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${workbenchBaseUrl}${formattedEndpoint}`;
  }
  
  // For other services, use the original logic
  // Ensure endpoint starts with / if it doesn't already
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Use standardized path format for all services
  const url = `${baseUrl}${formattedEndpoint}`;
  
  console.log('API URL:', url); // Debug log
  return url;
};

// Function to get API Gateway URL without service-specific port
export const getGatewayUrl = (endpoint) => {
  // Ensure endpoint starts with / if it doesn't already
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Use the gateway URL - default to localhost:80 if not specified
  // Note: In production, this should be your gateway's domain/port
  const gatewayUrl = process.env.REACT_APP_GATEWAY_URL || 'http://localhost:80';
  
  // Remove any trailing slash from the gateway URL
  const baseUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
  
  // Construct the full URL
  const url = `${baseUrl}${formattedEndpoint}`;
  
  console.log('Gateway URL:', url); // Debug log
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
  DIRECT_CHAT: API_URLS.DIRECT_CHAT,
  WORKBENCH: API_URLS.WORKBENCH,
  REPORT_BUILDER: API_URLS.REPORT_BUILDER,
};
