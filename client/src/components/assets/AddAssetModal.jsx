import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import api from '../../utils/api';

function AddAssetModal({ open, onClose }) {
    const [assetName, setAssetName] = useState('');
    const [category, setCategory] = useState('Machinery');
    const [totalCost, setTotalCost] = useState('');

    const handleSaveAsset = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/assets', {
                name: assetName,
                category,
                totalCost: parseFloat(totalCost)
            }, {
                headers: { 'x-auth-token': token }
            });
            onClose();
        } catch (error) {
            console.error('Error saving asset:', error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Asset Name"
                            fullWidth
                            value={assetName}
                            onChange={(e) => setAssetName(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel id="category-label">Category</InputLabel>
                            <Select
                                labelId="category-label"
                                id="category-select"
                                value={category}
                                label="Category"
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <MenuItem value="Machinery">Machinery</MenuItem>
                                <MenuItem value="Vehicle">Vehicle</MenuItem>
                                <MenuItem value="Property">Property</MenuItem>
                                <MenuItem value="Electronics">Electronics</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Total Cost (₹)"
                            fullWidth
                            type="number"
                            value={totalCost}
                            onChange={(e) => setTotalCost(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveAsset} variant="contained">Save Asset</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddAssetModal;