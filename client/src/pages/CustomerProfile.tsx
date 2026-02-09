import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    IconButton,
    Avatar,
    CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import Title from '../components/dashboard/Title';
import api from '../../utils/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
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

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const CustomerProfile: React.FC = () => {
    const { customerId } = useParams<{ customerId: string }>();
    const navigate = useNavigate();
    const [value, setValue] = React.useState(0);
    const [customer, setCustomer] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`http://localhost:5000/api/customers/${customerId}`, {
                    headers: { 'x-auth-token': token }
                });
                setCustomer(response.data);
            } catch (error) {
                console.error('Error fetching customer:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCustomer();
    }, [customerId]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
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
                    <ArrowBackIcon />
                </IconButton>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>{customer.name.charAt(0)}</Avatar>
                <Typography variant="h4" component="h1">
                    {customer.name} (ID: {customerId})
                </Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={value} onChange={handleChange} aria-label="customer profile tabs">
                    <Tab label="Overview" {...a11yProps(0)} />
                    <Tab label="Sales History" {...a11yProps(1)} />
                    <Tab label="Payments" {...a11yProps(2)} />
                    <Tab label="Notes" {...a11yProps(3)} />
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
                <Typography variant="body1">Sales history will be displayed here.</Typography>
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
                <Title>Payments</Title>
                <Typography variant="body1">Payment details will be displayed here.</Typography>
            </CustomTabPanel>
            <CustomTabPanel value={value} index={3}>
                <Title>Notes</Title>
                <Typography variant="body1">Notes about the customer will be displayed here.</Typography>
            </CustomTabPanel>
        </Paper>
    );
};

export default CustomerProfile;
