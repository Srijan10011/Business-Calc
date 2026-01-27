import { Router } from 'express';
import { addProduct, getProducts, getProductById, addStock } from '../controllers/productController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authMiddleware, addProduct);
router.get('/', authMiddleware, getProducts);
router.get('/:id', authMiddleware, getProductById);
router.post('/add-stock', authMiddleware, addStock);

export default router;
