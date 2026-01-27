import { Request, Response } from 'express';
import pool from '../db';

export const addInventoryItem = async (req: Request, res: Response) => {
    try {
        const { name, stock, unit_cost, type } = req.body;
        const user_id = req.user?.id;

        if (!name || stock === undefined || unit_cost === undefined || !type) {
            return res.status(400).json({ message: 'Missing required fields: name, stock, unit_cost, type' });
        }

        if (!['Raw_material', 'Other'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type. Must be Raw_material or Other' });
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert into inventory_info
            const inventoryResult = await client.query(
                `INSERT INTO inventory_info (name, stock, type, unit_cost)
                 VALUES ($1, $2, $3, $4)
                 RETURNING inventory_id, name, stock, type, unit_cost`,
                [name, stock, type, unit_cost]
            );

            const inventory_id = inventoryResult.rows[0].inventory_id;

            // Link to business in business_inventory
            await client.query(
                `INSERT INTO business_inventory (inventory_id, business_id)
                 VALUES ($1, $2)`,
                [inventory_id, business_id]
            );

            await client.query('COMMIT');
            res.status(201).json(inventoryResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
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
            `SELECT ii.inventory_id, ii.name, ii.stock, ii.type, ii.unit_cost
             FROM inventory_info ii
             INNER JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
             WHERE bi.business_id = $1
             ORDER BY ii.name`,
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
