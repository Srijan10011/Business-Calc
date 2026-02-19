import * as React from 'react';
import { Box, Button, Grid, Card, CardContent, Typography, LinearProgress, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import Add from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import Title from '../components/dashboard/Title';
import AddAssetModal from '../components/assets/AddAssetModal';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

function Assets() {
    const { showSnackbar } = useSnackbar();
    const [open, setOpen] = React.useState(false);
    const [assets, setAssets] = React.useState([]);
    const [tabValue, setTabValue] = React.useState(0);
    const [recurringCosts, setRecurringCosts] = React.useState([]);
    const [historyOpen, setHistoryOpen] = React.useState(false);
    const [history, setHistory] = React.useState([]);
    const [addRecurringOpen, setAddRecurringOpen] = React.useState(false);
    const [newCost, setNewCost] = React.useState({ name: '', type: 'rent', monthlyTarget: '' });

    const fetchAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/assets', {
                headers: { 'x-auth-token': token }
            });
            setAssets(response.data);
        } catch (error) {
            console.error('Error fetching assets:', error);
            showSnackbar('Failed to fetch assets. Please try again.', 'error');
        }
    };

    const fetchRecurringCosts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/recurring-costs', {
                headers: { 'x-auth-token': token }
            });
            setRecurringCosts(response.data);
        } catch (error) {
            console.error('Error fetching recurring costs:', error);
            showSnackbar('Failed to fetch recurring costs. Please try again.', 'error');
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/recurring-costs/history', {
                headers: { 'x-auth-token': token }
            });
            setHistory(response.data);
            setHistoryOpen(true);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handleAddRecurringCost = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/recurring-costs', newCost, {
                headers: { 'x-auth-token': token }
            });
            setAddRecurringOpen(false);
            setNewCost({ name: '', type: 'rent', monthlyTarget: '' });
            fetchRecurringCosts();
        } catch (error) {
            console.error('Error adding recurring cost:', error);
            showSnackbar(error.response?.data?.message || 'Failed to add recurring cost. Please try again.', 'error');
        }
    };

    React.useEffect(() => {
        fetchAssets();
        fetchRecurringCosts();
    }, []);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        fetchAssets();
    };

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Fixed Costs</Title>
                <Box>
                    {tabValue === 1 && (
                        <>
                            <Button variant="outlined" startIcon={<HistoryIcon />} onClick={fetchHistory} sx={{ mr: 1 }}>
                                View History
                            </Button>
                            <Button variant="contained" startIcon={<Add />} onClick={() => setAddRecurringOpen(true)}>
                                Add Monthly Cost
                            </Button>
                        </>
                    )}
                    {tabValue === 0 && (
                        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
                            Add Asset
                        </Button>
                    )}
                </Box>
            </Box>

            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="One-Time Assets" />
                <Tab label="Monthly Fixed Costs" />
            </Tabs>

            {tabValue === 0 && (
                <Grid container spacing={3}>
                    {assets.map((asset) => (
                        <Grid item xs={12} sm={6} md={4} key={asset.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography gutterBottom variant="h5" component="h2">
                                        {asset.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Cost: ₹{asset.cost.toLocaleString('en-IN')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Recovered: ₹{asset.recovered.toLocaleString('en-IN')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Remaining: ₹{asset.remaining.toLocaleString('en-IN')}
                                    </Typography>
                                    <Box sx={{ width: '100%', mt: 2 }}>
                                        <LinearProgress variant="determinate" value={asset.progress}/>
                                        <Typography variant="caption" color="text.secondary">
                                            {`${Math.round(asset.progress)}%`}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Status: {asset.status}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {tabValue === 1 && (
                <Grid container spacing={3}>
                    {recurringCosts.map((cost) => (
                        <Grid item xs={12} sm={6} md={4} key={cost.category_id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography gutterBottom variant="h5" component="h2">
                                        {cost.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Type: {cost.type}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Monthly Target: ₹{parseFloat(cost.monthly_target).toLocaleString('en-IN')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Recovered: ₹{parseFloat(cost.recovered_amount || 0).toLocaleString('en-IN')}
                                    </Typography>
                                    <Box sx={{ width: '100%', mt: 2 }}>
                                        <LinearProgress variant="determinate" value={cost.progress || 0}/>
                                        <Typography variant="caption" color="text.secondary">
                                            {`${Math.round(cost.progress || 0)}%`}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color={cost.status === 'fulfilled' ? 'success.main' : 'text.secondary'} sx={{ mt: 1 }}>
                                        Status: {cost.status === 'fulfilled' ? 'Target Met ✓' : 'In Progress'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <AddAssetModal open={open} onClose={handleClose}/>

            <Dialog open={addRecurringOpen} onClose={() => setAddRecurringOpen(false)}>
                <DialogTitle>Add Monthly Fixed Cost</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <input
                            placeholder="Cost Name (e.g., Office Rent)"
                            value={newCost.name}
                            onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                            style={{ padding: '10px', fontSize: '16px' }}
                        />
                        <select
                            value={newCost.type}
                            onChange={(e) => setNewCost({ ...newCost, type: e.target.value })}
                            style={{ padding: '10px', fontSize: '16px' }}
                        >
                            <option value="rent">Rent</option>
                            <option value="loan_interest">Loan Interest</option>
                            <option value="utilities">Utilities</option>
                            <option value="insurance">Insurance</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Monthly Target Amount"
                            value={newCost.monthlyTarget}
                            onChange={(e) => setNewCost({ ...newCost, monthlyTarget: e.target.value })}
                            style={{ padding: '10px', fontSize: '16px' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddRecurringOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddRecurringCost} variant="contained">Add</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Monthly Fixed Costs History</DialogTitle>
                <DialogContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Cost Name</TableCell>
                                <TableCell>Month</TableCell>
                                <TableCell>Target</TableCell>
                                <TableCell>Recovered</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.month}</TableCell>
                                    <TableCell>₹{parseFloat(row.target_amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell>₹{parseFloat(row.recovered_amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{Math.round(row.progress)}%</TableCell>
                                    <TableCell style={{ color: row.status === 'fulfilled' ? 'green' : 'orange' }}>
                                        {row.status === 'fulfilled' ? '✓ Fulfilled' : row.status === 'unfulfilled' ? '✗ Unfulfilled' : 'In Progress'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}

export default Assets;