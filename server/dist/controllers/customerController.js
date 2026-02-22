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
exports.addCustomer = exports.getCustomerPayments = exports.getCustomerSales = exports.getCustomerById = exports.getCustomers = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const Customerdb = __importStar(require("../db/Customerdb"));
const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const business_id = req.businessId;
        const result = yield Customerdb.getCustomersByBusiness(business_id);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomers = getCustomers;
const getCustomerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const business_id = req.businessId;
        const id = req.params.id;
        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }
        const result = yield Customerdb.getCustomerById(id, business_id);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        logger_1.default.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerById = getCustomerById;
const getCustomerSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const business_id = req.businessId;
        const id = req.params.id;
        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }
        const result = yield Customerdb.getCustomerSales(id, business_id);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching customer sales:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerSales = getCustomerSales;
const getCustomerPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const business_id = req.businessId;
        const id = req.params.id;
        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }
        const result = yield Customerdb.getCustomerPaymentsByBusiness(id, business_id);
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching customer payments:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.getCustomerPayments = getCustomerPayments;
const addCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone, email, address } = req.body;
        const business_id = req.businessId;
        if (!name || !phone) {
            return res.status(400).json({ message: 'Missing required fields: name, phone' });
        }
        // Insert into customers_info table
        const customerResult = yield Customerdb.addCustomer(name, phone, email, address, business_id);
        res.status(201).json(customerResult);
    }
    catch (error) {
        logger_1.default.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error === null || error === void 0 ? void 0 : error.message });
    }
});
exports.addCustomer = addCustomer;
