import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { createDefaultAccounts } from './accountController';

export const register = async (req: Request, res: Response) => {
    const { name, email, password, business_id } = req.body;

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user without business_id initially
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash, business_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, business_id, created_at',
            [name, email, hashedPassword, business_id || null]
        );

        // If business_id provided, add to business_users table
        if (business_id) {
            await pool.query(
                'INSERT INTO business_users (user_id, business_id) VALUES ($1, $2)',
                [newUser.rows[0].id, business_id]
            );
        }

        const payload = {
            user: {
                id: newUser.rows[0].id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token,
                    needsBusinessSetup: !business_id // Flag to show if business setup is needed
                });
            }
        );
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        console.log('=== LOGIN ATTEMPT ===');
        console.log('Email:', email);
        
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            console.log('User not found');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        console.log('User found:', user.rows[0].id, user.rows[0].name);

        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);

        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.rows[0].id
            }
        };

        console.log('Creating JWT for user:', user.rows[0].id);

        jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 3600 },
            async (err, token) => {
                if (err) throw err;
                console.log('=== LOGIN SUCCESS ===');
                console.log('JWT created for user ID:', user.rows[0].id);
                console.log('User name:', user.rows[0].name);
                console.log('User email:', user.rows[0].email);
                console.log('Token (first 50 chars):', token?.substring(0, 50) + '...');
                
                // Check if user needs business setup
                const businessCheck = await pool.query(
                    'SELECT business_id FROM business_users WHERE user_id = $1',
                    [user.rows[0].id]
                );
                
                const needsBusinessSetup = businessCheck.rows.length === 0;
                console.log('Needs business setup:', needsBusinessSetup);
                
                res.json({ 
                    token,
                    needsBusinessSetup
                });
            }
        );
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

export const setupBusiness = async (req: Request, res: Response) => {
    const { businessName, currency } = req.body;
    const user_id = req.user?.id;

    try {
        if (!businessName || !currency) {
            return res.status(400).json({ msg: 'Business name and currency are required' });
        }

        // Create new business
        const newBusiness = await pool.query(
            'INSERT INTO businesses (name, currency) VALUES ($1, $2) RETURNING id, name, currency',
            [businessName, currency]
        );

        const business_id = newBusiness.rows[0].id;

        // Update user's business_id
        await pool.query(
            'UPDATE users SET business_id = $1 WHERE id = $2',
            [business_id, user_id]
        );

        // Add to business_users table
        await pool.query(
            'INSERT INTO business_users (user_id, business_id, role) VALUES ($1, $2, $3)',
            [user_id, business_id, 'owner']
        );

        // Create default accounts for the new business
        await createDefaultAccounts(business_id);

        console.log('Business setup completed for user:', user_id, 'Business:', business_id);

        res.json({ 
            msg: 'Business setup completed',
            business: newBusiness.rows[0]
        });
    } catch (err: any) {
        console.error('Business setup error:', err.message);
        res.status(500).send('Server error');
    }
};
