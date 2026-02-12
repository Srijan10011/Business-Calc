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

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const normalizedEmail = email.toLowerCase().trim();

        const user = await client.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);

        if (user.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'User already exists' });
        }

        let finalBusinessId = business_id;
        let needsBusinessSetup = false;

        // If business_id provided, validate it exists
        if (business_id) {
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
        } else {
            // No business_id provided - user will need to set up business later
            needsBusinessSetup = true;
            finalBusinessId = null;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await client.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email, created_at',
            [name, normalizedEmail, hashedPassword]
        );

        const user_id = newUser.rows[0].user_id;

        // If business_id provided, create pending request instead of direct access
        if (finalBusinessId) {
            await client.query(
                'INSERT INTO user_requests (user_id, business_id, status) VALUES ($1, $2, $3)',
                [user_id, finalBusinessId, 'pending']
            );
        }

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
                    needsBusinessSetup: !finalBusinessId,
                    requestPending: !!finalBusinessId
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
        
        const normalizedEmail = email.toLowerCase().trim();
        
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);

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
                
                // Check if user has business access or pending request
                const businessCheck = await pool.query(
                    'SELECT business_id, role FROM business_users WHERE user_id = $1',
                    [user.rows[0].user_id]
                );
                
                let needsBusinessSetup = false;
                let requestPending = false;
                const role = businessCheck.rows.length > 0 ? businessCheck.rows[0].role : null;
                
                if (businessCheck.rows.length === 0) {
                    // Check if there's a pending request
                    const requestCheck = await pool.query(
                        'SELECT status FROM user_requests WHERE user_id = $1 AND status = $2',
                        [user.rows[0].user_id, 'pending']
                    );
                    
                    if (requestCheck.rows.length > 0) {
                        requestPending = true;
                    } else {
                        needsBusinessSetup = true;
                    }
                }
                
                console.log('Needs business setup:', needsBusinessSetup);
                console.log('Request pending:', requestPending);
                console.log('User role:', role);
                
                res.json({ 
                    token,
                    needsBusinessSetup,
                    requestPending,
                    role
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

        // Add to business_users table with Owner role
        await pool.query(
            'INSERT INTO business_users (user_id, business_id, role) VALUES ($1, $2, $3)',
            [user_id, business_id, 'Owner']
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

export const getUserInfo = async (req: Request, res: Response) => {
    const user_id = req.user?.id;

    try {
        const userInfo = await pool.query(
            `SELECT u.user_id, u.name, u.email, bu.role, bu.role_id
             FROM users u 
             LEFT JOIN business_users bu ON u.user_id = bu.user_id 
             WHERE u.user_id = $1`,
            [user_id]
        );

        if (userInfo.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const user = userInfo.rows[0];

        // Get permissions
        let permissions = [];
        if (user.role?.toLowerCase() === 'owner') {
            permissions = ['*']; // All permissions
        } else if (user.role_id) {
            const permResult = await pool.query(
                `SELECT p.permission_key 
                 FROM role_permissions rp
                 JOIN permissions p ON rp.permission_id = p.permission_id
                 WHERE rp.role_id = $1`,
                [user.role_id]
            );
            permissions = permResult.rows.map(row => row.permission_key);
        }

        res.json({
            ...user,
            permissions
        });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
