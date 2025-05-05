import React from 'react';
import { Box, Typography } from '@material-ui/core';
import NewReportOptions from './NewReportOptions';
import PriorReportsList from './PriorReportsList';
// import ReportDesignerModal from './ReportDesignerModal'; // No longer needed
import { makeStyles } from '@material-ui/core/styles';
import { GradientText, StyledContainer } from '../../styles/StyledComponents'; // Import GradientText and StyledContainer

const useStyles = makeStyles((theme) => ({
  root: {
    // Use StyledContainer styles potentially, or keep custom flex layout
    display: 'flex',
    height: 'calc(100vh - 180px)', // Adjust height based on header/footer
    gap: theme.spacing(3),
    padding: theme.spacing(3),
    width: '100%',
    maxWidth: '1600px', // Example max width
    margin: '0 auto', // Center the container
  },
  leftPanel: {
    width: '33%',
    flexShrink: 0,
    height: '100%', // Ensure panel takes full height available
  },
  rightPanel: {
    flexGrow: 1,
    height: '100%', // Ensure panel takes full height available
  },
  // Remove title style if using GradientText directly
  // title: {
  //   marginBottom: theme.spacing(2),
  //   textAlign: 'center',
  // },
}));

function ReportBuilderMain() {
  const classes = useStyles();
  // Remove modal state
  // const [isModalOpen, setIsModalOpen] = React.useState(false);
  // const [currentReport, setCurrentReport] = React.useState(null); 

  const handleCreateNew = (template = null) => {
    console.log("Opening new report designer window with template:", template);
    const url = '/report-designer'; // Base URL for new report
    // TODO: Pass template info if applicable, maybe via query params or state
    const windowFeatures = 'width=1400,height=900,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no';
    window.open(url, 'ReportDesigner_New', windowFeatures);
  };

  const handleViewEdit = (report) => {
    console.log("Opening report designer window for report:", report);
    const url = `/report-designer/${report.id}`;
    const windowFeatures = 'width=1400,height=900,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no';
    window.open(url, `ReportDesigner_Edit_${report.id}`, windowFeatures); // Use unique name for each edit window if desired
  };

  // handleCloseModal is no longer needed

  return (
    // Optionally wrap with StyledContainer if you prefer its base styling
    // <StyledContainer className={classes.root}>
    <Box sx={{ padding: 3 }}> {/* Add padding if not using StyledContainer */}
      <GradientText variant="h1" component="h1" align="center" gutterBottom sx={{ mb: 4, fontSize: '3.5rem' }}>
        Report Builder
      </GradientText>
      <Box className={classes.root}>
        <Box className={classes.leftPanel}>
          <NewReportOptions onCreateNew={handleCreateNew} />
        </Box>
        <Box className={classes.rightPanel}>
          <PriorReportsList onViewEdit={handleViewEdit} />
        </Box>
      </Box>
    </Box>
    // </StyledContainer>
  );
}

export default ReportBuilderMain; 