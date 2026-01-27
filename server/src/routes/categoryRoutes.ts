import { Router } from 'express';
import { checkCategory, createCategory, getCategories } from '../controllers/categoryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, getCategories);
router.post('/check', authMiddleware, checkCategory);
router.post('/', authMiddleware, createCategory);

export default router;
