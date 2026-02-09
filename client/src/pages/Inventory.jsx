import * as React from 'react';
import { Box, Button, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Visibility from '@mui/icons-material/Visibility';
import Refresh from '@mui/icons-material/Refresh';
import Title from '../components/dashboard/Title';
import api from '../utils/api';

const statusColors = {
    OK: 'success',
    LOW: 'warning',
    OUT: 'error',
};

function Inventory() {
    const [items, setItems] = React.useState([]);
    const [addDialog, setAddDialog] = React.useState(false);
    const [stockDialog, setStockDialog] = React.useState(false);
    const [stockOperation, setStockOperation] = React.useState('in');
    const [name, setName] = React.useState('');
    const [stock, setStock] = React.useState('');
    const [unitCost, setUnitCost] = React.useState('');
    const [type, setType] = React.useState('raw_material');
    const [selectedItem, setSelectedItem] = React.useState('');
    const [stockQuantity, setStockQuantity] = React.useState('');
    const [accounts, setAccounts] = React.useState([]);
    const [paymentAccount, setPaymentAccount] = React.useState('');
    const [skipPayment, setSkipPayment] = React.useState(false);
    const [partyName, setPartyName] = React.useState('');
    const [stockPaymentAccount, setStockPaymentAccount] = React.useState('');
    const [skipStockPayment, setSkipStockPayment] = React.useState(false);
    const [stockPartyName, setStockPartyName] = React.useState('');
    const [suppliers, setSuppliers] = React.useState([]);
    const [isNewSupplier, setIsNewSupplier] = React.useState(false);
    const [showPaymentError, setShowPaymentError] = React.useState(false);

    React.useEffect(() => {
        fetchItems();
        fetchAccounts();
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/credits', {
                headers: { 'x-auth-token': token }
            });
            const uniqueSuppliers = [...new Set(response.data.map(p => p.party_name))];
            setSuppliers(uniqueSuppliers);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/accounts', {
                headers: { 'x-auth-token': token }
            });
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/inventory', {
                headers: { 'x-auth-token': token }
            });
            setItems(response.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const handleAddItem = () => {
        setName('');
        setStock('');
        setUnitCost('');
        setType('raw_material');
        setPaymentAccount('');
        setSkipPayment(false);
        setPartyName('');
        setShowPaymentError(false);
        setAddDialog(true);
    };

    const handleSaveItem = async () => {
        // Validate payment account
        if (!skipPayment && !paymentAccount) {
            setShowPaymentError(true);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const totalAmount = skipPayment ? 0 : (parseFloat(stock) * parseFloat(unitCost));
            
            await api.post('/inventory', {
                name,
                stock: parseInt(stock),
                unit_cost: parseFloat(unitCost),
                type,
                payment_account: skipPayment ? null : paymentAccount,
                total_amount: totalAmount,
                party_name: partyName
            }, {
                headers: { 'x-auth-token': token }
            });
            setAddDialog(false);
            fetchItems();
        } catch (error) {
            console.error('Error adding inventory item:', error);
        }
    };

    const handleStockIn = () => {
        setStockOperation('in');
        setSelectedItem('');
        setStockQuantity('');
        setStockPaymentAccount('');
        setSkipStockPayment(false);
        setStockPartyName('');
        setIsNewSupplier(false);
        setStockDialog(true);
    };

    const handleStockOut = () => {
        setStockOperation('out');
        setSelectedItem('');
        setStockQuantity('');
        setStockDialog(true);
    };

    const handleStockUpdate = async () => {
        try {
            // Validation for stock in operations
            if (stockOperation === 'in' && !skipStockPayment && !stockPaymentAccount) {
                alert('Please select an account or skip payment');
                return;
            }

            // Validation for credit account requiring supplier name
            const selectedAccount = accounts.find(acc => acc.account_id === stockPaymentAccount);
            const isCredit = selectedAccount?.account_name?.toLowerCase().includes('credit');
            if (stockOperation === 'in' && !skipStockPayment && isCredit && !stockPartyName) {
                alert('Please select or enter a supplier name for credit transactions');
                return;
            }

            const token = localStorage.getItem('token');
            const selectedItemData = items.find(item => item.id === selectedItem);
            const totalAmount = (stockOperation === 'in' && !skipStockPayment) 
                ? parseFloat(stockQuantity) * parseFloat(selectedItemData?.unit_cost || 0) 
                : 0;
                
            await axios.patch(
                `http://localhost:5000/api/inventory/${selectedItem}/stock`,
                { 
                    quantity: parseInt(stockQuantity), 
                    operation: stockOperation,
                    payment_account: (stockOperation === 'in' && !skipStockPayment) ? stockPaymentAccount : null,
                    total_amount: totalAmount,
                    party_name: stockPartyName
                },
                { headers: { 'x-auth-token': token } }
            );
            setStockDialog(false);
            fetchItems();
        } catch (error) {
            console.error('Error updating stock:', error);
            alert('Error updating stock: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleView = (id) => {
        console.log(`View item ${id}`);
    };

    const handleRestock = (id) => {
        console.log(`Restock item ${id}`);
    };

    const getStatus = (stock) => {
        if (stock === 0) return 'OUT';
        if (stock < 10) return 'LOW';
        return 'OK';
    };

    const totalItems = items.length;
    const lowStockItems = items.filter(item => getStatus(item.stock) === 'LOW').length;
    const totalValue = items.reduce((sum, item) => sum + (item.stock * item.unit_cost), 0);

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mb: 3 }}>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddItem}>
                    Add Item
                </Button>
                <Button variant="outlined" startIcon={<ArrowUpward />} onClick={handleStockIn}>
                    Stock In
                </Button>
                <Button variant="outlined" startIcon={<ArrowDownward />} onClick={handleStockOut}>
                    Stock Out
                </Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Title>Summary</Title>
                        <Typography variant="h6">Total Items: {totalItems}</Typography>
                        <Typography variant="h6" color="warning.main">Low Stock: {lowStockItems}</Typography>
                        <Typography variant="h6">Value: ₹{totalValue.toLocaleString('en-IN')}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Title>Inventory List</Title>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Stock</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Unit Cost</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item) => {
                            const status = getStatus(item.stock);
                            return (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.stock}</TableCell>
                                <TableCell>{item.type}</TableCell>
                                <TableCell>₹{item.unit_cost.toLocaleString('en-IN')}</TableCell>
                                <TableCell>
                                    <Chip label={status} color={statusColors[status]} size="small"/>
                                </TableCell>
                                <TableCell>
                                    <Button onClick={() => handleView(item.id)} size="small" startIcon={<Visibility />}>View</Button>
                                    {status !== 'OK' && (
                                        <Button onClick={() => handleRestock(item.id)} size="small" startIcon={<Refresh />} sx={{ ml: 1 }}>Restock</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </Paper>

            <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Left Side - Item Details */}
                        <Grid item xs={12} sm={6}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Item Details</Typography>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Name"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <TextField
                                margin="dense"
                                label="Stock"
                                type="number"
                                fullWidth
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                            />
                            <TextField
                                margin="dense"
                                label="Unit Cost"
                                type="number"
                                fullWidth
                                value={unitCost}
                                onChange={(e) => setUnitCost(e.target.value)}
                            />
                            <TextField
                                select
                                margin="dense"
                                label="Type"
                                fullWidth
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <MenuItem value="raw_material">Raw Material</MenuItem>
                                <MenuItem value="product">Product</MenuItem>
                                <MenuItem value="other">Other</MenuItem>
                            </TextField>
                        </Grid>
                        
                        {/* Right Side - Payment */}
                        <Grid item xs={12} sm={6}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Payment</Typography>
                            <TextField
                                select
                                margin="dense"
                                label="Account"
                                fullWidth
                                value={paymentAccount}
                                onChange={(e) => {
                                    setPaymentAccount(e.target.value);
                                    setShowPaymentError(false);
                                }}
                                disabled={skipPayment}
                                required={!skipPayment}
                                error={showPaymentError && !skipPayment && !paymentAccount}
                                helperText={showPaymentError && !skipPayment && !paymentAccount ? "Please select an account or skip payment" : ""}
                            >
                                {accounts.filter(acc => ['Cash Account', 'Bank Account', 'Credit Account'].includes(acc.account_name)).map((account) => (
                                    <MenuItem key={account.account_id} value={account.account_id}>
                                        {account.account_name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                margin="dense"
                                label="Total Amount"
                                type="number"
                                fullWidth
                                value={skipPayment ? 0 : (parseFloat(stock || 0) * parseFloat(unitCost || 0)).toFixed(2)}
                                disabled
                            />
                            {accounts.find(acc => acc.account_id === paymentAccount)?.account_name?.toLowerCase().includes('credit') && !skipPayment && (
                                <TextField
                                    margin="dense"
                                    label="Party Name"
                                    fullWidth
                                    value={partyName}
                                    onChange={(e) => setPartyName(e.target.value)}
                                    placeholder="Enter supplier/vendor name"
                                />
                            )}
                            <Button 
                                variant={skipPayment ? "contained" : "outlined"}
                                onClick={() => setSkipPayment(!skipPayment)}
                                sx={{ mt: 2 }}
                                fullWidth
                            >
                                {skipPayment ? "Payment Skipped" : "Skip Payment"}
                            </Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSaveItem} 
                        variant="contained"
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Stock {stockOperation === 'in' ? 'In' : 'Out'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Left Side - Stock Details */}
                        <Grid item xs={12} sm={stockOperation === 'in' ? 6 : 12}>
                            <Typography variant="h6" sx={{ mb: 2 }}>Stock Details</Typography>
                            <TextField
                                select
                                margin="dense"
                                label="Item"
                                fullWidth
                                value={selectedItem}
                                onChange={(e) => setSelectedItem(e.target.value)}
                            >
                                {items.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>
                                        {item.name} (Current: {item.stock})
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                margin="dense"
                                label="Quantity"
                                type="number"
                                fullWidth
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(e.target.value)}
                            />
                        </Grid>
                        
                        {/* Right Side - Payment (only for stock in) */}
                        {stockOperation === 'in' && (
                            <Grid item xs={12} sm={6}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Payment</Typography>
                                <TextField
                                    select
                                    margin="dense"
                                    label="Account"
                                    fullWidth
                                    value={stockPaymentAccount}
                                    onChange={(e) => setStockPaymentAccount(e.target.value)}
                                    disabled={skipStockPayment}
                                >
                                    {accounts.filter(acc => ['Cash Account', 'Bank Account', 'Credit Account'].includes(acc.account_name)).map((account) => (
                                        <MenuItem key={account.account_id} value={account.account_id}>
                                            {account.account_name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    margin="dense"
                                    label="Total Amount"
                                    type="number"
                                    fullWidth
                                    value={skipStockPayment ? 0 : (parseFloat(stockQuantity || 0) * parseFloat(items.find(item => item.id === selectedItem)?.unit_cost || 0)).toFixed(2)}
                                    disabled
                                />
                                {accounts.find(acc => acc.account_id === stockPaymentAccount)?.account_name?.toLowerCase().includes('credit') && !skipStockPayment && (
                                    <>
                                        <TextField
                                            select
                                            margin="dense"
                                            label="Supplier"
                                            fullWidth
                                            value={isNewSupplier ? 'new' : stockPartyName}
                                            onChange={(e) => {
                                                if (e.target.value === 'new') {
                                                    setIsNewSupplier(true);
                                                    setStockPartyName('');
                                                } else {
                                                    setIsNewSupplier(false);
                                                    setStockPartyName(e.target.value);
                                                }
                                            }}
                                        >
                                            {suppliers.map((supplier) => (
                                                <MenuItem key={supplier} value={supplier}>
                                                    {supplier}
                                                </MenuItem>
                                            ))}
                                            <MenuItem value="new">+ New Supplier</MenuItem>
                                        </TextField>
                                        {isNewSupplier && (
                                            <TextField
                                                margin="dense"
                                                label="New Supplier Name"
                                                fullWidth
                                                value={stockPartyName}
                                                onChange={(e) => setStockPartyName(e.target.value)}
                                                placeholder="Enter supplier name"
                                            />
                                        )}
                                    </>
                                )}
                                <Button 
                                    variant={skipStockPayment ? "contained" : "outlined"}
                                    onClick={() => setSkipStockPayment(!skipStockPayment)}
                                    sx={{ mt: 2 }}
                                    fullWidth
                                >
                                    {skipStockPayment ? "Payment Skipped" : "Skip Payment"}
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStockDialog(false)}>Cancel</Button>
                    <Button onClick={handleStockUpdate} variant="contained">Update</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}

export default Inventory;