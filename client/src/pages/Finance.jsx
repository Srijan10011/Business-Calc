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
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import Title from '../components/dashboard/Title';
import axios from 'axios';

export default function Finance() {
    const [typeFilter, setTypeFilter] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('');
    const [startDate, setStartDate] = React.useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = React.useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [accounts, setAccounts] = React.useState([]);
    const [transactions, setTransactions] = React.useState([]);
    const [cogsData, setCogsData] = React.useState({ totalBalance: 0, categories: [] });
    const [loading, setLoading] = React.useState(true);
    const [transferOpen, setTransferOpen] = React.useState(false);
    const [fromAccount, setFromAccount] = React.useState('');
    const [toAccount, setToAccount] = React.useState('');
    const [transferAmount, setTransferAmount] = React.useState('');
    const [cogsTransferOpen, setCogsTransferOpen] = React.useState(false);
    const [cogsCategory, setCogsCategory] = React.useState('');
    const [cogsAccount, setCogsAccount] = React.useState('');
    const [cogsAmount, setCogsAmount] = React.useState('');
    const [cogsDirection, setCogsDirection] = React.useState('from-cogs');

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/accounts', {
                headers: { 'x-auth-token': token }
            });
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/accounts/transactions', {
                headers: { 'x-auth-token': token }
            });
            setTransactions(response.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCOGSData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/cogs/data', {
                headers: { 'x-auth-token': token }
            });
            setCogsData(response.data);
        } catch (error) {
            console.error('Error fetching COGS data:', error);
        }
    };

    const handleTransfer = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/accounts/transfer', {
                fromAccountId: fromAccount,
                toAccountId: toAccount,
                amount: parseFloat(transferAmount)
            }, {
                headers: { 'x-auth-token': token }
            });
            setTransferOpen(false);
            setFromAccount('');
            setToAccount('');
            setTransferAmount('');
            fetchAccounts(); // Refresh account balances
            fetchTransactions(); // Refresh transactions
        } catch (error) {
            console.error('Error transferring funds:', error);
        }
    };

    const handleCogsTransfer = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/accounts/transfer-cogs', {
                categoryId: cogsCategory,
                accountId: cogsAccount,
                amount: parseFloat(cogsAmount),
                direction: cogsDirection
            }, {
                headers: { 'x-auth-token': token }
            });
            setCogsTransferOpen(false);
            setCogsCategory('');
            setCogsAccount('');
            setCogsAmount('');
            fetchAccounts();
            fetchTransactions();
            fetchCOGSData();
        } catch (error) {
            console.error('Error transferring COGS:', error);
        }
    };

    React.useEffect(() => {
        fetchAccounts();
        fetchTransactions();
        fetchCOGSData();
    }, []);

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    return (
        <React.Fragment>
            {/* Accounts Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Accounts Overview</Title>
                <Button variant="contained" onClick={() => setTransferOpen(true)}>
                    Transfer Funds
                </Button>
            </Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {['Bank Account', 'Cash Account', 'Debit Account', 'Credit Account'].map((accountType) => {
                    const account = accounts.find(acc => acc.account_name === accountType);
                    return (
                        <Grid item xs={12} md={3} key={accountType}>
                            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h6">{accountType}</Typography>
                                <Typography variant="h4">₹{account ? account.balance.toLocaleString('en-IN') : '0'}</Typography>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>

            {/* COGS Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Cost of Goods Sold (COGS)</Title>
                <Button variant="outlined" onClick={() => setCogsTransferOpen(true)}>
                    COGS Transfer
                </Button>
            </Box>
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    COGS Balance: ₹{cogsData.totalBalance.toLocaleString('en-IN')}
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cogsData.categories.map((category, index) => (
                            <TableRow key={index}>
                                <TableCell>{category.category_name}</TableCell>
                                <TableCell align="right">₹{parseFloat(category.balance).toLocaleString('en-IN')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

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
                            <MenuItem value="Incomming">Incomming</MenuItem>
                            <MenuItem value="Outgoing">Outgoing</MenuItem>
                            <MenuItem value="Transfer">Transfer</MenuItem>
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
                        {transactions
                            .filter(transaction => {
                                const matchesType = !typeFilter || transaction.category === typeFilter;
                                const transactionDate = new Date(transaction.date);
                                const start = startDate ? new Date(startDate) : null;
                                const end = endDate ? new Date(endDate) : null;
                                
                                const matchesDateRange = (!start || transactionDate >= start) &&
                                                        (!end || transactionDate <= end);
                                return matchesType && matchesDateRange;
                            })
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map((transaction, index) => (
                            <TableRow key={transaction.id || index}>
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

            {/* Transfer Modal */}
            <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Transfer Funds</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>From Account</InputLabel>
                            <Select
                                value={fromAccount}
                                label="From Account"
                                onChange={(e) => setFromAccount(e.target.value)}
                            >
                                {accounts.filter(acc => !acc.account_name?.toLowerCase().includes('credit') && !acc.account_name?.toLowerCase().includes('debit')).map((account) => (
                                    <MenuItem key={account.account_id} value={account.account_id}>
                                        {account.account_name} (₹{account.balance.toLocaleString('en-IN')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>To Account</InputLabel>
                            <Select
                                value={toAccount}
                                label="To Account"
                                onChange={(e) => setToAccount(e.target.value)}
                            >
                                {accounts.filter(acc => !acc.account_name?.toLowerCase().includes('credit') && !acc.account_name?.toLowerCase().includes('debit') && acc.account_id !== fromAccount).map((account) => (
                                    <MenuItem key={account.account_id} value={account.account_id}>
                                        {account.account_name} (₹{account.balance.toLocaleString('en-IN')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Amount"
                            type="number"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
                    <Button onClick={handleTransfer} variant="contained" disabled={!fromAccount || !toAccount || !transferAmount}>
                        Transfer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* COGS Transfer Modal */}
            <Dialog open={cogsTransferOpen} onClose={() => setCogsTransferOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>COGS Transfer</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Direction</InputLabel>
                            <Select
                                value={cogsDirection}
                                label="Direction"
                                onChange={(e) => setCogsDirection(e.target.value)}
                            >
                                <MenuItem value="from-cogs">From COGS to Account</MenuItem>
                                <MenuItem value="to-cogs">From Account to COGS</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>COGS Category</InputLabel>
                            <Select
                                value={cogsCategory}
                                label="COGS Category"
                                onChange={(e) => setCogsCategory(e.target.value)}
                            >
                                {cogsData.categories.map((category, index) => (
                                    <MenuItem key={index} value={category.category_id}>
                                        {category.category_name} (₹{parseFloat(category.balance).toLocaleString('en-IN')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Account</InputLabel>
                            <Select
                                value={cogsAccount}
                                label="Account"
                                onChange={(e) => setCogsAccount(e.target.value)}
                            >
                                {accounts.filter(acc => !acc.account_name?.toLowerCase().includes('credit') && !acc.account_name?.toLowerCase().includes('debit')).map((account) => (
                                    <MenuItem key={account.account_id} value={account.account_id}>
                                        {account.account_name} (₹{account.balance.toLocaleString('en-IN')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Amount"
                            type="number"
                            value={cogsAmount}
                            onChange={(e) => setCogsAmount(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCogsTransferOpen(false)}>Cancel</Button>
                    <Button onClick={handleCogsTransfer} variant="contained" disabled={!cogsCategory || !cogsAccount || !cogsAmount}>
                        Transfer
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
