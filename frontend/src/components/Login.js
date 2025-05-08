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
import lemayCenterShield from '../assets/LeMay_Center_Shield.png';
import afwiLogo from '../assets/afwi_logo.png';
import mageCoin from '../assets/AFWI_MAGE_COIN.png';
import usafLogo from '../assets/1200px-USAF_logo.png';
import { AnimatedGradientPaper } from '../styles/StyledComponents';
import { ActionButton } from '../styles/ActionButtons';

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    zIndex: 0,
    backgroundColor: '#222',
    border: 'none',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  },
  cornerImage: {
    position: 'absolute',
    width: 90,
    height: 'auto',
    zIndex: 10,
    background: 'none',
    border: 'none',
  },
  leftCorner: {
    top: 24,
    left: 24,
  },
  rightCorner: {
    top: 24,
    right: 24,
  },
  logoRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1),
    position: 'relative',
  },
  afwiLogo: {
    width: 200,
    height: 'auto',
    position: 'relative',
    zIndex: 2,
    marginRight: -48,
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.45))',
  },
  mageCoin: {
    width: 200,
    height: 'auto',
    position: 'relative',
    zIndex: 1,
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.45))',
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
  loginPaper: {
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#181830',
    borderRadius: '10px',
    border: '4px solid #00ffff',
    position: 'relative',
    zIndex: 2,
    color: '#ffffff',
    width: '100%',
    maxWidth: '800px',
    boxSizing: 'border-box',
  },
  loginForm: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  loginSubmit: {
    margin: theme.spacing(3, 0, 0),
  },
  loginTextField: {
    marginBottom: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#181830 !important',
      '& fieldset': {
        borderColor: `${theme.palette.primary.main} !important`,
        borderWidth: '1.5px !important',
      },
      '&:hover fieldset': {
        borderColor: `${theme.palette.primary.light} !important`,
      },
      '&.Mui-focused fieldset': {
        borderColor: `${theme.palette.primary.main} !important`,
      },
    },
    '& .MuiInputLabel-root': {
      color: '#ffffff !important',
      opacity: '0.85 !important',
    },
    '& .MuiInputBase-input': {
      color: '#ffffff !important',
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
      {/* Corner Images */}
      <img src={lemayCenterShield} alt="LeMay Center Shield" className={`${classes.cornerImage} ${classes.leftCorner}`} />
      <img src={usafLogo} alt="USAF Logo" className={`${classes.cornerImage} ${classes.rightCorner}`} />
      <AnimatedGradientPaper>
        <Typography component="h3" variant="h5" className={classes.loginSubtitle} style={{ marginBottom: 0, marginTop: 0, fontWeight: 700, fontSize: '1.3rem' }}>
          Air Force Wargaming Institute
        </Typography>
        <div className={classes.logoRow}>
          <img src={afwiLogo} alt="AFWI Logo" className={classes.afwiLogo} />
          <img src={mageCoin} alt="MAGE Coin" className={classes.mageCoin} />
        </div>
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
            InputProps={{
              style: {
                backgroundColor: '#181830',
                color: '#fff',
              },
            }}
            InputLabelProps={{
              style: {
                color: '#fff',
                opacity: 0.85,
              },
            }}
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
              style: {
                backgroundColor: '#181830',
                color: '#fff',
              },
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
            InputLabelProps={{
              style: {
                color: '#fff',
                opacity: 0.85,
              },
            }}
          />
          
          {error && (
            <Typography className={classes.error}>
              {error}
            </Typography>
          )}
          
          <ActionButton
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            size="large"
            disabled={isLoading}
            style={{ marginTop: 24 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Login'
            )}
          </ActionButton>
        </form>
      </AnimatedGradientPaper>
    </div>
  );
}

export default Login;
