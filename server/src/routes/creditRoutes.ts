import express from 'express';
import { getCreditPayables, payCreditAmount } from '../controllers/creditController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = express.Router();

router.get('/', authMiddleware, loadPermissions, requirePermission('credits.view'), getCreditPayables);
router.post('/pay', authMiddleware, loadPermissions, requirePermission('credits.manage'), payCreditAmount);

export default router;
