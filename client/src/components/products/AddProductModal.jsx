import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Button } from '@mui/material';

function AddProductModal({ open, onClose }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [profitMargin, setProfitMargin] = useState('');
    const [stock, setStock] = useState('');

    const handleSaveProduct = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || '',
                },
                body: JSON.stringify({
                    name,
                    price: parseFloat(price),
                    profit_margin: parseFloat(profitMargin),
                    stock: parseInt(stock),
                }),
            });

            if (response.ok) {
                console.log('Product added successfully');
                setName('');
                setPrice('');
                setProfitMargin('');
                setStock('');
                onClose();
            } else {
                console.error('Failed to add product');
            }
        } catch (error) {
            console.error('Error adding product:', error);
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
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Profit Margin (%)"
                            fullWidth
                            type="number"
                            value={profitMargin}
                            onChange={(e) => setProfitMargin(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Stock"
                            fullWidth
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveProduct} variant="contained">Save Product</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddProductModal;