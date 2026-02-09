import { Request, Response } from 'express';
import pool from '../db';

export const getPendingRequests = async (req: Request, res: Response) => {
    const user_id = req.user?.id;

    try {
        const businessResult = await pool.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            return res.status(403).json({ msg: 'Only owners can view requests' });
        }

        const business_id = businessResult.rows[0].business_id;

        const requests = await pool.query(
            `SELECT ur.request_id, ur.user_id, ur.business_id, ur.status, ur.requested_at,
                    u.name, u.email
             FROM user_requests ur
             JOIN users u ON ur.user_id = u.user_id
             WHERE ur.business_id = $1 AND ur.status = 'pending'
             ORDER BY ur.requested_at DESC`,
            [business_id]
        );

        res.json(requests.rows);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

export const approveRequest = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { request_id } = req.params;
    const { role_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const businessResult = await client.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            await client.query('ROLLBACK');
            return res.status(403).json({ msg: 'Only owners can approve requests' });
        }

        const business_id = businessResult.rows[0].business_id;

        const requestResult = await client.query(
            'SELECT user_id, business_id FROM user_requests WHERE request_id = $1 AND business_id = $2 AND status = $3',
            [request_id, business_id, 'pending']
        );

        if (requestResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Request not found' });
        }

        const requestUserId = requestResult.rows[0].user_id;

        await client.query(
            'INSERT INTO business_users (user_id, business_id, role, role_id) VALUES ($1, $2, $3, $4)',
            [requestUserId, business_id, 'member', role_id || null]
        );

        await client.query(
            'UPDATE user_requests SET status = $1 WHERE request_id = $2',
            ['approved', request_id]
        );

        await client.query('COMMIT');

        res.json({ msg: 'Request approved successfully' });
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server error');
    } finally {
        client.release();
    }
};

export const rejectRequest = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    const { request_id } = req.params;

    try {
        const businessResult = await pool.query(
            'SELECT business_id, role FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0 || businessResult.rows[0].role?.toLowerCase() !== 'owner') {
            return res.status(403).json({ msg: 'Only owners can reject requests' });
        }

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            'UPDATE user_requests SET status = $1 WHERE request_id = $2 AND business_id = $3 AND status = $4 RETURNING *',
            ['rejected', request_id, business_id, 'pending']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        res.json({ msg: 'Request rejected successfully' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

export const checkUserStatus = async (req: Request, res: Response) => {
    const user_id = req.user?.id;

    try {
        const businessCheck = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessCheck.rows.length > 0) {
            return res.json({ status: 'approved', hasAccess: true });
        }

        const requestCheck = await pool.query(
            'SELECT status FROM user_requests WHERE user_id = $1 AND status = $2',
            [user_id, 'pending']
        );

        if (requestCheck.rows.length > 0) {
            return res.json({ status: 'pending', hasAccess: false });
        }

        res.json({ status: 'none', hasAccess: false });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
