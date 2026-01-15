import { Router } from 'express';
import { createDefaultAccountsForAllExisting, getAccounts } from '../controllers/accountController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getAccounts);
router.post('/create-defaults', authMiddleware, createDefaultAccountsForAllExisting);

export default router;
