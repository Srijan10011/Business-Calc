import { Request, Response } from 'express';
import * as Authdb from '../db/Authdb';
import { createDefaultAccounts } from './accountController';
import * as Accountdb from '../db/Accountdb';

export const checkBusiness = async (req: Request, res: Response) => {
    const business_id = req.params.business_id as string;
    try {
        const business = await Authdb.checkBusinessExists(business_id);
        if (!business) return res.status(404).json({ msg: 'Business not found' });
        res.json({ exists: true, business });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

export const register = async (req: Request, res: Response) => {
    const { name, email, password, business_id } = req.body;
    try {
        const result = await Authdb.registerUser(name, email, password, business_id);
        res.json(result);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const result = await Authdb.loginUser(email, password);
        res.json(result);
    } catch (err: any) {
        console.error(err.message || err);
        res.status(err.statusCode || 500).send(err.message || 'Server error');
    }
};

export const setupBusiness = async (req: Request, res: Response) => {
    const { businessName, currency } = req.body;
    const user_id = req.user?.id;

    if (!user_id) return res.status(401).json({ msg: 'Unauthorized' });

    try {
        const business = await Authdb.setupBusiness(user_id, businessName, currency, Accountdb.createDefaultAccount);
        res.json({ msg: 'Business setup completed', business });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
};

export const getUserInfo = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ msg: 'Unauthorized' });

    try {
        const userInfo = await Authdb.getUserInfo(user_id); // you can move getUserInfo to service if needed
        res.json(userInfo);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
};
