import React, { createContext, useState, useEffect } from 'react';
import { getApiUrl, getGatewayUrl } from '../config';
import axios from 'axios';

// import React, { createContext } from 'react';
// import Login from '../components/Login';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Function to check for and use a refreshed token
  const handleRefreshedToken = (headers) => {
    // Support both fetch Headers object and plain objects (axios)
    const refreshedToken = 
      typeof headers.get === 'function' 
        ? headers.get('X-Refreshed-Token') 
        : (headers['x-refreshed-token'] || headers['X-Refreshed-Token']);
    
    if (refreshedToken) {
      console.log('Token refreshed:', refreshedToken);
      localStorage.setItem('token', refreshedToken);
      setToken(refreshedToken);
      return true;
    }
    return false;
  };

  // Create a fetch wrapper that handles token refreshing
  const authenticatedFetch = async (url, options = {}) => {
    if (!token) return fetch(url, options);
    
    // Add authorization header if not present
    const headers = options.headers || {};
    if (!headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      // Check for refreshed token in response headers
      handleRefreshedToken(response.headers);
      
      // Handle 401 Unauthorized errors
      if (response.status === 401) {
        console.log('Unauthorized fetch request detected');
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
        setShowLoginModal(true);
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await fetch(getGatewayUrl('/api/auth/users/me'), {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
            setToken(storedToken);
            
            // Check for refreshed token
            handleRefreshedToken(response.headers);
          } else {
            // Token is invalid
            console.log('Invalid token during initialization');
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor - add token to all requests
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor - handle token refresh and auth errors
    const responseInterceptor = axios.interceptors.response.use(
      response => {
        // Use the shared handleRefreshedToken function
        handleRefreshedToken(response.headers);
        return response;
      },
      async error => {
        console.error('Axios response error:', error);
        
        if (error.response && error.response.status === 401) {
          console.log('Unauthorized axios request detected');
          // Clear any existing auth data
          localStorage.removeItem('token');
          setToken(null);
          setIsAuthenticated(false);
          setUser(null);
          
          // Show login modal
          setShowLoginModal(true);
        }
        return Promise.reject(error);
      }
    );

    // Cleanup function to remove interceptors when component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]); // Re-run when token changes

  //TODO: encrypt password before sending to backend; DB will need to be updated to store encrypted passwords
  const login = async (username, password) => {
    try {
      const response = await fetch(getGatewayUrl('/api/auth/users/token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      const { access_token } = data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setIsAuthenticated(true);
      
      // Fetch user details
      const userResponse = await fetch(getGatewayUrl('/api/auth/users/me'),
      {
      headers: {
        // Use the access_token variable directly, bypassing the potentially stale state
        'Authorization': `Bearer ${access_token}`, 
      },
    });
      
      if (!userResponse.ok) throw new Error('Failed to fetch user details');
      
      const userData = await userResponse.json();
      setUser(userData);
      
      // Close login modal if it was open
      setShowLoginModal(false);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    loading,
    authenticatedFetch, // Expose the fetch wrapper to components
    showLoginModal,
    closeLoginModal: () => setShowLoginModal(false)
  };

  if (loading) {
    return null; // or a loading spinner
  }
   
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
