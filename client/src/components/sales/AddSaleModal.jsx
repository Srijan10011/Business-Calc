import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Box, IconButton, RadioGroup, FormControlLabel, Radio, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function AddSaleModal({ open, onClose }) {
    const [rate, setRate] = useState(100);
    const [quantity, setQuantity] = useState(10);
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [product, setProduct] = useState('10'); // Initialize with the first product's value
    const [customer, setCustomer] = useState('10'); // Initialize with the first customer's value
    const [account, setAccount] = useState('10'); // Initialize with the first account's value

    const total = rate * quantity;

    const handleNewCustomerToggle = () => {
        setIsNewCustomer(prev => !prev);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Add New Sale</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={8}>
                        <FormControl fullWidth>
                            <InputLabel id="product-select-label">Product</InputLabel>
                            <Select
                                labelId="product-select-label"
                                id="product-select"
                                label="Product"
                                value={product} // Bind to state
                                onChange={(e) => setProduct(e.target.value)} // Update state
                            >
                                <MenuItem value={'10'}>Product A</MenuItem>
                                <MenuItem value={'20'}>Product B</MenuItem>
                                <MenuItem value={'30'}>Product C</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Rate per unit"
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(Number(e.target.value))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={8} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6">
                            Total: ₹{total.toLocaleString('en-IN')}
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            {isNewCustomer ? (
                                <TextField
                                    label="New Customer Name"
                                    variant="outlined"
                                    fullWidth
                                />
                            ) : (
                                <FormControl fullWidth>
                                    <InputLabel id="customer-select-label">Customer</InputLabel>
                                    <Select
                                        labelId="customer-select-label"
                                        id="customer-select"
                                        label="Customer"
                                        value={customer} // Bind to state
                                        onChange={(e) => setCustomer(e.target.value)} // Update state
                                    >
                                        <MenuItem value={10}>Customer 1</MenuItem>
                                        <MenuItem value={20}>Customer 2</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                            <IconButton
                                color="primary"
                                size="small"
                                onClick={handleNewCustomerToggle}
                                sx={{ ml: 1, mt: 1.5, p: 0.5 }} // Adjust margin-top for alignment
                                title={isNewCustomer ? 'Select Existing Customer' : 'Add New Customer'}
                            >
                                {isNewCustomer ? <ArrowBackIcon /> : <AddIcon />}
                            </IconButton>
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Phone/Email (Optional)" fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl>
                            <RadioGroup row name="payment-type" defaultValue="cash">
                                <FormControlLabel value="cash" control={<Radio />} label="Cash" />
                                <FormControlLabel value="bank" control={<Radio />} label="Bank" />
                                <FormControlLabel value="credit" control={<Radio />} label="Credit" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel id="account-select-label">Account</InputLabel>
                            <Select
                                labelId="account-select-label"
                                id="account-select"
                                label="Account"
                                value={account} // Bind to state
                                onChange={(e) => setAccount(e.target.value)} // Update state
                            >
                                <MenuItem value={10}>Main Account</MenuItem>
                                <MenuItem value={20}>Savings Account</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onClose} variant="contained">Save Sale</Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddSaleModal;