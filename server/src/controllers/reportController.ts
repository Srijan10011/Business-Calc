import { Request, Response } from 'express';
import pool from '../db';

export const getMonthlyReport = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user?.id;
        const { month } = req.query;

        if (!month) {
            return res.status(400).json({ message: 'Month parameter is required' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;
        const [year, monthNum] = (month as string).split('-');
        const startDate = `${year}-${monthNum}-01`;
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];

        // Product Sales
        const productSalesResult = await pool.query(`
            SELECT p.name as product_name, SUM(si.quantity) as quantity, 
                   AVG(si.rate) as unit_price, SUM(si.total_amount) as total_amount
            FROM sales_info si
            JOIN sales s ON si.sale_id = s.sale_id
            JOIN products p ON si.product_id = p.product_id
            WHERE s.business_id = $1 AND DATE(si.created_at) BETWEEN $2 AND $3
            GROUP BY p.product_id, p.name
        `, [business_id, startDate, endDate]);
        const productSales = productSalesResult.rows;

        // Inventory Purchased (from inventory_logs)
        const inventoryResult = await pool.query(`
            SELECT ii.name as item_name, SUM(il.amount) as quantity, 
                   AVG(ii.unit_cost) as unit_cost, SUM(il.total_cost) as total_amount
            FROM inventory_logs il
            JOIN inventory_info ii ON il.inventory_id = ii.inventory_id
            JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
            WHERE bi.business_id = $1 AND il.type = 'Incomming' 
            AND DATE(il.created_at) BETWEEN $2 AND $3
            GROUP BY ii.name
        `, [business_id, startDate, endDate]);
        const inventoryPurchased = inventoryResult.rows;

        // Customer Sales
        const customerSalesResult = await pool.query(`
            SELECT ci.name as customer_name, p.name as product_name, 
                   SUM(si.quantity) as quantity, SUM(si.total_amount) as total_amount
            FROM sales_info si
            JOIN sales s ON si.sale_id = s.sale_id
            JOIN customers_info ci ON s.customer_id = ci.customer_id
            JOIN products p ON si.product_id = p.product_id
            WHERE s.business_id = $1 AND DATE(si.created_at) BETWEEN $2 AND $3
            GROUP BY ci.customer_id, ci.name, p.product_id, p.name
        `, [business_id, startDate, endDate]);
        const customerSales = customerSalesResult.rows;

        // Expenses (from transactions) - exclude credit payments and inventory purchases
        const expensesResult = await pool.query(`
            SELECT t.note as description, t.amount, 'Expense' as category
            FROM transactions t
            JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
            WHERE bt.business_id = $1 AND t.type = 'Outgoing' 
            AND DATE(t.created_at) BETWEEN $2 AND $3
            AND t.note NOT ILIKE '%credit payment%'
            AND t.note NOT ILIKE '%purchase of inventory%'
        `, [business_id, startDate, endDate]);
        const expenses = expensesResult.rows;

        // COGS (from cogs_account balance changes)
        const cogsResult = await pool.query(`
            SELECT cc.name as category_name, ca.balance as amount
            FROM cogs_account ca
            JOIN cost_categories cc ON ca.category_id = cc.category_id
            WHERE ca.business_id = $1
        `, [business_id]);
        const cogs = cogsResult.rows;

        // Account Balances
        const accountBalancesResult = await pool.query(`
            SELECT a.account_name, ba.balance
            FROM accounts a
            JOIN business_account ba ON a.account_id = ba.account_id
            WHERE ba.business_id = $1
        `, [business_id]);
        const accountBalances = accountBalancesResult.rows;

        // Summary calculations
        const totalRevenue = productSales.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0);
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
        const totalInventoryCost = inventoryPurchased.reduce((sum: number, i: any) => sum + parseFloat(i.total_amount || 0), 0);
        const totalCogs = cogs.reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses - totalInventoryCost;

        res.json({
            summary: {
                totalRevenue,
                totalExpenses: totalExpenses + totalInventoryCost,
                netProfit,
                totalSales: productSales.reduce((sum: number, p: any) => sum + parseInt(p.quantity || 0), 0)
            },
            productSales,
            inventoryPurchased,
            customerSales,
            expenses,
            cogs,
            accountBalances
        });
    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
