import React from 'react';
import {
    Typography,
    Paper,
    Box,
    TextField,
    Button,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Stack
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import Title from '../components/dashboard/Title';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

const Reports = () => {
    const [selectedMonth, setSelectedMonth] = React.useState(new Date().toISOString().slice(0, 7));
    const [reportData, setReportData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const fetchMonthlyReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/reports/monthly?month=${selectedMonth}`, {
                headers: { 'x-auth-token': token }
            });
            setReportData(response.data);
        } catch (error) {
            showSnackbar('Failed to fetch report. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Title>Monthly Business Report</Title>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        label="Select Month"
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <Button variant="contained" onClick={fetchMonthlyReport} disabled={loading}>
                        {loading ? 'Loading...' : 'Generate'}
                    </Button>
                </Box>
            </Box>

            {reportData && (
                <>
                    {/* Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body2" sx={{ opacity: 0.9 }}>Revenue</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                                                ₹{reportData.summary?.totalRevenue?.toLocaleString('en-IN') || 0}
                                            </Typography>
                                        </Box>
                                        <TrendingUpIcon sx={{ fontSize: 35, opacity: 0.7 }} />
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body2" sx={{ opacity: 0.9 }}>Expenses</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                                                ₹{reportData.summary?.totalExpenses?.toLocaleString('en-IN') || 0}
                                            </Typography>
                                        </Box>
                                        <TrendingDownIcon sx={{ fontSize: 35, opacity: 0.7 }} />
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ 
                                background: reportData.summary?.netProfit >= 0 
                                    ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                                    : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 
                                color: 'white' 
                            }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body2" sx={{ opacity: 0.9 }}>Net Profit</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                                                ₹{reportData.summary?.netProfit?.toLocaleString('en-IN') || 0}
                                            </Typography>
                                        </Box>
                                        {reportData.summary?.netProfit >= 0 ? 
                                            <TrendingUpIcon sx={{ fontSize: 35, opacity: 0.7 }} /> : 
                                            <TrendingDownIcon sx={{ fontSize: 35, opacity: 0.7 }} />
                                        }
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                                <CardContent>
                                    <Typography variant="body2" color="textSecondary">Total Sales</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                                        {reportData.summary?.totalSales || 0} units
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Tables with spacing */}
                    <Grid container spacing={3}>
                        {/* Product Sales */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Product Sales</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reportData.productSales?.map((product, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{product.product_name}</TableCell>
                                                <TableCell align="right">{product.quantity}</TableCell>
                                                <TableCell align="right">₹{product.total_amount?.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {reportData.productSales?.length === 0 && (
                                            <TableRow><TableCell colSpan={3} align="center">No data</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>

                        {/* Customer Sales */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Top Customers</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Products</TableCell>
                                            <TableCell align="right">Total Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(
                                            reportData.customerSales?.reduce((acc, sale) => {
                                                if (!acc[sale.customer_name]) {
                                                    acc[sale.customer_name] = { products: [], total: 0 };
                                                }
                                                acc[sale.customer_name].products.push(
                                                    `${sale.product_name} (${sale.quantity}x)`
                                                );
                                                acc[sale.customer_name].total += parseFloat(sale.total_amount || 0);
                                                return acc;
                                            }, {}) || {}
                                        ).slice(0, 5).map(([customer, data], index) => (
                                            <TableRow key={index}>
                                                <TableCell>{customer}</TableCell>
                                                <TableCell>
                                                    {data.products.map((p, i) => (
                                                        <Box key={i}>{p}</Box>
                                                    ))}
                                                </TableCell>
                                                <TableCell align="right">₹{data.total.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {reportData.customerSales?.length === 0 && (
                                            <TableRow><TableCell colSpan={3} align="center">No data</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>

                        {/* Inventory */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Inventory Purchased</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Item</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Cost</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reportData.inventoryPurchased?.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.item_name}</TableCell>
                                                <TableCell align="right">{item.quantity}</TableCell>
                                                <TableCell align="right">₹{item.total_amount?.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {reportData.inventoryPurchased?.length === 0 && (
                                            <TableRow><TableCell colSpan={3} align="center">No data</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>

                        {/* Expenses */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Expenses</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reportData.expenses?.map((expense, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{expense.description}</TableCell>
                                                <TableCell align="right">₹{expense.amount?.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {reportData.expenses?.length === 0 && (
                                            <TableRow><TableCell colSpan={2} align="center">No data</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        </Grid>

                        {/* Account Balances */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>Account Balances</Typography>
                                <Grid container spacing={2}>
                                    {reportData.accountBalances?.map((account, index) => (
                                        <Grid item xs={6} md={3} key={index}>
                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                <Typography variant="caption" color="textSecondary">{account.account_name}</Typography>
                                                <Typography variant="h6" color="success.main">
                                                    ₹{account.balance?.toLocaleString('en-IN')}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>
                </>
            )}
        </Box>
    );
};

export default Reports;