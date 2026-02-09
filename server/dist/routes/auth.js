"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authController_1.register);
// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController_1.login);
// @route   GET api/auth/me
// @desc    Get current user with role
// @access  Private
router.get('/me', authMiddleware_1.authMiddleware, authController_1.getUserInfo);
// @route   GET api/auth/check-business/:business_id
// @desc    Check if business exists
// @access  Public
router.get('/check-business/:business_id', authController_1.checkBusiness);
// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware_1.authMiddleware, authController_1.setupBusiness);
exports.default = router;
