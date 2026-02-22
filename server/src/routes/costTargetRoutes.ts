import { Router } from 'express';
import { addCostTarget, getCostTargets } from '../controllers/costTargetController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.post('/', authMiddleware, loadUserBusiness, addCostTarget);
router.get('/', authMiddleware, loadUserBusiness, getCostTargets);

export default router;
