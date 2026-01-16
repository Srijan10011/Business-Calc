import { Router } from 'express';
import { addInventoryItem, getInventoryItems, updateInventoryStock } from '../controllers/inventoryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addInventoryItem);
router.get('/', authMiddleware, getInventoryItems);
router.patch('/:id/stock', authMiddleware, updateInventoryStock);

export default router;
