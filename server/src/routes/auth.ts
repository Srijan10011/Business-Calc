import express from 'express';
const router = express.Router();
import { register, login, setupBusiness, checkBusiness, getUserInfo } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { registerSchema, loginSchema, setupBusinessSchema } from '../validators';
import pool from '../db';
import * as Business_pool from '../db/Business_pool';

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

// @route   GET api/auth/business-id
// @desc    Get business_id for current user
// @access  Private
router.get('/business-id', authMiddleware, async (req, res) => {
    try {
        const business_id = await Business_pool.Get_Business_id(req.user?.id as string);
        res.json({ business_id });
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Server error' });
    }
});

// @route   GET api/auth/check-business/:business_id
// @desc    Check if business exists
// @access  Public
router.get('/check-business/:business_id', checkBusiness);

// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware, validateRequest(setupBusinessSchema), setupBusiness);

export default router;
