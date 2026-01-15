import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Paper, Box, IconButton, Typography, Grid, TextField, Button } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import Title from '../components/dashboard/Title'; // Reusing Title component
import CostAllocationEditor from '../components/products/CostAllocationEditor';
const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    // Placeholder data for a product
    const productData = {
        id: productId,
        name: 'Product A',
        price: 250,
        profitMargin: 20,
        stock: 120,
    };
    // State for basic info
    const [name, setName] = React.useState(productData.name);
    const [isBasicInfoEditing, setIsBasicInfoEditing] = React.useState(false);
    // State for inventory info
    const [price, setPrice] = React.useState(productData.price);
    const [profitMargin, setProfitMargin] = React.useState(productData.profitMargin);
    const [stock, setStock] = React.useState(productData.stock);
    const [isInventoryEditing, setIsInventoryEditing] = React.useState(false);
    const handleSaveBasicInfo = () => {
        console.log('Saving Basic Info:', { name });
        // In a real application, you would make an API call here to save the data
        setIsBasicInfoEditing(false);
    };
    const handleCancelBasicInfo = () => {
        // Reset to original values if cancelled
        setName(productData.name);
        setIsBasicInfoEditing(false);
    };
    const handleSaveInventory = () => {
        console.log('Saving Inventory Info:', { price, profitMargin, stock });
        // In a real application, you would make an API call here to save the data
        setIsInventoryEditing(false);
    };
    const handleCancelInventory = () => {
        // Reset to original values if cancelled
        setPrice(productData.price);
        setProfitMargin(productData.profitMargin);
        setStock(productData.stock);
        setIsInventoryEditing(false);
    };
    return (<Paper sx={{ p: 3, mb: 3 }}>
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
                        <TextField label="Product Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth margin="normal" InputProps={{ readOnly: !isBasicInfoEditing }}/>
                        {!isBasicInfoEditing ? (<Button variant="outlined" sx={{ mt: 2 }} onClick={() => setIsBasicInfoEditing(true)}>
                                Edit Basic Info
                            </Button>) : (<Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button variant="contained" onClick={handleSaveBasicInfo}>
                                    Save
                                </Button>
                                <Button variant="outlined" onClick={handleCancelBasicInfo}>
                                    Cancel
                                </Button>
                            </Box>)}
                    </Paper>
                </Grid>

                {/* Inventory Info */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Title>Inventory Info</Title>
                        <TextField label="Price (₹)" value={price} onChange={(e) => setPrice(Number(e.target.value))} fullWidth margin="normal" type="number" InputProps={{ readOnly: !isInventoryEditing }}/>
                        <TextField label="Profit Margin (%)" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))} fullWidth margin="normal" type="number" InputProps={{ readOnly: !isInventoryEditing }}/>
                        <TextField label="Stock" value={stock} onChange={(e) => setStock(Number(e.target.value))} fullWidth margin="normal" type="number" InputProps={{ readOnly: !isInventoryEditing }}/>
                        {!isInventoryEditing ? (<Button variant="outlined" sx={{ mt: 2 }} onClick={() => setIsInventoryEditing(true)}>
                                Adjust Inventory
                            </Button>) : (<Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button variant="contained" onClick={handleSaveInventory}>
                                    Save
                                </Button>
                                <Button variant="outlined" onClick={handleCancelInventory}>
                                    Cancel
                                </Button>
                            </Box>)}
                    </Paper>
                </Grid>

                {/* Cost Allocation Editor */}
                <Grid item xs={12}>
                    <CostAllocationEditor />
                </Grid>
            </Grid>
        </Paper>);
};

export default ProductDetail;
