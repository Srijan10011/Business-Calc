import { Request, Response } from 'express';
import pool from '../db';
import * as CostTargetdb from '../db/CostTargetdb';
import * as Business_pool from '../db/Business_pool';
export const addCostTarget = async (req: Request, res: Response) => {
    try {
        const { category_id, asset_id, name, target_amount, reset_period } = req.body;
        const user_id = req.user?.id;

        if (!name || !target_amount) {
            return res.status(400).json({ message: 'Missing required fields: name, target_amount' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);
        const AddCostTarget = await CostTargetdb.addCostTarget(category_id, asset_id, name, target_amount, reset_period, business_id);

        res.status(201).json(AddCostTarget);
    } catch (error: any) {
        console.error('Error adding cost target:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCostTargets = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await CostTargetdb.getCostTargets(business_id);

        res.json(result);
    } catch (error: any) {
        console.error('Error fetching cost targets:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
