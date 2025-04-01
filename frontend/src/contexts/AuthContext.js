import React, { createContext, useState, useEffect } from 'react';
import { getApiUrl } from '../config';

// import React, { createContext } from 'react';
// import Login from '../components/Login';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Function to check for and use a refreshed token
  const handleRefreshedToken = (headers) => {
    const refreshedToken = headers.get('X-Refreshed-Token');
    if (refreshedToken) {
      localStorage.setItem('token', refreshedToken);
      setToken(refreshedToken);
    }
  };

  // Create a fetch wrapper that handles token refreshing
  const authenticatedFetch = async (url, options = {}) => {
    if (!token) return fetch(url, options);
    
    // Add authorization header if not present
    const headers = options.headers || {};
    if (!headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { ...options, headers });
    
    // Check for refreshed token in response headers
    handleRefreshedToken(response.headers);
    
    return response;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await fetch(getApiUrl('AUTH', '/api/auth/users/me'), {
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

  //TODO: encrypt password before sending to backend; DB will need to be updated to store encrypted passwords
  const login = async (username, password) => {
    try {
      const response = await fetch(getApiUrl('AUTH', '/api/auth/users/token'), {
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
      const userResponse = await authenticatedFetch(getApiUrl('AUTH', '/api/auth/users/me'));
      
      if (!userResponse.ok) throw new Error('Failed to fetch user details');
      
      const userData = await userResponse.json();
      setUser(userData);
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
    authenticatedFetch // Expose the fetch wrapper to components
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
