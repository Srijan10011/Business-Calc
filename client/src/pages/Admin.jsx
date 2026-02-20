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
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../utils/api';
import { useSnackbar } from '../context/SnackbarContext';

const Admin = () => {
  const { showSnackbar } = useSnackbar();
  const userRole = localStorage.getItem('userRole');
  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Role dialog states
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [originalRoleName, setOriginalRoleName] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  
  // Approval dialog
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState('');
  
  // View permissions dialog
  const [viewPermissionsDialog, setViewPermissionsDialog] = useState(false);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [selectedUserForView, setSelectedUserForView] = useState(null);
  
  // Change role dialog
  const [changeRoleDialog, setChangeRoleDialog] = useState(false);
  const [newRoleForUser, setNewRoleForUser] = useState('');
  const [confirmChangeDialog, setConfirmChangeDialog] = useState(false);
  const [duplicateRoleDialog, setDuplicateRoleDialog] = useState(false);
  const [duplicateRoleName, setDuplicateRoleName] = useState('');
  const [duplicateRoleId, setDuplicateRoleId] = useState(null);
  const [businessId, setBusinessId] = useState('');

  useEffect(() => {
    fetchRequests();
    fetchRoles();
    fetchPermissions();
    fetchUsers();
    fetchBusinessId();
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
      showSnackbar('Failed to fetch requests. Please try again.', 'error');
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
      showSnackbar('Failed to fetch roles. Please try again.', 'error');
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
      showSnackbar('Failed to fetch permissions. Please try again.', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/business-users', {
        headers: { 'x-auth-token': token }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      showSnackbar('Failed to fetch users. Please try again.', 'error');
    }
  };

  const fetchBusinessId = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/auth/business-id', {
        headers: { 'x-auth-token': token }
      });
      setBusinessId(res.data.business_id);
    } catch (err) {
      console.error('Error fetching business ID:', err);
    }
  };

  const handleCreateRole = async () => {
    console.log('isEditingRole:', isEditingRole);
    console.log('roleName:', roleName);
    console.log('originalRoleName:', originalRoleName);
    console.log('Are they equal?', roleName === originalRoleName);
    
    // Prevent saving if editing and role name hasn't changed
    if (isEditingRole && roleName === originalRoleName) {
      setMessage('Please change the role name to create a new role');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (isEditingRole) {
        // First check if duplicate exists
        const checkRes = await api.post('/roles/check-duplicate', {
          permissions: selectedPermissions,
          exclude_role_id: editingRoleId
        }, {
          headers: { 'x-auth-token': token }
        });

        if (checkRes.data.exists) {
          // Show duplicate dialog
          setDuplicateRoleName(checkRes.data.role_name);
          setDuplicateRoleId(checkRes.data.role_id);
          setDuplicateRoleDialog(true);
          return;
        }

        console.log('Creating new role with name:', roleName);
        // Creating new role and assigning to specific user
        const roleRes = await api.post('/roles', {
          role_name: roleName,
          description: roleDescription,
          permissions: selectedPermissions
        }, {
          headers: { 'x-auth-token': token }
        });
        
        console.log('Role created, updating user...');
        // Update user's role_id
        await api.put(`/business-users/${editingUserId}/role`, {
          role_id: roleRes.data.role_id
        }, {
          headers: { 'x-auth-token': token }
        });
        
        setMessage('New role created and assigned to user');
      } else {
        // Normal role creation
        await api.post('/roles', {
          role_name: roleName,
          description: roleDescription,
          permissions: selectedPermissions
        }, {
          headers: { 'x-auth-token': token }
        });
        setMessage('Role created successfully');
      }
      
      setRoleDialog(false);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      setIsEditingRole(false);
      setEditingRoleId(null);
      setOriginalRoleName('');
      setEditingUserId(null);
      fetchRoles();
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error creating role:', err);
      showSnackbar(err.response?.data?.message || 'Failed to create role. Please try again.', 'error');
      console.error('Error response:', err.response?.data);
      
      if (err.response?.data?.msg) {
        setMessage(err.response.data.msg);
      } else {
        setMessage('Error creating role. Please try again.');
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleChangeUserRole = async () => {
    setChangeRoleDialog(false);
    setConfirmChangeDialog(true);
  };

  const confirmRoleChange = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/business-users/${selectedUserForView.user_id}/role`, {
        role_id: newRoleForUser
      }, {
        headers: { 'x-auth-token': token }
      });
      setMessage('User role updated successfully');
      setConfirmChangeDialog(false);
      setViewPermissionsDialog(false);
      setNewRoleForUser('');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating user role');
    }
  };

  const handleUseDuplicateRole = async () => {
    setDuplicateRoleDialog(false);
    // Directly assign the existing role to the user
    try {
      const token = localStorage.getItem('token');
      await api.put(`/business-users/${editingUserId}/role`, {
        role_id: duplicateRoleId
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setMessage(`User assigned to existing role: ${duplicateRoleName}`);
      setRoleDialog(false);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      setIsEditingRole(false);
      setEditingRoleId(null);
      setOriginalRoleName('');
      setEditingUserId(null);
      fetchRoles();
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error assigning role to user');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreateDuplicateAnyway = async () => {
    setDuplicateRoleDialog(false);
    // Proceed with creating the role
    try {
      const token = localStorage.getItem('token');
      const roleRes = await api.post('/roles', {
        role_name: roleName,
        description: roleDescription,
        permissions: selectedPermissions
      }, {
        headers: { 'x-auth-token': token }
      });
      
      await api.put(`/business-users/${editingUserId}/role`, {
        role_id: roleRes.data.role_id
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setMessage('New role created and assigned to user');
      setRoleDialog(false);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      setIsEditingRole(false);
      setEditingRoleId(null);
      setOriginalRoleName('');
      setEditingUserId(null);
      fetchRoles();
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error creating role:', err);
      showSnackbar(err.response?.data?.message || 'Failed to create role. Please try again.', 'error');
      if (err.response?.data?.msg) {
        setMessage(err.response.data.msg);
      } else {
        setMessage('Error creating role. Please try again.');
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/roles/${roleId}`, {
        headers: { 'x-auth-token': token }
      });
      setMessage('Role deleted successfully');
      fetchRoles();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error deleting role');
    }
  };

  const handleViewPermissions = async (roleId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/roles/${roleId}`, {
        headers: { 'x-auth-token': token }
      });
      setRolePermissions(res.data.permissions || []);
      setViewPermissionsDialog(true);
    } catch (err) {
      setMessage('Error fetching role permissions');
    }
  };

  const handleApproveRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/requests/${selectedRequest}/approve`, {
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
      await api.post(`/requests/${requestId}/reject`, {}, {
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
          <Tab label="Users" />
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
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Business Users
          </Typography>

          {loading ? (
            <Typography>Loading...</Typography>
          ) : users.length === 0 ? (
            <Typography color="text.secondary">No users found</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>User Type</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Joined At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.user_type || 'User'} 
                          size="small" 
                          color={user.user_type === 'owner' ? 'primary' : 'default'} 
                        />
                      </TableCell>
                      <TableCell>
                        {user.role_name ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={user.role_name} size="small" color="secondary" />
                            <IconButton size="small" onClick={() => {
                              setSelectedUserForView(user);
                              handleViewPermissions(user.role_id);
                            }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">No Role Assigned</Typography>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              onClick={() => {
                                setSelectedUserForView(user);
                                setChangeRoleDialog(true);
                              }}
                            >
                              Assign Role
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {activeTab === 3 && (
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
                        <IconButton size="small" onClick={() => handleViewPermissions(role.role_id)}>
                          <VisibilityIcon />
                        </IconButton>
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

      {activeTab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Business Information
            </Typography>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Business ID
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>
                {businessId || 'Loading...'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Create Role Dialog */}
      <Dialog open={roleDialog} onClose={() => {
        setRoleDialog(false);
        setIsEditingRole(false);
        setEditingRoleId(null);
        setOriginalRoleName('');
        setEditingUserId(null);
        setRoleName('');
        setRoleDescription('');
        setSelectedPermissions([]);
      }} maxWidth="md" fullWidth>
        <DialogTitle>{isEditingRole ? 'Edit User Permissions' : 'Create New Role'}</DialogTitle>
        <DialogContent>
          {isEditingRole && roleName === originalRoleName && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              The change will affect all users associated with this role. Please change the role name to create a new role for this user only.
            </Alert>
          )}
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
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {Object.keys(groupedPermissions).map(category => (
              <Paper key={category} elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1.5, pb: 0.5, borderBottom: '2px solid', borderColor: 'primary.main' }}>
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
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRoleDialog(false);
            setIsEditingRole(false);
            setEditingRoleId(null);
            setOriginalRoleName('');
            setEditingUserId(null);
            setRoleName('');
            setRoleDescription('');
            setSelectedPermissions([]);
          }}>Cancel</Button>
          <Button 
            onClick={handleCreateRole} 
            variant="contained"
            disabled={isEditingRole && roleName === originalRoleName}
          >
            {isEditingRole ? 'Save Changes' : 'Create'}
          </Button>
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

      {/* View Permissions Dialog */}
      <Dialog open={viewPermissionsDialog} onClose={() => setViewPermissionsDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 1.5 }}>
          <Typography variant="subtitle1">Role Permissions</Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {rolePermissions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">No permissions assigned to this role</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {Object.entries(rolePermissions.reduce((acc, perm) => {
                if (!acc[perm.category]) acc[perm.category] = [];
                acc[perm.category].push(perm);
                return acc;
              }, {})).map(([category, perms]) => (
                <Paper key={category} elevation={2} sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1.5, pb: 0.5, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    {category}
                  </Typography>
                  <Box>
                    {perms.map(perm => (
                      <Typography key={perm.permission_id} variant="body2" sx={{ py: 0.5 }}>
                        • {perm.permission_name}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => {
                setViewPermissionsDialog(false);
                setIsEditingRole(true);
                setEditingRoleId(selectedUserForView?.role_id);
                setOriginalRoleName(selectedUserForView?.role_name || '');
                setEditingUserId(selectedUserForView?.user_id);
                setRoleName(selectedUserForView?.role_name || '');
                setRoleDescription('');
                setSelectedPermissions(rolePermissions.map(p => p.permission_id));
                setRoleDialog(true);
              }} 
              variant="outlined" 
              size="small"
            >
              Edit Permissions
            </Button>
            <Button 
              onClick={() => {
                setChangeRoleDialog(true);
              }} 
              variant="outlined" 
              size="small"
              color="secondary"
            >
              Change Role
            </Button>
          </Box>
          <Button onClick={() => setViewPermissionsDialog(false)} variant="contained" size="small">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleDialog} onClose={() => setChangeRoleDialog(false)}>
        <DialogTitle>{selectedUserForView?.role_name ? 'Change User Role' : 'Assign Role'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Role</InputLabel>
            <Select
              value={newRoleForUser}
              onChange={(e) => setNewRoleForUser(e.target.value)}
              label="Select Role"
            >
              {roles.filter(r => r.role_id !== selectedUserForView?.role_id).map(role => (
                <MenuItem key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeRoleDialog(false)}>Cancel</Button>
          <Button onClick={handleChangeUserRole} variant="contained" disabled={!newRoleForUser}>
            Change
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Role Detection Dialog */}
      <Dialog open={duplicateRoleDialog} onClose={() => setDuplicateRoleDialog(false)}>
        <DialogTitle>Duplicate Permissions Detected</DialogTitle>
        <DialogContent>
          <Typography>
            Role <strong>"{duplicateRoleName}"</strong> already exists with the same permissions. Would you like to use that role instead?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDuplicateAnyway}>
            No, Create New Role
          </Button>
          <Button onClick={handleUseDuplicateRole} variant="contained" color="primary">
            Yes, Use Existing Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Role Change Dialog */}
      <Dialog open={confirmChangeDialog} onClose={() => setConfirmChangeDialog(false)}>
        <DialogTitle>{selectedUserForView?.role_name ? 'Confirm Role Change' : 'Confirm Role Assignment'}</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedUserForView?.role_name ? (
              <>Confirming this will change the role of <strong>{selectedUserForView?.name}</strong> from <strong>{selectedUserForView?.role_name}</strong> to <strong>{roles.find(r => r.role_id === newRoleForUser)?.role_name}</strong></>
            ) : (
              <>Confirming this will assign <strong>{selectedUserForView?.name}</strong> the role of <strong>{roles.find(r => r.role_id === newRoleForUser)?.role_name}</strong></>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setConfirmChangeDialog(false);
            setChangeRoleDialog(true);
          }}>Cancel</Button>
          <Button onClick={confirmRoleChange} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;
