import { Router } from 'express';
import { addCustomer, getCustomers } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getCustomers);
router.post('/', authMiddleware, addCustomer);

export default router;
