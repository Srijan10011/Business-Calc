import { Router } from 'express';
import { getAccounts, getTransactions, transferFunds, transferCOGS } from '../controllers/accountController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getAccounts);
router.get('/transactions', authMiddleware, getTransactions);
router.post('/transfer', authMiddleware, transferFunds);
router.post('/transfer-cogs', authMiddleware, transferCOGS);

export default router;
