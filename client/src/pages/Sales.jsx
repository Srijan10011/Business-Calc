import React, { useState, useEffect } from 'react';
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
import api from '../utils/api';
import { usePermissions } from '../context/PermissionContext';
import { useSnackbar } from '../context/SnackbarContext';

const statusColors = {
    Paid: 'success',
    Pending: 'warning',
};

export default function Sales() {
    const { hasPermission } = usePermissions();
    const { showSnackbar } = useSnackbar();
    const [open, setOpen] = useState(false);
    const [sales, setSales] = useState([]);
    const [paymentDialog, setPaymentDialog] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [stockDialog, setStockDialog] = useState(false);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [stockAmount, setStockAmount] = useState('');
    const [preselectedProduct, setPreselectedProduct] = useState('');
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSales, setTotalSales] = useState(0);

    const fetchSales = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (productFilter) params.append('product', productFilter);
            if (dateFromFilter) params.append('date_from', dateFromFilter);
            if (dateToFilter) params.append('date_to', dateToFilter);
            params.append('page', currentPage.toString());
            params.append('limit', '20');
            
            const response = await api.get(`/sales?${params}`, {
                headers: { 'x-auth-token': token }
            });
            setSales(response.data.sales);
            setTotalPages(response.data.pagination.totalPages);
            setTotalSales(response.data.pagination.totalSales);
        } catch (error) {
            console.error('Error fetching sales:', error);
            showSnackbar('Failed to fetch sales. Please try again.', 'error');
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/dependencies/products', {
                headers: { 'x-auth-token': token }
            });
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
            if (error.response?.status !== 403) {
                showSnackbar('Failed to fetch products. Please try again.', 'error');
            }
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/dependencies/accounts', {
                headers: { 'x-auth-token': token }
            });
            // Filter out Credit and Debit accounts for payment
            const filteredAccounts = response.data.filter(
                (account) => !account.account_name.toLowerCase().includes('credit') && 
                            !account.account_name.toLowerCase().includes('debit')
            );
            setAccounts(filteredAccounts);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            // Only show error if it's not a permission issue
            if (error.response?.status !== 403) {
                showSnackbar('Failed to fetch accounts. Please try again.', 'error');
            }
            // If 403, silently fail - user doesn't have permission to create sales anyway
        }
    };

    useEffect(() => {
        fetchSales();
        fetchProducts();
        fetchAccounts();
    }, []);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
        fetchSales();
    }, [statusFilter, productFilter, dateFromFilter, dateToFilter]);

    useEffect(() => {
        fetchSales();
    }, [currentPage]);

    const handleOpen = () => {
        setPreselectedProduct('');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setPreselectedProduct('');
        fetchSales();
    };

    const handlePayClick = (sale) => {
        setSelectedSale(sale);
        setPaymentAmount('');
        setSelectedAccount('');
        setPaymentError('');
        setPaymentDialog(true);
    };

    const handlePaymentSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post(
                `/sales/${selectedSale.sale_id}/payment`,
                { 
                    amount: parseFloat(paymentAmount),
                    account_id: selectedAccount
                },
                { headers: { 'x-auth-token': token } }
            );
            setPaymentDialog(false);
            fetchSales();
            showSnackbar('Payment recorded successfully!', 'success');
        } catch (error) {
            if (error.response?.data?.msg || error.response?.data?.message) {
                const errorMsg = error.response.data.msg || error.response.data.message;
                setPaymentError(errorMsg);
                showSnackbar(errorMsg, 'error');
            } else {
                console.error('Error recording payment:', error);
                showSnackbar('Failed to record payment. Please try again.', 'error');
            }
        }
    };

    const handleAddStock = (productId) => {
        setSelectedProduct(productId);
        setStockAmount('');
        setOpen(false);
        setStockDialog(true);
    };

    const handleStockSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post(
                '/products/add-stock',
                { product_id: selectedProduct, stock: parseInt(stockAmount) },
                { headers: { 'x-auth-token': token } }
            );
            setStockDialog(false);
            fetchProducts();
            setPreselectedProduct(selectedProduct);
            setOpen(true);
            showSnackbar('Stock added successfully!', 'success');
        } catch (error) {
            console.error('Error adding stock:', error);
            showSnackbar(error.response?.data?.msg || error.response?.data?.message || 'Failed to add stock. Please try again.', 'error');
        }
    };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Title>Recent Sales</Title>
        {hasPermission('sales.create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Add Sale
          </Button>
        )}
      </Box>
      
      {/* Filter Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </TextField>
          
          <TextField
            select
            label="Product"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="">All Products</MenuItem>
            {products.map((product) => (
              <MenuItem key={product.product_id} value={product.product_id}>
                {product.name}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            label="From Date"
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          
          <TextField
            label="To Date"
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          
          <Button variant="outlined" onClick={fetchSales}>
            Apply Filters
          </Button>
          
          <Button 
            variant="text" 
            onClick={() => {
              setStatusFilter('');
              setProductFilter('');
              setDateFromFilter('');
              setDateToFilter('');
              fetchSales();
            }}
          >
            Clear
          </Button>
        </Box>
      </Paper>
      
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
        
        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Box>
            Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalSales)} of {totalSales} sales
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === currentPage ? 'contained' : 'outlined'}
                onClick={() => setCurrentPage(page)}
                sx={{ minWidth: 40 }}
              >
                {page}
              </Button>
            ))}
            <Button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </Box>
        </Box>
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
                {accounts.map((account) => (
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
                {products.map((product) => (
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
    </>
  );
}
