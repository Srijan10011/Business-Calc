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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStock = exports.getProductById = exports.getProducts = exports.addProduct = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const db_1 = __importDefault(require("../db"));
const sanitize_1 = require("../utils/sanitize");
const addProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, price, stock } = req.body;
        const business_id = req.businessId;
        if (!name || price === undefined || stock === undefined) {
            return res.status(400).json({ message: 'Missing required fields: name, price, stock' });
        }
        if (parseFloat(price) < 0) {
            return res.status(400).json({ message: 'Price cannot be negative' });
        }
        if (parseInt(stock) < 0) {
            return res.status(400).json({ message: 'Stock cannot be negative' });
        }
        const sanitizedName = (0, sanitize_1.sanitizeText)(name);
        // Insert into products table
        const productResult = yield db_1.default.query('INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING product_id, name, price, stock, created_at', [sanitizedName, price, stock]);
        const product_id = productResult.rows[0].product_id;
        // Link product to business in products_business table
        yield db_1.default.query('INSERT INTO products_business (product_id, business_id) VALUES ($1, $2)', [product_id, business_id]);
        res.status(201).json(productResult.rows[0]);
    }
    catch (error) {
        logger_1.default.error('Error adding product:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addProduct = addProduct;
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const business_id = req.businessId;
        const result = yield db_1.default.query(`SELECT 
                p.product_id as id,
                p.product_id,
                p.name,
                p.price,
                p.stock,
                p.created_at
            FROM products p
            INNER JOIN products_business pb ON p.product_id = pb.product_id
            LEFT JOIN removed_products rp ON p.product_id = rp.original_product_id
            WHERE pb.business_id = $1 AND rp.removed_product_id IS NULL
            ORDER BY p.created_at DESC`, [business_id]);
        res.json(result.rows);
    }
    catch (error) {
        logger_1.default.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getProducts = getProducts;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const business_id = req.businessId;
        const result = yield db_1.default.query(`SELECT 
                p.product_id as id,
                p.product_id,
                p.name,
                p.price,
                p.stock,
                p.created_at
            FROM products p
            INNER JOIN products_business pb ON p.product_id = pb.product_id
            LEFT JOIN removed_products rp ON p.product_id = rp.original_product_id
            WHERE pb.business_id = $1 AND p.product_id = $2 AND rp.removed_product_id IS NULL`, [business_id, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        logger_1.default.error('Error fetching product:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getProductById = getProductById;
const addStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { product_id, stock } = req.body;
        const business_id = req.businessId;
        if (!product_id || stock === undefined) {
            return res.status(400).json({ message: 'Missing required fields: product_id, stock' });
        }
        // Update stock for product that belongs to user's business
        const result = yield db_1.default.query(`UPDATE products SET stock = stock + $1 
             WHERE product_id = $2 
             AND product_id IN (
                 SELECT product_id FROM products_business WHERE business_id = $3
             )
             RETURNING *`, [stock, product_id, business_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        logger_1.default.error('Error adding stock:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addStock = addStock;
