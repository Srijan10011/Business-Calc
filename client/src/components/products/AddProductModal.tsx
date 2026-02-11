import * as React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';

import api from '../../utils/api';

interface AddProductModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AddProductModal({ open, onClose }: AddProductModalProps) {
    const [name, setName] = React.useState('');
    const [price, setPrice] = React.useState('');
    const [profitMargin, setProfitMargin] = React.useState('');
    const [stock, setStock] = React.useState('');

    const handleSaveProduct = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/products', {
                name,
                price: parseFloat(price),
                profit_margin: parseFloat(profitMargin),
                stock: parseInt(stock),
            }, {
                headers: { 'x-auth-token': token }
            });

            console.log('Product added successfully');
            setName('');
            setPrice('');
            setProfitMargin('');
            setStock('');
            onClose();
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
