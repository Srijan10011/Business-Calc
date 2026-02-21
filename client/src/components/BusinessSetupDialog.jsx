import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, TextField, MenuItem, Button } from '@mui/material';
import api from '../utils/api';

const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'INR', label: 'Indian Rupee (INR)' },
    { value: 'NPR', label: 'Nepali Rupee (NPR)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'AUD', label: 'Australian Dollar (AUD)' }
];

const BusinessSetupDialog = ({ open, onComplete }) => {
    const [formData, setFormData] = useState({
        businessName: '',
        currency: 'USD'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    
                }
            };

            await api.post('/auth/setup-business', formData, config);
            localStorage.setItem('userRole', 'Owner');
            onComplete();
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to setup business');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
            onClose={() => {}} // Prevent closing
        >
            <DialogTitle>
                <Typography variant="h5" component="div">
                    Setup Your Business
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Please provide your business details to continue
                </Typography>
            </DialogTitle>
            
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            name="businessName"
                            label="Business Name"
                            value={formData.businessName}
                            onChange={handleChange}
                            required
                            fullWidth
                            autoFocus
                        />
                        
                        <TextField
                            name="currency"
                            label="Currency"
                            value={formData.currency}
                            onChange={handleChange}
                            select
                            required
                            fullWidth
                        >
                            {currencies.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {error && (
                            <Typography color="error" variant="body2">
                                {error}
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                
                <DialogActions sx={{ p: 3 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || !formData.businessName}
                        fullWidth
                        size="large"
                    >
                        {loading ? 'Setting up...' : 'Create Business'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default BusinessSetupDialog;