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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import { Link as RouterLink } from 'react-router-dom';
import AddProductModal from '../components/products/AddProductModal';

interface Product {
    id: number;
    name: string;
    price: number;
    profit_margin: number;
    stock: number;
}

export default function Products() {
    const [open, setOpen] = React.useState(false);
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);

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
        fetchProducts(); // Refresh products after adding new one
    };

    if (loading) {
        return <Typography>Loading products...</Typography>;
    }

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Products</Title>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                >
                    Add Product
                </Button>
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
        </React.Fragment>
    );
}
