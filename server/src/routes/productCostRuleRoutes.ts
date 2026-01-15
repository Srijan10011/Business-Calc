import { Router } from 'express';
import { addProductCostRule } from '../controllers/productCostRuleController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addProductCostRule);

export default router;
