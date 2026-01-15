import { Request, Response } from 'express';
import pool from '../db';

export const checkCategory = async (req: Request, res: Response) => {
    try {
        const { name, cost_behaviour, product_id } = req.body;
        const user_id = req.user?.id;

        if (!name || !cost_behaviour) {
            return res.status(400).json({ message: 'Missing required fields: name, cost_behaviour' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Check if category exists
        const existingCategory = await pool.query(
            'SELECT id FROM categories WHERE business_id = $1 AND name = $2 AND cost_behavior = $3 ANd product_id = $4 ',
            [business_id, name, cost_behaviour, product_id]
        );

        if (existingCategory.rows.length > 0) {
            return res.json({ exists: true, id: existingCategory.rows[0].id });
        } else {
            return res.json({ exists: false });
        }
    } catch (error: any) {
        console.error('Error checking category:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, cost_behaviour, type, product_id } = req.body;
        const user_id = req.user?.id;

        if (!name || !cost_behaviour || !type) {
            return res.status(400).json({ message: 'Missing required fields: name, cost_behaviour, type' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Create new category with product_id
        const result = await pool.query(
            `INSERT INTO categories (business_id, name, type, cost_behavior, product_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [business_id, name, type, cost_behaviour, product_id]
        );

        res.status(201).json({ id: result.rows[0].id });
    } catch (error: any) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
