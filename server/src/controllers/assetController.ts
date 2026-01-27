import { Request, Response } from 'express';
import pool from '../db';

export const getAssets = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // Get business_id from business_users table
        const userResult = await pool.query('SELECT business_id FROM business_users WHERE user_id = $1', [userId]);
        const businessId = userResult.rows[0].business_id;

        // Get assets data
        const result = await pool.query(
            `SELECT cc.name, fca.total_cost, fca.recovered, fca.asset_idd as id
             FROM fixed_cost_assets fca
             JOIN cost_categories cc ON fca.cateogory_id = cc.category_id
             WHERE cc.business_id = $1`,
            [businessId]
        );

        const assets = result.rows.map(asset => {
            const remaining = asset.total_cost - asset.recovered;
            const progress = (asset.recovered / asset.total_cost) * 100;
            const status = progress >= 100 ? 'Retired' : 'Active';
            
            return {
                id: asset.id,
                name: asset.name,
                cost: parseFloat(asset.total_cost),
                recovered: parseFloat(asset.recovered),
                remaining,
                progress,
                status
            };
        });

        res.json(assets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createAsset = async (req: Request, res: Response) => {
    try {
        const { name, category, totalCost } = req.body;
        const userId = (req as any).user.id;

        // Get business_id from business_users table
        const userResult = await pool.query('SELECT business_id FROM business_users WHERE user_id = $1', [userId]);
        const businessId = userResult.rows[0].business_id;

        // Insert into cost_categories with type = category (from frontend)
        const categoryResult = await pool.query(
            'INSERT INTO cost_categories (name, type, business_id) VALUES ($1, $2, $3) RETURNING category_id',
            [name, category, businessId]
        );
        const categoryId = categoryResult.rows[0].category_id;

        // Insert into fixed_cost_assets
        await pool.query(
            'INSERT INTO fixed_cost_assets (cateogory_id, total_cost, recovered) VALUES ($1, $2, $3)',
            [categoryId, totalCost, 0]
        );

        res.json({ message: 'Asset created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
