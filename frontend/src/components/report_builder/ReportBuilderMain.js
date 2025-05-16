import React, { useContext, useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@material-ui/core';
import NewReportOptions from './NewReportOptions';
import PriorReportsList from './PriorReportsList';
import { AuthContext } from '../../contexts/AuthContext';
import { useHistory } from 'react-router-dom';
import { makeStyles, styled, useTheme } from '@material-ui/core/styles';
import { GradientText } from '../../styles/StyledComponents';
import axios from 'axios';
import { getGatewayUrl } from '../../config';

// Styled components
const GradientHeader = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(30, 30, 30, 0.9)',
  padding: '35px 24px 24px 24px',
  marginBottom: '5px',
  borderRadius: '10px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
  color: theme.palette.text.primary,
  border: '1px solid rgba(66, 133, 244, 0.3)',
  minHeight: '175px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4, #5794ff, #2c5cc5)',
  }
}));

const TitleText = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 700,
  background: 'linear-gradient(45deg, #4285f4, #34a853)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  marginBottom: theme.spacing(2),
  letterSpacing: '0.5px',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '3px',
    background: 'linear-gradient(to right, #4285f4, #34a853)',
    borderRadius: '2px',
  }
}));

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    height: 'calc(100vh - 200px)',
    gap: theme.spacing(2),
    padding: theme.spacing(1.5),
    width: '100%',
    maxWidth: 'none',
    margin: '0 auto',
    overflow: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: '1800px',
    margin: '0 auto',
    padding: theme.spacing(0, 4),
  },
  leftPanel: {
    width: '40%',
    flexShrink: 0,
    height: '100%',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanel: {
    width: '60%',
    flexShrink: 0,
    height: '100%',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  headerContainer: {
    marginBottom: theme.spacing(2),
  },
  contentWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
}));

const ReportBuilderMain = () => {
    const { user, token, isAuthenticated, isLoading: authIsLoading } = useContext(AuthContext);
    const history = useHistory();
    const classes = useStyles();
    const theme = useTheme();
    const [reports, setReports] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (token) {
            const fetchData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    // Fetch reports
                    const reportsResponse = await axios.get(getGatewayUrl('/api/report_builder/reports'), {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    
                    // Fetch templates
                    const templatesResponse = await axios.get(getGatewayUrl('/api/report_builder/templates'), {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    
                    setReports(reportsResponse.data || []);
                    setTemplates(templatesResponse.data || []);
                } catch (err) {
                    console.error("Error fetching data:", err);
                    setError('Failed to fetch data. Please try again.');
                    setReports([]);
                    setTemplates([]);
                }
                setIsLoading(false);
            };
            fetchData();
            
            // Add event listener to refresh data when window regains focus
            const handleFocus = () => {
                console.log("Window focused, refreshing data");
                fetchData();
            };
            
            window.addEventListener('focus', handleFocus);
            
            // Add event listener for messages from the ReportDesignerPage
            const handleMessage = (event) => {
                // Verify the origin for security
                if (event.origin !== window.location.origin) return;
                
                // Check if this is a message from the report designer
                if (event.data && event.data.type === 'REPORT_BUILDER_SAVE') {
                    console.log("Received save notification from designer:", event.data);
                    fetchData(); // Refresh the data
                }
            };
            
            window.addEventListener('message', handleMessage);
            
            // Clean up event listeners
            return () => {
                window.removeEventListener('focus', handleFocus);
                window.removeEventListener('message', handleMessage);
            };
        }
    }, [token]);

    const handleCreateReport = async (options) => {
        // For custom reports
        if (options && options.type === 'custom') {
            window.open(`/report-designer`, '_blank', 'width=1200,height=800');
            return;
        }
        
        // For template-based reports
        if (options && options.type === 'template' && options.data) {
            // Store the template in session storage to be used by the designer
            try {
                sessionStorage.setItem('selectedTemplate', JSON.stringify(options.data));
            } catch (e) {
                console.error("Error saving template to session storage", e);
            }
            
            // Open the designer with a query param indicating it's a template-based new report
            window.open(`/report-designer?fromTemplate=true`, '_blank', 'width=1200,height=800');
            return;
        }
    };

    const handleViewEdit = (report) => {
        const url = report.templateId 
            ? `/report-designer/${report.id}?templateKey=${report.templateId}`
            : `/report-designer/${report.id}`;
        window.open(url, '_blank', 'width=1200,height=800');
    };

    const handleDeleteReport = async (reportId) => {
        setIsLoading(true);
        setError(null);
        try {
            await axios.delete(getGatewayUrl(`/api/report_builder/reports/${reportId}`), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReports(prev => prev.filter(report => report.id !== reportId));
        } catch (err) {
            console.error("Error deleting report:", err);
            setError('Failed to delete report. Please try again.');
        }
        setIsLoading(false);
    };

    const handleCreateTemplate = async () => {
        // Use a temporary ID for the new template
        const tempId = `temp-${Date.now()}`;
        
        // Open the template editor without creating a backend entry
        window.open(`/report-designer?isTemplate=true`, '_blank', 'width=1200,height=800');
    };

    // Add a function to fetch templates
    const fetchTemplates = async () => {
        try {
            const templatesResponse = await axios.get(getGatewayUrl('/api/report_builder/templates'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setTemplates(templatesResponse.data || []);
        } catch (err) {
            console.error("Error fetching templates:", err);
            // Optionally show an error message
        }
    };

    if (authIsLoading) {
        return <div>Loading authentication...</div>;
    }

    if (!isAuthenticated) {
        return <div>Please log in to access the Report Builder.</div>;
    }
    
    if (isLoading && !authIsLoading) {
        return <div>Loading reports and templates...</div>;
    }

    if (error) {
        return (
            <Box sx={{ padding: 2, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ padding: 2, height: '100vh', overflow: 'hidden' }}>
            <Box className={classes.container}>
                <Box className={classes.root}>
                    <Box className={classes.leftPanel}>
                        <Box className={classes.contentWrapper}>
                            <NewReportOptions 
                                onCreateNew={handleCreateReport}
                                onCreateTemplate={handleCreateTemplate}
                                templates={templates}
                                refreshTemplates={fetchTemplates}
                            />
                        </Box>
                    </Box>
                    <Box className={classes.rightPanel}>
                        <Box className={classes.headerContainer}>
                            <GradientHeader elevation={1}>
                                <TitleText variant="h1" component="h1">
                                    Report Builder
                                </TitleText>
                                <Typography 
                                    variant="subtitle1" 
                                    sx={{ 
                                        backgroundColor: 'rgba(40, 40, 40, 0.7)', 
                                        padding: '12px',
                                        borderRadius: '8px',
                                        maxWidth: '900px',
                                        margin: '0 auto 20px auto',
                                        color: theme.palette.text.primary,
                                        fontWeight: 500,
                                    }}
                                >
                                    Create and manage AI-assisted reports with customizable templates and dynamic content generation
                                </Typography>
                            </GradientHeader>
                        </Box>
                        <Box className={classes.contentWrapper}>
                            <PriorReportsList
                                onViewEdit={handleViewEdit}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ReportBuilderMain; 