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

const router = express.Router();

router.get('/permissions', authMiddleware, getPermissions);
router.post('/permissions', authMiddleware, createPermission);

router.get('/roles', authMiddleware, getRoles);
router.post('/roles', authMiddleware, createRole);
router.post('/roles/check-duplicate', authMiddleware, checkDuplicateRole);
router.get('/roles/:role_id', authMiddleware, getRoleDetails);
router.put('/roles/:role_id/permissions', authMiddleware, updateRolePermissions);
router.delete('/roles/:role_id', authMiddleware, deleteRole);

export default router;
