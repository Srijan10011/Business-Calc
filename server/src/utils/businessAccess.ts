import { Response } from 'express';
import pool from '../db';

export const getUserBusinessId = async (userId: string): Promise<string | null> => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].business_id : null;
};

export const requireBusinessAccess = async (userId: string, res: Response): Promise<string | null> => {
    const businessId = await getUserBusinessId(userId);
    if (!businessId) {
        res.status(403).json({ msg: 'No business access. Please wait for approval.' });
        return null;
    }
    return businessId;
};
