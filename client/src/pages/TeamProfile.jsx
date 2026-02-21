import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

export default function TeamProfile() {
    const { showSnackbar } = useSnackbar();
    const { memberId } = useParams();
    const [member, setMember] = useState(null);
    const [accountBalance, setAccountBalance] = useState(0);
    const [attendance, setAttendance] = useState([]);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [totalSalaryPaid, setTotalSalaryPaid] = useState(0);
    const [payoutDialog, setPayoutDialog] = useState(false);
    const [addSalaryDialog, setAddSalaryDialog] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [addSalaryAmount, setAddSalaryAmount] = useState('');
    const [payoutMonth, setPayoutMonth] = useState(new Date().toISOString().slice(0, 7));
    const [payoutError, setPayoutError] = useState('');

    useEffect(() => {
        fetchMemberData();
        fetchAccountBalance();
        fetchAttendance();
        fetchSalaryHistory();
    }, [memberId]);

    const fetchMemberData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/team/${memberId}`, {
                headers: { 'x-auth-token': token }
            });
            setMember(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch member details. Please try again.', 'error');
        }
    };

    const fetchAccountBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/team/${memberId}/account`, {
                headers: { 'x-auth-token': token }
            });
            setAccountBalance(response.data.current_balance || 0);
        } catch (error) {
            showSnackbar('Failed to fetch account balance. Please try again.', 'error');
        }
    };

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/team/${memberId}/attendance`, {
                headers: { 'x-auth-token': token }
            });
            setAttendance(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch attendance. Please try again.', 'error');
        }
    };

    const fetchSalaryHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/team/${memberId}/salary-history`, {
                headers: { 'x-auth-token': token }
            });
            setSalaryHistory(response.data);
            // Only sum payout transactions for total paid
            const total = response.data
                .filter(payment => payment.type === 'payout')
                .reduce((sum, payment) => sum + payment.amount, 0);
            setTotalSalaryPaid(total);
        } catch (error) {
            showSnackbar('Failed to fetch salary history. Please try again.', 'error');
        }
    };

    const handleSalaryPayout = async () => {
        try {
            setPayoutError('');
            const token = localStorage.getItem('token');
            
            await api.post('/team/salary-payout', {
                memberId,
                amount: parseFloat(payoutAmount),
                month: payoutMonth,
                description: `Salary for ${member.name} on ${new Date(payoutMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
            }, {
                headers: { 'x-auth-token': token }
            });
            
            // Deduct from account balance (can go negative for advances)
            await api.post('/team/distribute-salary', {
                member_id: memberId,
                amount: -parseFloat(payoutAmount), // Negative to deduct
                month: payoutMonth
            }, {
                headers: { 'x-auth-token': token }
            });
            
            setPayoutDialog(false);
            setPayoutAmount('');
            fetchSalaryHistory();
            fetchAccountBalance();
            showSnackbar('Salary payout processed successfully!', 'success');
        } catch (error) {
            if (error.response?.data?.error === 'INSUFFICIENT_BALANCE') {
                setPayoutError(`Balance in salary is ₹${error.response.data.availableBalance.toLocaleString('en-IN')}`);
                showSnackbar(`Insufficient balance. Available: ₹${error.response.data.availableBalance.toLocaleString('en-IN')}`, 'error');
            } else {
                setPayoutError('Error processing salary payout');
                showSnackbar(error.response?.data?.message || 'Failed to process salary payout. Please try again.', 'error');
            }
        }
    };

    const handleAddSalary = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/team/distribute-salary', {
                member_id: memberId,
                amount: parseFloat(addSalaryAmount),
                month: new Date().toISOString().slice(0, 7)
            }, {
                headers: { 'x-auth-token': token }
            });
            setAddSalaryDialog(false);
            setAddSalaryAmount('');
            fetchAccountBalance();
            showSnackbar('Salary added successfully!', 'success');
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to add salary. Please try again.', 'error');
        }
    };

    if (!member) return <Typography>Loading...</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">{member.name} - Profile</Typography>
                <Button variant="contained" onClick={() => {
                    setPayoutDialog(true);
                    setPayoutError('');
                }}>
                    Payout
                </Button>
            </Box>
            
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Basic Info</Typography>
                            <Typography>Position: {member.position}</Typography>
                            <Typography>Department: {member.department || 'N/A'}</Typography>
                            <Typography>Email: {member.email || 'N/A'}</Typography>
                            <Typography>Phone: {member.phone || 'N/A'}</Typography>
                            <Typography>Status: <Chip label={member.status} size="small" /></Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">Salary Information</Typography>
                                <Button variant="outlined" onClick={() => setAddSalaryDialog(true)}>
                                    Add Salary
                                </Button>
                            </Box>
                            <Typography>Current Salary: ₹{member.salary?.toLocaleString('en-IN') || 'N/A'}</Typography>
                            <Typography>Account Balance: ₹{accountBalance.toLocaleString('en-IN')}</Typography>
                            <Typography>Total Paid: ₹{totalSalaryPaid.toLocaleString('en-IN')}</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Salary Payment History</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Month</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Description</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {salaryHistory.map((payment) => (
                                        <TableRow key={payment.transaction_id}>
                                            <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                                            <TableCell>{payment.month}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={payment.type === 'addition' ? 'Added' : 'Payout'} 
                                                    color={payment.type === 'addition' ? 'success' : 'primary'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell>{payment.description}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Attendance</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Hours</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {attendance.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={record.status} 
                                                    color={record.status === 'present' ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>{record.hours || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={payoutDialog} onClose={() => setPayoutDialog(false)}>
                <DialogTitle>Payout Salary</DialogTitle>
                <DialogContent>
                    {payoutError && (
                        <Typography 
                            color="error" 
                            sx={{ mb: 2, fontWeight: 'bold', backgroundColor: '#ffebee', p: 1, borderRadius: 1 }}
                        >
                            {payoutError}
                        </Typography>
                    )}
                    <TextField
                        label="Amount"
                        type="number"
                        fullWidth
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                        error={payoutAmount && parseFloat(payoutAmount) <= 0}
                        helperText={payoutAmount && parseFloat(payoutAmount) <= 0 ? "Amount must be positive" : ""}
                    />
                    <TextField
                        label="Month"
                        type="month"
                        fullWidth
                        value={payoutMonth}
                        onChange={(e) => setPayoutMonth(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayoutDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSalaryPayout} 
                        variant="contained"
                        disabled={!payoutAmount || parseFloat(payoutAmount) <= 0}
                    >
                        Payout
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={addSalaryDialog} onClose={() => setAddSalaryDialog(false)}>
                <DialogTitle>Add Salary to Account</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Amount"
                        type="number"
                        fullWidth
                        value={addSalaryAmount}
                        onChange={(e) => setAddSalaryAmount(e.target.value)}
                        sx={{ mt: 2 }}
                        error={addSalaryAmount && parseFloat(addSalaryAmount) <= 0}
                        helperText={addSalaryAmount && parseFloat(addSalaryAmount) <= 0 ? "Amount must be positive" : ""}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddSalaryDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handleAddSalary} 
                        variant="contained"
                        disabled={!addSalaryAmount || parseFloat(addSalaryAmount) <= 0}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
