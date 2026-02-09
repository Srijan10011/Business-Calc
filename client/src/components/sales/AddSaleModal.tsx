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
    Alert,
    Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../utils/api';

interface AddSaleModalProps {
    open: boolean;
    onClose: () => void;
    onAddStock?: (productId: string) => void;
    preselectedProduct?: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
}

interface Customer {
    customer_id?: string;
    id?: string;
    name: string;
}

interface Account {
    account_id?: string;
    id?: string;
    account_name?: string;
    type?: string;
    balance?: number;
}

export default function AddSaleModal({ open, onClose, onAddStock, preselectedProduct }: AddSaleModalProps) {
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
    const [newCustomerName, setNewCustomerName] = React.useState('');
    const [newCustomerPhone, setNewCustomerPhone] = React.useState('');
    const [newCustomerAddress, setNewCustomerAddress] = React.useState('');
    const [stockError, setStockError] = React.useState(false);
    const [error, setError] = React.useState('');

    const total = rate * quantity;

    const selectedProduct = products.find(p => p.id.toString() === product);
    const availableStock = selectedProduct?.stock || 0;

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
            const response = await api.get('/products', {
                headers: { 'x-auth-token': token }
            });
            setProducts(response.data);
            if (preselectedProduct) {
                setProduct(preselectedProduct);
                const selectedProd = response.data.find((p: Product) => p.id.toString() === preselectedProduct);
                if (selectedProd) {
                    setRate(selectedProd.price);
                    setStockError(quantity > selectedProd.stock);
                }
            } else if (response.data.length > 0) {
                setProduct(response.data[0].id.toString());
                setRate(response.data[0].price);
                setStockError(quantity > response.data[0].stock);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/customers', {
                headers: { 'x-auth-token': token }
            });
            setCustomers(response.data);
            if (response.data.length > 0) {
                setCustomer(response.data[0].customer_id?.toString() || response.data[0].id?.toString());
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/accounts', {
                headers: { 'x-auth-token': token }
            });
            
            // Filter out credit accounts and prioritize cash accounts
            const filteredAccounts = response.data.filter((acc: Account) => 
                !acc.account_name?.toLowerCase().includes('credit')
            );
            
            // Sort to put cash account first
            const sortedAccounts = filteredAccounts.sort((a: Account, b: Account) => {
                const aIsCash = a.account_name?.toLowerCase().includes('cash');
                const bIsCash = b.account_name?.toLowerCase().includes('cash');
                if (aIsCash && !bIsCash) return -1;
                if (!aIsCash && bIsCash) return 1;
                return 0;
            });
            
            setAccounts(sortedAccounts);
            if (sortedAccounts.length > 0) {
                const firstAccount = sortedAccounts[0];
                const accountId = firstAccount.account_id || firstAccount.id;
                setAccount(accountId?.toString() || '');
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
        setStockError(false);
    };

    const handleQuantityChange = (newQuantity: number) => {
        setQuantity(newQuantity);
        setStockError(newQuantity > availableStock);
    };

    const handleNewCustomerToggle = () => {
        setIsNewCustomer(prev => !prev);
        if (!isNewCustomer) {
            setNewCustomerName('');
            setNewCustomerPhone('');
            setNewCustomerAddress('');
        }
    };

    const handleAddNewCustomer = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/customers', {
                name: newCustomerName,
                phone: newCustomerPhone,
                address: newCustomerAddress
            }, {
                headers: { 'x-auth-token': token }
            });
            
            await fetchCustomers();
            const newCustomerId = response.data.customer_id || response.data.id;
            setCustomer(newCustomerId?.toString());
            setIsNewCustomer(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            setNewCustomerAddress('');
        } catch (error) {
            console.error('Error adding customer:', error);
        }
    };

    const handleSaveSale = async () => {
        if (quantity > availableStock) {
            setStockError(true);
            return;
        }
        
        setError(''); // Clear previous errors
        
        try {
            const token = localStorage.getItem('token');
            await api.post('/sales', {
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
        } catch (error: any) {
            console.error('Error saving sale:', error);
            const errorMessage = error.response?.data?.message || 'Error saving sale';
            setError(errorMessage);
        }
    };

    const handleAddStockClick = () => {
        if (onAddStock) {
            onAddStock(product);
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
                            onChange={(e) => handleQuantityChange(Number(e.target.value))}
                            fullWidth
                            error={stockError}
                        />
                    </Grid>
                    <Grid item xs={12} sm={8} sx={{ display: 'flex', alignItems: 'center' }}>
                         <Typography variant="h6">
                            Total: ₹{total.toLocaleString('en-IN')}
                        </Typography>
                    </Grid>
                    {stockError && (
                        <Grid item xs={12}>
                            <Alert severity="error">
                                Stock is less. Available: {availableStock}.{' '}
                                <Link component="button" onClick={handleAddStockClick} underline="always">
                                    Add stock?
                                </Link>
                            </Alert>
                        </Grid>
                    )}
                    {error && (
                        <Grid item xs={12}>
                            <Alert severity="error">
                                {error}
                            </Alert>
                        </Grid>
                    )}
                     <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            {isNewCustomer ? (
                                <Box sx={{ width: '100%' }}>
                                    <TextField
                                        label="Customer Name"
                                        variant="outlined"
                                        fullWidth
                                        value={newCustomerName}
                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        label="Phone"
                                        variant="outlined"
                                        fullWidth
                                        value={newCustomerPhone}
                                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        label="Address"
                                        variant="outlined"
                                        fullWidth
                                        value={newCustomerAddress}
                                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                                    />
                                    <Button 
                                        variant="contained" 
                                        onClick={handleAddNewCustomer}
                                        sx={{ mt: 2 }}
                                        disabled={!newCustomerName || !newCustomerPhone || !newCustomerAddress}
                                    >
                                        Add Customer
                                    </Button>
                                </Box>
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
                                            <MenuItem key={cust.customer_id || cust.id} value={(cust.customer_id || cust.id)?.toString()}>
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
                            <Typography variant="caption" color="text.secondary">
                                Fill in all fields and click "Add Customer" to save
                            </Typography>
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <FormControl>
                            <RadioGroup row name="payment-type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                                <FormControlLabel value="cash" control={<Radio />} label="Cash" />
                                <FormControlLabel value="bank" control={<Radio />} label="Bank" />
                                <FormControlLabel value="debit" control={<Radio />} label="Debit" />
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
                                    <MenuItem key={acc.account_id || acc.id} value={(acc.account_id || acc.id)?.toString()}>
                                        {acc.account_name || acc.type || 'Account'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveSale} variant="contained" disabled={stockError}>Save Sale</Button>
            </DialogActions>
        </Dialog>
    );
}
