import * as React from 'react';
import { Box, Button, Grid, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import AddAssetModal from '../components/assets/AddAssetModal';

const assets = [
    { id: 'asset-001', name: 'Autoclave', cost: 100000, recovered: 72000, status: 'Active', maintenance: 0.2 },
    { id: 'asset-002', name: 'Computer', cost: 40000, recovered: 40000, status: 'Retired', maintenance: 0.1 },
    { id: 'asset-003', name: 'Machine X', cost: 250000, recovered: 50000, status: 'Active', maintenance: 0.5 },
];

function Assets() {
    const [open, setOpen] = React.useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <React.Fragment>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Title>Assets</Title>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
                    Add Asset
                </Button>
            </Box>
            <Grid container spacing={3}>
                {assets.map((asset) => {
                    const remaining = asset.cost - asset.recovered;
                    const progress = (asset.recovered / asset.cost) * 100;
                    return (
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
                                        Remaining: ₹{remaining.toLocaleString('en-IN')}
                                    </Typography>
                                    <Box sx={{ width: '100%', mt: 2 }}>
                                        <LinearProgress variant="determinate" value={progress}/>
                                        <Typography variant="caption" color="text.secondary">
                                            {`${Math.round(progress)}%`}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Status: {asset.status}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Maintenance: {asset.maintenance}%
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
            <AddAssetModal open={open} onClose={handleClose}/>
        </React.Fragment>
    );
}

export default Assets;