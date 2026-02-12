import { Request, Response } from 'express';
import pool from '../db';

export const addExpense = async (req: Request, res: Response) => {
    try {
        const { account_id, amount, note } = req.body;
        const user_id = req.user?.id;

        if (!account_id || !amount || !note) {
            return res.status(400).json({ message: 'Missing required fields: account_id, amount, note' });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be positive' });
        }

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

            // Check account balance for non-credit accounts
            const balanceResult = await client.query(
                'SELECT balance, account_name FROM business_account ba JOIN accounts a ON ba.account_id = a.account_id WHERE ba.account_id = $1 AND ba.business_id = $2',
                [account_id, business_id]
            );

            if (balanceResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Account not found' });
            }

            const { balance: currentBalance, account_name } = balanceResult.rows[0];
            const isCredit = account_name.toLowerCase().includes('credit');

            // Only check balance for non-credit accounts
            if (!isCredit && parseFloat(currentBalance) < parseFloat(amount)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Insufficient balance' });
            }

            // Create transaction
            const transactionResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, note)
                 VALUES ($1, $2, $3, $4)
                 RETURNING transaction_id`,
                [account_id, amount, 'Outgoing', note]
            );

            // Link to business
            await client.query(
                `INSERT INTO business_transactions (transaction_id, business_id)
                 VALUES ($1, $2)`,
                [transactionResult.rows[0].transaction_id, business_id]
            );

            // Update account balance (add for credit, subtract for cash/bank)
            await client.query(
                `UPDATE business_account 
                 SET balance = balance ${isCredit ? '+' : '-'} $1 
                 WHERE account_id = $2`,
                [amount, account_id]
            );

            await client.query('COMMIT');
            res.json({ message: 'Expense recorded successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error adding expense:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const cogsPayout = async (req: Request, res: Response) => {
    try {
        const { category_id, amount, note } = req.body;
        const user_id = req.user?.id;

        if (!category_id || !amount || !note) {
            return res.status(400).json({ message: 'Missing required fields: category_id, amount, note' });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be positive' });
        }

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

            // Check COGS balance
            const cogsResult = await client.query(
                `SELECT ca.balance, cc.name 
                 FROM cogs_account ca
                 JOIN cost_categories cc ON ca.category_id = cc.category_id
                 WHERE ca.category_id = $1 AND ca.business_id = $2`,
                [category_id, business_id]
            );

            if (cogsResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'COGS category not found' });
            }

            const { balance: cogsBalance, name: categoryName } = cogsResult.rows[0];
            if (parseFloat(cogsBalance) < parseFloat(amount)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Insufficient COGS balance' });
            }

            // Create transaction (no account_id needed for COGS payout)
            const transactionResult = await client.query(
                `INSERT INTO transactions (amount, type, note)
                 VALUES ($1, $2, $3)
                 RETURNING transaction_id`,
                [amount, 'Outgoing', `${categoryName}: ${note}`]
            );

            // Link to business
            await client.query(
                `INSERT INTO business_transactions (transaction_id, business_id)
                 VALUES ($1, $2)`,
                [transactionResult.rows[0].transaction_id, business_id]
            );

            // Update COGS balance
            await client.query(
                `UPDATE cogs_account 
                 SET balance = balance - $1 
                 WHERE category_id = $2 AND business_id = $3`,
                [amount, category_id, business_id]
            );

            // If this is a salary payout, also deduct from employee account balance
            if (categoryName.toLowerCase().includes('salary') && note.includes('Salary for ')) {
                // Extract employee name from note format: "Salary for [Name] on [Date]"
                const employeeNameMatch = note.match(/Salary for ([\w\s]+?) on/);
                if (employeeNameMatch) {
                    const employeeName = employeeNameMatch[1];
                    
                    // Find employee by name
                    const employeeResult = await client.query(
                        'SELECT member_id FROM team_members WHERE name = $1 AND business_id = $2',
                        [employeeName, business_id]
                    );
                    
                    if (employeeResult.rows.length > 0) {
                        const memberId = employeeResult.rows[0].member_id;
                        
                        // Get or create account
                        let accountResult = await client.query(
                            'SELECT * FROM team_accounts WHERE member_id = $1',
                            [memberId]
                        );

                        if (accountResult.rows.length === 0) {
                            await client.query(
                                'INSERT INTO team_accounts (member_id) VALUES ($1)',
                                [memberId]
                            );
                        }

                        // Deduct from account balance (can go negative for advances)
                        await client.query(
                            'UPDATE team_accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE member_id = $2',
                            [amount, memberId]
                        );

                        // Record salary transaction
                        const currentMonth = new Date().toISOString().slice(0, 7);
                        await client.query(
                            'INSERT INTO salary_transactions (member_id, amount, distribution_month, transaction_type) VALUES ($1, $2, $3, $4)',
                            [memberId, -parseFloat(amount), currentMonth, 'withdrawal']
                        );
                    }
                }
            }

            await client.query('COMMIT');
            res.json({ message: 'COGS payout recorded successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error processing COGS payout:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
