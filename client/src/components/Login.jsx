import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';
import { Container, Box, Avatar, Typography, TextField, Button, Grid, Link as MuiLink, Alert } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BusinessSetupDialog from './BusinessSetupDialog';

const Login = () => {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showBusinessSetup, setShowBusinessSetup] = useState(false);
    const [error, setError] = useState('');
    const { email, password } = formData;

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        const user = { email, password };
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const body = JSON.stringify(user);
            const res = await api.post('/auth/login', body, config);
            
            console.log('Login response:', res.data);
            
            // Store the token and role in localStorage
            localStorage.setItem('token', res.data.token);
            if (res.data.role) {
                localStorage.setItem('userRole', res.data.role);
                console.log('Stored role:', res.data.role);
            }
            
            // Check status
            if (res.data.requestPending) {
                showSnackbar('Your request is pending approval from the business owner.', 'info');
                navigate('/dashboard');
            } else if (res.data.needsBusinessSetup) {
                setShowBusinessSetup(true);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.msg || 'Invalid credentials');
        }
    };

    const handleBusinessSetupComplete = () => {
        setShowBusinessSetup(false);
        navigate('/dashboard');
    };

    return (
        <>
            <Container component="main" maxWidth="xs">
                <Box sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign in
                    </Typography>
                    {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
                    <Box component="form" noValidate onSubmit={onSubmit} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={onChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={onChange}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Sign In
                        </Button>
                        <Grid container>
                            <Grid item>
                                <MuiLink component={Link} to="/register" variant="body2">
                                    {"Don't have an account? Sign Up"}
                                </MuiLink>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>
            </Container>
            
            <BusinessSetupDialog
                open={showBusinessSetup}
                onComplete={handleBusinessSetupComplete}
            />
        </>
    );
};

export default Login;