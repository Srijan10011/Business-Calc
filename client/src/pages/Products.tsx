import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Button,
    Box,
    Typography,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import Title from '../components/dashboard/Title';
import { Link as RouterLink } from 'react-router-dom';
import AddProductModal from '../components/products/AddProductModal';
import axios from 'axios';

interface Product {
    id: number;
    name: string;
    price: number;
    profit_margin: number;
    stock: number;
}

export default function Products() {
    const [open, setOpen] = React.useState(false);
    const [stockDialog, setStockDialog] = React.useState(false);
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedProduct, setSelectedProduct] = React.useState('');
    const [stockAmount, setStockAmount] = React.useState('');

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/products', {
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            } else {
                console.error('Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        fetchProducts();
    };

    const handleStockOpen = () => {
        setSelectedProduct('');
        setStockAmount('');
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
        } catch (error) {
            console.error('Error adding stock:', error);
        }
    };

    if (loading) {
        return <Typography>Loading products...</Typography>;
    }

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Products</Title>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<InventoryIcon />}
                        onClick={handleStockOpen}
                    >
                        Add Stock
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpen}
                    >
                        Add Product
                    </Button>
                </Box>
            </Box>
            <Paper>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Profit Margin</TableCell>
                            <TableCell>Stock</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <RouterLink to={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        {product.name}
                                    </RouterLink>
                                </TableCell>
                                <TableCell>₹{product.price.toLocaleString('en-IN')}</TableCell>
                                <TableCell>{product.profit_margin}%</TableCell>
                                <TableCell>{product.stock}</TableCell>
                            </TableRow>
                        ))}
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No products found. Add your first product!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
            <AddProductModal open={open} onClose={handleClose} />

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
        </React.Fragment>
    );
}
