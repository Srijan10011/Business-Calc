import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Link
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

export default function Team() {
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        salary: '',
        enroll_date: new Date().toISOString().split('T')[0],
        status: 'active'
    });

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            console.log('Fetching team members...');
            const response = await axios.get('http://localhost:5000/api/team', {
                headers: { 'x-auth-token': token }
            });
            console.log('Team members response:', response.data);
            setTeamMembers(response.data);
        } catch (error) {
            console.error('Error fetching team members:', error);
            console.error('Error response:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = (member) => {
        if (member) {
            setEditingMember(member);
            setFormData({
                name: member.name,
                email: member.email || '',
                phone: member.phone || '',
                position: member.position,
                department: member.department || '',
                salary: member.salary?.toString() || '',
                enroll_date: member.enroll_date.split('T')[0],
                status: member.status
            });
        } else {
            setEditingMember(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                position: '',
                department: '',
                salary: '',
                enroll_date: new Date().toISOString().split('T')[0],
                status: 'active'
            });
        }
        setError('');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingMember(null);
        setError('');
    };

    const handleSave = async () => {
        if (!formData.name || !formData.position) {
            setError('Name and position are required');
            return;
        }

        setError('');

        try {
            const token = localStorage.getItem('token');
            const data = {
                ...formData,
                salary: formData.salary ? parseFloat(formData.salary) : null
            };

            if (editingMember) {
                await axios.put(`http://localhost:5000/api/team/${editingMember.member_id}`, data, {
                    headers: { 'x-auth-token': token }
                });
            } else {
                await axios.post('http://localhost:5000/api/team', data, {
                    headers: { 'x-auth-token': token }
                });
            }

            await fetchTeamMembers();
            handleClose();
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error saving team member';
            setError(errorMessage);
        }
    };

    const handleDelete = async (memberId) => {
        if (!window.confirm('Are you sure you want to delete this team member?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/team/${memberId}`, {
                headers: { 'x-auth-token': token }
            });
            await fetchTeamMembers();
        } catch (error) {
            console.error('Error deleting team member:', error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'warning';
            case 'terminated': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Team Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                >
                    Add Team Member
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Salary</TableCell>
                            <TableCell>Enroll Date</TableCell>
                            <TableCell>Months Working</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {teamMembers.map((member) => (
                            <TableRow key={member.member_id}>
                                <TableCell>
                                    <Link 
                                        component="button"
                                        variant="body2"
                                        onClick={() => navigate(`/team/${member.member_id}`)}
                                        sx={{ textAlign: 'left' }}
                                    >
                                        {member.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{member.position}</TableCell>
                                <TableCell>{member.department || '-'}</TableCell>
                                <TableCell>{member.email || '-'}</TableCell>
                                <TableCell>{member.phone || '-'}</TableCell>
                                <TableCell>
                                    {member.salary ? `₹${member.salary.toLocaleString('en-IN')}` : '-'}
                                </TableCell>
                                <TableCell>{formatDate(member.enroll_date)}</TableCell>
                                <TableCell>{Math.floor(member.months_working)} months</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={member.status} 
                                        color={getStatusColor(member.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleOpen(member)} size="small">
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton onClick={() => handleDelete(member.member_id)} size="small">
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {teamMembers.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={10} align="center">
                                    No team members found. Click "Add Team Member" to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={10} align="center">
                                    Loading team members...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Name *"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Position *"
                                fullWidth
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Department"
                                fullWidth
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Email"
                                type="email"
                                fullWidth
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Phone"
                                fullWidth
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Salary"
                                type="number"
                                fullWidth
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Enroll Date"
                                type="date"
                                fullWidth
                                value={formData.enroll_date}
                                onChange={(e) => setFormData({ ...formData, enroll_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={formData.status}
                                    label="Status"
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="terminated">Terminated</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
                        {editingMember ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
