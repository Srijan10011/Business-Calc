import pool from '../db';

export const addProductCostRule = async (
    product_id: string,
    category_id: string,
    mode: string,
    value: number
) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO product_cost_rules (product_id, category_id, mode, value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [product_id, category_id, mode, value]
        );

        return result.rows[0];
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};
