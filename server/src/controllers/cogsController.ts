import { Request, Response } from 'express';
import pool from '../db';

export const getBusinessCategories = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            'SELECT DISTINCT name FROM cost_categories WHERE business_id = $1 ORDER BY name',
            [business_id]
        );

        res.json(result.rows.map(row => row.name));
    } catch (error: any) {
        console.error('Error fetching business categories:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addCostCategory = async (req: Request, res: Response) => {
    try {
        const { category, type, value, product_id } = req.body;
        const user_id = req.user?.id;

        if (!category || !type || value === undefined || !product_id) {
            return res.status(400).json({ message: 'Missing required fields: category, type, value, product_id' });
        }

        if (parseFloat(value) < 0) {
            return res.status(400).json({ message: 'Amount cannot be negative' });
        }

        if (!['variable', 'fixed'].includes(type)) {
            return res.status(400).json({ message: 'Type must be either "variable" or "fixed"' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Get product price and validate COGS first
        const productResult = await pool.query(
            'SELECT price FROM products WHERE product_id = $1',
            [product_id]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const productPrice = parseFloat(productResult.rows[0].price);

        // Get current total COGS for this product
        const currentCogsResult = await pool.query(
            `SELECT COALESCE(SUM(pca.amount_per_unit), 0) as total_cogs
             FROM product_cost_allocation pca
             JOIN cost_categories cc ON pca.category_id = cc.category_id
             WHERE pca.product_id = $1 AND cc.business_id = $2`,
            [product_id, business_id]
        );

        const currentTotalCogs = parseFloat(currentCogsResult.rows[0].total_cogs);
        const newTotalCogs = currentTotalCogs + parseFloat(value);

        // Validate COGS doesn't exceed product price
        if (newTotalCogs > productPrice) {
            return res.status(400).json({ 
                message: 'Cogs value cannot surpass the cost'
            });
        }

        // Check if category already exists
        const existingCategory = await pool.query(
            'SELECT category_id FROM cost_categories WHERE name = $1 AND business_id = $2',
            [category, business_id]
        );

        let category_id;
        if (existingCategory.rows.length > 0) {
            // Use existing category
            category_id = existingCategory.rows[0].category_id;
        } else {
            // Create new cost category
            const categoryResult = await pool.query(
                'INSERT INTO cost_categories (name, type, business_id) VALUES ($1, $2, $3) RETURNING category_id',
                [category, type, business_id]
            );
            category_id = categoryResult.rows[0].category_id;
        }

        // Create product cost allocation
        await pool.query(
            'INSERT INTO product_cost_allocation (product_id, category_id, amount_per_unit) VALUES ($1, $2, $3)',
            [product_id, category_id, value]
        );

        res.status(201).json({ 
            category_id,
            message: 'Cost category and allocation created successfully'
        });
    } catch (error: any) {
        console.error('Error adding cost category:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getProductCostAllocations = async (req: Request, res: Response) => {
    try {
        const { product_id } = req.params;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            `SELECT 
                pca.allocation_id,
                pca.amount_per_unit as value,
                cc.category_id,
                cc.name as category,
                cc.type
            FROM product_cost_allocation pca
            INNER JOIN cost_categories cc ON pca.category_id = cc.category_id
            WHERE pca.product_id = $1 AND cc.business_id = $2
            ORDER BY cc.name`,
            [product_id, business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching product cost allocations:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const updateCostAllocation = async (req: Request, res: Response) => {
    try {
        const { allocation_id } = req.params;
        const { value } = req.body;
        const user_id = req.user?.id;

        if (value === undefined) {
            return res.status(400).json({ message: 'Missing required field: value' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get product info and current allocation
        const allocationResult = await pool.query(
            `SELECT pca.product_id, pca.amount_per_unit as current_value, p.price
             FROM product_cost_allocation pca
             JOIN products p ON pca.product_id = p.product_id
             WHERE pca.allocation_id = $1`,
            [allocation_id]
        );

        if (allocationResult.rows.length === 0) {
            return res.status(404).json({ message: 'Cost allocation not found' });
        }

        const { product_id, current_value, price: productPrice } = allocationResult.rows[0];

        // Get business_id
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        const business_id = businessResult.rows[0].business_id;

        // Get current total COGS for this product (excluding the allocation being updated)
        const currentCogsResult = await pool.query(
            `SELECT COALESCE(SUM(pca.amount_per_unit), 0) as total_cogs
             FROM product_cost_allocation pca
             JOIN cost_categories cc ON pca.category_id = cc.category_id
             WHERE pca.product_id = $1 AND cc.business_id = $2 AND pca.allocation_id != $3`,
            [product_id, business_id, allocation_id]
        );

        const currentTotalCogs = parseFloat(currentCogsResult.rows[0].total_cogs);
        const newTotalCogs = currentTotalCogs + parseFloat(value);

        // Validate COGS doesn't exceed product price
        if (newTotalCogs > parseFloat(productPrice)) {
            return res.status(400).json({ 
                message: 'Cogs value cannot surpass the cost',
                details: {
                    productPrice: parseFloat(productPrice),
                    currentCogs: currentTotalCogs,
                    attemptedValue: parseFloat(value),
                    wouldResultIn: newTotalCogs
                }
            });
        }

        // Update allocation amount
        const result = await pool.query(
            'UPDATE product_cost_allocation SET amount_per_unit = $1 WHERE allocation_id = $2 RETURNING *',
            [value, allocation_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cost allocation not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error updating cost allocation:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const deleteCostAllocation = async (req: Request, res: Response) => {
    try {
        const { allocation_id } = req.params;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Delete allocation
        const result = await pool.query(
            'DELETE FROM product_cost_allocation WHERE allocation_id = $1 RETURNING *',
            [allocation_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cost allocation not found' });
        }

        res.json({ message: 'Cost allocation deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting cost allocation:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCOGSData = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Get COGS data with category names
        const result = await pool.query(
            `SELECT ca.balance, cc.name as category_name, cc.category_id
             FROM cogs_account ca
             JOIN cost_categories cc ON ca.category_id = cc.category_id
             WHERE ca.business_id = $1
             ORDER BY cc.name`,
            [business_id]
        );

        // Calculate total COGS balance
        const totalBalance = result.rows.reduce((sum, row) => sum + parseFloat(row.balance || 0), 0);

        res.json({
            totalBalance,
            categories: result.rows
        });
    } catch (error: any) {
        console.error('Error fetching COGS data:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
