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
exports.addCustomer = exports.getCustomerPayments = exports.getCustomerSales = exports.getCustomerById = exports.getCustomers = void 0;
const db_1 = __importDefault(require("../db"));
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
                ci.customer_id as id,
                ci.customer_id,
                ci.name,
                ci.phone,
                ci.email,
                ci.address,
                ci.created_at,
                COALESCE(cph.total_purchase, 0) as total_purchases,
                COALESCE(cph.outstanding_credit, 0) as outstanding_credit,
                cph.last_purchase
            FROM customers_info ci
            INNER JOIN business_customers bc ON ci.customer_id = bc.customer_id
            LEFT JOIN customer_purchase_history cph ON ci.customer_id = cph.customer_id
            WHERE bc.business_id = $1
            ORDER BY ci.created_at DESC`, [business_id]);
        console.log('=== GET CUSTOMERS DEBUG ===');
        console.log('Returning customers:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('First customer ID:', result.rows[0].id);
            console.log('First customer customer_id:', result.rows[0].customer_id);
        }
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
        console.log('=== GET CUSTOMER BY ID DEBUG ===');
        console.log('Received ID parameter:', id);
        console.log('ID type:', typeof id);
        console.log('User ID:', user_id);
        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        const result = yield db_1.default.query(`SELECT 
                ci.customer_id,
                ci.name,
                ci.phone,
                ci.email,
                ci.created_at,
                COALESCE(cph.total_purchase, 0) as total_purchases,
                COALESCE(cph.outstanding_credit, 0) as outstanding_credit,
                cph.last_purchase
            FROM customers_info ci
            INNER JOIN business_customers bc ON ci.customer_id = bc.customer_id
            LEFT JOIN customer_purchase_history cph ON ci.customer_id = cph.customer_id
            WHERE bc.business_id = $1 AND ci.customer_id = $2`, [business_id, id]);
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
                si.sale_id,
                si.total_amount,
                si.type as payment_type,
                si.status,
                si.quantity,
                si.rate,
                si.created_at,
                p.name as product_name
            FROM sales s
            INNER JOIN sales_info si ON s.sale_id = si.sale_id
            INNER JOIN products p ON si.product_id = p.product_id
            WHERE s.customer_id = $1 AND s.business_id = $2
            ORDER BY si.created_at DESC`, [id, business_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching customer sales:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerSales = getCustomerSales;
const getCustomerPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Get payments: cash/bank sales (immediate) + debit sale payments (when recorded)
        const result = yield db_1.default.query(`SELECT 
                si.created_at as payment_date,
                si.total_amount as amount,
                si.type as payment_type,
                'Sale Payment' as payment_source
            FROM sales s
            INNER JOIN sales_info si ON s.sale_id = si.sale_id
            WHERE s.customer_id = $1 
            AND s.business_id = $2 
            AND si.type IN ('Cash', 'bank')
            
            UNION ALL
            
            SELECT 
                p.created_at as payment_date,
                p.amount,
                'Debit Payment' as payment_type,
                'Installment' as payment_source
            FROM payments p
            INNER JOIN sales s ON p.sale_id = s.sale_id
            WHERE s.customer_id = $1 
            AND s.business_id = $2
            
            ORDER BY payment_date DESC`, [id, business_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching customer payments:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerPayments = getCustomerPayments;
const addCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, phone, email, address } = req.body;
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!name || !phone) {
            return res.status(400).json({ message: 'Missing required fields: name, phone' });
        }
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        // Get business_id from business_users table
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        // Insert into customers_info table
        const customerResult = yield db_1.default.query('INSERT INTO customers_info (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING customer_id, name, phone, email, address, created_at', [name, phone, email || null, address || null]);
        const customer_id = customerResult.rows[0].customer_id;
        // Link customer to business in business_customers table
        yield db_1.default.query('INSERT INTO business_customers (customer_id, business_id) VALUES ($1, $2)', [customer_id, business_id]);
        res.status(201).json(customerResult.rows[0]);
    }
    catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addCustomer = addCustomer;
