import express, { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Get all users in the business
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    // Get the business_id for the current user
    const businessResult = await pool.query(
      'SELECT business_id FROM business_users WHERE user_id = $1',
      [user_id]
    );

    if (businessResult.rows.length === 0) {
      return res.status(400).json({ message: 'User not associated with any business' });
    }

    const business_id = businessResult.rows[0].business_id;

    // Get all users in the same business
    const result = await pool.query(
      `SELECT 
         u.user_id, 
         u.name, 
         u.email, 
         u.created_at, 
         bu.role as user_type,
         r.role_name,
         r.role_id
       FROM business_users bu
       JOIN users u ON bu.user_id = u.user_id
       LEFT JOIN roles r ON bu.role_id = r.role_id
       WHERE bu.business_id = $1
       ORDER BY u.created_at DESC`,
      [business_id]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's permissions
router.get('/permissions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    // Get user's role_id
    const userResult = await pool.query(
      'SELECT role_id FROM business_users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].role_id) {
      return res.json([]); // No role assigned, no permissions
    }

    const role_id = userResult.rows[0].role_id;

    // Get permissions for this role
    const result = await pool.query(
      `SELECT p.permission_id, p.permission_key, p.permission_name, p.category
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.permission_id
       WHERE rp.role_id = $1`,
      [role_id]
    );

    res.json(result.rows);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user's role
router.put('/:user_id/role', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const { role_id } = req.body;
    const current_user_id = req.user?.id;

    if (!current_user_id) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    // Get the business_id and verify user is owner
    const businessResult = await pool.query(
      'SELECT business_id, role FROM business_users WHERE user_id = $1',
      [current_user_id]
    );

    if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
      return res.status(403).json({ message: 'Only owners can update user roles' });
    }

    const business_id = businessResult.rows[0].business_id;

    // Update the user's role
    await pool.query(
      'UPDATE business_users SET role_id = $1 WHERE user_id = $2 AND business_id = $3',
      [role_id, user_id, business_id]
    );

    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
