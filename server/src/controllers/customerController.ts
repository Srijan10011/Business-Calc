import { Request, Response } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';

export const addCustomer = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, address } = req.body;
        const token = req.header('x-auth-token');
        
        console.log('=== JWT DEBUG ===');
        console.log('Raw token received:', token?.substring(0, 50) + '...');
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
                console.log('Decoded JWT user ID:', decoded.user.id);
                
                // Query users table to verify
                const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.user.id]);
                console.log('User from database:', userResult.rows[0]);
            } catch (jwtError) {
                console.log('JWT decode error:', jwtError);
            }
        }
        
        const user_id = req.user?.id;
        console.log('User ID from middleware:', user_id);
        
        if (!name || !phone || !address) {
            return res.status(400).json({ message: 'Missing required fields: name, phone, address' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        console.log('Business query result:', businessResult.rows);

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;
        console.log('Using business_id:', business_id);

        if (!business_id) {
            return res.status(400).json({ message: 'Invalid business association' });
        }

        const result = await pool.query(
            `INSERT INTO customers (business_id, name, phone, email, address, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [business_id, name, phone, email || null, address]
        );

        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

