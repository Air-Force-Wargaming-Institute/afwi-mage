import React, { useState, useContext } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { 
  Button, 
  Typography, 
  Container, 
  makeStyles, 
  Paper,
  TextField,
  CircularProgress,
  IconButton,
  InputAdornment
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import { AuthContext } from '../contexts/AuthContext';
import backgroundImage from '../assets/background.jpg';
import afwiLogo from '../assets/afwi_logo.png';

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(3px)',
    }
  },
  loginPaper: {
    padding: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 30, 1)',
    borderRadius: '10px',
    border: '2px solid white',  // Add this line for the white border
    boxShadow: theme.shadows[5],
    position: 'relative',
    color: '#ffffff',
    width: '100%',
    maxWidth: '800px',
  },
  logo: {
    width: '175px', // Adjust this value to resize the logo
    marginBottom: theme.spacing(4),
  },
  loginForm: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  loginSubmit: {
    margin: theme.spacing(3, 0, 0),
  },
  loginTitle: {
    marginBottom: theme.spacing(4),
    color: '#ffffff !important',
    textAlign: 'center',
    fontSize: '2rem',
  },
  loginSubtitle: {
    marginBottom: theme.spacing(1),
    color: '#ffffff !important',
    textAlign: 'center',
    fontSize: '1rem',
  },
  loginError: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(2),
  },
  loginTextField: {
    marginBottom: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.5)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.7)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#ffffff',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    '& .MuiInputBase-input': {
      color: '#ffffff',
    },
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  error: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(2),
    textAlign: 'center',
  },
}));

function Login() {
  const classes = useStyles();
  const { login } = useContext(AuthContext);
  const history = useHistory();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const { from } = location.state || { from: { pathname: '/home' } };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await login(credentials.username, credentials.password);
      history.replace(from);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to log in. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={classes.root}>
      <Container component="main" maxWidth="md">
        <Paper className={classes.loginPaper} elevation={6}>
          <img src={afwiLogo} alt="AFWI Logo" className={classes.logo} />
          <Typography component="h3" variant="h5" className={classes.loginSubtitle}>
            Air Force Wargaming Institute
          </Typography>
          <Typography component="h1" variant="h3" className={classes.loginTitle}>
            Multi-Agent Generative Engine
          </Typography>
          <Typography component="h2" variant="h4" className={classes.loginSubtitle}>
            Login
          </Typography>
          
          <form className={classes.form} onSubmit={handleSubmit}>
            <TextField
              className={classes.loginTextField}
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              variant="outlined"
              value={credentials.username}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <TextField
              className={classes.loginTextField}
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              variant="outlined"
              value={credentials.password}
              onChange={handleInputChange}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      style={{ color: 'white' }}
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {error && (
              <Typography className={classes.error}>
                {error}
              </Typography>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              className={classes.submit}
              size="large"
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </Paper>
      </Container>
    </div>
  );
}

export default Login;
