import { Router } from 'express';
import { addProductCostRule } from '../controllers/productCostRuleController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.post('/', authMiddleware, loadUserBusiness, addProductCostRule);

export default router;
