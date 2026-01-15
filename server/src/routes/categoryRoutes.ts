import { Router } from 'express';
import { checkCategory, createCategory } from '../controllers/categoryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/check', authMiddleware, checkCategory);
router.post('/', authMiddleware, createCategory);

export default router;
