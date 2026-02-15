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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInfo = exports.setupBusiness = exports.login = exports.register = exports.checkBusiness = void 0;
const Authdb = __importStar(require("../db/Authdb"));
const Accountdb = __importStar(require("../db/Accountdb"));
const checkBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const business_id = req.params.business_id;
    try {
        const business = yield Authdb.checkBusinessExists(business_id);
        if (!business)
            return res.status(404).json({ msg: 'Business not found' });
        res.json({ exists: true, business });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});
exports.checkBusiness = checkBusiness;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, business_id } = req.body;
    try {
        const result = yield Authdb.registerUser(name, email, password, business_id);
        res.json(result);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const result = yield Authdb.loginUser(email, password);
        res.json(result);
    }
    catch (err) {
        console.error(err.message || err);
        res.status(err.statusCode || 500).send(err.message || 'Server error');
    }
});
exports.login = login;
const setupBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { businessName, currency } = req.body;
    const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!user_id)
        return res.status(401).json({ msg: 'Unauthorized' });
    try {
        const business = yield Authdb.setupBusiness(user_id, businessName, currency, Accountdb.createDefaultAccount);
        res.json({ msg: 'Business setup completed', business });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
});
exports.setupBusiness = setupBusiness;
const getUserInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!user_id)
        return res.status(401).json({ msg: 'Unauthorized' });
    try {
        const userInfo = yield Authdb.getUserInfo(user_id); // you can move getUserInfo to service if needed
        res.json(userInfo);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
});
exports.getUserInfo = getUserInfo;
