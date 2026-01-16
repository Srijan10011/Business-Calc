import * as React from 'react';
import {
    Grid,
    Paper,
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import Title from '../components/dashboard/Title';
import axios from 'axios';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    OK: 'success',
    LOW: 'warning',
    OUT: 'error',
};

export default function Inventory() {
    const [items, setItems] = React.useState<any[]>([]);
    const [addDialog, setAddDialog] = React.useState(false);
    const [name, setName] = React.useState('');
    const [stock, setStock] = React.useState('');
    const [unitCost, setUnitCost] = React.useState('');
    const [type, setType] = React.useState('raw_material');

    React.useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/inventory', {
                headers: { 'x-auth-token': token }
            });
            setItems(response.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const handleAddItem = () => {
        setName('');
        setStock('');
        setUnitCost('');
        setType('raw_material');
        setAddDialog(true);
    };

    const handleSaveItem = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/inventory', {
                name,
                stock: parseInt(stock),
                unit_cost: parseFloat(unitCost),
                type
            }, {
                headers: { 'x-auth-token': token }
            });
            setAddDialog(false);
            fetchItems();
        } catch (error) {
            console.error('Error adding inventory item:', error);
        }
    };

    const handleStockIn = () => {
        console.log("Stock In clicked");
    };

    const handleStockOut = () => {
        console.log("Stock Out clicked");
    };

    const handleView = (id: string) => {
        console.log(`View item ${id}`);
    };

    const handleRestock = (id: string) => {
        console.log(`Restock item ${id}`);
    };

    const getStatus = (stock: number) => {
        if (stock === 0) return 'OUT';
        if (stock < 10) return 'LOW';
        return 'OK';
    };

    const totalItems = items.length;
    const lowStockItems = items.filter(item => getStatus(item.stock) === 'LOW').length;
    const totalValue = items.reduce((sum, item) => sum + (item.stock * item.unit_cost), 0);

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
        >
          Add Item
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowUpwardIcon />}
          onClick={handleStockIn}
        >
          Stock In
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowDownwardIcon />}
          onClick={handleStockOut}
        >
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
              <TableCell>Type</TableCell>
              <TableCell>Unit Cost</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const status = getStatus(item.stock);
              return (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.stock}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>₹{item.unit_cost.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                    <Chip label={status} color={statusColors[status]} size="small"/>
                </TableCell>
                <TableCell>
                    <Button onClick={() => handleView(item.id)} size="small" startIcon={<VisibilityIcon />}>View</Button>
                    {status !== 'OK' && (
                         <Button onClick={() => handleRestock(item.id)} size="small" startIcon={<RefreshIcon />} sx={{ml:1}}>Restock</Button>
                    )}
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={addDialog} onClose={() => setAddDialog(false)}>
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Stock"
            type="number"
            fullWidth
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Unit Cost"
            type="number"
            fullWidth
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
          <TextField
            select
            margin="dense"
            label="Type"
            fullWidth
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <MenuItem value="raw_material">Raw Material</MenuItem>
            <MenuItem value="product">Product</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
