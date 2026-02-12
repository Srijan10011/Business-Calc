import { Request, Response } from 'express';
import pool from '../db';

export const getTeamMembers = async (req: Request, res: Response) => {
    try {
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

        const result = await pool.query(
            `SELECT 
                tm.member_id,
                tm.name,
                tm.email,
                tm.phone,
                tm.position,
                tm.department,
                tm.salary,
                tm.enroll_date,
                tm.status,
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, tm.enroll_date)) * 12 + 
                EXTRACT(MONTH FROM AGE(CURRENT_DATE, tm.enroll_date)) as months_working,
                COALESCE(ta.current_balance, 0) as account_balance
            FROM team_members tm
            LEFT JOIN team_accounts ta ON tm.member_id = ta.member_id
            WHERE tm.business_id = $1 
            ORDER BY tm.enroll_date DESC`,
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addTeamMember = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, position, department, salary, enroll_date } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        if (!name || !position) {
            return res.status(400).json({ message: 'Name and position are required' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        const result = await pool.query(
            `INSERT INTO team_members (business_id, name, email, phone, position, department, salary, enroll_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING member_id, name, position`,
            [business_id, name, email, phone, position, department, salary, enroll_date || new Date()]
        );

        res.status(201).json({ 
            message: 'Team member added successfully',
            member: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error adding team member:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const updateTeamMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, phone, position, department, salary, status } = req.body;
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

        const result = await pool.query(
            `UPDATE team_members 
             SET name = $1, email = $2, phone = $3, position = $4, department = $5, salary = $6, status = $7, updated_at = CURRENT_TIMESTAMP
             WHERE member_id = $8 AND business_id = $9
             RETURNING member_id, name, position`,
            [name, email, phone, position, department, salary, status, id, business_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        res.json({ 
            message: 'Team member updated successfully',
            member: result.rows[0]
        });
    } catch (error: any) {
        console.error('Error updating team member:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getTeamMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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

        const result = await pool.query(
            `SELECT 
                member_id,
                name,
                email,
                phone,
                position,
                department,
                salary,
                enroll_date,
                status,
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, enroll_date)) * 12 + 
                EXTRACT(MONTH FROM AGE(CURRENT_DATE, enroll_date)) as months_working
            FROM team_members 
            WHERE member_id = $1 AND business_id = $2`,
            [id, business_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('Error fetching team member:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const payoutSalary = async (req: Request, res: Response) => {
    try {
        console.log('Request body:', req.body);
        const { member_id, memberId, id, amount, month, description } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const finalMemberId = member_id || memberId || id;
        const trimmedMonth = month?.trim();
        const trimmedDescription = description?.trim();
        
        if (!finalMemberId || !amount || !trimmedMonth || trimmedMonth === '') {
            return res.status(400).json({ message: 'Member ID, amount, and month are required' });
        }

        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Amount must be positive' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Get COGS account for salary category only
        const cogsResult = await pool.query(
            `SELECT ca.account_id, ca.balance 
             FROM cogs_account ca
             JOIN cost_categories cc ON ca.category_id = cc.category_id
             WHERE ca.business_id = $1 AND LOWER(cc.name) = 'salary'`,
            [business_id]
        );

        if (cogsResult.rows.length === 0) {
            return res.status(400).json({ message: 'Salary COGS account not found' });
        }

        const { account_id, balance } = cogsResult.rows[0];

        if (parseFloat(balance) < parseFloat(amount)) {
            return res.status(400).json({ 
                message: `Insufficient salary balance`,
                error: 'INSUFFICIENT_BALANCE',
                availableBalance: parseFloat(balance),
                requestedAmount: parseFloat(amount)
            });
        }

        // Get team member name
        const memberResult = await pool.query(
            'SELECT name FROM team_members WHERE member_id = $1 AND business_id = $2',
            [finalMemberId, business_id]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        const memberName = memberResult.rows[0].name;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Deduct from COGS balance
            await client.query(
                'UPDATE cogs_account SET balance = balance - $1 WHERE account_id = $2',
                [amount, account_id]
            );

            // Record transaction (no account_id needed for COGS payout)
            const transactionResult = await client.query(
                `INSERT INTO transactions (amount, type, note)
                 VALUES ($1, $2, $3)
                 RETURNING transaction_id`,
                [amount, 'Outgoing', `Salary payout for ${memberName} - ${trimmedMonth}`]
            );

            // Link transaction to business
            await client.query(
                'INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)',
                [transactionResult.rows[0].transaction_id, business_id]
            );

            // Get or create team account
            let accountResult = await client.query(
                'SELECT * FROM team_accounts WHERE member_id = $1',
                [finalMemberId]
            );

            if (accountResult.rows.length === 0) {
                await client.query(
                    'INSERT INTO team_accounts (member_id) VALUES ($1)',
                    [finalMemberId]
                );
            }

            // Deduct from account balance
            await client.query(
                'UPDATE team_accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE member_id = $2',
                [amount, finalMemberId]
            );

            // Record salary transaction
            await client.query(
                'INSERT INTO salary_transactions (member_id, amount, distribution_month, transaction_type) VALUES ($1, $2, $3, $4)',
                [finalMemberId, -parseFloat(amount), trimmedMonth, 'withdrawal']
            );

            await client.query('COMMIT');

            res.json({ 
                message: 'Salary payout successful',
                transaction_id: transactionResult.rows[0].transaction_id
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error processing salary payout:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getTeamMemberSalaryHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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

        // Get team member name first
        const memberResult = await pool.query(
            'SELECT name FROM team_members WHERE member_id = $1 AND business_id = $2',
            [id, business_id]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        const memberName = memberResult.rows[0].name;

        // Get salary payment history (payouts from both team page and finance page)
        const payoutHistory = await pool.query(
            `SELECT 
                t.transaction_id, 
                t.amount, 
                t.note, 
                t.created_at,
                'payout' as transaction_type
             FROM transactions t
             JOIN business_transactions bt ON t.transaction_id = bt.transaction_id
             WHERE bt.business_id = $1 
             AND t.type = 'Outgoing' 
             AND (t.note LIKE $2 OR t.note LIKE $3)`,
            [business_id, `Salary payout for ${memberName}%`, `%Salary for ${memberName}%`]
        );

        // Get salary additions (exclude negative amounts as they're duplicates of payouts)
        const additionHistory = await pool.query(
            `SELECT 
                st.transaction_id, 
                st.amount, 
                ('Salary added for ' || $2 || ' - ' || st.distribution_month) as note,
                st.created_at,
                'addition' as transaction_type
             FROM salary_transactions st
             WHERE st.member_id = $1 AND st.amount > 0`,
            [id, memberName]
        );

        // Combine and sort by date
        const allHistory = [...payoutHistory.rows, ...additionHistory.rows]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Format the response
        const formattedHistory = allHistory.map(row => ({
            transaction_id: row.transaction_id,
            amount: parseFloat(row.amount),
            note: row.note,
            created_at: row.created_at,
            date: row.created_at,
            payment_date: row.created_at,
            month: row.note.split(' - ')[1] || '',
            description: row.note,
            type: row.transaction_type // 'addition' or 'payout'
        }));

        res.json(formattedHistory);
    } catch (error: any) {
        console.error('Error fetching salary history:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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

        const result = await pool.query(
            'DELETE FROM team_members WHERE member_id = $1 AND business_id = $2 RETURNING name',
            [id, business_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        res.json({ message: 'Team member deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

// Get or create team account
export const getTeamMemberAccount = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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

        // Verify member belongs to business
        const memberCheck = await pool.query(
            'SELECT member_id FROM team_members WHERE member_id = $1 AND business_id = $2',
            [id, business_id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // Get or create account
        let accountResult = await pool.query(
            'SELECT * FROM team_accounts WHERE member_id = $1',
            [id]
        );

        if (accountResult.rows.length === 0) {
            // Create account if doesn't exist
            accountResult = await pool.query(
                'INSERT INTO team_accounts (member_id) VALUES ($1) RETURNING *',
                [id]
            );
        }

        res.json(accountResult.rows[0]);
    } catch (error: any) {
        console.error('Error fetching team account:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

// Distribute salary to team member account
export const distributeSalary = async (req: Request, res: Response) => {
    try {
        const { member_id, amount, month } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        if (!amount) {
            return res.status(400).json({ message: 'Amount is required' });
        }

        // Allow negative amounts for deductions, but validate it's not zero
        if (parseFloat(amount) === 0) {
            return res.status(400).json({ message: 'Amount cannot be zero' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        await pool.query('BEGIN');

        // Get or create account
        let accountResult = await pool.query(
            'SELECT * FROM team_accounts WHERE member_id = $1',
            [member_id]
        );

        if (accountResult.rows.length === 0) {
            accountResult = await pool.query(
                'INSERT INTO team_accounts (member_id) VALUES ($1) RETURNING *',
                [member_id]
            );
        }

        // Update account balance
        await pool.query(
            'UPDATE team_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE member_id = $2',
            [amount, member_id]
        );

        // Record transaction
        await pool.query(
            'INSERT INTO salary_transactions (member_id, amount, distribution_month) VALUES ($1, $2, $3)',
            [member_id, amount, month]
        );

        await pool.query('COMMIT');

        res.json({ message: 'Salary distributed successfully' });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error distributing salary:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

// Auto distribute salaries
export const autoDistributeSalaries = async (req: Request, res: Response) => {
    try {
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
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Get active team members with salaries
        const membersResult = await pool.query(
            'SELECT member_id, name, salary FROM team_members WHERE business_id = $1 AND status = $2 AND salary > 0',
            [business_id, 'active']
        );

        if (membersResult.rows.length === 0) {
            return res.status(400).json({ message: 'No active team members with salaries found' });
        }

        await pool.query('BEGIN');

        let distributedCount = 0;

        for (const member of membersResult.rows) {
            // Check if already distributed this month
            const existingTransaction = await pool.query(
                'SELECT transaction_id FROM salary_transactions WHERE member_id = $1 AND distribution_month = $2',
                [member.member_id, currentMonth]
            );

            if (existingTransaction.rows.length === 0) {
                // Get or create account
                let accountResult = await pool.query(
                    'SELECT * FROM team_accounts WHERE member_id = $1',
                    [member.member_id]
                );

                if (accountResult.rows.length === 0) {
                    await pool.query(
                        'INSERT INTO team_accounts (member_id) VALUES ($1)',
                        [member.member_id]
                    );
                }

                // Update account balance
                await pool.query(
                    'UPDATE team_accounts SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE member_id = $2',
                    [member.salary, member.member_id]
                );

                // Record transaction
                await pool.query(
                    'INSERT INTO salary_transactions (member_id, amount, distribution_month) VALUES ($1, $2, $3)',
                    [member.member_id, member.salary, currentMonth]
                );

                distributedCount++;
            }
        }

        await pool.query('COMMIT');

        res.json({ 
            message: `Auto distribution completed. ${distributedCount} salaries distributed.`,
            distributedCount,
            month: currentMonth
        });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error auto distributing salaries:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
