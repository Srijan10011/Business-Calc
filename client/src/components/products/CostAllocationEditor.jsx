import React, { useState } from 'react';
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Button, IconButton, Grid, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Title from '../dashboard/Title'; // Reusing Title component

function CostAllocationEditor() {
    const [rules, setRules] = useState([
        { id: 1, category: 'Raw Material', type: 'monthly_fixed', mode: 'percentage', value: 30 },
        { id: 2, category: 'Labor', type: 'one_time', mode: 'fixed', value: 50 },
    ]);
    const [nextId, setNextId] = useState(3);

    const handleAddRule = async () => {
        try {
            const token = localStorage.getItem('token');
            const productId = window.location.pathname.split('/').pop(); // Get product ID from URL

            // Create new rule with empty values
            const newRule = { id: nextId, category: '', type: '', mode: 'percentage', value: '' };
            setRules([...rules, newRule]);
            setNextId(nextId + 1);
        } catch (error) {
            console.error('Error adding rule:', error);
        }
    };

    const handleSaveRule = async (rule) => {
        try {
            const token = localStorage.getItem('token');
            const productId = window.location.pathname.split('/').pop();

            if (!rule.category || !rule.type || !rule.value) {
                console.error('Missing required fields');
                return;
            }

            // Step 1: Check if category exists
            let checkResponse = await fetch(`http://localhost:5000/api/categories/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || '',
                },
                body: JSON.stringify({
                    name: rule.category,
                    cost_behaviour: rule.type
                }),
            });

            let checkData = await checkResponse.json();
            let categoryId;

            if (checkData.exists) {
                // Category exists, show error that rule is already defined
                alert('This rule is already defined for this product');
                return;
            } else {
                // Category doesn't exist, create it
                let createResponse = await fetch(`http://localhost:5000/api/categories`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token || '',
                    },
                    body: JSON.stringify({
                        name: rule.category,
                        cost_behaviour: rule.type,
                        type: 'outgoing'
                    }),
                });

                let createData = await createResponse.json();
                categoryId = createData.id;

                // Step 2: Save to product_cost_rules table
                const ruleResponse = await fetch(`http://localhost:5000/api/product-cost-rules`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token || '',
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        category_id: categoryId,
                        mode: rule.mode === 'percentage' ? 'percent' : 'fixed',
                        value: parseFloat(rule.value.toString())
                    }),
                });

                if (ruleResponse.ok) {
                    alert('Allocation updated successfully!');
                    console.log('Cost rule saved successfully');
                } else {
                    alert('Failed to update allocation');
                    console.error('Failed to save cost rule');
                }
            }
        } catch (error) {
            console.error('Error saving rule:', error);
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

    // Placeholder for live total allocation calculation
    const allocatedPercentage = 24; // Static for now
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