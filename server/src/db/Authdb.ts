import pool from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import * as Accountdb from './Accountdb';

// Helper function to generate JWT token
const generateToken = (userId: string): string => {
    return jwt.sign(
        { user: { id: userId } },
        process.env.JWT_SECRET as string,
        { expiresIn: 3600 }
    );
};

interface User {
    user_id: string;
    name: string;
    email: string;
    password_hash: string;
    business_id?: string | null;
}

// Get a user by email

// Check if business exists
export const checkBusinessExists = async (business_id: string) => {
    const result = await pool.query(
        'SELECT business_id, name, currency FROM businesses WHERE business_id = $1',
        [business_id]
    );
    return result.rows[0] || null;
};

// Register a new user
export const registerUser = async (
    name: string,
    email: string,
    password: string,
    business_id?: string
) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            throw new Error('User already exists');
        }

        let finalBusinessId = business_id || null;
        let needsBusinessSetup = false;

        if (business_id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(business_id)) throw new Error('Invalid business ID format');

            const businessExists = await client.query('SELECT business_id FROM businesses WHERE business_id = $1', [business_id]);
            if (businessExists.rows.length === 0) throw new Error('Business not found');
        } else {
            needsBusinessSetup = true;
            finalBusinessId = null;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await client.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, name, email',
            [name, normalizedEmail, hashedPassword]
        );

        const user_id = newUser.rows[0].user_id;

        // If business_id provided, create pending request
        if (finalBusinessId) {
            await client.query(
                'INSERT INTO user_requests (user_id, business_id, status) VALUES ($1, $2, $3)',
                [user_id, finalBusinessId, 'pending']
            );
        }

        await client.query('COMMIT');

        // Generate JWT
        const token = generateToken(user_id);

        return {
            user_id,
            token,
            needsBusinessSetup,
            requestPending: !!finalBusinessId
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
export const getUserByEmail = async (email: string): Promise<User | null> => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
};
// Login a user



export const loginUser = async (email: string, password: string) => {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 1️⃣ Fetch user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) throw { statusCode: 400, message: 'Invalid Credentials' };

    // 2️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw { statusCode: 400, message: 'Invalid Credentials' };

    // 3️⃣ Generate JWT
    const token = jwt.sign(
        { user: { id: user.user_id } },
        process.env.JWT_SECRET as string,
        { expiresIn: 3600 } // 1 hour
    );

    // 4️⃣ Check business access
    const businessCheck = await pool.query(
        'SELECT business_id, role FROM business_users WHERE user_id = $1',
        [user.user_id]
    );

    let needsBusinessSetup = false;
    let requestPending = false;
    let role: string | null = null;

    if (businessCheck.rows.length > 0) {
        // User already has business access
        role = businessCheck.rows[0].role;
    } else {
        // No business access → check pending requests
        const requestCheck = await pool.query(
            'SELECT status FROM user_requests WHERE user_id = $1 AND status = $2',
            [user.user_id, 'pending']
        );
        if (requestCheck.rows.length > 0) {
            requestPending = true;
        } else {
            needsBusinessSetup = true;
        }
    }

    // 5️⃣ Return payload for frontend
    return {
        token,
        needsBusinessSetup,
        requestPending,
        role
    };
};

// Setup a business for a user
export const setupBusiness = async (user_id: string, businessName: string, currency: string, createDefaultAccount: (client: any, business_id: string) => Promise<void>) => {
    if (!businessName || !currency) throw new Error('Business name and currency are required');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const newBusiness = await client.query(
            'INSERT INTO businesses (name, currency) VALUES ($1, $2) RETURNING business_id, name, currency',
            [businessName, currency]
        );

        const business_id = newBusiness.rows[0].business_id;

        await client.query(
            'INSERT INTO business_users (user_id, business_id, role) VALUES ($1, $2, $3)',
            [user_id, business_id, 'Owner']
        );
        await client.query("COMMIT");
        await Accountdb.createDefaultAccount(business_id);

        await client.query('COMMIT');

        return newBusiness.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
// auth.service.ts
export const getUserInfo = async (user_id: string) => {
    const userInfo = await pool.query(
        `SELECT u.user_id, u.name, u.email, bu.role, bu.role_id
     FROM users u 
     LEFT JOIN business_users bu ON u.user_id = bu.user_id 
     WHERE u.user_id = $1`,
        [user_id]
    );

    if (userInfo.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = userInfo.rows[0];

    // Get permissions
    let permissions: string[] = [];
    if (user.role?.toLowerCase() === 'owner') {
        permissions = ['*'];
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

    return {
        ...user,
        permissions
    };
};


// ============================================================================
// REFRESH TOKEN FUNCTIONS
// ============================================================================

// Store refresh token in database (hashed)
export const storeRefreshToken = async (
    user_id: string,
    refreshToken: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
) => {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    
    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user_id, tokenHash, expiresAt, ipAddress, userAgent]
    );
};

// Validate refresh token with security checks
export const validateRefreshToken = async (
    refreshToken: string, 
    user_id: string,
    ipAddress?: string,
    userAgent?: string
) => {
    const result = await pool.query(
        `SELECT token_id, token_hash, expires_at, ip_address, user_agent, last_used 
         FROM refresh_tokens 
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [user_id]
    );

    for (const row of result.rows) {
        const isValid = await bcrypt.compare(refreshToken, row.token_hash);
        if (isValid) {
            // Security check: Detect token replay from different IP/device
            const ipMismatch = ipAddress && row.ip_address && ipAddress !== row.ip_address.toString();
            const userAgentMismatch = userAgent && row.user_agent && userAgent !== row.user_agent;
            
            if (ipMismatch || userAgentMismatch) {
                // Log suspicious activity
                logger.warn('Refresh token replay detected', {
                    user_id,
                    original_ip: row.ip_address,
                    request_ip: ipAddress,
                    ip_mismatch: ipMismatch,
                    user_agent_mismatch: userAgentMismatch
                });
                
                // Optionally: Revoke token on suspicious activity
                // await pool.query('DELETE FROM refresh_tokens WHERE token_id = $1', [row.token_id]);
                // return false;
            }
            
            // Update last_used timestamp
            await pool.query(
                'UPDATE refresh_tokens SET last_used = NOW() WHERE token_id = $1',
                [row.token_id]
            );
            
            return { valid: true, token_id: row.token_id };
        }
    }
    
    return { valid: false };
};

// Delete specific refresh token (logout)
export const deleteRefreshToken = async (refreshToken: string, user_id: string) => {
    const result = await pool.query(
        'SELECT token_id, token_hash FROM refresh_tokens WHERE user_id = $1',
        [user_id]
    );

    for (const row of result.rows) {
        const isMatch = await bcrypt.compare(refreshToken, row.token_hash);
        if (isMatch) {
            await pool.query('DELETE FROM refresh_tokens WHERE token_id = $1', [row.token_id]);
            return true;
        }
    }
    
    return false;
};

// Delete refresh token by ID (for token rotation)
export const deleteRefreshTokenById = async (token_id: string) => {
    await pool.query('DELETE FROM refresh_tokens WHERE token_id = $1', [token_id]);
};

// Delete all refresh tokens for a user (force logout all sessions)
export const deleteAllUserTokens = async (user_id: string) => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user_id]);
};

// Clean up expired tokens (run periodically)
export const cleanupExpiredTokens = async () => {
    const result = await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    return result.rowCount;
};
