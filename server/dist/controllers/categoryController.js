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
exports.createCategory = exports.checkCategory = void 0;
const db_1 = __importDefault(require("../db"));
const checkCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, cost_behaviour, product_id } = req.body;
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!name || !cost_behaviour) {
            return res.status(400).json({ message: 'Missing required fields: name, cost_behaviour' });
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
        // Check if category exists
        const existingCategory = yield db_1.default.query('SELECT id FROM categories WHERE business_id = $1 AND name = $2 AND cost_behavior = $3 ANd product_id = $4 ', [business_id, name, cost_behaviour, product_id]);
        if (existingCategory.rows.length > 0) {
            return res.json({ exists: true, id: existingCategory.rows[0].id });
        }
        else {
            return res.json({ exists: false });
        }
    }
    catch (error) {
        console.error('Error checking category:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.checkCategory = checkCategory;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, cost_behaviour, type, product_id } = req.body;
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!name || !cost_behaviour || !type) {
            return res.status(400).json({ message: 'Missing required fields: name, cost_behaviour, type' });
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
        // Create new category with product_id
        const result = yield db_1.default.query(`INSERT INTO categories (business_id, name, type, cost_behavior, product_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`, [business_id, name, type, cost_behaviour, product_id]);
        res.status(201).json({ id: result.rows[0].id });
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.createCategory = createCategory;
