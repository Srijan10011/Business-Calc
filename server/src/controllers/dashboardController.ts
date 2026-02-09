import { Request, Response } from 'express';
import pool from '../db';

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // Get business_id from business_users table
        const userResult = await pool.query('SELECT business_id FROM business_users WHERE user_id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.json({ 
                assets: [], 
                message: 'No business access yet' 
            });
        }
        
        const businessId = userResult.rows[0].business_id;

        // Get assets recovery progress
        const assetsResult = await pool.query(
            `SELECT cc.name, fca.total_cost, fca.recovered, fca.asset_idd as id
             FROM fixed_cost_assets fca
             JOIN cost_categories cc ON fca.cateogory_id = cc.category_id
             WHERE cc.business_id = $1`,
            [businessId]
        );

        const assetsRecovery = assetsResult.rows.map(asset => {
            const remaining = asset.total_cost - asset.recovered;
            const progress = (asset.recovered / asset.total_cost) * 100;
            const status = progress >= 100 ? 'Retired' : 'Active';
            
            return {
                id: asset.id,
                name: asset.name,
                cost: parseFloat(asset.total_cost),
                recovered: parseFloat(asset.recovered),
                remaining,
                progress: Math.round(progress * 100) / 100,
                status
            };
        });

        // Get debit recovery progress
        const debitResult = await pool.query(
            `SELECT da.debit_id, ci.name as customer_name, da.amount, da.recovered, da.total, da.status
             FROM debit_account da
             JOIN customers_info ci ON da.customer_id = ci.customer_id
             JOIN business_customers bc ON ci.customer_id = bc.customer_id
             WHERE bc.business_id = $1`,
            [businessId]
        );

        const debitRecovery = debitResult.rows.map(debit => {
            const progress = (debit.recovered / debit.total) * 100;
            return {
                id: debit.debit_id,
                customerName: debit.customer_name,
                amount: parseFloat(debit.amount),
                recovered: parseFloat(debit.recovered),
                total: parseFloat(debit.total),
                remaining: parseFloat(debit.total) - parseFloat(debit.recovered),
                progress: Math.round(progress * 100) / 100,
                status: debit.status
            };
        });

        // Get inventory recovery data
        const inventoryResult = await pool.query(
            `SELECT ii.name, SUM(il.add_to_recover) as total_to_recover
             FROM inventory_logs il
             JOIN inventory_info ii ON il.inventory_id = ii.inventory_id
             JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
             WHERE bi.business_id = $1 AND il.add_to_recover > 0
             GROUP BY ii.inventory_id, ii.name`,
            [businessId]
        );

        const inventoryRecovery = inventoryResult.rows.map(item => ({
            name: item.name,
            totalToRecover: parseFloat(item.total_to_recover)
        }));

        // Calculate summary metrics
        const totalAssetsValue = assetsRecovery.reduce((sum, asset) => sum + asset.cost, 0);
        const totalAssetsRecovered = assetsRecovery.reduce((sum, asset) => sum + asset.recovered, 0);
        const totalDebitAmount = debitRecovery.reduce((sum, debit) => sum + debit.total, 0);
        const totalDebitRecovered = debitRecovery.reduce((sum, debit) => sum + debit.recovered, 0);

        const summary = {
            assets: {
                totalValue: totalAssetsValue,
                totalRecovered: totalAssetsRecovered,
                overallProgress: totalAssetsValue > 0 ? Math.round((totalAssetsRecovered / totalAssetsValue) * 10000) / 100 : 0,
                activeAssets: assetsRecovery.filter(asset => asset.status === 'Active').length,
                retiredAssets: assetsRecovery.filter(asset => asset.status === 'Retired').length
            },
            debits: {
                totalAmount: totalDebitAmount,
                totalRecovered: totalDebitRecovered,
                overallProgress: totalDebitAmount > 0 ? Math.round((totalDebitRecovered / totalDebitAmount) * 10000) / 100 : 0,
                runningDebits: debitRecovery.filter(debit => debit.status === 'Running').length,
                closedDebits: debitRecovery.filter(debit => debit.status === 'closed').length
            }
        };

        res.json({
            summary,
            assetsRecovery,
            debitRecovery,
            inventoryRecovery
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMoneyFlow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // Get business_id from business_users table
        const userResult = await pool.query('SELECT business_id FROM business_users WHERE user_id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.json({ 
                incoming: {}, 
                outgoing: {} 
            });
        }
        
        const businessId = userResult.rows[0].business_id;

        // Get current month's start and end dates
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        console.log('Date range:', startOfMonth, 'to', endOfMonth);

        // Get incoming transactions by account type
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
            [businessId, startOfMonth, endOfMonth]
        );

        console.log('Incoming results:', incomingResult.rows);

        // Get outgoing transactions categorized
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
            [businessId, startOfMonth, endOfMonth]
        );

        // Get COGS categories breakdown
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
            [businessId, startOfMonth, endOfMonth]
        );

        console.log('Outgoing results:', outgoingResult.rows);

        // Format incoming data
        const incoming = {
            cash: 0,
            bank: 0,
            credit: 0
        };

        incomingResult.rows.forEach(row => {
            const amount = parseFloat(row.total);
            if (row.account_name.toLowerCase().includes('cash')) {
                incoming.cash = amount;
            } else if (row.account_name.toLowerCase().includes('bank')) {
                incoming.bank = amount;
            } else if (row.account_name.toLowerCase().includes('credit')) {
                incoming.credit = amount;
            }
        });

        // Format outgoing data
        const outgoing = {
            inventory: 0,
            general: 0,
            cogs: {} as Record<string, number>
        };

        outgoingResult.rows.forEach(row => {
            const amount = parseFloat(row.total);
            const category = row.category as 'inventory' | 'cogs' | 'general';
            if (category !== 'cogs') {
                outgoing[category] = amount;
            }
        });

        // Add COGS categories
        cogsResult.rows.forEach(row => {
            outgoing.cogs[row.category_name] = parseFloat(row.total);
        });

        res.json({ incoming, outgoing });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
