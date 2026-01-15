import * as React from 'react';
import { Box, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import AddSaleModal from '../components/sales/AddSaleModal';

// Generate Order Data
function createData(id, date, invoiceNo, customer, product, quantity, total, paymentType, status) {
    return { id, date, invoiceNo, customer, product, quantity, total, paymentType, status };
}

const rows = [
    createData(0, '13 Jan, 2026', 'INV-12345', 'John Smith', 'Product A', 5, '₹5,000', 'Bank', 'Paid'),
    createData(1, '13 Jan, 2026', 'INV-12346', 'Jane Doe', 'Product B', 2, '₹2,400', 'Cash', 'Paid'),
    createData(2, '12 Jan, 2026', 'INV-12347', 'ACME Corp', 'Product C', 10, '₹15,000', 'Credit', 'Pending'),
    createData(3, '11 Jan, 2026', 'INV-12348', 'Tech Solutions', 'Product A', 8, '₹8,000', 'Bank', 'Paid'),
    createData(4, '10 Jan, 2026', 'INV-12349', 'John Smith', 'Product D', 1, '₹1,200', 'Credit', 'Overdue'),
];

const statusColors = {
    Paid: 'success',
    Pending: 'warning',
    Overdue: 'error',
};

function Sales() {
    const [open, setOpen] = React.useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Recent Sales</Title>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
                    Add Sale
                </Button>
            </Box>
            <Paper>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Invoice No</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Total</TableCell>
                            <TableCell>Payment Type</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.date}</TableCell>
                                <TableCell>{row.invoiceNo}</TableCell>
                                <TableCell>{row.customer}</TableCell>
                                <TableCell>{row.product}</TableCell>
                                <TableCell>{row.quantity}</TableCell>
                                <TableCell>{row.total}</TableCell>
                                <TableCell>{row.paymentType}</TableCell>
                                <TableCell>
                                    <Chip label={row.status} color={statusColors[row.status]} size="small"/>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
            <AddSaleModal open={open} onClose={handleClose}/>
        </React.Fragment>
    );
}

export default Sales;