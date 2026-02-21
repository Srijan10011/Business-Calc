import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import pool from '../db';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        businessId?: string;
    };
}

export const attachBusinessId = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        // Attach business_id to req.user
        if (req.user) {
            req.user.businessId = businessResult.rows[0].business_id;
        }

        next();
    } catch (error: any) {
        logger.error('Error fetching business ID:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
