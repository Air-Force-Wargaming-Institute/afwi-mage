import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import HeaderStyled from './components/common/HeaderStyled.js';
import Home from './components/Home';
import Login from './components/Login';
import AdminDashboard from './components/admin_dashboard/AdminDashboard.js';
import FineTuneGuide from './components/fine_tuning/FineTuneGuide.js';
import ExtractComponent from './components/fine_tuning/ExtractComponent.js';
import GenerateDataset from './components/fine_tuning/GenerateDataset.js';
import FineTune from './components/fine_tuning/FineTune.js';
import Test from './components/fine_tuning/Test.js';
import RetrievalGuide from './components/retriever_systems/vectorestores/RetrievalGuide.js';
import BuildRetrievalDatabases from './components/retriever_systems/vectorestores/BuildRetrievalDatabases.js';
import ManageVectorStores from './components/retriever_systems/vectorestores/ManageVectorStores.js';
import LibrarianAgents from './components/retriever_systems/LibrarianAgents.js';
import DocumentLibrary from './components/library/DocumentLibrary.js';
import RecordTranscribeStandalone from './components/transcription/RecordTranscribe';
import UserGuide from './components/multi_chat/UserGuide.js';
import { ExtractionProvider } from './contexts/ExtractionContext';
import { GenerationProvider } from './contexts/GenerationContext';
import { DocumentLibraryProvider } from './contexts/DocumentLibraryContext';
import { ChatProvider } from './contexts/ChatContext';
import { HILChatProvider } from './contexts/HILChatContext';
import { TranscriptionProvider } from './contexts/TranscriptionContext';
import DirectChat from './components/direct_chat/DirectChat.js';
import { DirectChatProvider } from './contexts/DirectChatContext';
import WorkbenchDashboard from './components/workbench/WorkbenchDashboard';
import { WorkbenchProvider } from './contexts/WorkbenchContext';
import TeamChatContainer from './components/multi_chat/TeamChatContainer.js';
import AFWIMageCoin from './assets/AFWI_MAGE_COIN.png';
import StyleTest from './components/common/StyleTest';
import ThemeProvider from './styles/ThemeProvider';
import { useTheme } from '@material-ui/core/styles';
import { Box, CssBaseline } from '@material-ui/core';
import { StyledContainer } from './styles/StyledComponents';
import backgroundImage from './assets/background.jpg';
import WargameBuilder from './components/wargame_builder/WargameBuilder';
import ReportBuilderMain from './components/report_builder/ReportBuilderMain';
import ReportDesignerPage from './components/report_builder/ReportDesignerPage';
import DocumentViewerPopup from './components/direct_chat/DocumentViewerPopup';

// Create a component to handle authenticated routes
const AuthenticatedRoutes = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isStandaloneTranscriber = location.pathname === '/record-transcribe-standalone'; // Check for standalone route
  const isHomePage = location.pathname === '/home' || location.pathname === '/'; // Check if on home page
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
          
          {/* Protected routes that require authentication */}
          <Route path="/home">
            {user ? <Home /> : <Redirect to="/login" />}
          </Route>
          <Route path="/admin">
            {user ? <AdminDashboard /> : <Redirect to="/login" />}
          </Route>
          <Route path="/document-library">
            {user ? <DocumentLibrary /> : <Redirect to="/login" />}
          </Route>
          
          {/* StyleTest route - accessible to all users */}
          <Route path="/style-test" component={StyleTest} />
          
          <Route exact path="/multi-agent">
            {user ? <Redirect to="/multi-agent/team-chat" /> : <Redirect to="/login" />}
          </Route>
          <Route path="/multi-agent/guide">
            {user ? <UserGuide /> : <Redirect to="/login" />}
          </Route>
          
          {/* Team Chat Container */}
          <Route path="/multi-agent/team-chat">
            {user ? <TeamChatContainer /> : <Redirect to="/login" />}
          </Route>
          
          {/* Redirect old routes to new structure */}
          <Route path="/multi-agent/builder">
            {user ? <Redirect to="/multi-agent/team-chat/builder" /> : <Redirect to="/login" />}
          </Route>
          <Route path="/multi-agent/chat">
            {user ? <Redirect to="/multi-agent/team-chat/chat" /> : <Redirect to="/login" />}
          </Route>
          
          <Route path="/multi-agent/direct-chat">
            {user ? <DirectChat /> : <Redirect to="/login" />}
          </Route>
          <Route path="/multi-agent/workbench">
            {user ? <WorkbenchDashboard /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/fine-tuning">
            {user ? <FineTuneGuide /> : <Redirect to="/login" />}
          </Route>
          <Route path="/fine-tuning/extract">
            {user ? <ExtractComponent /> : <Redirect to="/login" />}
          </Route>
          <Route path="/fine-tuning/generate">
            {user ? <GenerateDataset /> : <Redirect to="/login" />}
          </Route>
          <Route path="/fine-tuning/fine-tune">
            {user ? <FineTune /> : <Redirect to="/login" />}
          </Route>
          <Route path="/fine-tuning/test">
            {user ? <Test /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/retrieval">
            {user ? <RetrievalGuide /> : <Redirect to="/login" />}
          </Route>
          <Route path="/retrieval/build-databases">
            {user ? <BuildRetrievalDatabases /> : <Redirect to="/login" />}
          </Route>
          <Route path="/retrieval/manage-databases">
            {user ? <ManageVectorStores /> : <Redirect to="/login" />}
          </Route>
          <Route path="/retrieval/librarian-agents">
            {user ? <LibrarianAgents /> : <Redirect to="/login" />}
          </Route>
          <Route path="/wargame-builder">
            {user ? <WargameBuilder /> : <Redirect to="/login" />}
          </Route>
          <Route path="/report-builder">
            {user ? <ReportBuilderMain /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/report-designer">
            {user ? <ReportDesignerPage /> : <Redirect to="/login" />}
          </Route>
          <Route path="/report-designer/:reportId">
            {user ? <ReportDesignerPage /> : <Redirect to="/login" />}
          </Route>
          
          {/* Root path redirects to login if not authenticated, home if authenticated */}
          <Route exact path="/">
            {user ? <Home /> : <Redirect to="/login" />}
          </Route>
        </Switch>
      </Box>
      {/* AFWI MAGE Coin Logo - Don't show on standalone transcriber or home page */}
      {!isStandaloneTranscriber && !isHomePage && (
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

                            {/* Add route for DocumentViewerPopup */}
                            <Route path="/view-document" component={DocumentViewerPopup} />

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
