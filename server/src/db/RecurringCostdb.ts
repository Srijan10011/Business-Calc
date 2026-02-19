import pool from '../db';

export const createRecurringCost = async (
    name: string,
    type: string,
    monthlyTarget: number,
    businessId: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const categoryResult = await client.query(
            `INSERT INTO cost_categories (name, type, business_id, is_recurring, monthly_target)
             VALUES ($1, $2, $3, true, $4)
             RETURNING category_id`,
            [name, type, businessId, monthlyTarget]
        );

        const categoryId = categoryResult.rows[0].category_id;
        const currentMonth = new Date().toISOString().slice(0, 7);

        await client.query(
            `INSERT INTO monthly_cost_recovery (category_id, business_id, month, target_amount, recovered_amount)
             VALUES ($1, $2, $3, $4, 0)`,
            [categoryId, businessId, currentMonth, monthlyTarget]
        );

        await client.query('COMMIT');
        return categoryResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getRecurringCosts = async (businessId: string) => {
    const result = await pool.query(
        `SELECT 
            cc.category_id,
            cc.name,
            cc.type,
            cc.monthly_target,
            mcr.month,
            mcr.target_amount,
            mcr.recovered_amount,
            mcr.status,
            CASE 
                WHEN mcr.target_amount > 0 THEN (mcr.recovered_amount / mcr.target_amount * 100)
                ELSE 0 
            END as progress
         FROM cost_categories cc
         LEFT JOIN monthly_cost_recovery mcr ON cc.category_id = mcr.category_id 
            AND mcr.month = $2
         WHERE cc.business_id = $1 AND cc.is_recurring = true
         ORDER BY cc.name`,
        [businessId, new Date().toISOString().slice(0, 7)]
    );
    return result.rows;
};

export const getRecurringCostHistory = async (businessId: string, categoryId?: string) => {
    const query = categoryId
        ? `SELECT 
            cc.name,
            cc.type,
            mcr.month,
            mcr.target_amount,
            mcr.recovered_amount,
            mcr.status,
            CASE 
                WHEN mcr.target_amount > 0 THEN (mcr.recovered_amount / mcr.target_amount * 100)
                ELSE 0 
            END as progress
           FROM monthly_cost_recovery mcr
           JOIN cost_categories cc ON mcr.category_id = cc.category_id
           WHERE mcr.business_id = $1 AND mcr.category_id = $2
           ORDER BY mcr.month DESC`
        : `SELECT 
            cc.name,
            cc.type,
            mcr.month,
            mcr.target_amount,
            mcr.recovered_amount,
            mcr.status,
            CASE 
                WHEN mcr.target_amount > 0 THEN (mcr.recovered_amount / mcr.target_amount * 100)
                ELSE 0 
            END as progress
           FROM monthly_cost_recovery mcr
           JOIN cost_categories cc ON mcr.category_id = cc.category_id
           WHERE mcr.business_id = $1
           ORDER BY mcr.month DESC, cc.name`;

    const result = await pool.query(query, categoryId ? [businessId, categoryId] : [businessId]);
    return result.rows;
};

export const getCurrentMonthRecovery = async (categoryId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const result = await pool.query(
        `SELECT recovered_amount, target_amount, status
         FROM monthly_cost_recovery
         WHERE category_id = $1 AND month = $2`,
        [categoryId, currentMonth]
    );
    return result.rows[0] || null;
};

export const updateMonthlyRecovery = async (
    categoryId: string,
    amount: number
) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const result = await pool.query(
        `UPDATE monthly_cost_recovery
         SET recovered_amount = recovered_amount + $1,
             status = CASE 
                 WHEN recovered_amount + $1 >= target_amount THEN 'fulfilled'
                 ELSE 'in_progress'
             END
         WHERE category_id = $2 AND month = $3
         RETURNING recovered_amount, target_amount, status`,
        [amount, categoryId, currentMonth]
    );
    return result.rows[0];
};

export const transitionToNewMonth = async (businessId: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const currentMonth = new Date().toISOString().slice(0, 7);
        const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

        await client.query(
            `UPDATE monthly_cost_recovery
             SET status = CASE 
                 WHEN recovered_amount >= target_amount THEN 'fulfilled'
                 ELSE 'unfulfilled'
             END
             WHERE business_id = $1 AND month = $2 AND status = 'in_progress'`,
            [businessId, lastMonth]
        );

        await client.query(
            `INSERT INTO monthly_cost_recovery (category_id, business_id, month, target_amount, recovered_amount, status)
             SELECT category_id, business_id, $2, monthly_target, 0, 'in_progress'
             FROM cost_categories
             WHERE business_id = $1 AND is_recurring = true
             ON CONFLICT (category_id, month) DO NOTHING`,
            [businessId, currentMonth]
        );

        await client.query('COMMIT');
        return { success: true, month: currentMonth };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
