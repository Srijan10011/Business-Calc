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
import AddCustomerModal from '../components/customers/AddCustomerModal'; // Import the new modal

// Generate Customer Data
function createData(
  id: string,
  name: string,
  phone: string,
  address: string, // Added address
  totalPurchases: string,
  outstandingCredit: string,
  lastPurchase: string,
) {
  return { id, name, phone, address, totalPurchases, outstandingCredit, lastPurchase };
}

const rows = [
  createData(
    'cust-001',
    'John Smith',
    '+1 123 456 7890',
    '123 Main St, Anytown', // Placeholder address
    '₹25,000',
    '₹5,000',
    '13 Jan, 2026',
  ),
  createData(
    'cust-002',
    'Jane Doe',
    '+1 987 654 3210',
    '456 Oak Ave, Somewhere', // Placeholder address
    '₹15,000',
    '₹0',
    '10 Jan, 2026',
  ),
  createData(
    'cust-003',
    'ACME Corp',
    '+1 555 123 4567',
    '789 Pine Ln, Nowhere', // Placeholder address
    '₹125,000',
    '₹10,000',
    '05 Jan, 2026',
  ),
  createData(
    'cust-004',
    'Tech Solutions',
    '+1 222 333 4444',
    '101 Elm Blvd, Anyplace', // Placeholder address
    '₹80,000',
    '₹2,000',
    '01 Jan, 2026',
  ),
];

export default function Customers() {
  const [open, setOpen] = React.useState(false); // For Add Customer Modal

  const handleOpen = () => {
      setOpen(true);
  };

  const handleClose = () => {
      setOpen(false);
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
              <TableCell>Address</TableCell> {/* New Address Column */}
              <TableCell>Total Purchases</TableCell>
              <TableCell>Outstanding Credit</TableCell>
              <TableCell>Last Purchase</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                    <RouterLink to={`/customers/${row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {row.name}
                    </RouterLink>
                </TableCell>
                <TableCell>{row.phone}</TableCell>
                <TableCell>{row.address}</TableCell> {/* Display Address */}
                <TableCell>{row.totalPurchases}</TableCell>
                <TableCell>{row.outstandingCredit}</TableCell>
                <TableCell>{row.lastPurchase}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <AddCustomerModal open={open} onClose={handleClose} /> {/* Integrate the modal */}
    </React.Fragment>
  );
}
