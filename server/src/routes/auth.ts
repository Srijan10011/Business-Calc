import express from 'express';
const router = express.Router();
import { register, login, setupBusiness, checkBusiness, getUserInfo } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { registerSchema, loginSchema, setupBusinessSchema } from '../validators';
import pool from '../db';

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateRequest(registerSchema), register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', validateRequest(loginSchema), login);

// @route   GET api/auth/me
// @desc    Get current user with role
// @access  Private
router.get('/me', authMiddleware, getUserInfo);

// @route   GET api/auth/check-business/:business_id
// @desc    Check if business exists
// @access  Public
router.get('/check-business/:business_id', checkBusiness);

// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware, validateRequest(setupBusinessSchema), setupBusiness);

export default router;
