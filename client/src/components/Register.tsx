import React, { useState } from 'react';
import api from '../../utils/api';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Grid,
    Link,
    Avatar
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BusinessSetupDialog from './BusinessSetupDialog';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password2: '',
        business_id: ''
    });
    const [showBusinessSetup, setShowBusinessSetup] = useState(false);

    const { name, email, password, password2, business_id } = formData;

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== password2) {
            console.log('Passwords do not match');
            // You might want to set an error state here and display it to the user
        } else {
            const newUser = {
                name,
                email,
                password,
                business_id: business_id || undefined
            };

            try {
                const config = {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                const body = JSON.stringify(newUser);
                const res = await api.post('/auth/register', body, config);
                
                // Store the token
                localStorage.setItem('token', res.data.token);
                
                // Check if business setup is needed
                if (res.data.needsBusinessSetup) {
                    setShowBusinessSetup(true);
                } else {
                    navigate('/dashboard');
                }
            } catch (err: any) {
                console.error(err.response.data);
                 // You might want to set an error state here and display it to the user
            }
        }
    };

    const handleBusinessSetupComplete = () => {
        setShowBusinessSetup(false);
        navigate('/dashboard');
    };

    return (
        <>
            <Container component="main" maxWidth="xs">
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign up
                    </Typography>
                    <Box component="form" noValidate onSubmit={onSubmit} sx={{ mt: 3 }}>
                        <TextField
                            margin="normal"
                            autoComplete="name"
                            name="name"
                            required
                            fullWidth
                            id="name"
                            label="Name"
                            autoFocus
                            value={name}
                            onChange={onChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={onChange}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            id="business_id"
                            label="Business ID (Optional)"
                            name="business_id"
                            value={business_id}
                            onChange={onChange}
                            helperText="Enter your business UUID if you have one, or leave blank to create a new business"
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={onChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password2"
                            label="Confirm Password"
                            type="password"
                            id="password2"
                            value={password2}
                            onChange={onChange}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Sign Up
                        </Button>
                        <Grid container justifyContent="flex-end">
                            <Grid item>
                                <Link component={RouterLink} to="/login" variant="body2">
                                    Already have an account? Sign in
                                </Link>
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

export default Register;
