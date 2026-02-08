import express from 'express';
const router = express.Router();
import { register, login, setupBusiness, checkBusiness } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req: any, res: any) => {
    try {
        const user = await pool.query(
            'SELECT user_id, name, email, created_at FROM users WHERE user_id = $1',
            [req.user.id]
        );
        res.json(user.rows[0]);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/check-business/:business_id
// @desc    Check if business exists
// @access  Public
router.get('/check-business/:business_id', checkBusiness);

// @route   POST api/auth/setup-business
// @desc    Setup business for user
// @access  Private
router.post('/setup-business', authMiddleware, setupBusiness);

export default router;
