import { Router } from 'express';
import { addSale, getSales, recordPayment } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addSale);
router.get('/', authMiddleware, getSales);
router.post('/:id/payment', authMiddleware, recordPayment);

export default router;
