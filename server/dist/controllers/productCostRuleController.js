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
exports.addProductCostRule = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const db_1 = __importDefault(require("../db"));
const addProductCostRule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { product_id, category_id, mode, value } = req.body;
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!product_id || !category_id || !mode || value === undefined) {
            return res.status(400).json({ message: 'Missing required fields: product_id, category_id, mode, value' });
        }
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const result = yield db_1.default.query(`INSERT INTO product_cost_rules (product_id, category_id, mode, value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`, [product_id, category_id, mode, value]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        logger_1.default.error('Error adding product cost rule:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addProductCostRule = addProductCostRule;
