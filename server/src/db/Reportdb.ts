import pool from '../db';

export const generateMonthlyReport = async (business_id: string, startdate: string, enddate: string) => {
    const productSalesResult = await pool.query(`
        SELECT p.name as product_name, SUM(si.quantity) as quantity, 
               AVG(si.rate) as unit_price, SUM(si.total_amount) as total_amount
        FROM sales_info si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.business_id = $1 AND DATE(si.created_at) BETWEEN $2 AND $3
        GROUP BY p.product_id, p.name
    `, [business_id, startdate, enddate]);

    const inventoryResult = await pool.query(`
        SELECT ii.name as item_name, SUM(il.amount) as quantity, 
               AVG(ii.unit_cost) as unit_cost, SUM(il.total_cost) as total_amount
        FROM inventory_logs il
        JOIN inventory_info ii ON il.inventory_id = ii.inventory_id
        JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
        WHERE bi.business_id = $1 AND il.type = 'Incomming' 
        AND DATE(il.created_at) BETWEEN $2 AND $3
        GROUP BY ii.name
    `, [business_id, startdate, enddate]);

    const customerSalesResult = await pool.query(`
        SELECT ci.name as customer_name, p.name as product_name, 
               SUM(si.quantity) as quantity, SUM(si.total_amount) as total_amount
        FROM sales_info si
        JOIN sales s ON si.sale_id = s.sale_id
        JOIN customers_info ci ON s.customer_id = ci.customer_id
        JOIN products p ON si.product_id = p.product_id
        WHERE s.business_id = $1 AND DATE(si.created_at) BETWEEN $2 AND $3
        GROUP BY ci.customer_id, ci.name, p.product_id, p.name
    `, [business_id, startdate, enddate]);

    const expensesResult = await pool.query(`
        SELECT t.note as description, t.amount, 'Expense' as category
        FROM transactions t
        JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
        WHERE bt.business_id = $1 AND t.type = 'Outgoing' 
        AND DATE(t.created_at) BETWEEN $2 AND $3
        AND t.note NOT ILIKE '%credit payment%'
        AND t.note NOT ILIKE '%purchase of inventory%'
    `, [business_id, startdate, enddate]);

    const cogsResult = await pool.query(`
        SELECT cc.name as category_name, ca.balance as amount
        FROM cogs_account ca
        JOIN cost_categories cc ON ca.category_id = cc.category_id
        WHERE ca.business_id = $1
    `, [business_id]);

    const accountBalancesResult = await pool.query(`
        SELECT a.account_name, ba.balance
        FROM accounts a
        JOIN business_account ba ON a.account_id = ba.account_id
        WHERE ba.business_id = $1
    `, [business_id]);

    return {
        productSales: productSalesResult.rows,
        inventoryPurchased: inventoryResult.rows,
        customerSales: customerSalesResult.rows,
        expenses: expensesResult.rows,
        cogs: cogsResult.rows,
        accountBalances: accountBalancesResult.rows
    };
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
