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
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = __importDefault(require("../db"));
// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authController_1.register);
// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController_1.login);
// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield db_1.default.query('SELECT user_id, name, email, created_at FROM users WHERE user_id = $1', [req.user.id]);
        res.json(user.rows[0]);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
}));
// @route   GET api/auth/check-business/:business_id
// @desc    Check if business exists
// @access  Public
router.get('/check-business/:business_id', authController_1.checkBusiness);
// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware_1.authMiddleware, authController_1.setupBusiness);
exports.default = router;
