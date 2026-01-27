import express from 'express';
import { getCreditPayables, payCreditAmount } from '../controllers/creditController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getCreditPayables);
router.post('/pay', authMiddleware, payCreditAmount);

export default router;
