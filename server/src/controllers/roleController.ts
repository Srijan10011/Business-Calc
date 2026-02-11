import { Request, Response } from 'express';
import pool from '../db';

// Get all permissions (system + custom for business)
export const getPermissions = async (req: Request, res: Response) => {
    const user_id = req.user?.id;

    try {
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(403).json({ msg: 'No business access' });
        }

        const business_id = businessResult.rows[0].business_id;

        const permissions = await pool.query(
            `SELECT * FROM permissions 
             WHERE business_id IS NULL OR business_id = $1 
             ORDER BY category, permission_name`,
            [business_id]
        );

        res.json(permissions.rows);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Create custom permission (owner only)
export const createPermission = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { permission_key, permission_name, category, description } = req.body;

    try {
        const businessResult = await pool.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            return res.status(403).json({ msg: 'Only owners can create permissions' });
        }

        const business_id = businessResult.rows[0].business_id;

        const newPermission = await pool.query(
            `INSERT INTO permissions (business_id, permission_key, permission_name, category, description) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [business_id, permission_key, permission_name, category, description]
        );

        res.json(newPermission.rows[0]);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Get all roles for business
export const getRoles = async (req: Request, res: Response) => {
    const user_id = req.user?.id;

    try {
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(403).json({ msg: 'No business access' });
        }

        const business_id = businessResult.rows[0].business_id;

        const roles = await pool.query(
            `SELECT r.*, 
                    COUNT(rp.permission_id) as permission_count
             FROM roles r
             LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
             WHERE r.business_id = $1
             GROUP BY r.role_id
             ORDER BY r.created_at DESC`,
            [business_id]
        );

        res.json(roles.rows);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Create role (owner only)
export const createRole = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { role_name, description, permissions } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const businessResult = await client.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            await client.query('ROLLBACK');
            return res.status(403).json({ msg: 'Only owners can create roles' });
        }

        const business_id = businessResult.rows[0].business_id;

        const newRole = await client.query(
            `INSERT INTO roles (business_id, role_name, description) 
             VALUES ($1, $2, $3) RETURNING *`,
            [business_id, role_name, description]
        );

        const role_id = newRole.rows[0].role_id;

        if (permissions && permissions.length > 0) {
            for (const permission_id of permissions) {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
                    [role_id, permission_id]
                );
            }
        }

        await client.query('COMMIT');
        res.json(newRole.rows[0]);
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error creating role:', err.message);
        
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ msg: 'A role with this name already exists in your business' });
        }
        
        res.status(500).json({ msg: 'Server error' });
    } finally {
        client.release();
    }
};

// Check if role with same permissions exists
export const checkDuplicateRole = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { permissions, exclude_role_id } = req.body;

    try {
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(403).json({ msg: 'No business access' });
        }

        const business_id = businessResult.rows[0].business_id;

        if (!permissions || permissions.length === 0) {
            return res.json({ exists: false });
        }

        // Get all roles with their permissions
        const existingRoles = await pool.query(
            `SELECT r.role_id, r.role_name, 
                    array_agg(rp.permission_id ORDER BY rp.permission_id) as permission_ids
             FROM roles r
             LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
             WHERE r.business_id = $1 AND ($2::uuid IS NULL OR r.role_id != $2)
             GROUP BY r.role_id, r.role_name`,
            [business_id, exclude_role_id || null]
        );

        // Sort incoming permissions for comparison
        const sortedPermissions = [...permissions].sort();

        // Check if any existing role has the exact same permissions
        for (const role of existingRoles.rows) {
            const rolePermissions = role.permission_ids ? role.permission_ids.sort() : [];
            
            if (JSON.stringify(rolePermissions) === JSON.stringify(sortedPermissions)) {
                return res.json({
                    exists: true,
                    role_id: role.role_id,
                    role_name: role.role_name
                });
            }
        }

        res.json({ exists: false });
    } catch (err: any) {
        console.error('Error checking duplicate role:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
};

// Get role with permissions
export const getRoleDetails = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { role_id } = req.params;

    try {
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(403).json({ msg: 'No business access' });
        }

        const business_id = businessResult.rows[0].business_id;

        const role = await pool.query(
            `SELECT * FROM roles WHERE role_id = $1 AND business_id = $2`,
            [role_id, business_id]
        );

        if (role.rows.length === 0) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        const permissions = await pool.query(
            `SELECT p.* FROM permissions p
             JOIN role_permissions rp ON p.permission_id = rp.permission_id
             WHERE rp.role_id = $1`,
            [role_id]
        );

        res.json({
            ...role.rows[0],
            permissions: permissions.rows
        });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// Update role permissions
export const updateRolePermissions = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { role_id } = req.params;
    const { permissions } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const businessResult = await client.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            await client.query('ROLLBACK');
            return res.status(403).json({ msg: 'Only owners can update roles' });
        }

        const business_id = businessResult.rows[0].business_id;

        const roleCheck = await client.query(
            'SELECT * FROM roles WHERE role_id = $1 AND business_id = $2',
            [role_id, business_id]
        );

        if (roleCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Role not found' });
        }

        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [role_id]);

        if (permissions && permissions.length > 0) {
            for (const permission_id of permissions) {
                await client.query(
                    `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
                    [role_id, permission_id]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ msg: 'Role permissions updated successfully' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
};

// Delete role
export const deleteRole = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { role_id } = req.params;

    try {
        const businessResult = await pool.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            return res.status(403).json({ msg: 'Only owners can delete roles' });
        }

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            'DELETE FROM roles WHERE role_id = $1 AND business_id = $2 RETURNING *',
            [role_id, business_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Role not found' });
        }

        res.json({ msg: 'Role deleted successfully' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
