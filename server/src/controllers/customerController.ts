import { Request, Response } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';
import * as Business_pool from '../db/Business_pool';
import * as Customerdb from '../db/Customerdb';
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id)
        const result = await Customerdb.getCustomersByBusiness(business_id)
        res.json(result);
    } catch (error: any) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;
        const id = req.params.id as string;

        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id)
        const result = await Customerdb.getCustomerById(id, business_id);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerSales = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;
        const id = req.params.id as string;

        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id)
        const result = await Customerdb.getCustomerSales(id, business_id);

        res.json(result);
    } catch (error: any) {
        console.error('Error fetching customer sales:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addCustomer = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, address } = req.body;
        const user_id = req.user?.id;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Missing required fields: name, phone' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const business_id = await Business_pool.Get_Business_id(user_id)
        // Insert into customers_info table
        const customerResult = await Customerdb.addCustomer(name, phone, email, address, business_id);

        res.status(201).json(customerResult);
    } catch (error: any) {
        console.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

