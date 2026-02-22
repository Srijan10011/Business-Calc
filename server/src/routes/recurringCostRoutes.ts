import express from 'express';
import * as recurringCostController from '../controllers/recurringCostController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.post('/', authMiddleware, loadUserBusiness, recurringCostController.createRecurringCost);
router.get('/', authMiddleware, loadUserBusiness, recurringCostController.getRecurringCosts);
router.get('/history', authMiddleware, loadUserBusiness, recurringCostController.getRecurringCostHistory);
router.post('/transition-month', authMiddleware, loadUserBusiness, recurringCostController.transitionMonth);

export default router;
