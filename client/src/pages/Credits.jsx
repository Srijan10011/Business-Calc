import * as React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Chip,
    Typography,
    Box
} from '@mui/material';
import Title from '../components/dashboard/Title';
import api from '../utils/api';
import { usePermissions } from '../context/PermissionContext';

const statusColors = {
    Pending: 'error',
    Partial: 'warning',
    Paid: 'success'
};

export default function Credits() {
    const { hasPermission, loading } = usePermissions();
    const [payables, setPayables] = React.useState([]);
    const [accounts, setAccounts] = React.useState([]);
    const [paymentDialog, setPaymentDialog] = React.useState(false);
    const [selectedPayable, setSelectedPayable] = React.useState(null);
    const [paymentAmount, setPaymentAmount] = React.useState('');
    const [paymentAccount, setPaymentAccount] = React.useState('');

    React.useEffect(() => {
        if (!loading && hasPermission('credits.view')) {
            fetchPayables();
            fetchAccounts();
        }
    }, [loading, hasPermission]);

    const fetchPayables = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/credits', {
                headers: { 'x-auth-token': token }
            });
            setPayables(response.data);
        } catch (error) {
            console.error('Error fetching payables:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/dependencies/accounts', {
                headers: { 'x-auth-token': token }
            });
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const handlePayClick = (payable) => {
        setSelectedPayable(payable);
        setPaymentAmount('');
        setPaymentAccount('');
        setPaymentDialog(true);
    };

    const handlePaymentSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/credits/pay', {
                payable_id: selectedPayable.payable_id,
                amount: parseFloat(paymentAmount),
                payment_account: paymentAccount
            }, {
                headers: { 'x-auth-token': token }
            });
            setPaymentDialog(false);
            fetchPayables();
        } catch (error) {
            console.error('Error making payment:', error);
            if (error.response?.status !== 403) {
                alert('Error: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    const totalOwed = payables.reduce((sum, p) => sum + (parseFloat(p.total_amount) - parseFloat(p.paid_amount)), 0);

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Credit Management</Title>
                <Typography variant="h6" color="error">
                    Total Owed: ₹{totalOwed.toLocaleString('en-IN')}
                </Typography>
            </Box>

            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Party Name</TableCell>
                            <TableCell>Total Amount</TableCell>
                            <TableCell>Paid Amount</TableCell>
                            <TableCell>Remaining</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payables.map((payable) => {
                            const remaining = parseFloat(payable.total_amount) - parseFloat(payable.paid_amount);
                            return (
                                <TableRow key={payable.payable_id}>
                                    <TableCell>{payable.party_name}</TableCell>
                                    <TableCell>₹{parseFloat(payable.total_amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell>₹{parseFloat(payable.paid_amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell>₹{remaining.toLocaleString('en-IN')}</TableCell>
                                    <TableCell>
                                        <Chip label={payable.status} color={statusColors[payable.status]} size="small" />
                                    </TableCell>
                                    <TableCell>{new Date(payable.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        {payable.status !== 'Paid' && (
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => handlePayClick(payable)}
                                            >
                                                Pay
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Paper>

            {/* Payment Dialog */}
            <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)}>
                <DialogTitle>Pay Credit - {selectedPayable?.party_name}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Remaining: ₹{selectedPayable ? (parseFloat(selectedPayable.total_amount) - parseFloat(selectedPayable.paid_amount)).toLocaleString('en-IN') : '0'}
                    </Typography>
                    <TextField
                        select
                        margin="dense"
                        label="Payment Account"
                        fullWidth
                        value={paymentAccount}
                        onChange={(e) => setPaymentAccount(e.target.value)}
                    >
                        {accounts.filter(acc => ['Cash Account', 'Bank Account'].includes(acc.account_name)).map((account) => (
                            <MenuItem key={account.account_id} value={account.account_id}>
                                {account.account_name} (₹{parseFloat(account.balance).toLocaleString('en-IN')})
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Payment Amount"
                        type="number"
                        fullWidth
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        error={paymentAmount && parseFloat(paymentAmount) <= 0}
                        helperText={paymentAmount && parseFloat(paymentAmount) <= 0 ? "Amount must be positive" : ""}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialog(false)}>Cancel</Button>
                    <Button 
                        onClick={handlePaymentSubmit} 
                        variant="contained"
                        disabled={!paymentAccount || !paymentAmount || parseFloat(paymentAmount) <= 0}
                    >
                        Pay
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
