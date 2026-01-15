import * as React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Typography,
    Box,
    IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';

interface AddSaleModalProps {
    open: boolean;
    onClose: () => void;
}

interface Product {
    id: number;
    name: string;
    price: number;
}

interface Customer {
    id: number;
    name: string;
}

interface Account {
    id: number;
    type: string;
}

export default function AddSaleModal({ open, onClose }: AddSaleModalProps) {
    const [rate, setRate] = React.useState(100);
    const [quantity, setQuantity] = React.useState(10);
    const [isNewCustomer, setIsNewCustomer] = React.useState(false);
    const [product, setProduct] = React.useState('');
    const [customer, setCustomer] = React.useState('');
    const [account, setAccount] = React.useState('');
    const [paymentType, setPaymentType] = React.useState('cash');
    const [products, setProducts] = React.useState<Product[]>([]);
    const [customers, setCustomers] = React.useState<Customer[]>([]);
    const [accounts, setAccounts] = React.useState<Account[]>([]);

    const total = rate * quantity;

    React.useEffect(() => {
        if (open) {
            fetchProducts();
            fetchCustomers();
            fetchAccounts();
        }
    }, [open]);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/products', {
                headers: { 'x-auth-token': token }
            });
            setProducts(response.data);
            if (response.data.length > 0) {
                setProduct(response.data[0].id.toString());
                setRate(response.data[0].price);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/customers', {
                headers: { 'x-auth-token': token }
            });
            setCustomers(response.data);
            if (response.data.length > 0) {
                setCustomer(response.data[0].id.toString());
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/accounts', {
                headers: { 'x-auth-token': token }
            });
            setAccounts(response.data);
            if (response.data.length > 0) {
                setAccount(response.data[0].id.toString());
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const handleProductChange = (productId: string) => {
        setProduct(productId);
        const selectedProduct = products.find(p => p.id.toString() === productId);
        if (selectedProduct) {
            setRate(selectedProduct.price);
        }
    };

    const handleNewCustomerToggle = () => {
        setIsNewCustomer(prev => !prev);
    };

    const handleSaveSale = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/sales', {
                customer_id: customer,
                total_amount: total,
                payment_type: paymentType,
                account_id: account,
                product_id: product,
                rate: rate,
                quantity: quantity
            }, {
                headers: { 'x-auth-token': token }
            });
            onClose();
        } catch (error) {
            console.error('Error saving sale:', error);
        }
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
                                value={product}
                                onChange={(e) => handleProductChange(e.target.value as string)}
                            >
                                {products.map((prod) => (
                                    <MenuItem key={prod.id} value={prod.id.toString()}>
                                        {prod.name}
                                    </MenuItem>
                                ))}
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
                                        value={customer}
                                        onChange={(e) => setCustomer(e.target.value as string)}
                                    >
                                        {customers.map((cust) => (
                                            <MenuItem key={cust.id} value={cust.id.toString()}>
                                                {cust.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            <IconButton
                                color="primary"
                                size="small"
                                onClick={handleNewCustomerToggle}
                                sx={{ ml: 1, mt: 1.5, p: 0.5 }}
                                title={isNewCustomer ? 'Select Existing Customer' : 'Add New Customer'}
                            >
                                {isNewCustomer ? <ArrowBackIcon /> : <AddIcon />}
                            </IconButton>
                        </Box>
                    </Grid>
                    {isNewCustomer && (
                        <Grid item xs={12}>
                            <TextField
                                label="Phone/Email (Optional)"
                                fullWidth
                            />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <FormControl>
                            <RadioGroup row name="payment-type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
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
                                value={account}
                                onChange={(e) => setAccount(e.target.value as string)}
                            >
                                {accounts.map((acc) => (
                                    <MenuItem key={acc.id} value={acc.id.toString()}>
                                        {acc.type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveSale} variant="contained">Save Sale</Button>
            </DialogActions>
        </Dialog>
    );
}
