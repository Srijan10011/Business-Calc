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
exports.addCustomer = exports.getCustomerSales = exports.getCustomerById = exports.getCustomers = void 0;
const db_1 = __importDefault(require("../db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        const result = yield db_1.default.query(`SELECT 
                c.id,
                c.name,
                c.phone,
                c.address,
                COALESCE(SUM(s.total_amount), 0) as total_purchases,
                COALESCE(SUM(CASE WHEN LOWER(s.payment_type) = 'credit' THEN s.total_amount ELSE 0 END), 0) as outstanding_credit,
                MAX(s.created_at) as last_purchase
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE c.business_id = $1
            GROUP BY c.id, c.name, c.phone, c.address
            ORDER BY c.created_at DESC`, [business_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomers = getCustomers;
const getCustomerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        const result = yield db_1.default.query(`SELECT 
                c.id,
                c.name,
                c.phone,
                c.email,
                c.address,
                COALESCE(SUM(s.total_amount), 0) as total_purchases,
                COALESCE(SUM(CASE WHEN LOWER(s.payment_type) = 'credit' THEN s.total_amount ELSE 0 END), 0) as outstanding_credit,
                MAX(s.created_at) as last_purchase
            FROM customers c
            LEFT JOIN sales s ON c.id = s.customer_id
            WHERE c.business_id = $1 AND c.id = $2
            GROUP BY c.id, c.name, c.phone, c.email, c.address`, [business_id, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerById = getCustomerById;
const getCustomerSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        const result = yield db_1.default.query(`SELECT 
                s.id,
                s.total_amount,
                s.payment_type,
                s.created_at,
                si.quantity,
                si.rate,
                p.name as product_name
            FROM sales s
            INNER JOIN sale_items si ON s.id = si.sale_id
            INNER JOIN products p ON si.product_id = p.id
            WHERE s.customer_id = $1 AND s.business_id = $2
            ORDER BY s.created_at DESC`, [id, business_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching customer sales:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerSales = getCustomerSales;
const addCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, phone, email, address } = req.body;
        const token = req.header('x-auth-token');
        console.log('=== JWT DEBUG ===');
        console.log('Raw token received:', (token === null || token === void 0 ? void 0 : token.substring(0, 50)) + '...');
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                console.log('Decoded JWT user ID:', decoded.user.id);
                // Query users table to verify
                const userResult = yield db_1.default.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.user.id]);
                console.log('User from database:', userResult.rows[0]);
            }
            catch (jwtError) {
                console.log('JWT decode error:', jwtError);
            }
        }
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log('User ID from middleware:', user_id);
        if (!name || !phone || !address) {
            return res.status(400).json({ message: 'Missing required fields: name, phone, address' });
        }
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        // Get business_id from business_users table
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        console.log('Business query result:', businessResult.rows);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        console.log('Using business_id:', business_id);
        if (!business_id) {
            return res.status(400).json({ message: 'Invalid business association' });
        }
        const result = yield db_1.default.query(`INSERT INTO customers (business_id, name, phone, email, address, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`, [business_id, name, phone, email || null, address]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addCustomer = addCustomer;
