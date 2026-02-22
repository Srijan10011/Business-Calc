import { Router } from 'express';
import logger from '../utils/logger';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions } from '../middleware/permissionMiddleware';
import pool from '../db';
import * as Business_pool from '../db/Business_pool';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = Router();

// Shared dependency endpoint for accounts - accessible by multiple permissions
router.get('/accounts', authMiddleware, loadUserBusiness, loadPermissions, async (req: any, res: any) => {
    try {
        const userPermissions = req.userPermissions || [];
        
        // Check if user has any permission that needs accounts
        const accountDependentPermissions = [
            'sales.create',
            'sales.edit',
            'inventory.create',
            'inventory.edit',
            'credits.view',
            'credits.manage',
            'team.manage',
            'finance.edit',
            'assets.create'
        ];
        
        const hasAccess = userPermissions.includes('*') || 
                         accountDependentPermissions.some(perm => userPermissions.includes(perm));
        
        if (!hasAccess) {
            return res.status(403).json({ msg: 'Permission denied' });
        }

        const business_id = req.businessId;
        
        // Check if user has finance.view permission to see balances
        const hasFinanceView = userPermissions.includes('*') || userPermissions.includes('finance.view');
        
        if (hasFinanceView) {
            // Return with balance
            const result = await pool.query(
                `SELECT a.account_id, a.account_name, ba.balance
                 FROM accounts a
                 JOIN business_account ba ON a.account_id = ba.account_id
                 WHERE ba.business_id = $1
                 ORDER BY a.account_name`,
                [business_id]
            );
            res.json(result.rows);
        } else {
            // Return without balance (security)
            const result = await pool.query(
                `SELECT a.account_id, a.account_name
                 FROM accounts a
                 JOIN business_account ba ON a.account_id = ba.account_id
                 WHERE ba.business_id = $1
                 ORDER BY a.account_name`,
                [business_id]
            );
            res.json(result.rows);
        }
    } catch (error: any) {
        logger.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Products endpoint - accessible by sales.create, sales.edit
router.get('/products', authMiddleware, loadUserBusiness, loadPermissions, async (req: any, res: any) => {
    try {
        const userPermissions = req.userPermissions || [];
        
        const productDependentPermissions = ['sales.create', 'sales.edit'];
        
        const hasAccess = userPermissions.includes('*') || 
                         productDependentPermissions.some(perm => userPermissions.includes(perm));
        
        if (!hasAccess) {
            return res.status(403).json({ msg: 'Permission denied' });
        }

        const business_id = req.businessId;
        const result = await pool.query(
            `SELECT p.product_id as id, p.name, p.price, p.stock 
             FROM products p
             JOIN products_business pb ON p.product_id = pb.product_id
             WHERE pb.business_id = $1 AND p.stock > 0
             ORDER BY p.name`,
            [business_id]
        );
        
        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Customers endpoint - accessible by sales.create, sales.edit, credits.view, credits.manage
router.get('/customers', authMiddleware, loadUserBusiness, loadPermissions, async (req: any, res: any) => {
    try {
        const userPermissions = req.userPermissions || [];
        
        const customerDependentPermissions = ['sales.create', 'sales.edit', 'credits.view', 'credits.manage'];
        
        const hasAccess = userPermissions.includes('*') || 
                         customerDependentPermissions.some(perm => userPermissions.includes(perm));
        
        if (!hasAccess) {
            return res.status(403).json({ msg: 'Permission denied' });
        }

        const business_id = req.businessId;
        const result = await pool.query(
            `SELECT c.customer_id, c.name, c.phone, c.email
             FROM customers_info c
             JOIN business_customers bc ON c.customer_id = bc.customer_id
             WHERE bc.business_id = $1
             ORDER BY c.name`,
            [business_id]
        );
        
        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Inventory/COGS categories - accessible by products.create
router.get('/inventory-categories', authMiddleware, loadUserBusiness, loadPermissions, async (req: any, res: any) => {
    try {
        const userPermissions = req.userPermissions || [];
        
        const hasAccess = userPermissions.includes('*') || userPermissions.includes('products.create');
        
        if (!hasAccess) {
            return res.status(403).json({ msg: 'Permission denied' });
        }

        const business_id = req.businessId;
        const result = await pool.query(
            `SELECT category_id, name, type
             FROM cost_categories
             WHERE business_id = $1
             ORDER BY name`,
            [business_id]
        );
        
        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
