import express from 'express';
import { getMonthlyReport } from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/monthly', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('reports.view'), getMonthlyReport);

export default router;
