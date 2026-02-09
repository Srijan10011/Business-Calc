import express from 'express';
import { getMonthlyReport } from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = express.Router();

router.get('/monthly', authMiddleware, loadPermissions, requirePermission('reports.view'), getMonthlyReport);

export default router;
