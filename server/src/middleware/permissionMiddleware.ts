import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import pool from '../db';

// Extend Request type to include permissions
declare global {
    namespace Express {
        interface Request {
            userPermissions?: string[];
        }
    }
}

// Middleware to load user permissions
export const loadPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = (req as any).user?.id;

        if (!user_id) {
            return res.status(401).json({ msg: 'No user found' });
        }

        // Check if user is owner (owners have all permissions)
        const businessUser = await pool.query(
            'SELECT role, role_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessUser.rows.length === 0) {
            req.userPermissions = [];
            return next();
        }

        const { role, role_id } = businessUser.rows[0];

        // Owners bypass permission checks
        if (role?.toLowerCase() === 'owner') {
            req.userPermissions = ['*']; // Wildcard = all permissions
            return next();
        }

        // If no role assigned, no permissions
        if (!role_id) {
            req.userPermissions = [];
            return next();
        }

        // Get permissions for the role
        const permissions = await pool.query(
            `SELECT p.permission_key 
             FROM role_permissions rp
             JOIN permissions p ON rp.permission_id = p.permission_id
             WHERE rp.role_id = $1`,
            [role_id]
        );

        req.userPermissions = permissions.rows.map(row => row.permission_key);
        next();
    } catch (err: any) {
        logger.error('Permission loading error:', err.message);
        res.status(500).send('Server error');
    }
};

// Middleware to check specific permission
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userPermissions = req.userPermissions || [];

        // Owner has all permissions
        if (userPermissions.includes('*')) {
            return next();
        }

        // Check if user has the required permission
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({ 
                msg: 'Permission denied',
                required: permission 
            });
        }

        next();
    };
};


// Middleware to check if user has ANY of the specified permissions (OR logic)
export const requireAnyPermission = (...permissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userPermissions = req.userPermissions || [];

        // Owner has all permissions
        if (userPermissions.includes('*')) {
            return next();
        }

        // Check if user has any of the required permissions
        const hasPermission = permissions.some(perm => userPermissions.includes(perm));
        
        if (!hasPermission) {
            return res.status(403).json({ 
                msg: 'Permission denied',
                required: permissions.join(' or ')
            });
        }

        next();
    };
};
