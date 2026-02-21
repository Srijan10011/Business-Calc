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
exports.createCategory = exports.getCategories = exports.checkCategory = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const Business_pool = __importStar(require("../db/Business_pool"));
const Categorydb = __importStar(require("../db/Categorydb"));
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
        const business_id = yield Business_pool.Get_Business_id(user_id);
        // Check if category exists
        const existingCategory = yield Categorydb.checkCategory(name, cost_behaviour, product_id, business_id);
        res.json(existingCategory);
    }
    catch (error) {
        logger_1.default.error('Error checking category:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.checkCategory = checkCategory;
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const business_id = yield Business_pool.Get_Business_id(user_id);
        res.json({ business_id });
        const result = yield Categorydb.getCategoriesByBusiness(business_id);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCategories = getCategories;
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
        const business_id = yield Business_pool.Get_Business_id(user_id);
        // Create new category with product_id
        const result = yield Categorydb.createCategory(name, cost_behaviour, type, product_id, business_id);
        res.status(201).json({ id: result.id });
    }
    catch (error) {
        logger_1.default.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.createCategory = createCategory;
