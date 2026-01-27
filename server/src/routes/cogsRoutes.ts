import { Router } from 'express';
import { 
    addCostCategory, 
    getProductCostAllocations, 
    updateCostAllocation, 
    deleteCostAllocation,
    getBusinessCategories,
    getCOGSData
} from '../controllers/cogsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get business categories
router.get('/categories', authMiddleware, getBusinessCategories);

// Get COGS data
router.get('/data', authMiddleware, getCOGSData);

// Add cost category and allocation
router.post('/cost-category', authMiddleware, addCostCategory);

// Get product cost allocations
router.get('/product/:product_id/allocations', authMiddleware, getProductCostAllocations);

// Update cost allocation
router.put('/allocation/:allocation_id', authMiddleware, updateCostAllocation);

// Delete cost allocation
router.delete('/allocation/:allocation_id', authMiddleware, deleteCostAllocation);

export default router;
