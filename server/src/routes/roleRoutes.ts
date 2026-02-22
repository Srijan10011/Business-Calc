import express from 'express';
import { 
    getPermissions, 
    createPermission, 
    getRoles, 
    createRole,
    checkDuplicateRole,
    getRoleDetails, 
    updateRolePermissions,
    deleteRole 
} from '../controllers/roleController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/permissions', authMiddleware, loadUserBusiness, getPermissions);
router.post('/permissions', authMiddleware, loadUserBusiness, createPermission);

router.get('/roles', authMiddleware, loadUserBusiness, getRoles);
router.post('/roles', authMiddleware, loadUserBusiness, createRole);
router.post('/roles/check-duplicate', authMiddleware, loadUserBusiness, checkDuplicateRole);
router.get('/roles/:role_id', authMiddleware, loadUserBusiness, getRoleDetails);
router.put('/roles/:role_id/permissions', authMiddleware, loadUserBusiness, updateRolePermissions);
router.delete('/roles/:role_id', authMiddleware, loadUserBusiness, deleteRole);

export default router;
