import React, { useState, useEffect } from 'react';
import { 
    Paper, 
    Table, 
    TableHead, 
    TableRow, 
    TableCell, 
    TableBody, 
    TextField, 
    Typography, 
    Button, 
    IconButton, 
    MenuItem,
    Box,
    Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Title from '../dashboard/Title';
import { useSnackbar } from '../../context/SnackbarContext';
import api from '../../utils/api';

function COGSEditor({ productId }) {
    const { showSnackbar } = useSnackbar();
    const [allocations, setAllocations] = useState([]);
    const [existingCategories, setExistingCategories] = useState([]);
    const [newAllocation, setNewAllocation] = useState({
        category: '',
        type: 'variable',
        value: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllocations();
        fetchExistingCategories();
    }, [productId]);

    const fetchAllocations = async () => {
        try {
            const response = await api.get(`/cogs/product/${productId}/allocations`);
            setAllocations(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch allocations. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingCategories = async () => {
        try {
            const response = await api.get('/cogs/categories');
            const categoriesWithSalary = ['Salary', ...response.data.filter(cat => cat !== 'Salary')];
            setExistingCategories(categoriesWithSalary);
        } catch (error) {
            showSnackbar('Failed to fetch categories. Please try again.', 'error');
            setExistingCategories(['Salary']);
        }
    };

    const handleAddAllocation = async () => {
        if (!newAllocation.category || !newAllocation.value) {
            showSnackbar('Please fill in all fields', 'warning');
            return;
        }

        try {
            await api.post('/cogs/cost-category', {
                category: newAllocation.category,
                type: newAllocation.type,
                value: parseFloat(newAllocation.value),
                product_id: productId
            });
            setNewAllocation({ category: '', type: 'variable', value: '' });
            fetchAllocations();
            fetchExistingCategories();
            showSnackbar('Cost category added successfully!', 'success');
        } catch (error) {
            showSnackbar(`Failed to add cost category: ${error.response?.data?.message || error.message}`, 'error');
        }
    };

    const handleDeleteAllocation = async (allocationId) => {
        try {
            await api.delete(`/cogs/allocation/${allocationId}`);
            fetchAllocations();
            showSnackbar('Cost allocation deleted successfully!', 'success');
        } catch (error) {
            showSnackbar('Error deleting cost allocation', 'error');
        }
        
    };

    if (loading) {
        return <Typography>Loading COGS data...</Typography>;
    }

    return (
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Title>COGS (Cost of Goods Sold)</Title>
            
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {allocations.map((allocation) => (
                        <TableRow key={allocation.allocation_id}>
                            <TableCell>{allocation.category}</TableCell>
                            <TableCell>
                                <Typography 
                                    sx={{ 
                                        textTransform: 'capitalize',
                                        color: allocation.type === 'variable' ? 'primary.main' : 'secondary.main'
                                    }}
                                >
                                    {allocation.type}
                                </Typography>
                            </TableCell>
                            <TableCell>₹{allocation.value}</TableCell>
                            <TableCell align="right">
                                <IconButton
                                    onClick={() => handleDeleteAllocation(allocation.allocation_id)}
                                    color="error"
                                    size="small"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    
                    {/* Add new allocation row */}
                    <TableRow>
                        <TableCell>
                            <Autocomplete
                                freeSolo
                                size="small"
                                options={existingCategories}
                                value={newAllocation.category}
                                onChange={(event, newValue) => {
                                    setNewAllocation({...newAllocation, category: newValue || ''});
                                }}
                                onInputChange={(event, newInputValue) => {
                                    setNewAllocation({...newAllocation, category: newInputValue});
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Select or enter category"
                                        variant="outlined"
                                        size="small"
                                    />
                                )}
                                sx={{ minWidth: 200 }}
                            />
                        </TableCell>
                        <TableCell>
                            <TextField
                                select
                                size="small"
                                value={newAllocation.type}
                                onChange={(e) => setNewAllocation({...newAllocation, type: e.target.value})}
                                fullWidth
                            >
                                <MenuItem value="variable">Variable</MenuItem>
                                <MenuItem value="fixed">Fixed</MenuItem>
                            </TextField>
                        </TableCell>
                        <TableCell>
                            <TextField
                                size="small"
                                type="number"
                                placeholder="Amount in ₹"
                                value={newAllocation.value}
                                onChange={(e) => setNewAllocation({...newAllocation, value: e.target.value})}
                                fullWidth
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>
                                }}
                            />
                        </TableCell>
                        <TableCell align="right">
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddAllocation}
                            >
                                Add
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {allocations.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">
                        No cost categories defined yet. Add your first cost category above.
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}

export default COGSEditor;
