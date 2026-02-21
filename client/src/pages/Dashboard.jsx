import * as React from 'react';
import { Grid, Card, CardContent, Typography, Paper, Box, LinearProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert } from '@mui/material';
import Title from '../components/dashboard/Title';
import api from '../utils/api';
import { usePermissions } from '../context/PermissionContext';
import { useSnackbar } from '../context/SnackbarContext';

function SummaryCard({ title, value }) {
    return (
        <Card>
            <CardContent>
                <Typography component="h2" variant="h6" color="primary" gutterBottom>
                    {title}
                </Typography>
                <Typography component="p" variant="h4">
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
}

function AssetProgress({ name, value, progress, status }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">{name}</Typography>
                <Typography variant="body1" color="text.secondary">{value}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                        variant="determinate" 
                        value={Math.min(progress, 100)}
                        color={status === 'Retired' ? 'success' : 'primary'}
                    />
                </Box>
                <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(progress)}%`}</Typography>
                    <Typography variant="caption" color={status === 'Retired' ? 'green' : 'text.secondary'}>
                        {status}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

const Dashboard = () => {
    const { hasPermission } = usePermissions();
    const { showSnackbar } = useSnackbar();
    const [accounts, setAccounts] = React.useState([]);
    const [assets, setAssets] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [expenseDialog, setExpenseDialog] = React.useState(false);
    const [expenseAccount, setExpenseAccount] = React.useState('');
    const [expenseAmount, setExpenseAmount] = React.useState('');
    const [expenseNote, setExpenseNote] = React.useState('');
    const [moneyFlow, setMoneyFlow] = React.useState({ incoming: {}, outgoing: {} });
    const [userStatus, setUserStatus] = React.useState(null);

    const checkUserStatus = async () => {
        try {            const res = await api.get('/requests/status');
            setUserStatus(res.data);
        } catch (error) {
            showSnackbar('Failed to check user status. Please try again.', 'error');
        }
    };

    const fetchAccounts = async () => {
        try {            const response = await api.get('/accounts');
            setAccounts(response.data);
        } catch (error) {
            if (error.response?.status === 403) {
                setAccounts([]);
            } else {
                showSnackbar('Failed to fetch accounts. Please try again.', 'error');
            }
        }
    };

    const fetchAssets = async () => {
        try {            const response = await api.get('/assets');
            setAssets(response.data);
        } catch (error) {
            if (error.response?.status === 403) {
                setAssets([]);
            } else {
                showSnackbar('Failed to fetch assets. Please try again.', 'error');
            }
        }
    };

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchAccounts(), fetchAssets(), fetchMoneyFlow()]);
        setLoading(false);
    };

    const fetchMoneyFlow = async () => {
        try {            const response = await api.get('/dashboard/money-flow');
            setMoneyFlow(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch money flow data. Please try again.', 'error');
        }
    };

    React.useEffect(() => {
        checkUserStatus();
        fetchData();
    }, []);

    const getAccountBalance = (accountName) => {
        const account = accounts.find(acc => 
            acc.account_name.toLowerCase().includes(accountName.toLowerCase())
        );
        return account ? parseFloat(account.balance) : 0;
    };

    const cashBalance = getAccountBalance('cash');
    const bankBalance = getAccountBalance('bank');
    const debitBalance = getAccountBalance('debit');
    const creditBalance = getAccountBalance('credit');
    const totalBalance = cashBalance + bankBalance + debitBalance;

    const handleExpenseSubmit = async () => {
        try {            await api.post('/expenses', {
                account_id: expenseAccount,
                amount: parseFloat(expenseAmount),
                note: expenseNote
            });
            setExpenseDialog(false);
            setExpenseAccount('');
            setExpenseAmount('');
            setExpenseNote('');
            fetchData(); // Refresh data
            showSnackbar('Expense added successfully!', 'success');
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to add expense. Please try again.', 'error');
        }
    };

    if (loading) {
        return <Typography>Loading...</Typography>;
    }

    return (
        <React.Fragment>
            {/* Pending Approval Banner */}
            {userStatus?.status === 'pending' && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Your request to join this business is pending approval from the owner. You will have limited access until approved.
                </Alert>
            )}

            {/* Header with Add Expense Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Dashboard
                </Typography>
                <Button variant="contained" color="error" onClick={() => setExpenseDialog(true)}>
                    Add Expense
                </Button>
            </Box>

            <Grid container spacing={3}>
            {/* Top Summary Cards */}
            <Grid item xs={12} md={2}>
                <SummaryCard title="Total Balance" value={`₹${totalBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2}>
                <SummaryCard title="Cash Balance" value={`₹${cashBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2}>
                <SummaryCard title="Bank Balance" value={`₹${bankBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2}>
                <SummaryCard title="Debit Balance" value={`₹${debitBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2}>
                <SummaryCard title="Credit Balance" value={`₹${creditBalance.toLocaleString('en-IN')}`} />
            </Grid>

            {/* Money Flow Section */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Title>Money Flow (This Month)</Title>
                    {hasPermission('finance.view') ? (
                        <Grid container spacing={4}>
                            <Grid item xs={5}>
                                <Typography variant="subtitle1" sx={{ color: 'green' }}>Incoming</Typography>
                                <Box component="ul" sx={{ pl: 2 }}>
                                    <li><Typography>Cash: ₹{(moneyFlow.incoming.cash || 0).toLocaleString('en-IN')}</Typography></li>
                                    <li><Typography>Bank: ₹{(moneyFlow.incoming.bank || 0).toLocaleString('en-IN')}</Typography></li>
                                    <li><Typography>Credit: ₹{(moneyFlow.incoming.credit || 0).toLocaleString('en-IN')}</Typography></li>
                                    {Array.from({ length: Math.max(0, (Object.keys(moneyFlow.outgoing.cogs || {}).length + 2) - 3) }).map((_, index) => (
                                        <div key={index} style={{ height: '24px' }}></div>
                                    ))}
                                    <li><Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1, color: 'green' }}>
                                        Total: ₹{((moneyFlow.incoming.cash || 0) + (moneyFlow.incoming.bank || 0) + (moneyFlow.incoming.credit || 0)).toLocaleString('en-IN')}
                                    </Typography></li>
                                </Box>
                            </Grid>
                            <Grid item xs={2}></Grid>
                            <Grid item xs={5}>
                                <Typography variant="subtitle1" sx={{ color: 'red' }}>Outgoing</Typography>
                                <Box component="ul" sx={{ pl: 2 }}>
                                    <li><Typography>Inventory: ₹{(moneyFlow.outgoing.inventory || 0).toLocaleString('en-IN')}</Typography></li>
                                    {Object.entries(moneyFlow.outgoing.cogs || {}).map(([category, amount]) => (
                                        <li key={category}><Typography>{category}: ₹{amount.toLocaleString('en-IN')}</Typography></li>
                                    ))}
                                    <li><Typography>General Expenses: ₹{(moneyFlow.outgoing.general || 0).toLocaleString('en-IN')}</Typography></li>
                                    <li><Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1, color: 'red' }}>
                                        Total: ₹{((moneyFlow.outgoing.inventory || 0) + Object.values(moneyFlow.outgoing.cogs || {}).reduce((sum, amount) => sum + amount, 0) + (moneyFlow.outgoing.general || 0)).toLocaleString('en-IN')}
                                    </Typography></li>
                                </Box>
                            </Grid>
                        </Grid>
                    ) : (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                            No permission to view financial data
                        </Typography>
                    )}
                </Paper>
            </Grid>

            {/* Assets Recovery Progress */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Title>Assets Recovery Progress</Title>
                    {hasPermission('assets.view') ? (
                        assets.length > 0 ? (
                            assets.map((asset) => (
                                <AssetProgress 
                                    key={asset.id}
                                    name={asset.name} 
                                    value={`₹${asset.cost.toLocaleString('en-IN')}`} 
                                    progress={asset.progress} 
                                    status={asset.status} 
                            />
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{mt: 2}}>
                            No assets found. Add assets to track recovery progress.
                        </Typography>
                    )
                    ) : (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                            No permission to view assets
                        </Typography>
                    )}
                </Paper>
            </Grid>
            </Grid>

            {/* Expense Dialog */}
        <Dialog open={expenseDialog} onClose={() => setExpenseDialog(false)}>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogContent>
                <TextField
                    select
                    margin="dense"
                    label="Account"
                    fullWidth
                    value={expenseAccount}
                    onChange={(e) => setExpenseAccount(e.target.value)}
                >
                    {accounts.map((account) => (
                        <MenuItem key={account.account_id} value={account.account_id}>
                            {account.account_name} (₹{parseFloat(account.balance).toLocaleString('en-IN')})
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    margin="dense"
                    label="Amount"
                    type="number"
                    fullWidth
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    error={expenseAmount && parseFloat(expenseAmount) <= 0}
                    helperText={expenseAmount && parseFloat(expenseAmount) <= 0 ? "Amount must be positive" : ""}
                />
                <TextField
                    margin="dense"
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setExpenseDialog(false)}>Cancel</Button>
                <Button 
                    onClick={handleExpenseSubmit} 
                    variant="contained"
                    disabled={!expenseAccount || !expenseAmount || parseFloat(expenseAmount) <= 0}
                >
                    Add Expense
                </Button>
            </DialogActions>
            </Dialog>
        </React.Fragment>
    );
};

export default Dashboard;
