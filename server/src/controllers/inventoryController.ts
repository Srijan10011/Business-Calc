import { Request, Response } from 'express';
import pool from '../db';

export const addInventoryItem = async (req: Request, res: Response) => {
    try {
        const { name, stock, unit_cost, type } = req.body;
        const user_id = req.user?.id;

        if (!name || stock === undefined || unit_cost === undefined || !type) {
            return res.status(400).json({ message: 'Missing required fields: name, stock, unit_cost, type' });
        }

        if (!['raw_material', 'product', 'other'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type. Must be raw_material, product, or other' });
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
            `INSERT INTO inventory_items (business_id, name, type, stock, unit_cost, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [business_id, name, type, stock, unit_cost]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getInventoryItems = async (req: Request, res: Response) => {
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
            'SELECT * FROM inventory_items WHERE business_id = $1 ORDER BY created_at DESC',
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const updateInventoryStock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { quantity, operation } = req.body;
        const user_id = req.user?.id;

        if (!quantity || !operation) {
            return res.status(400).json({ message: 'Missing required fields: quantity, operation' });
        }

        if (!['in', 'out'].includes(operation)) {
            return res.status(400).json({ message: 'Invalid operation. Must be in or out' });
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

        const stockChange = operation === 'in' ? quantity : -quantity;

        const result = await pool.query(
            `UPDATE inventory_items 
             SET stock = stock + $1 
             WHERE id = $2 AND business_id = $3
             RETURNING *`,
            [stockChange, id, business_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inventory item not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating inventory stock:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
