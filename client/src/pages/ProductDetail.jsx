import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Paper, Box, IconButton, Typography, Grid, TextField, Button } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import Title from '../components/dashboard/Title';
import COGSEditor from '../components/products/COGSEditor';

const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    
    const [product, setProduct] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    
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
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setProduct(data);
                setName(data.name);
                setPrice(data.price);
                setStock(data.stock);
            } else {
                console.error('Failed to fetch product');
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBasicInfo = () => {
        console.log('Saving Basic Info:', { name });
        setIsBasicInfoEditing(false);
    };

    const handleCancelBasicInfo = () => {
        setName(product?.name || '');
        setIsBasicInfoEditing(false);
    };

    const handleSaveInventory = () => {
        console.log('Saving Inventory Info:', { price, stock });
        setIsInventoryEditing(false);
    };

    const handleCancelInventory = () => {
        setPrice(product?.price || 0);
        setStock(product?.stock || 0);
        setIsInventoryEditing(false);
    };

    if (loading) {
        return <Typography>Loading product...</Typography>;
    }

    if (!product) {
        return <Typography>Product not found</Typography>;
    }

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h4" component="h1">
                    {name} (ID: {productId})
                </Typography>
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
    );
};

export default ProductDetail;
