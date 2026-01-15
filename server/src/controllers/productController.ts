import { Request, Response } from 'express';
import pool from '../db';

export const addProduct = async (req: Request, res: Response) => {
    try {
        const { name, price, stock, profit_margin } = req.body;
        const user_id = req.user?.id;
        
        if (!name || price === undefined || stock === undefined || profit_margin === undefined) {
            return res.status(400).json({ message: 'Missing required fields: name, price, stock, profit_margin' });
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

        const result = await pool.query(
            `INSERT INTO products (business_id, name, price, stock, profit_margin)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [business_id, name, price, stock, profit_margin]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getProducts = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

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

        const result = await pool.query(
            'SELECT * FROM products WHERE business_id = $1 ORDER BY id DESC',
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
