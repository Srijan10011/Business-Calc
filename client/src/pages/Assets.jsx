import * as React from 'react';
import { Box, Button, Grid, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Title from '../components/dashboard/Title';
import AddAssetModal from '../components/assets/AddAssetModal';
import api from '../utils/api';

function Assets() {
    const [open, setOpen] = React.useState(false);
    const [assets, setAssets] = React.useState([]);

    const fetchAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/assets', {
                headers: { 'x-auth-token': token }
            });
            setAssets(response.data);
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
    };

    React.useEffect(() => {
        fetchAssets();
    }, []);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        fetchAssets(); // Refresh assets after adding new one
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
                    );
                })}
            </Grid>
            <AddAssetModal open={open} onClose={handleClose}/>
        </React.Fragment>
    );
}

export default Assets;