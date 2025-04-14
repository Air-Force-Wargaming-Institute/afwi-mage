import React, { useContext, useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Grid,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
  Checkbox,
  FormControlLabel,
  Tooltip,
  IconButton,
  InputAdornment
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import InfoIcon from '@material-ui/icons/Info';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { AuthContext } from '../contexts/AuthContext';
import { getApiUrl, getGatewayUrl } from '../config';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  mainContainer: {
    backgroundColor: 'white',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  welcome: {
    marginBottom: theme.spacing(3),
    color: theme.palette.primary.main,
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  actionButton: {
    marginRight: theme.spacing(1),
  },
  addButton: {
    marginBottom: theme.spacing(2),
  },
  formControl: {
    marginBottom: theme.spacing(2),
    minWidth: '100%',
  },
  passwordRequirements: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
  },
  requirementMet: {
    color: '#4caf50',
    fontWeight: 'bold',
    '& .bullet': {
      color: '#4caf50',
    }
  },
  requirementNotMet: {
    color: theme.palette.text.secondary,
    '& .bullet': {
      color: theme.palette.text.secondary,
    }
  },
  bullet: {
    display: 'inline-block',
    marginRight: theme.spacing(1),
  },
  infoIcon: {
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
    verticalAlign: 'middle',
  },
}));

const USER_TYPES = {
  ADMIN: 'admin',
  DATA_SCIENTIST: 'data_scientist',
  BASIC_USER: 'basic_user'
};

const formatPermission = (permission) => {
  switch (permission) {
    case USER_TYPES.ADMIN:
      return 'Administrator';
    case USER_TYPES.DATA_SCIENTIST:
      return 'Data Scientist';
    case USER_TYPES.BASIC_USER:
      return 'Basic User';
    default:
      return permission;
  }
};

