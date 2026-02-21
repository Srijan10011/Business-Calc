import * as React from 'react';
import { Box, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import { Link } from 'react-router-dom';
import AddCustomerModal from '../components/customers/AddCustomerModal';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

function Customers() {
    const { showSnackbar } = useSnackbar();
    const [open, setOpen] = React.useState(false);
    const [customers, setCustomers] = React.useState([]);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch customers. Please try again.', 'error');
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
                <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
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
                                    <Link to={`/customers/${row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        {row.name}
                                    </Link>
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
            <AddCustomerModal open={open} onClose={handleClose}/>
        </React.Fragment>
    );
}

export default Customers;