import { Request, Response } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';

export const getCustomers = async (req: Request, res: Response) => {
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
                ci.customer_id as id,
                ci.customer_id,
                ci.name,
                ci.phone,
                ci.email,
                ci.address,
                ci.created_at,
                COALESCE(cph.total_purchase, 0) as total_purchases,
                COALESCE(cph.outstanding_credit, 0) as outstanding_credit,
                cph.last_purchase
            FROM customers_info ci
            INNER JOIN business_customers bc ON ci.customer_id = bc.customer_id
            LEFT JOIN customer_purchase_history cph ON ci.customer_id = cph.customer_id
            WHERE bc.business_id = $1
            ORDER BY ci.created_at DESC`,
            [business_id]
        );

        console.log('=== GET CUSTOMERS DEBUG ===');
        console.log('Returning customers:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('First customer ID:', result.rows[0].id);
            console.log('First customer customer_id:', result.rows[0].customer_id);
        }

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;
        const { id } = req.params;

        console.log('=== GET CUSTOMER BY ID DEBUG ===');
        console.log('Received ID parameter:', id);
        console.log('ID type:', typeof id);
        console.log('User ID:', user_id);

        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
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
            `SELECT 
                ci.customer_id,
                ci.name,
                ci.phone,
                ci.email,
                ci.created_at,
                COALESCE(cph.total_purchase, 0) as total_purchases,
                COALESCE(cph.outstanding_credit, 0) as outstanding_credit,
                cph.last_purchase
            FROM customers_info ci
            INNER JOIN business_customers bc ON ci.customer_id = bc.customer_id
            LEFT JOIN customer_purchase_history cph ON ci.customer_id = cph.customer_id
            WHERE bc.business_id = $1 AND ci.customer_id = $2`,
            [business_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerSales = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;
        const { id } = req.params;

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
                s.id,
                s.total_amount,
                s.payment_type,
                s.created_at,
                si.quantity,
                si.rate,
                p.name as product_name
            FROM sales s
            INNER JOIN sale_items si ON s.id = si.sale_id
            INNER JOIN products p ON si.product_id = p.id
            WHERE s.customer_id = $1 AND s.business_id = $2
            ORDER BY s.created_at DESC`,
            [id, business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching customer sales:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addCustomer = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, address } = req.body;
        const user_id = req.user?.id;
        
        if (!name || !phone) {
            return res.status(400).json({ message: 'Missing required fields: name, phone' });
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

        // Insert into customers_info table
        const customerResult = await pool.query(
            'INSERT INTO customers_info (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING customer_id, name, phone, email, address, created_at',
            [name, phone, email || null, address || null]
        );

        const customer_id = customerResult.rows[0].customer_id;

        // Link customer to business in business_customers table
        await pool.query(
            'INSERT INTO business_customers (customer_id, business_id) VALUES ($1, $2)',
            [customer_id, business_id]
        );

        res.status(201).json(customerResult.rows[0]);
    } catch (error: any) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