function AdminDashboard() {
  const classes = useStyles();
  const { user, token } = useContext(AuthContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    userType: '',
  });
  const [formError, setFormError] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getGatewayUrl('/api/auth/users'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [token, fetchUsers]);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setNewUser({
        username: user.username,
        password: '',
        confirmPassword: '',
        userType: user.permission,
      });
      setShowPasswordFields(false);
    } else {
      setEditingUser(null);
      setNewUser({
        username: '',
        password: '',
        confirmPassword: '',
        userType: '',
      });
      setShowPasswordFields(true);
    }
    setOpenDialog(true);
    setFormError('');
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setShowPasswordFields(false);
    setNewUser({
      username: '',
      password: '',
      confirmPassword: '',
      userType: '',
    });
    setFormError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const validation = {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    console.log('Password validation:', validation);
    setPasswordValidation(validation);
  };

  const validateForm = () => {
    if (!newUser.username || !newUser.userType) {
      setFormError('Please fill in all required fields');
      return false;
    }
    if (!editingUser || showPasswordFields) {
      if (!newUser.password || !newUser.confirmPassword) {
        setFormError('Password is required');
        return false;
      }
      if (newUser.password !== newUser.confirmPassword) {
        setFormError('Passwords do not match');
        return false;
      }
      if (!Object.values(passwordValidation).every(Boolean)) {
        setFormError('Password does not meet all requirements');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const endpoint = editingUser 
        ? `/api/auth/users/${editingUser.id}` 
        : '/api/auth/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const userData = {
        username: newUser.username,
        permission: newUser.userType,
      };

      // Only include password if it's a new user or if password was changed
      if (!editingUser || newUser.password) {
        userData.password = newUser.password;
      }

      const response = await fetch(getGatewayUrl(endpoint), {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle validation errors
        if (response.status === 422) {
          const errorDetail = data.detail || [];
          const errorMessages = Array.isArray(errorDetail) 
            ? errorDetail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('\n')
            : data.detail;
          throw new Error(errorMessages);
        }
        throw new Error(data.detail || `Failed to ${editingUser ? 'update' : 'create'} user`);
      }

      setSnackbar({
        open: true,
        message: `User ${editingUser ? 'updated' : 'created'} successfully`,
        severity: 'success'
      });
      
      await fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error(`Error ${editingUser ? 'updating' : 'creating'} user:`, error);
      setFormError(error.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(getGatewayUrl(`/api/auth/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
      
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTogglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <Container className={classes.root}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className={classes.root}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className={classes.root}>
      <Paper className={classes.mainContainer}>
        <Typography variant="h4" className={classes.title}>
          Admin Dashboard
        </Typography>
        <Typography variant="h6" className={classes.welcome}>
          Welcome, {user?.username || 'Administrator'}!
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Typography variant="h6" className={classes.section}>
                User Management
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                className={classes.addButton}
              >
                Add New User
              </Button>
              <TableContainer className={classes.tableContainer}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>User Type</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{formatPermission(user.permission)}</TableCell>
                        <TableCell>{user.lastLogin || 'Never'}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            className={classes.actionButton}
                            onClick={() => handleOpenDialog(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            color="secondary"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Other dashboard sections */}
          <Grid item xs={12} md={6}>
            <Paper className={classes.paper}>
              <Typography variant="h6" className={classes.section}>
                System Status
              </Typography>
              <Typography variant="body1">
                • System is running normally
              </Typography>
              <Typography variant="body1">
                • All services are operational
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Typography variant="h6" className={classes.section}>
                Recent Activity
              </Typography>
              <Typography variant="body1">
                No recent administrative actions to display.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* User Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogContent>
            <FormControl className={classes.formControl}>
              <TextField
                autoFocus
                margin="dense"
                name="username"
                label="Username"
                type="text"
                fullWidth
                value={newUser.username}
                onChange={handleInputChange}
              />
            </FormControl>
            
            {editingUser && (
              <FormControl className={classes.formControl}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showPasswordFields}
                      onChange={(e) => {
                        setShowPasswordFields(e.target.checked);
                        if (!e.target.checked) {
                          // Clear password fields when unchecking
                          setNewUser(prev => ({
                            ...prev,
                            password: '',
                            confirmPassword: ''
                          }));
                        }
                      }}
                      name="showPassword"
                    />
                  }
                  label="Change Password"
                />
              </FormControl>
            )}
            
            {(!editingUser || showPasswordFields) && (
              <div>
                <FormControl className={classes.formControl}>
                  <TextField
                    margin="dense"
                    name="password"
                    label={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        New Password
                        <Tooltip title="Password must meet all requirements below">
                          <InfoIcon className={classes.infoIcon} />
                        </Tooltip>
                      </div>
                    }
                    type={showPasswords.password ? 'text' : 'password'}
                    fullWidth
                    value={newUser.password}
                    onChange={handleInputChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => handleTogglePasswordVisibility('password')}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                          >
                            {showPasswords.password ? <Visibility /> : <VisibilityOff />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
                
                <Paper variant="outlined" className={classes.passwordRequirements}>
                  <Typography variant="subtitle2" gutterBottom>
                    Password Requirements:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    className={passwordValidation.hasMinLength ? classes.requirementMet : classes.requirementNotMet}
                  >
                    <span className="bullet">•</span>
                    Minimum 8 characters
                  </Typography>
                  <Typography 
                    variant="body2"
                    className={passwordValidation.hasUpperCase ? classes.requirementMet : classes.requirementNotMet}
                  >
                    <span className="bullet">•</span>
                    At least one uppercase letter
                  </Typography>
                  <Typography 
                    variant="body2"
                    className={passwordValidation.hasLowerCase ? classes.requirementMet : classes.requirementNotMet}
                  >
                    <span className="bullet">•</span>
                    At least one lowercase letter
                  </Typography>
                  <Typography 
                    variant="body2"
                    className={passwordValidation.hasNumber ? classes.requirementMet : classes.requirementNotMet}
                  >
                    <span className="bullet">•</span>
                    At least one number
                  </Typography>
                  <Typography 
                    variant="body2"
                    className={passwordValidation.hasSpecialChar ? classes.requirementMet : classes.requirementNotMet}
                  >
                    <span className="bullet">•</span>
                    At least one special character (!@#$%^&amp;*(),.?&quot;:&#123;&#125;|&lt;&gt;)
                  </Typography>
                </Paper>

                <FormControl className={classes.formControl}>
                  <TextField
                    margin="dense"
                    name="confirmPassword"
                    label="Confirm Password"
                    type={showPasswords.confirmPassword ? 'text' : 'password'}
                    fullWidth
                    value={newUser.confirmPassword}
                    onChange={handleInputChange}
                    error={newUser.confirmPassword && newUser.password !== newUser.confirmPassword}
                    helperText={newUser.confirmPassword && newUser.password !== newUser.confirmPassword ? "Passwords don't match" : ""}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => handleTogglePasswordVisibility('confirmPassword')}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                          >
                            {showPasswords.confirmPassword ? <Visibility /> : <VisibilityOff />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FormControl>
              </div>
            )}
            
            <FormControl className={classes.formControl}>
              <InputLabel>User Type</InputLabel>
              <Select
                name="userType"
                value={newUser.userType}
                onChange={handleInputChange}
              >
                <MenuItem value={USER_TYPES.ADMIN}>{formatPermission(USER_TYPES.ADMIN)}</MenuItem>
                <MenuItem value={USER_TYPES.DATA_SCIENTIST}>{formatPermission(USER_TYPES.DATA_SCIENTIST)}</MenuItem>
                <MenuItem value={USER_TYPES.BASIC_USER}>{formatPermission(USER_TYPES.BASIC_USER)}</MenuItem>
              </Select>
            </FormControl>
            {formError && (
              <Typography color="error" variant="body2">
                {formError}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={handleSubmit} color="primary" variant="contained">
              {editingUser ? 'Save Changes' : 'Add User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Snackbar for notifications */}
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
}

export default AdminDashboard;
