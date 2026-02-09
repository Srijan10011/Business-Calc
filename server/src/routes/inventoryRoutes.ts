import { Router } from 'express';
import { addInventoryItem, getInventoryItems, updateInventoryStock } from '../controllers/inventoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

router.post('/', authMiddleware, loadPermissions, requirePermission('inventory.create'), addInventoryItem);
router.get('/', authMiddleware, loadPermissions, requirePermission('inventory.view'), getInventoryItems);
router.patch('/:id/stock', authMiddleware, loadPermissions, requirePermission('inventory.edit'), updateInventoryStock);

export default router;
