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
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validateRequest_1 = require("../middleware/validateRequest");
const validators_1 = require("../validators");
const Business_pool = __importStar(require("../db/Business_pool"));
// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', (0, validateRequest_1.validateRequest)(validators_1.registerSchema), authController_1.register);
// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', (0, validateRequest_1.validateRequest)(validators_1.loginSchema), authController_1.login);
// @route   POST api/auth/logout
// @desc    Logout user (clear cookie)
// @access  Private
router.post('/logout', authMiddleware_1.authMiddleware, authController_1.logout);
// @route   POST api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public (uses refresh token from cookie)
router.post('/refresh', authController_1.refreshAccessToken);
// @route   GET api/auth/verify
// @desc    Verify token is valid
// @access  Private
router.get('/verify', authMiddleware_1.authMiddleware, authController_1.verifyToken);
// @route   GET api/auth/me
// @desc    Get current user with role
// @access  Private
router.get('/me', authMiddleware_1.authMiddleware, authController_1.getUserInfo);
// @route   GET api/auth/business-id
// @desc    Get business_id for current user
// @access  Private
router.get('/business-id', authMiddleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const business_id = yield Business_pool.Get_Business_id((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        res.json({ business_id });
    }
    catch (error) {
        res.status(500).json({ message: (error === null || error === void 0 ? void 0 : error.message) || 'Server error' });
    }
}));
// @route   GET api/auth/check-business/:business_id
// @desc    Check if business exists
// @access  Public
router.get('/check-business/:business_id', authController_1.checkBusiness);
// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware_1.authMiddleware, (0, validateRequest_1.validateRequest)(validators_1.setupBusinessSchema), authController_1.setupBusiness);
exports.default = router;
