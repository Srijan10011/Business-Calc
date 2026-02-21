import { Request, Response } from 'express';
import logger from '../utils/logger';

import * as Business_pool from '../db/Business_pool';
import * as Categorydb from '../db/Categorydb';
import { get } from 'node:http';
export const checkCategory = async (req: Request, res: Response) => {
    try {
        const { name, cost_behaviour, product_id } = req.body;
        const user_id = req.user?.id;

        if (!name || !cost_behaviour) {
            return res.status(400).json({ message: 'Missing required fields: name, cost_behaviour' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        const business_id = await Business_pool.Get_Business_id(user_id);

        // Check if category exists
        const existingCategory = await Categorydb.checkCategory(name, cost_behaviour, product_id, business_id);
        res.json(existingCategory);
    } catch (error: any) {
        logger.error('Error checking category:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);
        res.json({ business_id });

        const result = await Categorydb.getCategoriesByBusiness(business_id);

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, cost_behaviour, type, product_id } = req.body;
        const user_id = req.user?.id;

        if (!name || !cost_behaviour || !type) {
            return res.status(400).json({ message: 'Missing required fields: name, cost_behaviour, type' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        // Create new category with product_id
        const result = await Categorydb.createCategory(name, cost_behaviour, type, product_id, business_id);

        res.status(201).json({ id: result.id });
    } catch (error: any) {
        logger.error('Error creating category:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
