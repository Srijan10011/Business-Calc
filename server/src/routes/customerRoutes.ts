import { Router } from 'express';
import { addCustomer, getCustomers, getCustomerById, getCustomerSales } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getCustomers);
router.get('/:id', authMiddleware, getCustomerById);
router.get('/:id/sales', authMiddleware, getCustomerSales);
router.post('/', authMiddleware, addCustomer);

export default router;
