"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.transferCOGS = exports.transferFunds = exports.getTransactions = exports.getAccounts = exports.createDefaultAccounts = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const Accountdb = __importStar(require("../db/Accountdb"));
const createDefaultAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { business_id } = req.body;
    if (!business_id) {
        return res.status(400).json({ message: 'Business ID is required' });
    }
    try {
        const message = yield Accountdb.createDefaultAccount(business_id);
        res.status(201).json({ message });
    }
    catch (error) {
        logger_1.default.error('Error creating default accounts:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.createDefaultAccounts = createDefaultAccounts;
const getAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user_id = req.userId;
        const business_id = req.businessId;
        const result = yield Accountdb.getAccount(user_id, business_id);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getAccounts = getAccounts;
const getTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user_id = req.userId;
        const business_id = req.businessId;
        // Get transactions for this business
        const gettransaction = yield Accountdb.getTransactions(user_id, business_id);
        res.json(gettransaction);
    }
    catch (error) {
        logger_1.default.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getTransactions = getTransactions;
const transferFunds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromAccountId, toAccountId, amount } = req.body;
        const user_id = req.userId;
        const business_id = req.businessId;
        const result = yield Accountdb.transferFund(user_id, fromAccountId, toAccountId, amount, business_id);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({
            message: err.message
        });
    }
});
exports.transferFunds = transferFunds;
const transferCOGS = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId, accountId, amount, direction } = req.body; // direction: 'to-cogs' or 'from-cogs'
        const user_id = req.userId;
        const business_id = req.businessId;
        const transfercog = yield Accountdb.transferCOGS(user_id, categoryId, accountId, amount, direction, business_id);
        res.json(transfercog);
    }
    catch (err) {
        res.status(400).json({
            message: err.message
        });
    }
});
exports.transferCOGS = transferCOGS;
