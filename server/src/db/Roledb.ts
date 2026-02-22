import pool from '../db';
import * as Business_pool from './Business_pool';
import { clearPermissionCache } from '../middleware/permissionMiddleware';

// Permissions
export const getPermissionsByBusiness = async (business_id: string) => {
    const result = await pool.query(
        `SELECT * FROM permissions 
         WHERE business_id IS NULL OR business_id = $1 
         ORDER BY category, permission_name`,
        [business_id]
    );
    return result.rows;
};

export const createPermission = async (
    business_id: string,
    permission_key: string,
    permission_name: string,
    category: string,
    description: string
) => {
    const result = await pool.query(
        `INSERT INTO permissions 
         (business_id, permission_key, permission_name, category, description)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [business_id, permission_key, permission_name, category, description]
    );
    return result.rows[0];
};

// Roles
export const getRolesByBusiness = async (business_id: string) => {
    const result = await pool.query(
        `SELECT r.*, COUNT(rp.permission_id) AS permission_count
         FROM roles r
         LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
         WHERE r.business_id = $1
         GROUP BY r.role_id
         ORDER BY r.created_at DESC`,
        [business_id]
    );
    return result.rows;
};

export const createRole = async (
    business_id: string,
    role_name: string,
    description: string,
    permissions: string[]
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const roleResult = await client.query(
            `INSERT INTO roles (business_id, role_name, description)
             VALUES ($1, $2, $3) RETURNING *`,
            [business_id, role_name, description]
        );

        const role_id = roleResult.rows[0].role_id;

        if (permissions?.length) {
            for (const permission_id of permissions) {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     VALUES ($1, $2)`,
                    [role_id, permission_id]
                );
            }
        }

        await client.query('COMMIT');
        return roleResult.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const getRoleDetails = async (role_id: string, business_id: string) => {
    const role = await pool.query(
        `SELECT * FROM roles WHERE role_id = $1 AND business_id = $2`,
        [role_id, business_id]
    );
    if (!role.rows.length) return null;

    const permissions = await pool.query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.permission_id = rp.permission_id
         WHERE rp.role_id = $1`,
        [role_id]
    );

    return { ...role.rows[0], permissions: permissions.rows };
};

export const updateRolePermissions = async (
    role_id: string,
    permissions: string[]
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `DELETE FROM role_permissions WHERE role_id = $1`,
            [role_id]
        );

        if (permissions?.length) {
            for (const permission_id of permissions) {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id)
                     VALUES ($1, $2)`,
                    [role_id, permission_id]
                );
            }
        }

        await client.query('COMMIT');
        clearPermissionCache(role_id);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const deleteRole = async (role_id: string, business_id: string) => {
    const result = await pool.query(
        `DELETE FROM roles WHERE role_id = $1 AND business_id = $2 RETURNING *`,
        [role_id, business_id]
    );
    return result.rows[0] || null;
};

// Utilities
export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );
    if (!result.rows.length) throw new Error('User not associated with any business');
    return result.rows[0].business_id as string;
};

export const isUserOwner = async (user_id: string) => {
    const result = await pool.query(
        'SELECT role FROM business_users WHERE user_id = $1',
        [user_id]
    );
    return result.rows.length && result.rows[0].role?.toLowerCase() === 'owner';
};

export const checkDuplicateRole = async (
    business_id: string,
    permissions: string[],
    exclude_role_id?: string
) => {
    if (!permissions.length) return null;

    const result = await pool.query(
        `SELECT r.role_id, r.role_name, array_agg(rp.permission_id ORDER BY rp.permission_id) AS permission_ids
         FROM roles r
         LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
         WHERE r.business_id = $1 ${exclude_role_id ? 'AND r.role_id != $2' : ''}
         GROUP BY r.role_id`,
        exclude_role_id ? [business_id, exclude_role_id] : [business_id]
    );

    const sortedInput = [...permissions].sort();

    for (const role of result.rows) {
        const rolePerms = role.permission_ids ? role.permission_ids.sort() : [];
        if (JSON.stringify(rolePerms) === JSON.stringify(sortedInput)) {
            return { role_id: role.role_id, role_name: role.role_name };
        }
    }
    return null;
};


// ============================================
// NEW HELPER FUNCTIONS - MIGRATION
// ============================================

export const verifyBusinessAccess = async (user_id: string) => {
    const business_id = await Business_pool.Get_Business_id(user_id);
    return business_id;
};

export const verifyOwnerAccess = async (user_id: string) => {
    const business_id = await Business_pool.Get_Business_id(user_id);
    const isOwner = await isUserOwner(user_id);
    if (!isOwner) throw { status: 403, message: 'Only owners can perform this action' };
    return business_id;
};
