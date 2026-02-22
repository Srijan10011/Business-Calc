import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';
import * as CostTargetdb from '../db/CostTargetdb';
import * as Business_pool from '../db/Business_pool';
export const addCostTarget = async (req: Request, res: Response) => {
    try {
        const { category_id, asset_id, name, target_amount, reset_period } = req.body;
        const business_id = req.businessId;

        if (!name || !target_amount) {
            return res.status(400).json({ message: 'Missing required fields: name, target_amount' });
        }

        const AddCostTarget = await CostTargetdb.addCostTarget(category_id, asset_id, name, target_amount, reset_period, business_id);

        res.status(201).json(AddCostTarget);
    } catch (error: any) {
        logger.error('Error adding cost target:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCostTargets = async (req: Request, res: Response) => {
    try {
        const business_id = req.businessId;

        const result = await CostTargetdb.getCostTargets(business_id);

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching cost targets:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
