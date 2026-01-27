import { Router } from 'express';
import { addCostTarget, getCostTargets } from '../controllers/costTargetController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addCostTarget);
router.get('/', authMiddleware, getCostTargets);

export default router;
