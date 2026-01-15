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
    return (
        <Grid container spacing={3}>
            {/* Top Summary Cards */}
            <Grid item xs={12} md={3}>
                <SummaryCard title="Total Balance" value="₹1,50,000" />
            </Grid>
            <Grid item xs={12} md={3}>
                <SummaryCard title="Cash Balance" value="₹50,000" />
            </Grid>
            <Grid item xs={12} md={3}>
                <SummaryCard title="Bank Balance" value="₹90,000" />
            </Grid>
            <Grid item xs={12} md={3}>
                <SummaryCard title="Receivables" value="₹10,000" />
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
