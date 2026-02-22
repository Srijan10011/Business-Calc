import { Router } from 'express';
import { addCustomer, getCustomers, getCustomerById, getCustomerSales, getCustomerPayments } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomers);
router.get('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomerById);
router.get('/:id/sales', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomerSales);
router.get('/:id/payments', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomerPayments);
router.post('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.create'), addCustomer);

export default router;
