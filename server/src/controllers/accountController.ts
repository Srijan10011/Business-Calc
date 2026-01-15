import { Request, Response } from 'express';
import pool from '../db';

export const createDefaultAccounts = async (business_id: string) => {
    try {
        const defaultAccounts = [
            { type: 'cash', balance: 0 },
            { type: 'bank', balance: 0 },
            { type: 'credit', balance: 0 },
            { type: 'debit', balance: 0 }
        ];

        for (const account of defaultAccounts) {
            await pool.query(
                `INSERT INTO accounts (business_id, name, type, balance, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [business_id, 'Wallet', account.type, account.balance]
            );
        }

        console.log(`Default accounts created for business_id: ${business_id}`);
    } catch (error) {
        console.error('Error creating default accounts:', error);
        throw error;
    }
};

export const getAccounts = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Get accounts for this business
        const result = await pool.query(
            'SELECT * FROM accounts WHERE business_id = $1 ORDER BY type',
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const createDefaultAccountsForAllExisting = async (req: Request, res: Response) => {
    try {
        // Get all existing business_ids
        const businessResult = await pool.query('SELECT id FROM businesses');
        
        for (const business of businessResult.rows) {
            // Check if accounts already exist for this business
            const existingAccounts = await pool.query(
                'SELECT COUNT(*) FROM accounts WHERE business_id = $1',
                [business.id]
            );

            if (parseInt(existingAccounts.rows[0].count) === 0) {
                // No accounts exist, create default ones
                await createDefaultAccounts(business.id);
            }
        }

        res.json({ message: 'Default accounts created for all businesses' });
    } catch (error: any) {
        console.error('Error creating default accounts for existing businesses:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
