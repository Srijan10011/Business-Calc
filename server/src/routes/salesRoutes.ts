import { Router } from 'express';
import { addSale, getSales, recordPayment } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission, requireAnyPermission } from '../middleware/permissionMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { createSaleSchema, recordPaymentSchema } from '../validators';

const router = Router();

router.post('/', authMiddleware, loadPermissions, requirePermission('sales.create'), validateRequest(createSaleSchema), addSale);
router.get('/', authMiddleware, loadPermissions, requireAnyPermission('sales.view', 'sales.create'), getSales);
router.post('/:id/payment', authMiddleware, loadPermissions, requirePermission('sales.edit'), validateRequest(recordPaymentSchema), recordPayment);

export default router;
