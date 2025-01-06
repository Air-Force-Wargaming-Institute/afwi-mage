import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Header from './components/Header';
import Home from './components/Home';
import AdminDashboard from './components/AdminDashboard';
import FineTuneGuide from './components/FineTuneGuide';
import ExtractComponent from './components/ExtractComponent';
import GenerateDataset from './components/GenerateDataset';
import FineTune from './components/FineTune';
import Test from './components/Test';
import MultiAgentBuilder from './components/MultiAgentBuilder';
import MultiAgentChat from './components/MultiAgentChat';
import RetrievalGuide from './components/RetrievalGuide';
import BuildRetrievalDatabases from './components/BuildRetrievalDatabases';
import LibrarianAgents from './components/LibrarianAgents';
import DocumentLibrary from './components/DocumentLibrary';
import UserGuide from './components/UserGuide';
import './App.css';

// Create a component to handle authenticated routes
const AuthenticatedRoutes = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Redirect to="/login" />;
  }

  // If authenticated and on login page, redirect to home
  if (isAuthenticated && location.pathname === '/login') {
    return <Redirect to="/home" />;
  }

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="App animated-gradient">
      {!isLoginPage && <Header />}
      <main>
        <Switch>
          <Route exact path="/login" component={Login} />
          <PrivateRoute exact path="/home" component={Home} />
          <PrivateRoute path="/admin" component={AdminDashboard} adminOnly={true} />
          <PrivateRoute path="/document-library" component={DocumentLibrary} />
          <PrivateRoute exact path="/multi-agent" component={UserGuide} />
          <PrivateRoute path="/multi-agent/builder" component={MultiAgentBuilder} />
          <PrivateRoute exact path="/multi-agent/builder/llm-library" component={MultiAgentBuilder} />
          <PrivateRoute path="/multi-agent/chat" component={MultiAgentChat} />
          <PrivateRoute exact path="/fine-tuning" component={FineTuneGuide} />
          <PrivateRoute path="/fine-tuning/extract" component={ExtractComponent} />
          <PrivateRoute path="/fine-tuning/generate" component={GenerateDataset} />
          <PrivateRoute path="/fine-tuning/fine-tune" component={FineTune} />
          <PrivateRoute path="/fine-tuning/test" component={Test} />
          <PrivateRoute exact path="/retrieval" component={RetrievalGuide} />
          <PrivateRoute path="/retrieval/build-databases" component={BuildRetrievalDatabases} />
          <PrivateRoute path="/retrieval/librarian-agents" component={LibrarianAgents} />
          <Route exact path="/">
            <Redirect to={isAuthenticated ? "/home" : "/login"} />
          </Route>
          <Redirect to={isAuthenticated ? "/home" : "/login"} />
        </Switch>
      </main>
      {!isLoginPage && (
        <footer className="app-footer">
          The application was developed by the LeMay Center's Air Force Wargaming Institute, Maxwell AFB, Alabama.
        </footer>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthenticatedRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
