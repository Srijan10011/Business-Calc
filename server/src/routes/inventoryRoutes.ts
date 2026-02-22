import { Router } from 'express';
import { addInventoryItem, getInventoryItems, updateInventoryStock } from '../controllers/inventoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.post('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('inventory.create'), addInventoryItem);
router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('inventory.view'), getInventoryItems);
router.patch('/:id/stock', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('inventory.edit'), updateInventoryStock);

export default router;
