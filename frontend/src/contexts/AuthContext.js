//import React, { createContext, useState, useEffect } from 'react';
//import { getApiUrl } from '../config';

import React, { createContext } from 'react';
import Login from '../components/Login';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [user, setUser] = useState(null);
  // const [token, setToken] = useState(localStorage.getItem('token'));
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const initializeAuth = async () => {
  //     const storedToken = localStorage.getItem('token');
  //     if (storedToken) {
  //       try {
  //         const response = await fetch(getApiUrl('AUTH', '/api/users/me'), {
  //           headers: {
  //             'Authorization': `Bearer ${storedToken}`,
  //           },
  //         });
  //         if (response.ok) {
  //           const userData = await response.json();
  //           setUser(userData);
  //           setIsAuthenticated(true);
  //           setToken(storedToken);
  //         } else {
  //           // Token is invalid
  //           localStorage.removeItem('token');
  //         }
  //       } catch (error) {
  //         console.error('Auth initialization error:', error);
  //         localStorage.removeItem('token');
  //       }
  //     }
  //     setLoading(false);
  //   };

  //   initializeAuth();
  // }, []);

  // const login = async (username, password) => {
  //   try {
  //     const response = await fetch(getApiUrl('AUTH', '/api/users/token'), {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //       },
  //       body: new URLSearchParams({
  //         username,
  //         password,
  //       }),
  //     });

  //     if (!response.ok) {
  //       const error = await response.json();
  //       throw new Error(error.detail || 'Login failed');
  //     }

  //     const data = await response.json();
  //     const { access_token } = data;
      
  //     localStorage.setItem('token', access_token);
  //     setToken(access_token);
  //     setIsAuthenticated(true);
      
      // Fetch user details
  //     const userResponse = await fetch(getApiUrl('AUTH', '/api/users/me'), {
  //       headers: {
  //         'Authorization': `Bearer ${access_token}`,
  //       },
  //     });
      
  //     if (!userResponse.ok) throw new Error('Failed to fetch user details');
      
  //     const userData = await userResponse.json();
  //     setUser(userData);
  //   } catch (error) {
  //     console.error('Login error:', error);
  //     throw error;
  //   }
  // };

  // const logout = () => {
  //   localStorage.removeItem('token');
  //   setToken(null);
  //   setIsAuthenticated(false);
  //   setUser(null);
  // };

  const value = {
  //   isAuthenticated,
  //   user,
  //   token,
  //   login,
  //   logout,
  //   loading
  // };

  // if (loading) {
  //   return null; // or a loading spinner
  // }
  isAuthenticated: true,
  user: {
    id: 1,
    username: 'admin',
    permission: 'admin'
  },

  token: 'dummy_token',
  login: async () => {},
  logout: () => {},
  loading: false
};

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
