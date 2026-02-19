import { Router } from 'express';
import { getAccounts, getTransactions, transferFunds, transferCOGS } from '../controllers/accountController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { transferFundsSchema, transferCOGSSchema } from '../validators';

const router = Router();

router.get('/', authMiddleware, loadPermissions, requirePermission('finance.view'), getAccounts);
router.get('/transactions', authMiddleware, loadPermissions, requirePermission('finance.view'), getTransactions);
router.post('/transfer', authMiddleware, loadPermissions, requirePermission('finance.edit'), validateRequest(transferFundsSchema), transferFunds);
router.post('/transfer-cogs', authMiddleware, loadPermissions, requirePermission('finance.edit'), validateRequest(transferCOGSSchema), transferCOGS);

export default router;
