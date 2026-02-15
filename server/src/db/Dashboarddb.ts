import pool from '../db';

export const getBusinessIdForUser = async (user_id: string): Promise<string> => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );

    if (result.rows.length === 0) {
        throw new Error('User not associated with any business');
    }

    return result.rows[0].business_id;
};

export const getDashboardDataForBusiness = async (business_id: string) => {
    // Assets
    const assetsResult = await pool.query(
        `SELECT cc.name, fca.total_cost, fca.recovered, fca.asset_idd as id
         FROM fixed_cost_assets fca
         JOIN cost_categories cc ON fca.cateogory_id = cc.category_id
         WHERE cc.business_id = $1`,
        [business_id]
    );

    // Debits
    const debitResult = await pool.query(
        `SELECT da.debit_id, ci.name as customer_name, da.amount, da.recovered, da.total, da.status
         FROM debit_account da
         JOIN customers_info ci ON da.customer_id = ci.customer_id
         JOIN business_customers bc ON ci.customer_id = bc.customer_id
         WHERE bc.business_id = $1`,
        [business_id]
    );

    // Inventory
    const inventoryResult = await pool.query(
        `SELECT ii.name, SUM(il.add_to_recover) as total_to_recover
         FROM inventory_logs il
         JOIN inventory_info ii ON il.inventory_id = ii.inventory_id
         JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
         WHERE bi.business_id = $1 AND il.add_to_recover > 0
         GROUP BY ii.inventory_id, ii.name`,
        [business_id]
    );

    return { assets: assetsResult.rows, debits: debitResult.rows, inventory: inventoryResult.rows };
};

export const getMoneyFlowForBusiness = async (
    business_id: string,
    startOfMonth: Date,
    endOfMonth: Date
) => {
    // Incoming
    const incomingResult = await pool.query(
        `SELECT a.account_name, COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
         LEFT JOIN accounts a ON t.account_id = a.account_id
         WHERE bt.business_id = $1 
           AND t.type = 'Incomming' 
           AND t.created_at >= $2 
           AND t.created_at <= $3
           AND a.account_name IS NOT NULL
         GROUP BY a.account_name`,
        [business_id, startOfMonth, endOfMonth]
    );

    // Outgoing
    const outgoingResult = await pool.query(
        `SELECT 
            CASE 
                WHEN t.note LIKE '%inventory%' OR t.note LIKE '%Stock in%' OR t.note LIKE '%Purchase of inventory%' THEN 'inventory'
                WHEN t.account_id IS NULL THEN 'cogs'
                ELSE 'general'
            END as category,
            COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
         WHERE bt.business_id = $1 
           AND t.type = 'Outgoing' 
           AND t.created_at >= $2 
           AND t.created_at <= $3
         GROUP BY category`,
        [business_id, startOfMonth, endOfMonth]
    );

    // COGS breakdown
    const cogsResult = await pool.query(
        `SELECT 
            SUBSTRING(t.note FROM '^([^:]+):') as category_name, 
            COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
         WHERE bt.business_id = $1 
           AND t.type = 'Outgoing' 
           AND t.account_id IS NULL
           AND t.created_at >= $2 
           AND t.created_at <= $3
           AND t.note LIKE '%:%'
         GROUP BY SUBSTRING(t.note FROM '^([^:]+):')
         ORDER BY total DESC`,
        [business_id, startOfMonth, endOfMonth]
    );

    return { incoming: incomingResult.rows, outgoing: outgoingResult.rows, cogs: cogsResult.rows };
};
