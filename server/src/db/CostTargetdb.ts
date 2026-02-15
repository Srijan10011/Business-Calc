import pool from '../db';

export const addCostTarget = async (
    category_id: string,
    asset_id: string,
    name: string,
    target_amount: number,
    reset_period: string,
    business_id: string
) => {
    const result = await pool.query(
        `INSERT INTO cost_targets (business_id, category_id, asset_id, name, target_amount, reset_period)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [business_id, category_id || null, asset_id || null, name, target_amount, reset_period || 'never']
    );

    return result.rows[0];
};

export const getCostTargets = async (business_id: string) => {
    const result = await pool.query(
        `SELECT 
            ct.*,
            c.name as category_name,
            a.name as asset_name
        FROM cost_targets ct
        LEFT JOIN categories c ON ct.category_id = c.id
        LEFT JOIN assets a ON ct.asset_id = a.id
        WHERE ct.business_id = $1
        ORDER BY ct.created_at DESC`,
        [business_id]
    );

    return result.rows;
};

export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );

    if (result.rows.length === 0) {
        throw new Error('User not associated with any business');
    }

    return result.rows[0].business_id;
};
