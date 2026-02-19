import { Request, Response } from 'express';
import * as RecurringCostdb from '../db/RecurringCostdb';
import * as Business_pool from '../db/Business_pool';

export const createRecurringCost = async (req: Request, res: Response) => {
    try {
        const { name, type, monthlyTarget } = req.body;
        const userId = (req as any).user.id;

        if (!name || !type || !monthlyTarget) {
            return res.status(400).json({ message: 'Missing required fields: name, type, monthlyTarget' });
        }

        if (parseFloat(monthlyTarget) <= 0) {
            return res.status(400).json({ message: 'Monthly target must be positive' });
        }

        const businessId = await Business_pool.Get_Business_id(userId);
        const result = await RecurringCostdb.createRecurringCost(name, type, parseFloat(monthlyTarget), businessId);

        res.json({ message: 'Recurring cost created successfully', data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRecurringCosts = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const businessId = await Business_pool.Get_Business_id(userId);
        const costs = await RecurringCostdb.getRecurringCosts(businessId);

        res.json(costs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getRecurringCostHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { categoryId } = req.query;
        
        const businessId = await Business_pool.Get_Business_id(userId);
        const history = await RecurringCostdb.getRecurringCostHistory(businessId, categoryId as string);

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const transitionMonth = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const businessId = await Business_pool.Get_Business_id(userId);
        const result = await RecurringCostdb.transitionToNewMonth(businessId);

        res.json({ message: 'Month transition completed', data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
