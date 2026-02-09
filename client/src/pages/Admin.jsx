import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  Alert,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../utils/api';

const Admin = () => {
  const userRole = localStorage.getItem('userRole');
  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Role dialog states
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  
  // Approval dialog
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState('');

  useEffect(() => {
    fetchRequests();
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/requests', {
        headers: { 'x-auth-token': token }
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/roles', {
        headers: { 'x-auth-token': token }
      });
      setRoles(res.data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/permissions', {
        headers: { 'x-auth-token': token }
      });
      setPermissions(res.data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const handleCreateRole = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/roles', {
        role_name: roleName,
        description: roleDescription,
        permissions: selectedPermissions
      }, {
        headers: { 'x-auth-token': token }
      });
      setMessage('Role created successfully');
      setRoleDialog(false);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      fetchRoles();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error creating role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/roles/${roleId}`, {
        headers: { 'x-auth-token': token }
      });
      setMessage('Role deleted successfully');
      fetchRoles();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error deleting role');
    }
  };

  const handleApproveRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/requests/${selectedRequest}/approve`, {
        role_id: selectedRoleForApproval || null
      }, {
        headers: { 'x-auth-token': token }
      });
      setMessage('Request approved successfully');
      setApprovalDialog(false);
      setSelectedRequest(null);
      setSelectedRoleForApproval('');
      fetchRequests();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error approving request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/requests/${requestId}/reject`, {}, {
        headers: { 'x-auth-token': token }
      });
      setMessage('Request rejected');
      fetchRequests();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error rejecting request');
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  if (!userRole || userRole.toLowerCase() !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab 
            label={
              <Badge badgeContent={requests.length} color="error">
                User Requests
              </Badge>
            }
          />
          <Tab label="Roles & Permissions" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Overview
          </Typography>
          <Typography color="text.secondary">
            Total Roles: {roles.length} | Pending Requests: {requests.length}
          </Typography>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pending User Requests
          </Typography>

          {loading ? (
            <Typography>Loading...</Typography>
          ) : requests.length === 0 ? (
            <Typography color="text.secondary">No pending requests</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Requested At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.request_id}>
                      <TableCell>{request.name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button 
                          variant="contained" 
                          color="success" 
                          size="small" 
                          onClick={() => {
                            setSelectedRequest(request.request_id);
                            setApprovalDialog(true);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="error" 
                          size="small" 
                          onClick={() => handleReject(request.request_id)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Roles & Permissions</Typography>
            <Button variant="contained" onClick={() => setRoleDialog(true)}>
              Create Role
            </Button>
          </Box>

          <Paper sx={{ p: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Role Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Permissions</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.role_id}>
                      <TableCell>{role.role_name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <Chip label={`${role.permission_count} permissions`} size="small" />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRole(role.role_id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
          <Typography color="text.secondary">
            Business settings will appear here
          </Typography>
        </Paper>
      )}

      {/* Create Role Dialog */}
      <Dialog open={roleDialog} onClose={() => setRoleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Role</DialogTitle>
        <DialogContent>
          <TextField
            label="Role Name"
            fullWidth
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle1" gutterBottom>
            Select Permissions
          </Typography>
          
          {Object.keys(groupedPermissions).map(category => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {category}
              </Typography>
              <FormGroup>
                {groupedPermissions[category].map(perm => (
                  <FormControlLabel
                    key={perm.permission_id}
                    control={
                      <Checkbox
                        checked={selectedPermissions.includes(perm.permission_id)}
                        onChange={() => handlePermissionToggle(perm.permission_id)}
                      />
                    }
                    label={perm.permission_name}
                  />
                ))}
              </FormGroup>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRole} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Approve User Request</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Assign Role</InputLabel>
            <Select
              value={selectedRoleForApproval}
              onChange={(e) => setSelectedRoleForApproval(e.target.value)}
              label="Assign Role"
            >
              <MenuItem value="">No Role (Basic Access)</MenuItem>
              {roles.map(role => (
                <MenuItem key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button onClick={handleApproveRequest} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;
