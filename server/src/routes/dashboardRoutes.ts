import express from 'express';
import { getDashboardData, getMoneyFlow } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/', authMiddleware, loadUserBusiness, getDashboardData);
router.get('/money-flow', authMiddleware, loadUserBusiness, getMoneyFlow);

export default router;
