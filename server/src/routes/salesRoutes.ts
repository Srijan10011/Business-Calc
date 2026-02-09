import { Router } from 'express';
import { addSale, getSales, recordPayment } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

router.post('/', authMiddleware, loadPermissions, requirePermission('sales.create'), addSale);
router.get('/', authMiddleware, loadPermissions, requirePermission('sales.view'), getSales);
router.post('/:id/payment', authMiddleware, loadPermissions, requirePermission('sales.edit'), recordPayment);

export default router;
