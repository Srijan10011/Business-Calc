import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Button,
    Box,
    Paper,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import AddSaleModal from '../components/sales/AddSaleModal';
import axios from 'axios';

const statusColors: Record<string, 'success' | 'warning'> = {
    Paid: 'success',
    Pending: 'warning',
}

export default function Sales() {
    const [open, setOpen] = React.useState(false);
    const [sales, setSales] = React.useState([]);
    const [paymentDialog, setPaymentDialog] = React.useState(false);
    const [selectedSale, setSelectedSale] = React.useState<any>(null);
    const [paymentAmount, setPaymentAmount] = React.useState('');
    const [paymentError, setPaymentError] = React.useState('');
    const [selectedAccount, setSelectedAccount] = React.useState('');
    const [accounts, setAccounts] = React.useState([]);
    const [stockDialog, setStockDialog] = React.useState(false);
    const [products, setProducts] = React.useState([]);
    const [selectedProduct, setSelectedProduct] = React.useState('');
    const [stockAmount, setStockAmount] = React.useState('');
    const [preselectedProduct, setPreselectedProduct] = React.useState('');

    const fetchSales = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/sales', {
                headers: { 'x-auth-token': token }
            });
            setSales(response.data);
        } catch (error) {
            console.error('Error fetching sales:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/products', {
                headers: { 'x-auth-token': token }
            });
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/accounts', {
                headers: { 'x-auth-token': token }
            });
            // Filter out Credit and Debit accounts for payment
            const filteredAccounts = response.data.filter(
                (account: any) => !account.account_name.toLowerCase().includes('credit') && 
                                 !account.account_name.toLowerCase().includes('debit')
            );
            setAccounts(filteredAccounts);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    React.useEffect(() => {
        fetchSales();
        fetchProducts();
        fetchAccounts();
    }, []);

    const handleOpen = () => {
        setPreselectedProduct('');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setPreselectedProduct('');
        fetchSales();
    };

    const handlePayClick = (sale: any) => {
        setSelectedSale(sale);
        setPaymentAmount('');
        setSelectedAccount('');
        setPaymentError('');
        setPaymentDialog(true);
    };

    const handlePaymentSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `http://localhost:5000/api/sales/${selectedSale.sale_id}/payment`,
                { 
                    amount: parseFloat(paymentAmount),
                    account_id: selectedAccount
                },
                { headers: { 'x-auth-token': token } }
            );
            setPaymentDialog(false);
            fetchSales();
        } catch (error: any) {
            if (error.response?.data?.message) {
                setPaymentError(error.response.data.message);
            } else {
                console.error('Error recording payment:', error);
            }
        }
    };

    const handleAddStock = (productId: string) => {
        setSelectedProduct(productId);
        setStockAmount('');
        setOpen(false);
        setStockDialog(true);
    };

    const handleStockSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:5000/api/products/add-stock',
                { product_id: selectedProduct, stock: parseInt(stockAmount) },
                { headers: { 'x-auth-token': token } }
            );
            setStockDialog(false);
            fetchProducts();
            setPreselectedProduct(selectedProduct);
            setOpen(true);
        } catch (error) {
            console.error('Error adding stock:', error);
        }
    };

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Title>Recent Sales</Title>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Add Sale
        </Button>
      </Box>
      <Paper>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Payment Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((row) => (
              <TableRow key={row.sale_id}>
                <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>{row.product}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>₹{row.total}</TableCell>
                <TableCell>{row.payment_type}</TableCell>
                <TableCell>
                    <Chip label={row.status} color={statusColors[row.status]} size="small"/>
                </TableCell>
                <TableCell>
                    {row.status === 'Pending' && (
                        <Button size="small" variant="outlined" onClick={() => handlePayClick(row)}>
                            Pay
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <AddSaleModal open={open} onClose={handleClose} onAddStock={handleAddStock} preselectedProduct={preselectedProduct} />

      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
            {paymentError && (
                <Alert severity="error" sx={{ mb: 2 }}>{paymentError}</Alert>
            )}
            <TextField
                select
                margin="dense"
                label="Account"
                fullWidth
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                sx={{ mb: 2 }}
            >
                {accounts.map((account: any) => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                        {account.account_name}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                autoFocus
                margin="dense"
                label="Payment Amount"
                type="number"
                fullWidth
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handlePaymentSubmit} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={stockDialog} onClose={() => setStockDialog(false)}>
        <DialogTitle>Add Stock</DialogTitle>
        <DialogContent>
            <TextField
                select
                margin="dense"
                label="Product"
                fullWidth
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
            >
                {products.map((product: any) => (
                    <MenuItem key={product.id} value={product.id}>
                        {product.name}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                margin="dense"
                label="Stock to Add"
                type="number"
                fullWidth
                value={stockAmount}
                onChange={(e) => setStockAmount(e.target.value)}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setStockDialog(false)}>Cancel</Button>
            <Button onClick={handleStockSubmit} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
