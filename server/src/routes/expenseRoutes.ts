import express from 'express';
import { addExpense, cogsPayout } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, addExpense);
router.post('/cogs-payout', authMiddleware, cogsPayout);

export default router;
