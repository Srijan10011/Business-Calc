import { Request, Response } from 'express';
import pool from '../db';

export const addSale = async (req: Request, res: Response) => {
    try {
        const { customer_id, total_amount, payment_type, account_id, product_id, rate, quantity } = req.body;
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

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert sale
            const saleResult = await client.query(
                `INSERT INTO sales (business_id, customer_id, total_amount, payment_type, account_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING *`,
                [business_id, customer_id, total_amount, payment_type, account_id]
            );

            const sale_id = saleResult.rows[0].id;

            // Insert sale_item
            await client.query(
                `INSERT INTO sale_items (sale_id, product_id, rate, quantity, total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [sale_id, product_id, rate, quantity, total_amount]
            );

            // Get product cost rules with category and asset info
            const costRulesResult = await client.query(
                `SELECT 
                    pcr.category_id,
                    pcr.value,
                    pcr.mode,
                    pcr.asset_id,
                    c.cost_behavior as allocation_type
                FROM product_cost_rules pcr
                JOIN categories c ON pcr.category_id = c.id
                WHERE pcr.product_id = $1 AND pcr.product_id IS NOT NULL AND c.business_id = $2`,
                [product_id, business_id]
            );

            // Insert sale_allocations for each cost rule
            for (const rule of costRulesResult.rows) {
                let amount;
                if (rule.mode === 'fixed') {
                    amount = rule.value; // Fixed amount in Rs
                } else {
                    amount = (rule.value / 100) * total_amount; // Percentage
                }
                
                await client.query(
                    `INSERT INTO sale_allocations (sale_id, category_id, asset_id, allocation_type, amount)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [sale_id, rule.category_id, rule.asset_id, rule.allocation_type, amount]
                );
            }

            await client.query('COMMIT');
            res.status(201).json(saleResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error adding sale:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
