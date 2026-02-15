import { Router } from 'express';
import { addCustomer, getCustomers, getCustomerById, getCustomerSales } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

router.get('/', authMiddleware, loadPermissions, requirePermission('customers.view'), getCustomers);
router.get('/:id', authMiddleware, loadPermissions, requirePermission('customers.view'), getCustomerById);
router.get('/:id/sales', authMiddleware, loadPermissions, requirePermission('customers.view'), getCustomerSales);
router.post('/', authMiddleware, loadPermissions, requirePermission('customers.create'), addCustomer);

export default router;
