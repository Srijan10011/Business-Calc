import React, { useState } from 'react';
import { Button, Box } from '@mui/material';

const ErrorTest = () => {
    const [shouldError, setShouldError] = useState(false);

    if (shouldError) {
        throw new Error('Test error - ErrorBoundary should catch this!');
    }

    return (
        <Box sx={{ p: 2 }}>
            <Button 
                variant="contained" 
                color="error"
                onClick={() => setShouldError(true)}
            >
                Trigger Error (Test ErrorBoundary)
            </Button>
        </Box>
    );
};

export default ErrorTest;
