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
exports.createDefaultAccountsForAllExisting = exports.getAccounts = exports.createDefaultAccounts = void 0;
const db_1 = __importDefault(require("../db"));
const createDefaultAccounts = (business_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const defaultAccounts = [
            { type: 'cash', balance: 0 },
            { type: 'bank', balance: 0 },
            { type: 'credit', balance: 0 },
            { type: 'debit', balance: 0 }
        ];
        for (const account of defaultAccounts) {
            yield db_1.default.query(`INSERT INTO accounts (business_id, name, type, balance, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`, [business_id, 'Wallet', account.type, account.balance]);
        }
        console.log(`Default accounts created for business_id: ${business_id}`);
    }
    catch (error) {
        console.error('Error creating default accounts:', error);
        throw error;
    }
});
exports.createDefaultAccounts = createDefaultAccounts;
const getAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        // Get accounts for this business
        const result = yield db_1.default.query('SELECT * FROM accounts WHERE business_id = $1 ORDER BY type', [business_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getAccounts = getAccounts;
const createDefaultAccountsForAllExisting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all existing business_ids
        const businessResult = yield db_1.default.query('SELECT id FROM businesses');
        for (const business of businessResult.rows) {
            // Check if accounts already exist for this business
            const existingAccounts = yield db_1.default.query('SELECT COUNT(*) FROM accounts WHERE business_id = $1', [business.id]);
            if (parseInt(existingAccounts.rows[0].count) === 0) {
                // No accounts exist, create default ones
                yield (0, exports.createDefaultAccounts)(business.id);
            }
        }
        res.json({ message: 'Default accounts created for all businesses' });
    }
    catch (error) {
        console.error('Error creating default accounts for existing businesses:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.createDefaultAccountsForAllExisting = createDefaultAccountsForAllExisting;
