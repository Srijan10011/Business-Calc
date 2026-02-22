import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { logSecurityEvent } from '../utils/securityAudit';
import pool from '../db';

// Extend Request type to include permissions
declare global {
    namespace Express {
        interface Request {
            userPermissions?: string[];
        }
    }
}

// Permission cache
interface CachedPermission {
    permissions: string[];
    expiresAt: number;
}

const permissionCache = new Map<string, CachedPermission>();
const CACHE_TTL = 60000; // 1 minute

// Clear expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of permissionCache.entries()) {
        if (now > value.expiresAt) {
            permissionCache.delete(key);
        }
    }
}, 60000);

// Helper to clear cache for a specific role (call when permissions change)
export const clearPermissionCache = (roleId?: string) => {
    if (roleId) {
        permissionCache.delete(`role:${roleId}`);
    } else {
        permissionCache.clear();
    }
};

// Middleware to load user permissions
export const loadPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = (req as any).user?.id;

        if (!user_id) {
            return res.status(401).json({ msg: 'No user found' });
        }

        // Check if user is associated with a business
        const businessUser = await pool.query(
            'SELECT role, role_id, business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessUser.rows.length === 0) {
            logger.warn(`User ${user_id} attempted access without business association`);
            return res.status(403).json({ msg: 'User not associated with any business' });
        }

        const { role, role_id, business_id } = businessUser.rows[0];
        (req as any).user.businessId = business_id;

        // Owners bypass permission checks
        const normalizedRole = role?.trim().toLowerCase();
        if (normalizedRole === 'owner') {
            req.userPermissions = ['*'];
            return next();
        }

        if (!role_id) {
            logger.warn(`User ${user_id} has no role assigned in business ${business_id}`);
            return res.status(403).json({ msg: 'No role assigned. Contact administrator.' });
        }

        // Check cache first
        const cacheKey = `role:${role_id}`;
        const cached = permissionCache.get(cacheKey);
        
        if (cached && Date.now() < cached.expiresAt) {
            req.userPermissions = cached.permissions;
            return next();
        }

        // Cache miss - fetch from DB
        const permissions = await pool.query(
            `SELECT p.permission_key 
             FROM role_permissions rp
             JOIN permissions p ON rp.permission_id = p.permission_id
             WHERE rp.role_id = $1`,
            [role_id]
        );

        const permissionList = permissions.rows.map(row => row.permission_key);
        
        if (permissionList.length === 0) {
            logger.warn(`User ${user_id} has role ${role_id} but no permissions assigned`);
            return res.status(403).json({ msg: 'No permissions assigned to your role. Contact administrator.' });
        }

        // Store in cache
        permissionCache.set(cacheKey, {
            permissions: permissionList,
            expiresAt: Date.now() + CACHE_TTL
        });

        req.userPermissions = permissionList;
        next();
    } catch (err: any) {
        logger.error('Permission loading error:', err.message);
        res.status(500).send('Server error');
    }
};

// Middleware to check specific permission
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userPermissions = req.userPermissions;

        // Fail-safe: if permissions not loaded, deny access
        if (!userPermissions) {
            logger.error('Permissions not loaded - loadPermissions middleware missing?');
            return res.status(500).json({ msg: 'Permission system error' });
        }

        // Owner has all permissions
        if (userPermissions.includes('*')) {
            return next();
        }

        // Check if user has the required permission
        if (!userPermissions.includes(permission)) {
            logger.warn(`Permission denied: user needs '${permission}', has [${userPermissions.join(', ')}]`);
            
            // Log permission denial
            logSecurityEvent({
                event_type: 'permission_denied',
                user_id: (req as any).user?.id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                details: { 
                    required_permission: permission,
                    user_permissions: userPermissions,
                    path: req.path,
                    method: req.method
                },
                severity: 'low'
            });
            
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
        const userPermissions = req.userPermissions;

        // Fail-safe: if permissions not loaded, deny access
        if (!userPermissions) {
            logger.error('Permissions not loaded - loadPermissions middleware missing?');
            return res.status(500).json({ msg: 'Permission system error' });
        }

        // Owner has all permissions
        if (userPermissions.includes('*')) {
            return next();
        }

        // Check if user has any of the required permissions
        const hasPermission = permissions.some(perm => userPermissions.includes(perm));
        
        if (!hasPermission) {
            logger.warn(`Permission denied: user needs one of [${permissions.join(', ')}], has [${userPermissions.join(', ')}]`);
            return res.status(403).json({ 
                msg: 'Permission denied',
                required: permissions.join(' or ')
            });
        }

        next();
    };
};
