import React, { useState } from 'react';
import { useSnackbar } from '../../context/SnackbarContext';
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Button, IconButton, Grid, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Title from '../dashboard/Title';
import api from '../../utils/api';

function CostAllocationEditor() {
    const { showSnackbar } = useSnackbar();
    const [rules, setRules] = useState([
        { id: 1, category: 'Raw Material', type: 'monthly_fixed', mode: 'percentage', value: 30 },
        { id: 2, category: 'Labor', type: 'one_time', mode: 'fixed', value: 50 },
    ]);
    const [nextId, setNextId] = useState(3);

    const handleAddRule = async () => {
        try {
            const productId = window.location.pathname.split('/').pop();
            const newRule = { id: nextId, category: '', type: '', mode: 'percentage', value: '' };
            setRules([...rules, newRule]);
            setNextId(nextId + 1);
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to add rule. Please try again.', 'error');
        }
    };

    const handleSaveRule = async (rule) => {
        try {
            const productId = window.location.pathname.split('/').pop();

            if (!rule.category || !rule.type || !rule.value) {
                showSnackbar('Please fill in all required fields', 'warning');
                return;
            }

            // Check if category exists
            const checkResponse = await api.post('/categories/check', {
                name: rule.category,
                cost_behaviour: rule.type,
                product_id: productId
            });

            if (checkResponse.data.exists) {
                showSnackbar('This rule is already defined for this product', 'warning');
                return;
            }

            // Create category
            const createResponse = await api.post('/categories', {
                name: rule.category,
                cost_behaviour: rule.type,
                type: 'outgoing',
                product_id: productId
            });

            const categoryId = createResponse.data.id;

            // Save to product_cost_rules
            await api.post('/product-cost-rules', {
                product_id: productId,
                category_id: categoryId,
                mode: rule.mode === 'percentage' ? 'percent' : 'fixed',
                value: parseFloat(rule.value.toString())
            });

            showSnackbar('Allocation updated successfully!', 'success');
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to save rule. Please try again.', 'error');
        }
    };

    const handleRemoveRule = (id) => {
        setRules(rules.filter(rule => rule.id !== id));
    };

    const handleRuleChange = (id, field, value) => {
        setRules(rules.map(rule => 
            rule.id === id ? { ...rule, [field]: value } : rule
        ));
    };

    const allocatedPercentage = 24;
    const remainingPercentage = 100 - allocatedPercentage;

    return (
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Title>Cost Allocation Editor</Title>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Mode</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rules.map((rule) => (
                        <TableRow key={rule.id}>
                            <TableCell>
                                <FormControl variant="standard" sx={{ minWidth: 120 }}>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={rule.category}
                                        onChange={(e) => handleRuleChange(rule.id, 'category', e.target.value)}
                                        label="Category"
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="Raw Material">Raw Material</MenuItem>
                                        <MenuItem value="Labor">Labor</MenuItem>
                                        <MenuItem value="Utilities">Utilities</MenuItem>
                                        <MenuItem value="Machinery">Machinery</MenuItem>
                                    </Select>
                                </FormControl>
                            </TableCell>
                            <TableCell>
                                <FormControl variant="standard" sx={{ minWidth: 120 }}>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={rule.type}
                                        onChange={(e) => handleRuleChange(rule.id, 'type', e.target.value)}
                                        label="Type"
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        <MenuItem value="monthly_fixed">Monthly Fixed</MenuItem>
                                        <MenuItem value="one_time">One Time</MenuItem>
                                        <MenuItem value="variable">Variable</MenuItem>
                                    </Select>
                                </FormControl>
                            </TableCell>
                            <TableCell>
                                <FormControl variant="standard" sx={{ minWidth: 120 }}>
                                    <InputLabel>Mode</InputLabel>
                                    <Select
                                        value={rule.mode}
                                        onChange={(e) => handleRuleChange(rule.id, 'mode', e.target.value)}
                                        label="Mode"
                                    >
                                        <MenuItem value="percentage">%</MenuItem>
                                        <MenuItem value="fixed">Rs</MenuItem>
                                    </Select>
                                </FormControl>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    variant="standard"
                                    type="number"
                                    value={rule.value}
                                    onChange={(e) => handleRuleChange(rule.id, 'value', e.target.value)}
                                    InputProps={{
                                        startAdornment: rule.mode === 'fixed' ? <Typography>₹</Typography> : null,
                                        endAdornment: rule.mode === 'percentage' ? <Typography>%</Typography> : null,
                                    }}
                                />
                            </TableCell>
                            <TableCell align="right">
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleSaveRule(rule)}
                                    sx={{ mr: 1 }}
                                >
                                    Save
                                </Button>
                                <IconButton
                                    onClick={() => handleRemoveRule(rule.id)}
                                    color="error"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Button
                startIcon={<AddIcon />}
                onClick={handleAddRule}
                sx={{ mt: 2, mb: 2, alignSelf: 'flex-start' }}
            >
                Add Rule
            </Button>
            <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
                <Grid item>
                    <Typography variant="body1">
                        Allocated: <Box component="span" fontWeight="bold">{allocatedPercentage}%</Box>
                    </Typography>
                </Grid>
                <Grid item sx={{ ml: 2 }}>
                    <Typography variant="body1">
                        Remaining: <Box component="span" fontWeight="bold">{remainingPercentage}%</Box>
                    </Typography>
                </Grid>
            </Grid>
        </Paper>
    );
}

export default CostAllocationEditor;
