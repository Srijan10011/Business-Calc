import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ErrorFallback = () => {
    const handleReload = () => {
        window.location.reload();
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    textAlign: 'center',
                    gap: 2
                }}
            >
                <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main' }} />
                <Typography variant="h4" component="h1">
                    Something went wrong
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    We're sorry for the inconvenience. Please try reloading the page.
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleReload}
                    sx={{ mt: 2 }}
                >
                    Reload Page
                </Button>
            </Box>
        </Container>
    );
};

export default ErrorFallback;
