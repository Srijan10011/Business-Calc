import pool from '../db';

export const checkCategory = async (
    name: string,
    cost_behaviour: string,
    product_id: string,
    business_id: string
) => {
    const result = await pool.query(
        'SELECT id FROM categories WHERE business_id = $1 AND name = $2 AND cost_behavior = $3 AND product_id = $4',
        [business_id, name, cost_behaviour, product_id]
    );

    if (result.rows.length > 0) {
        return { exists: true, id: result.rows[0].id };
    }
    return { exists: false };
};

export const getCategoriesByBusiness = async (business_id: string) => {
    const result = await pool.query(
        'SELECT * FROM categories WHERE business_id = $1 ORDER BY created_at DESC',
        [business_id]
    );

    return result.rows;
};

export const createCategory = async (
    name: string,
    cost_behaviour: string,
    type: string,
    product_id: string,
    business_id: string
) => {
    const result = await pool.query(
        `INSERT INTO categories (business_id, name, type, cost_behavior, product_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [business_id, name, type, cost_behaviour, product_id]
    );

    return { id: result.rows[0].id };
};


