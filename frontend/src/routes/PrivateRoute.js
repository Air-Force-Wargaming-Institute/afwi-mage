import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const PrivateRoute = ({ component: Component, adminOnly = false, ...rest }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  return (
    <Route
      {...rest}
      render={props => {
        if (!isAuthenticated) {
          // Not logged in, redirect to login page
          return <Redirect to={{
            pathname: "/login",
            state: { from: props.location }
          }} />;
        }

        // Check if admin route and user is not admin
        if (adminOnly && user?.permission !== 'admin') {
          return <Redirect to="/" />;
        }

        // Authorized, render component
        return <Component {...props} />;
      }}
    />
  );
};

export default PrivateRoute;
