import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    AppBar,
    Toolbar,
    IconButton,
    Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import Title from '../components/dashboard/Title'; // Assuming Title component is reusable

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
    const [value, setValue] = React.useState(0); // For tabs

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    // Placeholder data for a customer
    const customerData = {
        id: customerId,
        name: 'John Doe', // Placeholder
        email: 'john.doe@example.com', // Placeholder
        phone: '+1 123 456 7890', // Placeholder
        totalPurchases: '₹250,000', // Placeholder
        outstandingCredit: '₹15,000', // Placeholder
        lastPurchase: '2026-01-05', // Placeholder
        creditStatus: 'Good', // Placeholder for Overview tab
    };


    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>{customerData.name.charAt(0)}</Avatar>
                <Typography variant="h4" component="h1">
                    {customerData.name} (ID: {customerId})
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
                <Typography variant="body1">Email: {customerData.email}</Typography>
                <Typography variant="body1">Phone: {customerData.phone}</Typography>
                <Typography variant="body1">Total Purchases: {customerData.totalPurchases}</Typography>
                <Typography variant="body1">Outstanding Credit: {customerData.outstandingCredit}</Typography>
                <Typography variant="body1">Last Purchase: {customerData.lastPurchase}</Typography>
                <Typography variant="body1" sx={{ mt: 2 }}><strong>Credit Status:</strong> {customerData.creditStatus}</Typography>
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <Title>Sales History</Title>
                <Typography variant="body1">Sales history will be displayed here.</Typography>
                {/* Future: Table of sales */}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
                <Title>Payments</Title>
                <Typography variant="body1">Payment details will be displayed here.</Typography>
                {/* Future: Table of payments */}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={3}>
                <Title>Notes</Title>
                <Typography variant="body1">Notes about the customer will be displayed here.</Typography>
                {/* Future: Editable notes section */}
            </CustomTabPanel>
        </Paper>
    );
};

export default CustomerProfile;
