import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Business Manager
                    </Typography>
                    <Button color="inherit" component={Link} to="/login">Login</Button>
                    <Button color="inherit" component={Link} to="/register">Register</Button>
                </Toolbar>
            </AppBar>
            <Container maxWidth="sm">
                <Box sx={{
                    my: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    height: '60vh'
                }}>
                    <Typography variant="h2" component="h1" gutterBottom>
                        Welcome to Business Manager
                    </Typography>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Your all-in-one solution for managing your business finances.
                    </Typography>
                    <Box sx={{ mt: 4 }}>
                        <Button variant="contained" color="primary" component={Link} to="/register" sx={{ mr: 2 }}>
                            Get Started
                        </Button>
                        <Button variant="outlined" color="primary" component={Link} to="/login">
                            Sign In
                        </Button>
                    </Box>
                </Box>
            </Container>
        </>
    );
};

export default Home;