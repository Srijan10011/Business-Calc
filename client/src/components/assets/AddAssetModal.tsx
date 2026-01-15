import * as React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    MenuItem,
    Select,
    Typography
} from '@mui/material';

interface AddAssetModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAssetModal({ open, onClose }: AddAssetModalProps) {
    const [assetName, setAssetName] = React.useState('');
    const [category, setCategory] = React.useState('Machinery'); // Pre-select "Machinery"
    const [totalCost, setTotalCost] = React.useState('');
    const [recoveryMethod, setRecoveryMethod] = React.useState('percentage');
    const [recoveryValue, setRecoveryValue] = React.useState(''); // State for conditional input
    const [maintenancePercentage, setMaintenancePercentage] = React.useState('');

    const handleSaveAsset = () => {
        // Here you would typically send this data to your backend
        console.log({
            assetName,
            category,
            totalCost,
            recoveryMethod,
            recoveryValue, // Include this in the data
            maintenancePercentage,
        });
        onClose(); // Close the dialog after saving
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            label="Asset Name"
                            fullWidth
                            value={assetName}
                            onChange={(e) => setAssetName(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel id="category-label">Category</InputLabel>
                            <Select
                                labelId="category-label"
                                id="category-select"
                                value={category}
                                label="Category"
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <MenuItem value="Machinery">Machinery</MenuItem>
                                <MenuItem value="Vehicle">Vehicle</MenuItem>
                                <MenuItem value="Property">Property</MenuItem>
                                <MenuItem value="Electronics">Electronics</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Total Cost (₹)"
                            fullWidth
                            type="number"
                            value={totalCost}
                            onChange={(e) => setTotalCost(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl component="fieldset">
                            <Typography variant="body2" component="legend">Recovery Method</Typography>
                            <RadioGroup
                                row
                                name="recovery-method"
                                value={recoveryMethod}
                                onChange={(e) => setRecoveryMethod(e.target.value)}
                            >
                                <FormControlLabel value="percentage" control={<Radio />} label="Percentage per product" />
                                <FormControlLabel value="fixed" control={<Radio />} label="Fixed Rs per unit" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>
                    {recoveryMethod === 'percentage' && (
                        <Grid item xs={12}>
                            <TextField
                                label="Percentage (%)"
                                fullWidth
                                type="number"
                                value={recoveryValue}
                                onChange={(e) => setRecoveryValue(e.target.value)}
                                InputProps={{ endAdornment: <Typography>%</Typography> }}
                            />
                        </Grid>
                    )}
                    {recoveryMethod === 'fixed' && (
                        <Grid item xs={12}>
                            <TextField
                                label="Fixed Amount (₹)"
                                fullWidth
                                type="number"
                                value={recoveryValue}
                                onChange={(e) => setRecoveryValue(e.target.value)}
                                InputProps={{ startAdornment: <Typography>₹</Typography> }}
                            />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        <TextField
                            label="Maintenance %"
                            fullWidth
                            type="number"
                            value={maintenancePercentage}
                            onChange={(e) => setMaintenancePercentage(e.target.value)}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveAsset} variant="contained">Save Asset</Button>
            </DialogActions>
        </Dialog>
    );
}
