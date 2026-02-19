import express from 'express';
import { addExpense, cogsPayout } from '../controllers/expenseController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { addExpenseSchema, cogsPayoutSchema } from '../validators';

const router = express.Router();

router.post('/', authMiddleware, loadPermissions, requirePermission('finance.edit'), validateRequest(addExpenseSchema), addExpense);
router.post('/cogs-payout', authMiddleware, loadPermissions, requirePermission('finance.edit'), validateRequest(cogsPayoutSchema), cogsPayout);

export default router;
