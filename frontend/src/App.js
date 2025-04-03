import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Home from './components/Home';
import AdminDashboard from './components/AdminDashboard';
import FineTuneGuide from './components/FineTuneGuide';
import ExtractComponent from './components/ExtractComponent';
import GenerateDataset from './components/GenerateDataset';
import FineTune from './components/FineTune';
import Test from './components/Test';
import MultiAgentBuilder from './components/MultiAgentBuilder';
import MultiAgentHILChat from './components/MultiAgentHILChat';
import RetrievalGuide from './components/RetrievalGuide';
import BuildRetrievalDatabases from './components/BuildRetrievalDatabases';
import ManageVectorStores from './components/vectorstore/ManageVectorStores';
import LibrarianAgents from './components/LibrarianAgents';
import DocumentLibrary from './components/DocumentLibrary';
import UserGuide from './components/UserGuide';
import './App.css';
import { ExtractionProvider } from './contexts/ExtractionContext';
import { GenerationProvider } from './contexts/GenerationContext';
import { DocumentLibraryProvider } from './contexts/DocumentLibraryContext';
import { ChatProvider } from './contexts/ChatContext';
import { HILChatProvider } from './contexts/HILChatContext';
import DirectChat from './components/DirectChat';
import { DirectChatProvider } from './contexts/DirectChatContext';
import WorkbenchDashboard from './components/workbench/WorkbenchDashboard';
import { WorkbenchProvider } from './contexts/WorkbenchContext';
import TeamChatContainer from './components/TeamChatContainer';
import AFWIMageCoin from './assets/AFWI_MAGE_COIN.png';
import StyleTest from './components/common/StyleTest';

// Create a component to handle authenticated routes
const AuthenticatedRoutes = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { user } = useContext(AuthContext) || { user: null };
  const isAdmin = user?.permission === 'admin';

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
          
          {/* StyleTest route - accessible to all users */}
          <Route path="/style-test" component={StyleTest} />
          
          <Route exact path="/multi-agent">
            <Redirect to="/multi-agent/team-chat" />
          </Route>
          <Route path="/multi-agent/guide" component={UserGuide} />
          
          {/* New Team Chat Container with nested routes */}
          <Route path="/multi-agent/team-chat" component={TeamChatContainer} />
          
          {/* Redirect old routes to new structure */}
          <Route path="/multi-agent/builder">
            <Redirect to="/multi-agent/team-chat/builder" />
          </Route>
          <Route path="/multi-agent/chat">
            <Redirect to="/multi-agent/team-chat/chat" />
          </Route>
          
          <Route path="/multi-agent/direct-chat" component={DirectChat} />
          <Route path="/multi-agent/workbench" component={WorkbenchDashboard} />
          <Route exact path="/fine-tuning" component={FineTuneGuide} />
          <Route path="/fine-tuning/extract" component={ExtractComponent} />
          <Route path="/fine-tuning/generate" component={GenerateDataset} />
          <Route path="/fine-tuning/fine-tune" component={FineTune} />
          <Route path="/fine-tuning/test" component={Test} />
          <Route exact path="/retrieval" component={RetrievalGuide} />
          <Route path="/retrieval/build-databases" component={BuildRetrievalDatabases} />
          <Route path="/retrieval/manage-databases" component={ManageVectorStores} />
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
      {/* AFWI MAGE Coin Logo */}
      <img src={AFWIMageCoin} alt="AFWI MAGE Coin" className="afwi-mage-coin" />
    </div>
  );
};

function App() {
  return (
    <ExtractionProvider>
      <GenerationProvider>
        <DocumentLibraryProvider>
          <DirectChatProvider>
            <ChatProvider>
              <HILChatProvider>
                <AuthProvider>
                  <WorkbenchProvider>
                    <Router>
                      <AuthenticatedRoutes />
                    </Router>
                  </WorkbenchProvider>
                </AuthProvider>
              </HILChatProvider>
            </ChatProvider>
          </DirectChatProvider>
        </DocumentLibraryProvider>
      </GenerationProvider>
    </ExtractionProvider>
  );
}

export default App;
