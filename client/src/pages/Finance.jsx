import * as React from 'react';
import { Grid, Paper, Typography, Box, TextField, FormControl, InputLabel, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import Title from '../components/dashboard/Title';

// Generate Transaction Data
function createData(id, date, description, category, amount, account) {
    return { id, date, description, category, amount, account };
}

const transactions = [
    createData('trn-001', '13 Jan, 2026', 'Salary for Jan', 'Income', 50000, 'Bank Account'),
    createData('trn-002', '12 Jan, 2026', 'Raw Material Purchase', 'Expense', -25000, 'Cash Account'),
    createData('trn-003', '10 Jan, 2026', 'Electricity Bill', 'Expense', -2000, 'Bank Account'),
    createData('trn-004', '08 Jan, 2026', 'Client Payment', 'Income', 15000, 'Invoice'),
    createData('trn-005', '05 Jan, 2026', 'Rent Payment', 'Expense', -10000, 'Bank Account'),
];

const getAccountDisplayName = (type) => {
    switch (type) {
        case 'cash': return 'Cash Account';
        case 'bank': return 'Bank Account';
        case 'credit': return 'Funds on Hold';
        case 'debit': return 'Invoice';
        default: return type;
    }
};

function Finance() {
    const [typeFilter, setTypeFilter] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('');
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [accounts, setAccounts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/accounts', {
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setAccounts(data);
            } else {
                console.error('Failed to fetch accounts');
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAccounts();
    }, []);

    if (loading) {
        return <Typography>Loading accounts...</Typography>;
    }

    return (
        <React.Fragment>
            {/* Accounts Section */}
            <Title>Accounts Overview</Title>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {accounts.map((account) => (
                    <Grid item xs={12} md={3} key={account.id}>
                        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6">{getAccountDisplayName(account.type)}</Typography>
                            <Typography variant="h4">₹{account.balance.toLocaleString('en-IN')}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Transactions Table */}
            <Title>Transactions</Title>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <TextField
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{ minWidth: 150 }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                        sx={{ minWidth: 150 }}
                    />
                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="type-filter-label">Type</InputLabel>
                        <Select
                            labelId="type-filter-label"
                            value={typeFilter}
                            label="Type"
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <MenuItem value=""><em>All</em></MenuItem>
                            <MenuItem value="Income">Income</MenuItem>
                            <MenuItem value="Expense">Expense</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="category-filter-label">Category</InputLabel>
                        <Select
                            labelId="category-filter-label"
                            value={categoryFilter}
                            label="Category"
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <MenuItem value=""><em>All</em></MenuItem>
                            <MenuItem value="Salary">Salary</MenuItem>
                            <MenuItem value="Raw Material">Raw Material</MenuItem>
                            <MenuItem value="Utilities">Utilities</MenuItem>
                            <MenuItem value="Rent">Rent</MenuItem>
                            <MenuItem value="Client Payment">Client Payment</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Table size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Account</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>{transaction.date}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>{transaction.category}</TableCell>
                                <TableCell align="right">
                                    <Typography color={transaction.amount > 0 ? 'green' : 'error'}>
                                        ₹{transaction.amount.toLocaleString('en-IN')}
                                    </Typography>
                                </TableCell>
                                <TableCell>{transaction.account}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </React.Fragment>
    );
}

export default Finance;