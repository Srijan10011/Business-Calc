import { Request, Response } from 'express';
import pool from '../db';

export const createDefaultAccounts = async (business_id: string) => {
    try {
        const defaultAccounts = [
            'Cash Account',
            'Bank Account', 
            'Credit Account',
            'Debit Account'
        ];

        for (const accountName of defaultAccounts) {
            // Create account
            const accountResult = await pool.query(
                'INSERT INTO accounts (account_name) VALUES ($1) RETURNING account_id',
                [accountName]
            );

            const account_id = accountResult.rows[0].account_id;

            // Link account to business
            await pool.query(
                'INSERT INTO business_account (account_id, business_id, balance) VALUES ($1, $2, $3)',
                [account_id, business_id, 0]
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
            `SELECT a.account_id, a.account_name, ba.balance 
             FROM accounts a 
             JOIN business_account ba ON a.account_id = ba.account_id 
             WHERE ba.business_id = $1`,
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
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

        // Get transactions for this business
        const result = await pool.query(
            `SELECT t.transaction_id, t.created_at, t.note, t.type, t.amount, a.account_name
             FROM transactions t
             JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
             LEFT JOIN accounts a ON t.account_id = a.account_id
             WHERE bt.business_id = $1
             ORDER BY t.created_at DESC`,
            [business_id]
        );

        const transactions = result.rows.map(row => ({
            id: row.transaction_id,
            date: new Date(row.created_at).toLocaleDateString(),
            description: row.note,
            category: row.type,
            amount: parseFloat(row.amount),
            account: row.account_name || 'COGS Expense'
        }));

        res.json(transactions);
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const transferFunds = async (req: Request, res: Response) => {
    try {
        const { fromAccountId, toAccountId, amount } = req.body;
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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if from account has sufficient balance
            const fromAccountResult = await client.query(
                'SELECT balance FROM business_account WHERE account_id = $1 AND business_id = $2',
                [fromAccountId, business_id]
            );

            if (fromAccountResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'From account not found' });
            }

            const fromBalance = parseFloat(fromAccountResult.rows[0].balance);
            if (fromBalance < amount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            // Get account names for transaction notes
            const accountsResult = await client.query(
                'SELECT account_id, account_name FROM accounts WHERE account_id IN ($1, $2)',
                [fromAccountId, toAccountId]
            );

            const fromAccount = accountsResult.rows.find(acc => acc.account_id === fromAccountId);
            const toAccount = accountsResult.rows.find(acc => acc.account_id === toAccountId);

            // Deduct from source account
            await client.query(
                'UPDATE business_account SET balance = balance - $1 WHERE account_id = $2 AND business_id = $3',
                [amount, fromAccountId, business_id]
            );

            // Add to destination account
            await client.query(
                'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2 AND business_id = $3',
                [amount, toAccountId, business_id]
            );

            // Create transfer transaction for source account
            const transferTransactionResult = await client.query(
                'INSERT INTO transactions (account_id, amount, type, note) VALUES ($1, $2, $3, $4) RETURNING transaction_id',
                [fromAccountId, amount, 'Transfer', `Transfer to ${toAccount?.account_name}`]
            );

            // Link transaction to business
            await client.query(
                'INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)',
                [transferTransactionResult.rows[0].transaction_id, business_id]
            );

            await client.query('COMMIT');
            res.json({ message: 'Transfer completed successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error transferring funds:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
export const transferCOGS = async (req: Request, res: Response) => {
    try {
        const { categoryId, accountId, amount, direction } = req.body; // direction: 'to-cogs' or 'from-cogs'
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get category and account names
            const categoryResult = await client.query('SELECT name FROM cost_categories WHERE category_id = $1', [categoryId]);
            const accountResult = await client.query('SELECT account_name FROM accounts WHERE account_id = $1', [accountId]);
            
            const categoryName = categoryResult.rows[0]?.name;
            const accountName = accountResult.rows[0]?.account_name;

            if (direction === 'from-cogs') {
                // Transfer from COGS to account
                await client.query(
                    'UPDATE cogs_account SET balance = balance - $1 WHERE category_id = $2 AND business_id = $3',
                    [amount, categoryId, business_id]
                );
                
                await client.query(
                    'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2 AND business_id = $3',
                    [amount, accountId, business_id]
                );

                // Create transaction
                const transactionResult = await client.query(
                    'INSERT INTO transactions (account_id, amount, type, note) VALUES ($1, $2, $3, $4) RETURNING transaction_id',
                    [accountId, amount, 'Transfer', `COGS transfer from ${categoryName}`]
                );

                await client.query(
                    'INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)',
                    [transactionResult.rows[0].transaction_id, business_id]
                );
            } else {
                // Transfer from account to COGS
                await client.query(
                    'UPDATE business_account SET balance = balance - $1 WHERE account_id = $2 AND business_id = $3',
                    [amount, accountId, business_id]
                );

                const existingCogs = await client.query(
                    'SELECT account_id FROM cogs_account WHERE category_id = $1 AND business_id = $2',
                    [categoryId, business_id]
                );

                if (existingCogs.rows.length > 0) {
                    await client.query(
                        'UPDATE cogs_account SET balance = balance + $1 WHERE category_id = $2 AND business_id = $3',
                        [amount, categoryId, business_id]
                    );
                } else {
                    await client.query(
                        'INSERT INTO cogs_account (category_id, balance, business_id) VALUES ($1, $2, $3)',
                        [categoryId, amount, business_id]
                    );
                }

                // Create transaction
                const transactionResult = await client.query(
                    'INSERT INTO transactions (account_id, amount, type, note) VALUES ($1, $2, $3, $4) RETURNING transaction_id',
                    [accountId, amount, 'Transfer', `COGS transfer to ${categoryName}`]
                );

                await client.query(
                    'INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)',
                    [transactionResult.rows[0].transaction_id, business_id]
                );
            }

            await client.query('COMMIT');
            res.json({ message: 'COGS transfer completed successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error transferring COGS:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
