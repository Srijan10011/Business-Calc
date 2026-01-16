import { Router } from 'express';
import { addProduct, getProducts, addStock } from '../controllers/productController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addProduct);
router.get('/', authMiddleware, getProducts);
router.post('/add-stock', authMiddleware, addStock);

export default router;
