import { Router } from 'express';
import { addCustomer, getCustomers, getCustomerById, getCustomerSales, getCustomerPayments, updateCustomer, deleteCustomer } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomers);
router.get('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomerById);
router.get('/:id/sales', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomerSales);
router.get('/:id/payments', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.view'), getCustomerPayments);
router.post('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.create'), addCustomer);
router.put('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.edit'), updateCustomer);
router.delete('/:id', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('customers.delete'), deleteCustomer);

export default router;
