import React, { useContext, useState } from 'react';
import { Box, Typography, Paper } from '@material-ui/core';
import NewReportOptions from './NewReportOptions';
import PriorReportsList from './PriorReportsList';
import { AuthContext } from '../../contexts/AuthContext';
import { useHistory } from 'react-router-dom';
import { makeStyles, styled, useTheme } from '@material-ui/core/styles';
import { GradientText } from '../../styles/StyledComponents';
import { mockReports } from './mockReports';
import { reportTemplates } from './reportTemplates';

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
    const { isAuthenticated, isLoading } = useContext(AuthContext);
    const history = useHistory();
    const classes = useStyles();
    const theme = useTheme();
    const [reports, setReports] = useState(mockReports);

    const handleCreateReport = (reportData) => {
        // If reportData is a template, use it to create a new report
        if (reportData?.prebuiltElements) {
            const newReport = {
                id: `report-${Date.now()}`,
                name: reportData.name || 'New Report',
                description: reportData.description || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'draft',
                prebuiltElements: reportData.prebuiltElements,
                type: 'Template'
            };
            setReports(prev => [...prev, newReport]);
            // Open in new window
            window.open(`/report-designer/${newReport.id}`, '_blank', 'width=1200,height=800');
        } else {
            // Create a new empty report
            const newReport = {
                id: `report-${Date.now()}`,
                name: 'New Report',
                description: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'draft',
                prebuiltElements: [],
                type: 'Custom'
            };
            setReports(prev => [...prev, newReport]);
            // Open in new window
            window.open(`/report-designer/${newReport.id}`, '_blank', 'width=1200,height=800');
        }
    };

    const handleViewEdit = (report) => {
        // Open report in new window
        window.open(`/report-designer/${report.id}`, '_blank', 'width=1200,height=800');
    };

    const handleDeleteReport = (reportId) => {
        setReports(prev => prev.filter(report => report.id !== reportId));
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Box sx={{ padding: 2, height: '100vh', overflow: 'hidden' }}>
            <Box className={classes.container}>
                <Box className={classes.root}>
                    <Box className={classes.leftPanel}>
                        <Box className={classes.contentWrapper}>
                            <NewReportOptions 
                                onCreateNew={handleCreateReport}
                                onCreateTemplate={() => history.push('/templates/new')}
                                templates={reportTemplates}
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
                                reports={reports}
                                onDeleteReport={handleDeleteReport}
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