import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';
import * as Business_pool from '../db/Business_pool';
import * as Creditdb from '../db/Creditdb';

export const getCreditPayables = async (req: Request, res: Response) => {
    try {
        const business_id = (req as any).businessId;

        const result = await Creditdb.getCreditsByBusiness(business_id);

        res.json(result);
    } catch (error: any) {
        logger.error('Error fetching credit payables:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const payCreditAmount = async (req: Request, res: Response) => {
    try {
        const { payable_id, amount, payment_account } = req.body;
        const business_id = (req as any).businessId;

        if (!payable_id || !amount || !payment_account) {
            return res.status(400).json({ message: 'Missing required fields: payable_id, amount, payment_account' });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be positive' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get payable details
            const payableResult = await Creditdb.getPayableDetails(payable_id, business_id);

            if (payableResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Credit payable not found' });
            }

            const { party_name, total_amount, paid_amount } = payableResult.rows[0];
            const remaining = parseFloat(total_amount) - parseFloat(paid_amount);

            if (parseFloat(amount) > remaining) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Payment amount exceeds remaining balance' });
            }

            // Check payment account balance (must be cash or bank)
            const accountResult = await Creditdb.getPaymentAccount(payment_account, business_id);

            if (accountResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Payment account not found' });
            }

            const { balance, account_name } = accountResult.rows[0];

            if (account_name.toLowerCase().includes('credit')) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Cannot pay credit with credit account' });
            }

            if (parseFloat(balance) < parseFloat(amount)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Insufficient balance in payment account' });
            }

            // Update payable
            const newPaidAmount = parseFloat(paid_amount) + parseFloat(amount);
            const newStatus = newPaidAmount >= parseFloat(total_amount) ? 'Paid' : 'Partial';

            await client.query(
                'UPDATE credit_payables SET paid_amount = $1, status = $2 WHERE payable_id = $3',
                [newPaidAmount, newStatus, payable_id]
            );

            // Create transaction
            const transactionResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, note)
                 VALUES ($1, $2, $3, $4)
                 RETURNING transaction_id`,
                [payment_account, amount, 'Outgoing', `Credit payment to ${party_name}`]
            );

            // Link to business
            await client.query(
                `INSERT INTO business_transactions (transaction_id, business_id)
                 VALUES ($1, $2)`,
                [transactionResult.rows[0].transaction_id, business_id]
            );

            // Update payment account balance
            await client.query(
                `UPDATE business_account SET balance = balance - $1 WHERE account_id = $2 AND business_id = $3`,
                [amount, payment_account, business_id]
            );

            // Reduce credit account balance (the account used when inventory was purchased)
            const creditAccountResult = await Creditdb.getCreditAccount(business_id);

            if (creditAccountResult.rows.length > 0) {
                await client.query(
                    `UPDATE business_account SET balance = balance - $1 WHERE account_id = $2 AND business_id = $3`,
                    [amount, creditAccountResult.rows[0].account_id, business_id]
                );
            }

            await client.query('COMMIT');
            res.json({ message: 'Credit payment recorded successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        logger.error('Error processing credit payment:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
