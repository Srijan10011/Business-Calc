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
exports.getProducts = exports.addProduct = void 0;
const db_1 = __importDefault(require("../db"));
const addProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, price, stock, profit_margin } = req.body;
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!name || price === undefined || stock === undefined || profit_margin === undefined) {
            return res.status(400).json({ message: 'Missing required fields: name, price, stock, profit_margin' });
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
        const result = yield db_1.default.query(`INSERT INTO products (business_id, name, price, stock, profit_margin)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [business_id, name, price, stock, profit_margin]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addProduct = addProduct;
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        // Get business_id from business_users table
        const businessResult = yield db_1.default.query('SELECT business_id FROM business_users WHERE user_id = $1', [user_id]);
        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }
        const business_id = businessResult.rows[0].business_id;
        const result = yield db_1.default.query('SELECT * FROM products WHERE business_id = $1 ORDER BY id DESC', [business_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getProducts = getProducts;
