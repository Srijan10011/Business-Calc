import { Request, Response } from 'express';
import pool from '../db';

export const getSales = async (req: Request, res: Response) => {
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

        const salesResult = await pool.query(
            `SELECT 
                s.id as sale_id,
                s.created_at as date,
                c.name as customer,
                p.name as product,
                si.quantity,
                si.total,
                s.payment_type,
                COALESCE(r.status, 'paid') as status,
                r.amount_due
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN receivables r ON s.id = r.sale_id
            WHERE s.business_id = $1
            ORDER BY s.created_at DESC`,
            [business_id]
        );

        const sales = salesResult.rows.map(row => ({
            ...row,
            status: row.status === 'pending' ? 'Pending' : 'Paid'
        }));

        res.json(sales);
    } catch (error: any) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

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

            // Decrease product stock
            await client.query(
                `UPDATE products SET stock = stock - $1 WHERE id = $2`,
                [quantity, product_id]
            );

            // If payment type is credit, create receivable entry
            if (payment_type.toLowerCase() === 'credit') {
                await client.query(
                    `INSERT INTO receivables (sale_id, customer_id, amount_due, amount_paid, status)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [sale_id, customer_id, total_amount, 0, 'pending']
                );
            }

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

export const recordPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current receivable
            const receivableResult = await client.query(
                'SELECT amount_due FROM receivables WHERE sale_id = $1',
                [id]
            );

            if (receivableResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Receivable not found' });
            }

            const currentDue = parseFloat(receivableResult.rows[0].amount_due);

            if (amount > currentDue) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    message: `Credit = ${currentDue}, only ${currentDue} is due` 
                });
            }

            // Update receivables
            const updateResult = await client.query(
                `UPDATE receivables 
                 SET amount_paid = amount_paid + $1,
                     amount_due = amount_due - $1,
                     status = CASE 
                         WHEN amount_due - $1 = 0 THEN 'complete'
                         ELSE 'pending'
                     END
                 WHERE sale_id = $2
                 RETURNING *`,
                [amount, id]
            );

            await client.query('COMMIT');
            res.json(updateResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

CREATE TABLE cost_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),

    category_id UUID REFERENCES categories(id),   -- labour, rent, raw material etc
    asset_id UUID REFERENCES assets(id),          -- for machines

    name TEXT NOT NULL,                           -- "January Salary", "Autoclave A1"

    target_amount NUMERIC(14,2) NOT NULL,         -- total to recover/pay
    recovered_amount NUMERIC(14,2) DEFAULT 0,     -- how much collected so far

    reset_period TEXT CHECK (reset_period IN ('monthly','yearly','never')) DEFAULT 'never',

    status TEXT CHECK (status IN ('active','completed')) DEFAULT 'active',

    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,

    created_at TIMESTAMP DEFAULT now()
);

