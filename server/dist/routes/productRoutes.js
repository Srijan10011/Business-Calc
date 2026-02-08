"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.authMiddleware, productController_1.addProduct);
router.get('/', authMiddleware_1.authMiddleware, productController_1.getProducts);
router.get('/:id', authMiddleware_1.authMiddleware, productController_1.getProductById);
router.post('/add-stock', authMiddleware_1.authMiddleware, productController_1.addStock);
router.delete('/:id', authMiddleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user_id = req.user.id;
    const client = yield require('../db').default.connect();
    try {
        yield client.query('BEGIN');
        // Get product details and business_id
        const productResult = yield client.query(`SELECT p.*, pb.business_id, p.created_at 
             FROM products p 
             JOIN products_business pb ON p.product_id = pb.product_id 
             WHERE p.product_id = $1`, [id]);
        if (productResult.rows.length === 0) {
            yield client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Product not found' });
        }
        const product = productResult.rows[0];
        // Calculate sales metrics
        const salesResult = yield client.query(`SELECT 
                COALESCE(SUM(quantity), 0) as total_quantity_sold,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as total_sales_count,
                MAX(created_at) as last_sale_date
             FROM sales_info 
             WHERE product_id = $1`, [id]);
        const salesData = salesResult.rows[0];
        // Insert into removed_products
        yield client.query(`INSERT INTO removed_products 
             (original_product_id, product_name, original_price, business_id, 
              total_quantity_sold, total_revenue, final_stock_quantity, 
              created_at, removed_by, total_sales_count, last_sale_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
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
        ]);
        yield client.query('COMMIT');
        res.json({ msg: 'Product removed successfully' });
        yield client.query('COMMIT');
        res.json({ msg: 'Product deleted successfully' });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server error');
    }
    finally {
        client.release();
    }
}));
exports.default = router;
