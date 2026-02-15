import { Request, Response } from 'express';
import pool from '../db';
import * as Cogsdb from '../db/Cogsdb';
import * as Business_pool from '../db/Business_pool';

export const getBusinessCategories = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await Cogsdb.getBusinessCategories(business_id);

        res.json(result.map(row => row.name));
    } catch (error: any) {
        console.error('Error fetching business categories:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addCostCategory = async (req: Request, res: Response) => {
    try {
        const { category, type, value, product_id } = req.body;
        const user_id = req.user?.id;

        if (!category || !type || value === undefined || !product_id) {
            return res.status(400).json({ message: 'Missing required fields: category, type, value, product_id' });
        }

        if (parseFloat(value) < 0) {
            return res.status(400).json({ message: 'Amount cannot be negative' });
        }

        if (!['variable', 'fixed'].includes(type)) {
            return res.status(400).json({ message: 'Type must be either "variable" or "fixed"' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const business_id = await Business_pool.Get_Business_id(user_id);

        // Get product price and validate COGS first
        const addCostcategory = await Cogsdb.addCostCategory(category, type, Number(value), product_id, business_id);
        res.status(201).json({
            category_id: addCostcategory.category_id,
            message: 'Cost category and allocation created successfully'
        });
    } catch (error: any) {
        console.error('Error adding cost category:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getProductCostAllocations = async (req: Request, res: Response) => {
    try {
        const product_id = req.params.product_id as string;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const business_id = await Business_pool.Get_Business_id(user_id);
        const getProductCostAllocation = await Cogsdb.getProductCostAllocations(product_id, business_id);

        res.json(getProductCostAllocation);
    } catch (error: any) {
        console.error('Error fetching product cost allocations:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const updateCostAllocation = async (req: Request, res: Response) => {
    try {
        const allocation_id = req.params.allocation_id as string;
        const { value } = req.body;
        const user_id = req.user?.id;

        if (value === undefined) {
            return res.status(400).json({ message: 'Missing required field: value' });
        }

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const business_id = await Business_pool.Get_Business_id(user_id);

        // Get product info and current allocation
        const updatecostAllocation = await Cogsdb.updateCostAllocation(allocation_id, Number(value), business_id);
        res.json(updatecostAllocation);
    }
    catch (error: any) {
        console.error('Error updating cost allocation:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    };
}
export const deleteCostAllocation = async (req: Request, res: Response) => {
    try {
        const allocation_id = req.params.allocation_id as string;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Delete allocation
        const delete_allocation = await Cogsdb.deleteCostAllocation(allocation_id);
        res.json({ message: 'Cost allocation deleted successfully', deleted: delete_allocation });
    } catch (error: any) {
        console.error('Error deleting cost allocation:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getCOGSData = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ message: 'User ID not found in token' });

        const business_id = await Business_pool.Get_Business_id(user_id);
        const cogsData = await Cogsdb.getCOGSData(business_id);

        // Sum balances correctly
        const totalBalance = cogsData.reduce((sum, row) => sum + parseFloat(row.balance || '0'), 0);

        res.json({
            totalBalance,
            categories: cogsData
        });
    } catch (error: any) {
        console.error('Error fetching COGS data:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
