import { Router } from 'express';
import { checkCategory, createCategory, getCategories } from '../controllers/categoryController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

router.get('/', authMiddleware, loadUserBusiness, getCategories);
router.post('/check', authMiddleware, loadUserBusiness, checkCategory);
router.post('/', authMiddleware, loadUserBusiness, createCategory);

export default router;
