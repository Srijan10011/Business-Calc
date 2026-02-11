import express from 'express';
import { addExpense, cogsPayout } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = express.Router();

router.post('/', authMiddleware, loadPermissions, requirePermission('finance.edit'), addExpense);
router.post('/cogs-payout', authMiddleware, loadPermissions, requirePermission('finance.edit'), cogsPayout);

export default router;
