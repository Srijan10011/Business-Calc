import { Router } from 'express';
import { addCustomer } from '../controllers/customerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addCustomer);

export default router;
