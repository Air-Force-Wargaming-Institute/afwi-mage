import { createTheme, responsiveFontSizes } from '@material-ui/core/styles';

// Define gradient strings for reuse
const gradients = {
  gradient1: 'linear-gradient(to right,rgb(129, 177, 255),rgb(95, 127, 255),rgb(165, 165, 165))',
  gradient2: 'linear-gradient(135deg,rgb(129, 177, 255),rgb(95, 127, 255),rgb(165, 165, 165))',
  horizontal: 'linear-gradient(to right, #4285f4,rgb(126, 139, 255),rgb(209, 234, 255))',
  vertical: 'linear-gradient(to bottom, #4285f4,rgb(203, 208, 255),rgb(5, 140, 251))',
  vibrant: 'linear-gradient(45deg, #4285f4,rgb(203, 208, 255),rgb(5, 140, 251))',
  strong: 'linear-gradient(to right, #4285f4,rgb(203, 208, 255),rgb(5, 140, 251))',
  border: 'linear-gradient(to right, rgba(71, 106, 162, 0.8), rgba(121, 181, 255, 0.8), rgba(17, 96, 255, 0.8))',
};

// Create base theme
let theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#4285f4',
      light: '#5794ff',
      dark: '#2c5cc5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#34a853',
      light: '#5cb767',
      dark: '#1e7e34',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ea4335',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#fbbc05',
      light: '#ffd54f',
      dark: '#f9a825',
    },
    info: {
      main: '#4285f4',
      light: '#63a4ff',
      dark: '#004ba0',
    },
    success: {
      main: '#34a853',
      light: '#4caf50',
      dark: '#2e7d32',
    },
    background: {
      default: '#121212',
      paper: 'rgba(30, 30, 30, 0.9)',
      lighter: 'rgba(40, 40, 40, 0.9)',
      header: 'rgba(10, 10, 10, 0.95)',
      card: 'rgba(40, 40, 40, 0.8)',
    },
    text: {
      primary: '#f0f0f0',
      secondary: '#bbbbbb',
    },
    divider: '#333333',
    action: {
      hover: 'rgba(66, 134, 244, 0.39)',
      selected: 'rgba(66, 134, 244, 0.2)',
    },
  },
  typography: {
    fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: {
      fontFamily: '"Oswald", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 700,
      fontSize: '2.7rem',
    },
    h2: {
      fontFamily: '"Oswald", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontFamily: '"Oswald", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.7rem',
    },
    h4: {
      fontFamily: '"Oswald", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.4rem',
    },
    h5: {
      fontFamily: '"Oswald", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontFamily: '"Oswald", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
      fontSize: '1.1rem',
    },
    subtitle1: {
      fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
    },
    subtitle2: {
      fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
      lineHeight: 1.6,
    },
    button: {
      fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 10,
  },
  spacing: 8,
  shadows: [
    'none',
    '0 2px 4px 0 rgba(0,0,0,0.2)',
    '0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12)',
    // Keep other shadows as default
    ...Array(22).fill(''),
    '0 4px 10px rgba(0, 0, 0, 0.3)', // Custom box shadow from CSS
    '0 8px 16px rgba(0, 0, 0, 0.4)', // Custom large shadow from CSS
  ],
  props: {
    MuiButtonBase: {
      disableRipple: false,
    },
    MuiButton: {
      disableElevation: false,
    },
    MuiPaper: {
      elevation: 1,
    },
  },
  overrides: {
    MuiCssBaseline: {
      '@global': {
        '@import': [
          'url("https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&display=swap")',
          'url("https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap")',
        ],
        body: {
          backgroundColor: '#121212',
          backgroundImage: 'url("./assets/background.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        },
        '.App': {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          textAlign: 'center',
        },
      },
    },
    MuiPaper: {
      root: {
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
        color: '#f0f0f0',
        transition: 'all 0.3s ease',
      },
      rounded: {
        borderRadius: 10,
      },
    },
    MuiButton: {
      root: {
        borderRadius: 10,
        textTransform: 'none',
        transition: 'all 0.3s ease',
      },
      contained: {
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.25)',
        },
      },
      containedPrimary: {
        backgroundColor: '#4285f4',
        '&:hover': {
          backgroundColor: '#5794ff',
        },
      },
      outlined: {
        borderColor: '#4285f4',
        '&:hover': {
          backgroundColor: 'rgba(66, 134, 244, 0.39)',
        },
      },
      sizeSmall: {
        padding: '6px 12px',
      },
    },
    MuiIconButton: {
      root: {
        color: '#f0f0f0',
        '&:hover': {
          backgroundColor: 'rgba(66, 134, 244, 0.39)',
        },
      },
    },
    MuiInputBase: {
      root: {
        borderRadius: 10,
        transition: 'all 0.3s ease',
        color: '#f0f0f0',
      },
      input: {
        '&::placeholder': {
          color: '#bbbbbb',
          opacity: 1,
        },
      },
    },
    MuiOutlinedInput: {
      root: {
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#4285f4',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#4285f4',
        },
      },
      notchedOutline: {
        borderColor: '#333333',
      },
    },
    MuiFormLabel: {
      root: {
        color: '#bbbbbb',
        '&.Mui-focused': {
          color: '#4285f4',
        },
      },
    },
    MuiTable: {
      root: {
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
      },
    },
    MuiTableHead: {
      root: {
        '& .MuiTableCell-head': {
          backgroundColor: '#4285f4',
          color: 'white',
          fontWeight: 'bold',
        },
      },
    },
    MuiTableRow: {
      root: {
        '&:nth-of-type(odd)': {
          backgroundColor: 'rgba(35, 35, 35, 0.7)',
        },
        '&:nth-of-type(even)': {
          backgroundColor: 'rgba(75, 74, 74, 0.7)',
        },
        '&:hover': {
          backgroundColor: 'rgba(60, 60, 60, 0.7)',
        },
      },
    },
    MuiTableCell: {
      root: {
        borderBottom: '1px solid #333333',
        color: '#f0f0f0',
      },
      head: {
        color: 'white',
      },
    },
    MuiDialog: {
      paper: {
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
      },
    },
    MuiDialogTitle: {
      root: {
        backgroundColor: '#4285f4',
        color: 'white',
        padding: '1rem',
      },
    },
    MuiDialogContent: {
      root: {
        padding: '1.5rem',
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
      },
    },
    MuiListItem: {
      root: {
        borderRadius: 10,
        '&:hover': {
          backgroundColor: 'rgba(66, 134, 244, 0.39)',
        },
        '&.Mui-selected': {
          backgroundColor: '#4285f4',
          color: 'white',
          '& .MuiListItemIcon-root': {
            color: 'white',
          },
          '& .MuiListItemText-primary': {
            color: 'white',
          },
          '& .MuiListItemText-secondary': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          '&:hover': {
            backgroundColor: '#4285f4',
          },
        },
      },
    },
    MuiListItemIcon: {
      root: {
        color: '#4285f4',
        minWidth: 40,
      },
    },
    MuiListItemText: {
      primary: {
        color: '#f0f0f0',
      },
      secondary: {
        color: '#bbbbbb',
      },
    },
    MuiDivider: {
      root: {
        backgroundColor: '#333333',
      },
    },
    MuiChip: {
      root: {
        backgroundColor: 'rgba(40, 40, 40, 0.9)',
        color: '#f0f0f0',
      },
      colorPrimary: {
        backgroundColor: '#4285f4',
        color: 'white',
      },
    },
    MuiSwitch: {
      switchBase: {
        '&.Mui-checked': {
          color: '#4285f4',
          '& + .MuiSwitch-track': {
            backgroundColor: '#4285f4',
          },
        },
      },
    },
    MuiCheckbox: {
      colorPrimary: {
        '&.Mui-checked': {
          color: '#4285f4',
        },
      },
    },
    MuiRadio: {
      colorPrimary: {
        '&.Mui-checked': {
          color: '#4285f4',
        },
      },
    },
  },
  // Custom values to hold the gradient strings and other design elements
  custom: {
    gradients,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    boxShadowLarge: '0 8px 16px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.3s ease',
    borderWidth: {
      hairline: 0.5,
      ultraThin: 0.75,
      thin: 1,
      regular: 2,
      thick: 3,
      extraThick: 4
    },
    borderStyles: {
      solid: 'solid',
      dashed: 'dashed',
      dotted: 'dotted'
    }
  },
});

// Responsive font sizes for better mobile experience
theme = responsiveFontSizes(theme);

export default theme; 