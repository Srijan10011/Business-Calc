import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Button } from '@mui/material';
import api from '../../utils/api';
import { useSnackbar } from '../../context/SnackbarContext';

function AddProductModal({ open, onClose }) {
    const { showSnackbar } = useSnackbar();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');

    const handleSaveProduct = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/products', {
                name,
                price: parseFloat(price),
                stock: parseInt(stock),
            }, {
                headers: { 'x-auth-token': token }
            });

            setName('');
            setPrice('');
            setStock('');
            onClose();
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to add product. Please try again.', 'error');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Product Name"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Price (₹)"
                            fullWidth
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            error={price && parseFloat(price) < 0}
                            helperText={price && parseFloat(price) < 0 ? "Price cannot be negative" : ""}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Stock"
                            fullWidth
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            error={stock && parseInt(stock) < 0}
                            helperText={stock && parseInt(stock) < 0 ? "Stock cannot be negative" : ""}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button 
                    onClick={handleSaveProduct} 
                    variant="contained"
                    disabled={!name || !price || !stock || parseFloat(price) < 0 || parseInt(stock) < 0}
                >
                    Save Product
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddProductModal;