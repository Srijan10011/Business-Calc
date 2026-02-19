import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Button } from '@mui/material';
import api from '../../utils/api';
import { useSnackbar } from '../../context/SnackbarContext';

function AddCustomerModal({ open, onClose }) {
    const { showSnackbar } = useSnackbar();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');

    // Error states
    const [nameError, setNameError] = useState(false);
    const [phoneError, setPhoneError] = useState(false);
    const [streetError, setStreetError] = useState(false);
    const [cityError, setCityError] = useState(false);
    const [emailError, setEmailError] = useState(false);

    const handleSaveCustomer = async () => {
        let isValid = true;

        if (name.trim() === '') {
            setNameError(true);
            isValid = false;
        } else {
            setNameError(false);
        }

        if (phone.trim() === '') {
            setPhoneError(true);
            isValid = false;
        } else {
            setPhoneError(false);
        }

        if (street.trim() === '') {
            setStreetError(true);
            isValid = false;
        } else {
            setStreetError(false);
        }

        if (city.trim() === '') {
            setCityError(true);
            isValid = false;
        } else {
            setCityError(false);
        }

        if (email.trim() !== '' && !/\S+@\S+\.\S+/.test(email)) {
            setEmailError(true);
            isValid = false;
        } else {
            setEmailError(false);
        }

        if (isValid) {
            try {
                const fullAddress = `${street} ${city} ${state} ${zipCode}`.trim();

                const response = await api.post('/customers', {
                    name,
                    phone,
                    email: email.trim() === '' ? null : email,
                    address: fullAddress,
                });

                console.log('Customer added successfully:', response.data);

                // Reset fields and close the dialog after saving
                setName('');
                setPhone('');
                setEmail('');
                setStreet('');
                setCity('');
                setState('');
                setZipCode('');
                setNameError(false);
                setPhoneError(false);
                setStreetError(false);
                setCityError(false);
                setEmailError(false);
                onClose();
            } catch (error) {
                console.error('Error adding customer:', error.message);
                showSnackbar(error.response?.data?.message || 'Failed to add customer. Please try again.', 'error');
                // Optionally, display an error message to the user
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Customer Name"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            error={nameError}
                            helperText={nameError ? 'Customer Name is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Phone Number"
                            fullWidth
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            error={phoneError}
                            helperText={phoneError ? 'Phone Number is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            error={emailError}
                            helperText={emailError ? 'Enter a valid email address' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Street Address"
                            fullWidth
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            required
                            error={streetError}
                            helperText={streetError ? 'Street Address is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="City"
                            fullWidth
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                            error={cityError}
                            helperText={cityError ? 'City is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="State"
                            fullWidth
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Zip Code"
                            fullWidth
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveCustomer} variant="contained">Save Customer</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddCustomerModal;