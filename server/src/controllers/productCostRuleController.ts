import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';

export const addProductCostRule = async (req: Request, res: Response) => {
    try {
        const { product_id, category_id, mode, value } = req.body;
        const user_id = req.user?.id;

        if (!product_id || !category_id || !mode || value === undefined) {
            return res.status(400).json({ message: 'Missing required fields: product_id, category_id, mode, value' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const result = await pool.query(
            `INSERT INTO product_cost_rules (product_id, category_id, mode, value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [product_id, category_id, mode, value]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error adding product cost rule:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
