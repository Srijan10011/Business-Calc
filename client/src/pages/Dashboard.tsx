import * as React from 'react';
import {
    Grid,
    Paper,
    Box,
    Typography,
    LinearProgress,
    Card,
    CardContent,
} from '@mui/material';
import Title from '../components/dashboard/Title';
import axios from 'axios';

// --- Reusable Summary Card Component ---
interface SummaryCardProps {
    title: string;
    value: string;
}

function SummaryCard({ title, value }: SummaryCardProps) {
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

// --- Reusable Asset Progress Component ---
interface AssetProgressProps {
    name: string;
    value: string;
    progress: number;
    status: 'Active' | 'Recovered';
}

function AssetProgress({ name, value, progress, status }: AssetProgressProps) {
    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">{name}</Typography>
                <Typography variant="body1" color="text.secondary">{value}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress variant="determinate" value={progress} />
                </Box>
                <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(progress)}%`}</Typography>
                    <Typography variant="caption" color={status === 'Recovered' ? 'green' : 'text.secondary'}>
                        {status}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

const Dashboard: React.FC = () => {
    const [accounts, setAccounts] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/accounts', {
                headers: { 'x-auth-token': token }
            });
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAccounts();
    }, []);

    const getAccountBalance = (accountName: string) => {
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

    if (loading) {
        return <Typography>Loading...</Typography>;
    }
    return (
        <Grid container spacing={3}>
            {/* Top Summary Cards */}
            <Grid item xs={12} md={2.4}>
                <SummaryCard title="Total Balance" value={`₹${totalBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2.4}>
                <SummaryCard title="Cash Balance" value={`₹${cashBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2.4}>
                <SummaryCard title="Bank Balance" value={`₹${bankBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2.4}>
                <SummaryCard title="Debit Balance" value={`₹${debitBalance.toLocaleString('en-IN')}`} />
            </Grid>
            <Grid item xs={12} md={2.4}>
                <SummaryCard title="Credit Balance" value={`₹${creditBalance.toLocaleString('en-IN')}`} />
            </Grid>

            {/* Money Flow Section */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Title>Money Flow (This Month)</Title>
                    <Grid container>
                        <Grid item xs={6}>
                            <Typography variant="subtitle1" color="green">Incoming</Typography>
                            <Box component="ul" sx={{ pl: 2 }}>
                                <li><Typography>Cash: ₹30,000</Typography></li>
                                <li><Typography>Bank: ₹1,20,000</Typography></li>
                                <li><Typography>Credit: ₹15,000</Typography></li>
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="subtitle1" color="red">Outgoing</Typography>
                            <Box component="ul" sx={{ pl: 2 }}>
                                <li><Typography>Salary: ₹40,000</Typography></li>
                                <li><Typography>Raw Material: ₹25,000</Typography></li>
                                <li><Typography>Rent: ₹15,000</Typography></li>
                                <li><Typography>Utilities: ₹5,000</Typography></li>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>

            {/* Assets Recovery Progress */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Title>Assets Recovery Progress</Title>
                    <AssetProgress name="Autoclave" value="₹100,000" progress={72} status="Active" />
                    <AssetProgress name="Computer" value="₹40,000" progress={100} status="Recovered" />
                    <Typography variant="caption" color="text.secondary" align="center" sx={{mt: 2}}>
                        Users will be able to add things here which is stored in db
                    </Typography>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default Dashboard;
