import { Request, Response } from 'express';
import logger from '../utils/logger';

import * as Assetdb from '../db/Assetdb';
import * as Business_pool from '../db/Business_pool';
import { sanitizeText } from '../utils/sanitize';

export const getAssets = async (req: Request, res: Response) => {
    try {
        const businessId = req.businessId;

        // Get assets data
        const assets = await Assetdb.getAssets(businessId);

        res.json(assets);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createAsset = async (req: Request, res: Response) => {
    try {
        const { name, category, totalCost } = req.body;
        const businessId = req.businessId;

        if (!name || !category || totalCost === undefined) {
            return res.status(400).json({ message: 'Missing required fields: name, category, totalCost' });
        }

        if (parseFloat(totalCost) < 0) {
            return res.status(400).json({ message: 'Cost cannot be negative' });
        }

        const sanitizedName = sanitizeText(name);
        const sanitizedCategory = sanitizeText(category);

        // Insert into cost_categories with type = category (from frontend)
        const categoryResult = await Assetdb.createAsset(sanitizedName!, sanitizedCategory!, (totalCost), businessId);
        res.json(categoryResult);
        res.json(categoryResult);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
