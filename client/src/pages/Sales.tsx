import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Button,
    Box,
    Paper,
    Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import AddSaleModal from '../components/sales/AddSaleModal';
import axios from 'axios';

const statusColors: Record<string, 'success' | 'warning'> = {
    Paid: 'success',
    Pending: 'warning',
}

export default function Sales() {
    const [open, setOpen] = React.useState(false);
    const [sales, setSales] = React.useState([]);

    const fetchSales = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/sales', {
                headers: { 'x-auth-token': token }
            });
            setSales(response.data);
        } catch (error) {
            console.error('Error fetching sales:', error);
        }
    };

    React.useEffect(() => {
        fetchSales();
    }, []);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        fetchSales();
    };

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Title>Recent Sales</Title>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Add Sale
        </Button>
      </Box>
      <Paper>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Payment Type</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>{row.product}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>₹{row.total}</TableCell>
                <TableCell>{row.payment_type}</TableCell>
                <TableCell>
                    <Chip label={row.status} color={statusColors[row.status]} size="small"/>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <AddSaleModal open={open} onClose={handleClose} />
    </React.Fragment>
  );
}
