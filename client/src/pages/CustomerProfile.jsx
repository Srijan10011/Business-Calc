import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Paper, Box, IconButton, Typography, Avatar, Tabs, Tab, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import Title from '../components/dashboard/Title';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const CustomerProfile = () => {
    const { customerId } = useParams();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [value, setValue] = React.useState(0);
    const [customer, setCustomer] = React.useState(null);
    const [sales, setSales] = React.useState([]);
    const [payments, setPayments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await api.get(`/customers/${customerId}`, {
                    headers: { 'x-auth-token': token }
                });
                setCustomer(response.data);
            } catch (error) {
                showSnackbar('Failed to fetch customer details. Please try again.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomer();
    }, [customerId]);

    React.useEffect(() => {
        const fetchSales = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await api.get(`/customers/${customerId}/sales`, {
                    headers: { 'x-auth-token': token }
                });
                setSales(response.data);
            } catch (error) {
                showSnackbar('Failed to fetch sales. Please try again.', 'error');
            }
        };

        const fetchPayments = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await api.get(`/customers/${customerId}/payments`, {
                    headers: { 'x-auth-token': token }
                });
                setPayments(response.data);
            } catch (error) {
                showSnackbar('Failed to fetch payments. Please try again.', 'error');
            }
        };

        if (value === 1) {
            fetchSales();
        } else if (value === 2) {
            fetchPayments();
        }
    }, [customerId, value]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!customer) {
        return (
            <Paper sx={{ p: 3 }}>
                <Typography>Customer not found</Typography>
            </Paper>
        );
    }

    const creditStatus = customer.outstanding_credit > 0 ? 'Outstanding' : 'Clear';

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                    <ArrowBack />
                </IconButton>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>{customer.name.charAt(0)}</Avatar>
                <Typography variant="h4" component="h1">
                    {customer.name} (ID: {customerId})
                </Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={value} onChange={handleChange} aria-label="customer profile tabs">
                    <Tab label="Overview" {...a11yProps(0)}/>
                    <Tab label="Sales History" {...a11yProps(1)}/>
                    <Tab label="Payments" {...a11yProps(2)}/>
                    <Tab label="Notes" {...a11yProps(3)}/>
                </Tabs>
            </Box>

            <CustomTabPanel value={value} index={0}>
                <Title>Overview</Title>
                <Typography variant="body1">Email: {customer.email || 'N/A'}</Typography>
                <Typography variant="body1">Phone: {customer.phone}</Typography>
                <Typography variant="body1">Address: {customer.address}</Typography>
                <Typography variant="body1">Total Purchases: ₹{customer.total_purchases}</Typography>
                <Typography variant="body1">Outstanding Credit: ₹{customer.outstanding_credit}</Typography>
                <Typography variant="body1">Last Purchase: {customer.last_purchase ? new Date(customer.last_purchase).toLocaleDateString() : 'N/A'}</Typography>
                <Typography variant="body1" sx={{ mt: 2 }}><strong>Credit Status:</strong> {creditStatus}</Typography>
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <Title>Sales History</Title>
                {sales.length === 0 ? (
                    <Typography variant="body1">No sales history found.</Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell>Rate</TableCell>
                                <TableCell>Total</TableCell>
                                <TableCell>Payment Type</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sales.map((sale, index) => (
                                <TableRow key={index}>
                                    <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{sale.product_name}</TableCell>
                                    <TableCell>{sale.quantity}</TableCell>
                                    <TableCell>₹{sale.rate}</TableCell>
                                    <TableCell>₹{sale.total_amount}</TableCell>
                                    <TableCell>{sale.payment_type}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
                <Title>Payments</Title>
                {payments.length === 0 ? (
                    <Typography variant="body1">No payment history found.</Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Payment Type</TableCell>
                                <TableCell>Source</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map((payment, index) => (
                                <TableRow key={index}>
                                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                    <TableCell>₹{parseFloat(payment.amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{payment.payment_type}</TableCell>
                                    <TableCell>{payment.payment_source}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={3}>
                <Title>Notes</Title>
                <Typography variant="body1">Notes about the customer will be displayed here.</Typography>
            </CustomTabPanel>
        </Paper>
    );
};

export default CustomerProfile;