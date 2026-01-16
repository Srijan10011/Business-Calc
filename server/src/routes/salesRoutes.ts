import { Router } from 'express';
import { addSale, getSales } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addSale);
router.get('/', authMiddleware, getSales);

export default router;
