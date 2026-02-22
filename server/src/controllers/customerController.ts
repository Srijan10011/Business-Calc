import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';
import jwt from 'jsonwebtoken';
import * as Business_pool from '../db/Business_pool';
import * as Customerdb from '../db/Customerdb';
import { sanitizeName, sanitizePhone, sanitizeEmail, sanitizeText } from '../utils/sanitize';
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const business_id = req.businessId;
        const result = await Customerdb.getCustomersByBusiness(business_id)
        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const business_id = req.businessId;
        const id = req.params.id as string;

        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }

        const result = await Customerdb.getCustomerById(id, business_id);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        logger.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerSales = async (req: Request, res: Response) => {
    try {
        const business_id = req.businessId;
        const id = req.params.id as string;

        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }

        const result = await Customerdb.getCustomerSales(id, business_id);

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching customer sales:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCustomerPayments = async (req: Request, res: Response) => {
    try {
        const business_id = req.businessId;
        const id = req.params.id as string;

        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'Invalid customer ID provided' });
        }

        const result = await Customerdb.getCustomerPaymentsByBusiness(id, business_id);

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching customer payments:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addCustomer = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, address } = req.body;
        const business_id = req.businessId;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Missing required fields: name, phone' });
        }

        // Sanitize inputs
        const sanitizedName = sanitizeName(name);
        const sanitizedPhone = sanitizePhone(phone);
        const sanitizedEmail = email ? sanitizeEmail(email) : null;
        const sanitizedAddress = address ? sanitizeText(address) : null;

        // Insert into customers_info table
        const customerResult = await Customerdb.addCustomer(
            sanitizedName!,
            sanitizedPhone!,
            sanitizedEmail,
            sanitizedAddress,
            business_id
        );

        res.status(201).json(customerResult);
    } catch (error: any) {
        logger.error('Error adding customer:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

