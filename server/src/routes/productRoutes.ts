import { Router } from 'express';
import { addProduct, getProducts } from '../controllers/productController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addProduct);
router.get('/', authMiddleware, getProducts);

export default router;
