import * as React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Button,
    Box,
    Typography,
    Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import { Link as RouterLink } from 'react-router-dom';
import AddCustomerModal from '../components/customers/AddCustomerModal';
import axios from 'axios';

export default function Customers() {
  const [open, setOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState([]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/customers', {
        headers: { 'x-auth-token': token }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpen = () => {
      setOpen(true);
  };

  const handleClose = () => {
      setOpen(false);
      fetchCustomers();
  };

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Title>Customers</Title>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Add Customer
        </Button>
      </Box>
      <Paper>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Total Purchases</TableCell>
              <TableCell>Outstanding Credit</TableCell>
              <TableCell>Last Purchase</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                    <RouterLink to={`/customers/${row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {row.name}
                    </RouterLink>
                </TableCell>
                <TableCell>{row.phone}</TableCell>
                <TableCell>{row.address}</TableCell>
                <TableCell>₹{row.total_purchases}</TableCell>
                <TableCell>₹{row.outstanding_credit}</TableCell>
                <TableCell>{row.last_purchase ? new Date(row.last_purchase).toLocaleDateString() : 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <AddCustomerModal open={open} onClose={handleClose} />
    </React.Fragment>
  );
}
