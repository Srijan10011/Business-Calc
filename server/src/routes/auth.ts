import express from 'express';
const router = express.Router();
import { register, login, setupBusiness } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware, setupBusiness);

export default router;
