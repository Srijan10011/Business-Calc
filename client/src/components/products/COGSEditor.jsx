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
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/cogs/product/${productId}/allocations`, {
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setAllocations(data);
            } else {
                console.error('Failed to fetch allocations');
                showSnackbar('Failed to fetch allocations', 'error');
            }
        } catch (error) {
            console.error('Error fetching allocations:', error);
            showSnackbar('Failed to fetch allocations. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/cogs/categories', {
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Add Salary as first option, then other categories
                const categoriesWithSalary = ['Salary', ...data.filter(cat => cat !== 'Salary')];
                setExistingCategories(categoriesWithSalary);
            } else {
                console.error('Failed to fetch categories');
                showSnackbar('Failed to fetch categories', 'error');
                // If API fails, at least show Salary as default option
                setExistingCategories(['Salary']);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            showSnackbar('Failed to fetch categories. Please try again.', 'error');
            // If API fails, at least show Salary as default option
            setExistingCategories(['Salary']);
        }
    };

    const handleAddAllocation = async () => {
        if (!newAllocation.category || !newAllocation.value) {
            showSnackbar('Please fill in all fields', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/cogs/cost-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || '',
                },
                body: JSON.stringify({
                    category: newAllocation.category,
                    type: newAllocation.type,
                    value: parseFloat(newAllocation.value),
                    product_id: productId
                }),
            });

            if (response.ok) {
                setNewAllocation({ category: '', type: 'variable', value: '' });
                fetchAllocations(); // Refresh the list
                fetchExistingCategories(); // Refresh categories if new one was added
                showSnackbar('Cost category added successfully!', 'success');
            } else {
                const error = await response.json();
                showSnackbar(`Failed to add cost category: ${error.message}`, 'error');
            }
        } catch (error) {
            console.error('Error adding allocation:', error);
            showSnackbar('Error adding cost category', 'error');
        }
    };

    const handleDeleteAllocation = async (allocationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/cogs/allocation/${allocationId}`, {
                method: 'DELETE',
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                fetchAllocations(); // Refresh the list
                showSnackbar('Cost allocation deleted successfully!', 'success');
            } else {
                showSnackbar('Failed to delete cost allocation', 'error');
            }
        } catch (error) {
            console.error('Error deleting allocation:', error);
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
