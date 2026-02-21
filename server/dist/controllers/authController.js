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
exports.refreshAccessToken = exports.logout = exports.verifyToken = exports.getUserInfo = exports.setupBusiness = exports.login = exports.register = exports.checkBusiness = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
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
        logger_1.default.error(err.message);
        res.status(500).send('Server error');
    }
});
exports.checkBusiness = checkBusiness;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, business_id } = req.body;
    try {
        const result = yield Authdb.registerUser(name, email, password, business_id);
        // Set httpOnly cookie
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });
        res.json(result);
    }
    catch (err) {
        logger_1.default.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Get user first to extract user_id
        const normalizedEmail = email.toLowerCase().trim();
        const user = yield Authdb.getUserByEmail(normalizedEmail);
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const user_id = user.user_id;
        // Perform login (validates password and checks business access)
        const result = yield Authdb.loginUser(email, password);
        // Generate access token (15 minutes)
        const accessToken = jsonwebtoken_1.default.sign({ user: { id: user_id } }, process.env.JWT_SECRET, { expiresIn: '15m' });
        // Generate refresh token (7 days)
        const refreshToken = jsonwebtoken_1.default.sign({ user: { id: user_id } }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
        // Store refresh token in database
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        yield Authdb.storeRefreshToken(user_id, refreshToken, expiresAt, req.ip, req.headers['user-agent']);
        // Set access token cookie (15 minutes)
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });
        // Set refresh token cookie (7 days)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        // Send response (backward compatibility)
        res.json(Object.assign(Object.assign({}, result), { token: accessToken // For backward compatibility
         }));
    }
    catch (err) {
        logger_1.default.error(err.message || err);
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
        logger_1.default.error(err.message);
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
        logger_1.default.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
});
exports.getUserInfo = getUserInfo;
const verifyToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // authMiddleware already validated the token
    // If we reach here, token is valid
    res.json({ valid: true, user: req.user });
});
exports.verifyToken = verifyToken;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const refreshToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken;
    const user_id = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
    // Delete refresh token from database
    if (refreshToken && user_id) {
        try {
            yield Authdb.deleteRefreshToken(refreshToken, user_id);
        }
        catch (err) {
            logger_1.default.error('Error deleting refresh token:', err);
        }
    }
    // Clear both cookies
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.json({ msg: 'Logged out successfully' });
});
exports.logout = logout;
// Refresh access token using refresh token
const refreshAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const refreshToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ msg: 'Refresh token not found' });
    }
    try {
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user_id = decoded.user.id;
        // Check if refresh token exists in database and is valid
        const isValid = yield Authdb.validateRefreshToken(refreshToken, user_id);
        if (!isValid) {
            return res.status(401).json({ msg: 'Invalid refresh token' });
        }
        // Generate new access token (15 minutes)
        const newAccessToken = jsonwebtoken_1.default.sign({ user: { id: user_id } }, process.env.JWT_SECRET, { expiresIn: '15m' });
        // Set new access token cookie
        res.cookie('token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });
        res.json({ msg: 'Token refreshed successfully' });
    }
    catch (err) {
        logger_1.default.error('Refresh token error:', err.message);
        res.status(401).json({ msg: 'Invalid or expired refresh token' });
    }
});
exports.refreshAccessToken = refreshAccessToken;
