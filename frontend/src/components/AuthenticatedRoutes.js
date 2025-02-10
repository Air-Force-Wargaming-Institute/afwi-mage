import React, { useEffect } from 'react';
import { Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { useNavigation } from '../contexts/NavigationContext';
import Header from './Header';
import Home from './Home';
import AdminDashboard from './AdminDashboard';
import DocumentLibrary from './DocumentLibrary';
import FineTuneGuide from './FineTuneGuide';
import ExtractComponent from './ExtractComponent';
import GenerateDataset from './GenerateDataset';
import FineTune from './FineTune';
import Test from './Test';
import UserGuide from './UserGuide';
import MultiAgentBuilder from './MultiAgentBuilder';
import MultiAgentChat from './MultiAgentChat';
import RetrievalGuide from './RetrievalGuide';
import BuildRetrievalDatabases from './BuildRetrievalDatabases';
import LibrarianAgents from './LibrarianAgents';

const AuthenticatedRoutes = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { lastVisitedSubpage, updateLastVisitedSubpage } = useNavigation();

  // Start with just fine-tuning section
  useEffect(() => {
    console.log('Current location:', location.pathname);
    // Only update last visited page if we're on an actual subpage
    if (location.pathname.startsWith('/fine-tuning/') && 
        location.pathname !== '/fine-tuning' && 
        location.pathname !== lastVisitedSubpage.fineTuning) {
      console.log('Updating fine-tuning subpage to:', location.pathname);
      updateLastVisitedSubpage('fineTuning', location.pathname);
    }
  }, [location.pathname, updateLastVisitedSubpage, lastVisitedSubpage]);

  console.log('Last visited subpage:', lastVisitedSubpage);

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
          
          {/* Fine-Tuning Section */}
          <Route exact path="/fine-tuning">
            {/* If coming from another section, use last visited, otherwise go to guide */}
            <Redirect to={
              location.pathname === '/fine-tuning' ? 
              lastVisitedSubpage.fineTuning : 
              '/fine-tuning/guide'
            } />
          </Route>
          <Route exact path="/fine-tuning/guide" component={FineTuneGuide} />
          <Route path="/fine-tuning/extract" component={ExtractComponent} />
          <Route path="/fine-tuning/generate" component={GenerateDataset} />
          <Route path="/fine-tuning/fine-tune" component={FineTune} />
          <Route path="/fine-tuning/test" component={Test} />
          
          {/* Other sections without navigation context yet */}
          <Route path="/multi-agent/guide" component={UserGuide} />
          <Route path="/multi-agent/builder" component={MultiAgentBuilder} />
          <Route path="/multi-agent/chat" component={MultiAgentChat} />
          <Route path="/retrieval/guide" component={RetrievalGuide} />
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

export default AuthenticatedRoutes; 