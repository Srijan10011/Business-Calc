import * as React from 'react';
import {
    Grid,
    Paper,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import Title from '../components/dashboard/Title';

interface Account {
    id: string;
    type: string;
    balance: number;
    account_name: string;
}

interface Transaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    account: string;
}

export default function Finance() {
    const [typeFilter, setTypeFilter] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('');
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
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
        }
    };

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/accounts/transactions', {
                headers: {
                    'x-auth-token': token || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            } else {
                console.error('Failed to fetch transactions');
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAccounts();
        fetchTransactions();
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
                            <Typography variant="h6">{account.account_name}</Typography>
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
                            onChange={(e) => setTypeFilter(e.target.value as string)}
                        >
                            <MenuItem value=""><em>All</em></MenuItem>
                            <MenuItem value="Incomming">Incomming</MenuItem>
                            <MenuItem value="Outgoing">Outgoing</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="category-filter-label">Category</InputLabel>
                        <Select
                            labelId="category-filter-label"
                            value={categoryFilter}
                            label="Category"
                            onChange={(e) => setCategoryFilter(e.target.value as string)}
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
                                    <Typography color={transaction.category === 'Incomming' ? 'green' : 'error'}>
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
