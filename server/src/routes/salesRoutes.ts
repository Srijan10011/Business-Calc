import { Router } from 'express';
import { addSale } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addSale);

export default router;
