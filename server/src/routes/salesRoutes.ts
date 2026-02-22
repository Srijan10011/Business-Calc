import { Router } from 'express';
import { addSale, getSales, recordPayment } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission, requireAnyPermission } from '../middleware/permissionMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { createSaleSchema, recordPaymentSchema } from '../validators';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.post('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('sales.create'), validateRequest(createSaleSchema), addSale);
router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requireAnyPermission('sales.view', 'sales.create'), getSales);
router.post('/:id/payment', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('sales.edit'), validateRequest(recordPaymentSchema), recordPayment);

export default router;
