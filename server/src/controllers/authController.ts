import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { createDefaultAccounts } from './accountController';

// Check if business exists
export const checkBusiness = async (req: Request, res: Response) => {
    const { business_id } = req.params;

    try {
        const business = await pool.query(
            'SELECT business_id, name, currency FROM businesses WHERE business_id = $1',
            [business_id]
        );

        if (business.rows.length === 0) {
            return res.status(404).json({ msg: 'Business not found' });
        }

        res.json({ 
            exists: true,
            business: business.rows[0]
        });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

export const register = async (req: Request, res: Response) => {
    const { name, email, password, business_id } = req.body;

    // Require business_id for registration
    if (!business_id) {
        return res.status(400).json({ msg: 'Business ID is required for registration' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Validate business_id exists first
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(business_id)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Invalid business ID format' });
        }

        const businessExists = await client.query(
            'SELECT business_id FROM businesses WHERE business_id = $1',
            [business_id]
        );

        if (businessExists.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Business not found' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user only after business validation
        const newUser = await client.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email, created_at',
            [name, email, hashedPassword]
        );

        const user_id = newUser.rows[0].user_id;

        // Link user to business
        await client.query(
            'INSERT INTO business_users (user_id, business_id) VALUES ($1, $2)',
            [user_id, business_id]
        );
        await client.query('COMMIT');

        const payload = {
            user: {
                id: user_id
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
                    needsBusinessSetup: false
                });
            }
        );
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server error');
    } finally {
        client.release();
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

        console.log('User found:', user.rows[0].user_id, user.rows[0].name);

        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);

        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.rows[0].user_id
            }
        };

        console.log('Creating JWT for user:', user.rows[0].user_id);

        jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 3600 },
            async (err, token) => {
                if (err) throw err;
                console.log('=== LOGIN SUCCESS ===');
                console.log('JWT created for user ID:', user.rows[0].user_id);
                console.log('User name:', user.rows[0].name);
                console.log('User email:', user.rows[0].email);
                console.log('Token (first 50 chars):', token?.substring(0, 50) + '...');
                
                // Check if user needs business setup
                const businessCheck = await pool.query(
                    'SELECT business_id FROM business_users WHERE user_id = $1',
                    [user.rows[0].user_id]
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
            'INSERT INTO businesses (name, currency) VALUES ($1, $2) RETURNING business_id, name, currency',
            [businessName, currency]
        );

        const business_id = newBusiness.rows[0].business_id;

        // Add to business_users table (no role column in schema)
        await pool.query(
            'INSERT INTO business_users (user_id, business_id) VALUES ($1, $2)',
            [user_id, business_id]
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
