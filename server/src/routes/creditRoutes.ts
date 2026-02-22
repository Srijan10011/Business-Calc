import express from 'express';
import { getCreditPayables, payCreditAmount } from '../controllers/creditController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('credits.view'), getCreditPayables);
router.post('/pay', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('credits.manage'), payCreditAmount);

export default router;
