import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Paper, Box, IconButton, Typography, Grid, TextField, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import Title from '../components/dashboard/Title';
import COGSEditor from '../components/products/COGSEditor';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    
    const [product, setProduct] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    
    // State for basic info
    const [name, setName] = React.useState('');
    const [isBasicInfoEditing, setIsBasicInfoEditing] = React.useState(false);
    
    // State for inventory info
    const [price, setPrice] = React.useState(0);
    const [stock, setStock] = React.useState(0);
    const [isInventoryEditing, setIsInventoryEditing] = React.useState(false);

    React.useEffect(() => {
        fetchProduct();
    }, [productId]);

    const fetchProduct = async () => {
        try {
            const response = await api.get(`/products/${productId}`);
            setProduct(response.data);
            setName(response.data.name);
            setPrice(response.data.price);
            setStock(response.data.stock);
        } catch (error) {
            if (error.response?.status === 404) {
                navigate('/products');
            } else {
                showSnackbar('Failed to fetch product details. Please try again.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBasicInfo = () => {
        setIsBasicInfoEditing(false);
    };

    const handleCancelBasicInfo = () => {
        setName(product?.name || '');
        setIsBasicInfoEditing(false);
    };

    const handleSaveInventory = () => {
        setIsInventoryEditing(false);
    };

    const handleCancelInventory = () => {
        setPrice(product?.price || 0);
        setStock(product?.stock || 0);
        setIsInventoryEditing(false);
    };

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await api.delete(`/products/${productId}`);
            showSnackbar('Product deleted successfully', 'success');
            navigate('/products');
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to delete product. Please try again.', 'error');
        }
        setDeleteDialogOpen(false);
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
    };

    if (loading) {
        return <Typography>Loading product...</Typography>;
    }

    if (!product) {
        return <Typography>Product not found</Typography>;
    }

    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                            {name} (ID: {productId})
                        </Typography>
                    </Box>
                    <IconButton color="error" onClick={handleDeleteClick}>
                        <DeleteIcon />
                    </IconButton>
                </Box>

            <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Title>Basic Info</Title>
                        <TextField 
                            label="Product Name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            fullWidth 
                            margin="normal" 
                            InputProps={{ readOnly: !isBasicInfoEditing }}
                        />
                        {!isBasicInfoEditing ? (
                            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setIsBasicInfoEditing(true)}>
                                Edit Basic Info
                            </Button>
                        ) : (
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button variant="contained" onClick={handleSaveBasicInfo}>
                                    Save
                                </Button>
                                <Button variant="outlined" onClick={handleCancelBasicInfo}>
                                    Cancel
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Inventory Info */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Title>Inventory Info</Title>
                        <TextField 
                            label="Price (₹)" 
                            value={price} 
                            onChange={(e) => setPrice(Number(e.target.value))} 
                            fullWidth 
                            margin="normal" 
                            type="number" 
                            InputProps={{ readOnly: !isInventoryEditing }}
                        />
                        <TextField 
                            label="Stock" 
                            value={stock} 
                            onChange={(e) => setStock(Number(e.target.value))} 
                            fullWidth 
                            margin="normal" 
                            type="number" 
                            InputProps={{ readOnly: !isInventoryEditing }}
                        />
                        {!isInventoryEditing ? (
                            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setIsInventoryEditing(true)}>
                                Adjust Inventory
                            </Button>
                        ) : (
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button variant="contained" onClick={handleSaveInventory}>
                                    Save
                                </Button>
                                <Button variant="outlined" onClick={handleCancelInventory}>
                                    Cancel
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* COGS Editor */}
                <Grid item xs={12}>
                    <COGSEditor productId={productId} />
                </Grid>
            </Grid>
        </Paper>

        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to remove "{name}" from your business? This action will archive the product and its sales history.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDeleteCancel}>Cancel</Button>
                <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    </>
    );
};

export default ProductDetail;
