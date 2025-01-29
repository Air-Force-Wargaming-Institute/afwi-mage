import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
import { ExtractionProvider } from './contexts/ExtractionContext';
import { GenerationProvider } from './contexts/GenerationContext';
import { DocumentLibraryProvider } from './contexts/DocumentLibraryContext';

// Create a component to handle authenticated routes
const AuthenticatedRoutes = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="App animated-gradient">
      {!isLoginPage && <Header />}
      <main>
        <Switch>
          <Route exact path="/login">
            <Redirect to="/home" />
          </Route>
          <Route exact path="/home" component={Home} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/document-library" component={DocumentLibrary} />
          <Route exact path="/multi-agent" component={UserGuide} />
          <Route path="/multi-agent/builder" component={MultiAgentBuilder} />
          <Route exact path="/multi-agent/builder/llm-library" component={MultiAgentBuilder} />
          <Route path="/multi-agent/chat" component={MultiAgentChat} />
          <Route exact path="/fine-tuning" component={FineTuneGuide} />
          <Route path="/fine-tuning/extract" component={ExtractComponent} />
          <Route path="/fine-tuning/generate" component={GenerateDataset} />
          <Route path="/fine-tuning/fine-tune" component={FineTune} />
          <Route path="/fine-tuning/test" component={Test} />
          <Route exact path="/retrieval" component={RetrievalGuide} />
          <Route path="/retrieval/build-databases" component={BuildRetrievalDatabases} />
          <Route path="/retrieval/librarian-agents" component={LibrarianAgents} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
          <Redirect to="/home" />
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
    <ExtractionProvider>
      <GenerationProvider>
        <DocumentLibraryProvider>
          <AuthProvider>
            <Router>
              <AuthenticatedRoutes />
            </Router>
          </AuthProvider>
        </DocumentLibraryProvider>
      </GenerationProvider>
    </ExtractionProvider>
  );
}

export default App;
