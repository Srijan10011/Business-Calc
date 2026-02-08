import express from 'express';
import { getMonthlyReport } from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/monthly', authMiddleware, getMonthlyReport);

export default router;
