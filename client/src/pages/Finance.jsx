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
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

export default function Finance() {
    const { showSnackbar } = useSnackbar();
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
    const [payoutOpen, setPayoutOpen] = React.useState(false);
    const [payoutCategory, setPayoutCategory] = React.useState(null);
    const [payoutAmount, setPayoutAmount] = React.useState('');
    const [payoutAccount, setPayoutAccount] = React.useState('');
    const [payoutNote, setPayoutNote] = React.useState('');
    const [teamMembers, setTeamMembers] = React.useState([]);
    const [selectedEmployee, setSelectedEmployee] = React.useState('');
    const [salaryMonth, setSalaryMonth] = React.useState(new Date().toISOString().slice(0, 7));

    const fetchAccounts = async () => {
        try {            const response = await api.get('/accounts');
            setAccounts(response.data);
        } catch (error) {
            if (error.response?.status !== 403) {
                showSnackbar('Failed to fetch accounts. Please try again.', 'error');
            }
        }
    };

    const fetchTransactions = async () => {
        try {            const response = await api.get('/accounts/transactions');
            setTransactions(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch transactions. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCOGSData = async () => {
        try {            const response = await api.get('/cogs/data');
            setCogsData(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch COGS data. Please try again.', 'error');
        }
    };

    const fetchTeamMembers = async () => {
        try {            const response = await api.get('/team');
            setTeamMembers(response.data);
        } catch (error) {
            if (error.response?.status !== 403) {
                showSnackbar('Failed to fetch team members. Please try again.', 'error');
            }
        }
    };

    const handleTransfer = async () => {
        try {            await api.post('/accounts/transfer', {
                fromAccountId: fromAccount,
                toAccountId: toAccount,
                amount: parseFloat(transferAmount)
            });
            setTransferOpen(false);
            setFromAccount('');
            setToAccount('');
            setTransferAmount('');
            fetchAccounts(); // Refresh account balances
            fetchTransactions(); // Refresh transactions
            showSnackbar('Transfer completed successfully!', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.msg || error.response?.data?.message || 'Failed to transfer funds. Please try again.';
            showSnackbar(errorMessage, 'error');
        }
    };

    const handleCogsTransfer = async () => {
        try {            await api.post('/accounts/transfer-cogs', {
                categoryId: cogsCategory,
                accountId: cogsAccount,
                amount: parseFloat(cogsAmount),
                direction: cogsDirection
            });
            setCogsTransferOpen(false);
            setCogsCategory('');
            setCogsAccount('');
            setCogsAmount('');
            fetchAccounts();
            fetchTransactions();
            fetchCOGSData();
            showSnackbar('COGS transfer completed successfully!', 'success');
        } catch (error) {
            showSnackbar(error.response?.data?.msg || error.response?.data?.message || 'Failed to transfer COGS. Please try again.', 'error');
        }
    };

    const handleCogsPayoutOpen = (category) => {
        setPayoutCategory(category);
        setPayoutAmount('');
        setPayoutNote('');
        setSelectedEmployee('');
        setSalaryMonth(new Date().toISOString().slice(0, 7));
        setPayoutOpen(true);
    };

    const handleCogsPayoutSubmit = async () => {
        try {            await api.post('/expenses/cogs-payout', {
                category_id: payoutCategory.category_id,
                amount: parseFloat(payoutAmount),
                note: payoutNote
            });
            setPayoutOpen(false);
            fetchAccounts();
            fetchTransactions();
            fetchCOGSData();
            showSnackbar('Payout processed successfully!', 'success');
        } catch (error) {
            if (error.response?.status !== 403) {
                showSnackbar(error.response?.data?.msg || error.response?.data?.message || 'Failed to process payout. Please try again.', 'error');
            }
        }
    };

    React.useEffect(() => {
        fetchAccounts();
        fetchTransactions();
        fetchCOGSData();
        fetchTeamMembers();
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
                            <TableCell align="right">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {cogsData.categories.map((category, index) => (
                            <TableRow key={index}>
                                <TableCell>{category.category_name}</TableCell>
                                <TableCell align="right">₹{parseFloat(category.balance).toLocaleString('en-IN')}</TableCell>
                                <TableCell align="right">
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="error"
                                        onClick={() => handleCogsPayoutOpen(category)}
                                    >
                                        Payout
                                    </Button>
                                </TableCell>
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
                            error={transferAmount && parseFloat(transferAmount) <= 0}
                            helperText={transferAmount && parseFloat(transferAmount) <= 0 ? "Amount must be positive" : ""}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleTransfer} 
                        variant="contained" 
                        disabled={!fromAccount || !toAccount || !transferAmount || parseFloat(transferAmount) <= 0}
                    >
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
                        
                        {cogsDirection === 'from-cogs' ? (
                            <>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1 }}>
                                    <Typography variant="h5">↓</Typography>
                                </Box>
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
                            </>
                        ) : (
                            <>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1 }}>
                                    <Typography variant="h5">↓</Typography>
                                </Box>
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
                            </>
                        )}
                        
                        <TextField
                            label="Amount"
                            type="number"
                            value={cogsAmount}
                            onChange={(e) => setCogsAmount(e.target.value)}
                            fullWidth
                            error={cogsAmount && parseFloat(cogsAmount) <= 0}
                            helperText={cogsAmount && parseFloat(cogsAmount) <= 0 ? "Amount must be positive" : ""}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCogsTransferOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleCogsTransfer} 
                        variant="contained" 
                        disabled={!cogsCategory || !cogsAccount || !cogsAmount || parseFloat(cogsAmount) <= 0}
                    >
                        Transfer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* COGS Payout Dialog */}
            <Dialog open={payoutOpen} onClose={() => setPayoutOpen(false)}>
                <DialogTitle>COGS Payout - {payoutCategory?.category_name}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Available: ₹{payoutCategory ? parseFloat(payoutCategory.balance).toLocaleString('en-IN') : '0'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        {payoutCategory?.category_name?.toLowerCase().includes('salary') && (
                            <>
                                <FormControl fullWidth>
                                    <InputLabel>Employee</InputLabel>
                                    <Select
                                        value={selectedEmployee}
                                        onChange={(e) => {
                                            setSelectedEmployee(e.target.value);
                                            const employee = teamMembers.find(m => m.member_id === e.target.value);
                                            if (employee) {
                                                setPayoutAmount(employee.salary || '');
                                                setPayoutNote(`Salary payout for ${employee.name} - ${salaryMonth}`);
                                            }
                                        }}
                                        label="Employee"
                                    >
                                        {teamMembers.map((member) => (
                                            <MenuItem key={member.member_id} value={member.member_id}>
                                                {member.name} - {member.position}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Month"
                                    type="month"
                                    value={salaryMonth}
                                    onChange={(e) => {
                                        setSalaryMonth(e.target.value);
                                        const employee = teamMembers.find(m => m.member_id === selectedEmployee);
                                        if (employee) {
                                            setPayoutNote(`Salary payout for ${employee.name} - ${e.target.value}`);
                                        }
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </>
                        )}
                        <TextField
                            label="Amount"
                            type="number"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            fullWidth
                            error={payoutAmount && parseFloat(payoutAmount) <= 0}
                            helperText={payoutAmount && parseFloat(payoutAmount) <= 0 ? "Amount must be positive" : ""}
                        />
                        <TextField
                            label="Description"
                            value={payoutNote}
                            onChange={(e) => setPayoutNote(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="e.g., Electricity bill payment, Office rent, etc."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayoutOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleCogsPayoutSubmit} 
                        variant="contained" 
                        color="error"
                        disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                    >
                        Payout
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
