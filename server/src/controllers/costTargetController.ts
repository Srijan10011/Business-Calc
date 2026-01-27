import { Request, Response } from 'express';
import pool from '../db';

export const addCostTarget = async (req: Request, res: Response) => {
    try {
        const { category_id, asset_id, name, target_amount, reset_period } = req.body;
        const user_id = req.user?.id;

        if (!name || !target_amount) {
            return res.status(400).json({ message: 'Missing required fields: name, target_amount' });
        }

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

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            `INSERT INTO cost_targets (business_id, category_id, asset_id, name, target_amount, reset_period)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [business_id, category_id || null, asset_id || null, name, target_amount, reset_period || 'never']
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error adding cost target:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCostTargets = async (req: Request, res: Response) => {
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

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            `SELECT 
                ct.*,
                c.name as category_name,
                a.name as asset_name
            FROM cost_targets ct
            LEFT JOIN categories c ON ct.category_id = c.id
            LEFT JOIN assets a ON ct.asset_id = a.id
            WHERE ct.business_id = $1
            ORDER BY ct.created_at DESC`,
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching cost targets:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
