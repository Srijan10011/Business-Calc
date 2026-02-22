import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';
import * as Accountdb from '../db/Accountdb';
import * as Business_pool from '../db/Business_pool';
export const createDefaultAccounts = async (req: Request, res: Response) => {
    const { business_id } = req.body;
    if (!business_id) {
        return res.status(400).json({ message: 'Business ID is required' });
    }
    try {
        const message = await Accountdb.createDefaultAccount(business_id);
        res.status(201).json({ message });

    } catch (error: any) {
        logger.error('Error creating default accounts:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
export const getAccounts = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).userId;
        const business_id = (req as any).businessId;
        const result = await Accountdb.getAccount(user_id, business_id);

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).userId;
        const business_id = (req as any).businessId;

        // Get transactions for this business
        const gettransaction = await Accountdb.getTransactions(user_id, business_id);

        res.json(gettransaction);
    } catch (error: any) {
        logger.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const transferFunds = async (req: Request, res: Response) => {
    try {
        const { fromAccountId, toAccountId, amount } = req.body;
        const user_id = (req as any).userId;
        const business_id = (req as any).businessId;
        const result = await Accountdb.transferFund(user_id, fromAccountId, toAccountId, amount, business_id);

        res.json(result);
    }
    catch (err: any) {
        res.status(400).json({
            message: err.message
        });
    }
};
export const transferCOGS = async (req: Request, res: Response) => {
    try {
        const { categoryId, accountId, amount, direction } = req.body; // direction: 'to-cogs' or 'from-cogs'
        const user_id = (req as any).userId;
        const business_id = (req as any).businessId;

        const transfercog = await Accountdb.transferCOGS(user_id, categoryId, accountId, amount, direction, business_id);

        res.json(transfercog);
    }
    catch (err: any) {
        res.status(400).json({
            message: err.message
        });
    }
};
