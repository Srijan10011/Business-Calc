import * as React from 'react';
import { Box, Button, Grid, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import Visibility from '@mui/icons-material/Visibility';
import Refresh from '@mui/icons-material/Refresh';
import Title from '../components/dashboard/Title'; // Reusing Title component

// Generate Inventory Data
function createData(id, item, stock, unit, cost, status) {
    return { id, item, stock, unit, cost, status };
}

const rows = [
    createData('item-001', 'Grain A', 120, 'kg', 25, 'OK'),
    createData('item-002', 'Gas', 3, 'cyl', 900, 'LOW'),
    createData('item-003', 'Powder B', 0, 'kg', 40, 'OUT'),
    createData('item-004', 'Item C', 50, 'pcs', 10, 'OK'),
    createData('item-005', 'Item D', 10, 'units', 150, 'LOW'),
];

const statusColors = {
    OK: 'success',
    LOW: 'warning',
    OUT: 'error',
};

function Inventory() {
    const handleAddItem = () => {
        console.log("Add Item clicked");
        // Future: Open Add Item Modal
    };

    const handleStockIn = () => {
        console.log("Stock In clicked");
        // Future: Open Stock In Modal
    };

    const handleStockOut = () => {
        console.log("Stock Out clicked");
        // Future: Open Stock Out Modal
    };

    const handleView = (id) => {
        console.log(`View item ${id}`);
        // Future: Redirect to item detail page or open view modal
    };

    const handleRestock = (id) => {
        console.log(`Restock item ${id}`);
        // Future: Open restock modal
    };

    const totalItems = rows.length;
    const lowStockItems = rows.filter(row => row.status === 'LOW').length;
    const totalValue = rows.reduce((sum, row) => sum + (row.stock * row.cost), 0);

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mb: 3 }}>
                <Button variant="contained" startIcon={<Add />} onClick={handleAddItem}>
                    Add Item
                </Button>
                <Button variant="outlined" startIcon={<ArrowUpward />} onClick={handleStockIn}>
                    Stock In
                </Button>
                <Button variant="outlined" startIcon={<ArrowDownward />} onClick={handleStockOut}>
                    Stock Out
                </Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Title>Summary</Title>
                        <Typography variant="h6">Total Items: {totalItems}</Typography>
                        <Typography variant="h6" color="warning.main">Low Stock: {lowStockItems}</Typography>
                        <Typography variant="h6">Value: ₹{totalValue.toLocaleString('en-IN')}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Title>Inventory List</Title>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Stock</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Cost</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.item}</TableCell>
                                <TableCell>{row.stock}</TableCell>
                                <TableCell>{row.unit}</TableCell>
                                <TableCell>₹{row.cost.toLocaleString('en-IN')}</TableCell>
                                <TableCell>
                                    <Chip label={row.status} color={statusColors[row.status]} size="small"/>
                                </TableCell>
                                <TableCell>
                                    <Button onClick={() => handleView(row.id)} size="small" startIcon={<Visibility />}>View</Button>
                                    {row.status !== 'OK' && ( // Show restock only if not OK
                                        <Button onClick={() => handleRestock(row.id)} size="small" startIcon={<Refresh />} sx={{ ml: 1 }}>Restock</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </React.Fragment>
    );
}

export default Inventory;