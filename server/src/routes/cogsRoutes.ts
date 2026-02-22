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
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

// Get business categories
router.get('/categories', authMiddleware, loadUserBusiness, getBusinessCategories);

// Get COGS data
router.get('/data', authMiddleware, loadUserBusiness, getCOGSData);

// Add cost category and allocation
router.post('/cost-category', authMiddleware, loadUserBusiness, addCostCategory);

// Get product cost allocations
router.get('/product/:product_id/allocations', authMiddleware, loadUserBusiness, getProductCostAllocations);

// Update cost allocation
router.put('/allocation/:allocation_id', authMiddleware, loadUserBusiness, updateCostAllocation);

// Delete cost allocation
router.delete('/allocation/:allocation_id', authMiddleware, deleteCostAllocation);

export default router;
