import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import HeaderStyled from './components/HeaderStyled';
import Home from './components/Home';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import FineTuneGuide from './components/FineTuneGuide';
import ExtractComponent from './components/ExtractComponent';
import GenerateDataset from './components/GenerateDataset';
import FineTune from './components/FineTune';
import Test from './components/Test';
import RetrievalGuide from './components/RetrievalGuide';
import BuildRetrievalDatabases from './components/BuildRetrievalDatabases';
import ManageVectorStores from './components/vectorstore/ManageVectorStores';
import LibrarianAgents from './components/LibrarianAgents';
import DocumentLibrary from './components/DocumentLibrary';
import RecordTranscribeStandalone from './components/transcription/RecordTranscribe';
import UserGuide from './components/UserGuide';
import { ExtractionProvider } from './contexts/ExtractionContext';
import { GenerationProvider } from './contexts/GenerationContext';
import { DocumentLibraryProvider } from './contexts/DocumentLibraryContext';
import { ChatProvider } from './contexts/ChatContext';
import { HILChatProvider } from './contexts/HILChatContext';
import { TranscriptionProvider } from './contexts/TranscriptionContext';
import DirectChat from './components/DirectChat';
import { DirectChatProvider } from './contexts/DirectChatContext';
import WorkbenchDashboard from './components/workbench/WorkbenchDashboard';
import { WorkbenchProvider } from './contexts/WorkbenchContext';
import TeamChatContainer from './components/TeamChatContainer';
import AFWIMageCoin from './assets/AFWI_MAGE_COIN.png';
import StyleTest from './components/common/StyleTest';
import ThemeProvider from './styles/ThemeProvider';
import { useTheme } from '@material-ui/core/styles';
import { Box, CssBaseline } from '@material-ui/core';
import { StyledContainer } from './styles/StyledComponents';
import backgroundImage from './assets/background.jpg';

// Create a component to handle authenticated routes
const AuthenticatedRoutes = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isStandaloneTranscriber = location.pathname === '/record-transcribe-standalone'; // Check for standalone route
  const { user } = useContext(AuthContext) || { user: null };
  
  return (
    <>
      {/* Only show header if not login page and not standalone transcriber */}
      {!isLoginPage && !isStandaloneTranscriber && <HeaderStyled />}
      <Box 
        component="main" 
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          pt: isStandaloneTranscriber ? 0 : 10, // No padding-top for standalone
          zIndex: 1001
        }}
      >
        <Switch>
          <Route exact path="/login" component={Login} />
          <Route exact path="/home" component={Home} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/document-library" component={DocumentLibrary} />
          
          {/* StyleTest route - accessible to all users */}
          <Route path="/style-test" component={StyleTest} />
          
          <Route exact path="/multi-agent">
            <Redirect to="/multi-agent/team-chat" />
          </Route>
          <Route path="/multi-agent/guide" component={UserGuide} />
          
          {/* Team Chat Container */}
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
            <Redirect to="/login" />
          </Route>
          <Redirect to="/login" />
        </Switch>
      </Box>
      {/* AFWI MAGE Coin Logo - Don't show on standalone transcriber */}
      {!isStandaloneTranscriber && (
        <Box
          component="img"
          src={AFWIMageCoin}
          alt="AFWI MAGE Coin"
          sx={{
            position: 'fixed',
            bottom: 40,
            left: 40,
            width: 300,
            height: 'auto',
            zIndex: 1,
            opacity: 0.9,
            pointerEvents: 'none'
          }}
        />
      )}
    </>
  );
};

function App() {
  const theme = useTheme();

  return (
    <ThemeProvider>
      <ExtractionProvider>
        <GenerationProvider>
          <DocumentLibraryProvider>
            <DirectChatProvider>
              <ChatProvider>
                <HILChatProvider>
                  <AuthProvider>
                    <WorkbenchProvider>
                      <TranscriptionProvider>
                        <Router>
                          <CssBaseline />
                          {/* Use Switch at the top level to handle the standalone route */}
                          <Switch>
                            {/* Standalone Route - renders ONLY the component with necessary providers */}
                            <Route path="/record-transcribe-standalone">
                              <Box sx={{
                                minHeight: '100vh', // Ensure it takes full height
                                backgroundColor: theme.palette.background.default, // Apply theme background
                              }}>
                                <RecordTranscribeStandalone />
                              </Box>
                            </Route>

                            {/* All other routes go through the standard authenticated layout */}
                            <Route path="/">
                              <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '100vh',
                                backgroundColor: theme.palette.background.default,
                                backgroundImage: `url(${backgroundImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundAttachment: 'fixed',
                              }}>
                                <AuthenticatedRoutes />
                              </Box>
                            </Route>
                          </Switch>
                        </Router>
                      </TranscriptionProvider>
                    </WorkbenchProvider>
                  </AuthProvider>
                </HILChatProvider>
              </ChatProvider>
            </DirectChatProvider>
          </DocumentLibraryProvider>
        </GenerationProvider>
      </ExtractionProvider>
    </ThemeProvider>
  );
}

export default App;
