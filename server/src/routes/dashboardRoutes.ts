import express from 'express';
import { getDashboardData, getMoneyFlow } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getDashboardData);
router.get('/money-flow', authMiddleware, getMoneyFlow);

export default router;
