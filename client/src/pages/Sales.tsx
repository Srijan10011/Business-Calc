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
import api from '../utils/api';
import { usePermissions } from '../context/PermissionContext';

const statusColors: Record<string, 'success' | 'warning'> = {
    Paid: 'success',
    Pending: 'warning',
}

export default function Sales() {
    const { hasPermission } = usePermissions();
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
    
    // Filter states
    const [statusFilter, setStatusFilter] = React.useState('');
    const [productFilter, setProductFilter] = React.useState('');
    const [dateFromFilter, setDateFromFilter] = React.useState('');
    const [dateToFilter, setDateToFilter] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalSales, setTotalSales] = React.useState(0);

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

    React.useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
        fetchSales();
    }, [statusFilter, productFilter, dateFromFilter, dateToFilter]);

    React.useEffect(() => {
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
            await api.post(
                '/products/add-stock',
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
