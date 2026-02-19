import express from 'express';
import * as recurringCostController from '../controllers/recurringCostController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, recurringCostController.createRecurringCost);
router.get('/', authMiddleware, recurringCostController.getRecurringCosts);
router.get('/history', authMiddleware, recurringCostController.getRecurringCostHistory);
router.post('/transition-month', authMiddleware, recurringCostController.transitionMonth);

export default router;
