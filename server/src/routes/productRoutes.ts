import { Router } from 'express';
import logger from '../utils/logger';
import { addProduct, getProducts, getProductById, addStock } from '../controllers/productController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = Router();

router.post('/', authMiddleware, loadPermissions, requirePermission('products.create'), addProduct);
router.get('/', authMiddleware, loadPermissions, requirePermission('products.view'), getProducts);
router.get('/:id', authMiddleware, loadPermissions, requirePermission('products.view'), getProductById);
router.post('/add-stock', authMiddleware, loadPermissions, requirePermission('products.edit'), addStock);
router.delete('/:id', authMiddleware, loadPermissions, requirePermission('products.delete'), async (req: any, res: any) => {
    const { id } = req.params;
    const user_id = req.user.id;

    const client = await require('../db').default.connect();
    try {
        await client.query('BEGIN');

        const productResult = await client.query(
            `SELECT p.*, pb.business_id, p.created_at 
             FROM products p 
             JOIN products_business pb ON p.product_id = pb.product_id 
             WHERE p.product_id = $1`,
            [id]
        );

        if (productResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Product not found' });
        }

        const product = productResult.rows[0];

        const salesResult = await client.query(
            `SELECT 
                COALESCE(SUM(quantity), 0) as total_quantity_sold,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as total_sales_count,
                MAX(created_at) as last_sale_date
             FROM sales_info 
             WHERE product_id = $1`,
            [id]
        );

        const salesData = salesResult.rows[0];

        await client.query(
            `INSERT INTO removed_products 
             (original_product_id, product_name, original_price, business_id, 
              total_quantity_sold, total_revenue, final_stock_quantity, 
              created_at, removed_by, total_sales_count, last_sale_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                id,
                product.name,
                product.price,
                product.business_id,
                salesData.total_quantity_sold,
                salesData.total_revenue,
                product.stock,
                product.created_at,
                user_id,
                salesData.total_sales_count,
                salesData.last_sale_date
            ]
        );

        await client.query('COMMIT');
        res.json({ msg: 'Product removed successfully' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        logger.error(err.message);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});
router.delete('/:id', authMiddleware, loadPermissions, requirePermission('products.delete'), async (req: any, res: any) => {
    const { id } = req.params;
    const user_id = req.user.id;

    const client = await require('../db').default.connect();
    try {
        await client.query('BEGIN');

        // Get product details and business_id
        const productResult = await client.query(
            `SELECT p.*, pb.business_id, p.created_at 
             FROM products p 
             JOIN products_business pb ON p.product_id = pb.product_id 
             WHERE p.product_id = $1`,
            [id]
        );

        if (productResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Product not found' });
        }

        const product = productResult.rows[0];

        // Calculate sales metrics
        const salesResult = await client.query(
            `SELECT 
                COALESCE(SUM(quantity), 0) as total_quantity_sold,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as total_sales_count,
                MAX(created_at) as last_sale_date
             FROM sales_info 
             WHERE product_id = $1`,
            [id]
        );

        const salesData = salesResult.rows[0];

        // Insert into removed_products
        await client.query(
            `INSERT INTO removed_products 
             (original_product_id, product_name, original_price, business_id, 
              total_quantity_sold, total_revenue, final_stock_quantity, 
              created_at, removed_by, total_sales_count, last_sale_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                id,
                product.name,
                product.price,
                product.business_id,
                salesData.total_quantity_sold,
                salesData.total_revenue,
                product.stock,
                product.created_at,
                user_id,
                salesData.total_sales_count,
                salesData.last_sale_date
            ]
        );

        await client.query('COMMIT');
        res.json({ msg: 'Product removed successfully' });

        await client.query('COMMIT');
        res.json({ msg: 'Product deleted successfully' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        logger.error(err.message);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
});

export default router;
