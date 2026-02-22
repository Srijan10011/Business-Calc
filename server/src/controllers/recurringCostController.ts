import { Request, Response } from 'express';
import logger from '../utils/logger';
import * as RecurringCostdb from '../db/RecurringCostdb';
import * as Business_pool from '../db/Business_pool';

export const createRecurringCost = async (req: Request, res: Response) => {
    try {
        const { name, type, monthlyTarget } = req.body;
        const businessId = (req as any).businessId;

        if (!name || !type || !monthlyTarget) {
            return res.status(400).json({ message: 'Missing required fields: name, type, monthlyTarget' });
        }

        if (parseFloat(monthlyTarget) <= 0) {
            return res.status(400).json({ message: 'Monthly target must be positive' });
        }

        const result = await RecurringCostdb.createRecurringCost(name, type, parseFloat(monthlyTarget), businessId);

        res.json({ message: 'Recurring cost created successfully', data: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRecurringCosts = async (req: Request, res: Response) => {
    try {
        const businessId = (req as any).businessId;
        const costs = await RecurringCostdb.getRecurringCosts(businessId);

        res.json(costs);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRecurringCostHistory = async (req: Request, res: Response) => {
    try {
        const businessId = (req as any).businessId;
        const { categoryId } = req.query;
        
        const history = await RecurringCostdb.getRecurringCostHistory(businessId, categoryId as string);

        res.json(history);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const transitionMonth = async (req: Request, res: Response) => {
    try {
        const businessId = (req as any).businessId;
        const result = await RecurringCostdb.transitionToNewMonth(businessId);

        res.json({ message: 'Month transition completed', data: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
