import { Request, Response } from 'express';
import pool from '../db';
import * as Business_pool from '../db/Business_pool';
import * as Teamdb from '../db/Teamdb';

export const getTeamMembers = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await Teamdb.getTeamMembersByBusiness(business_id);


        res.json(result);
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

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await Teamdb.addTeamMember(
            business_id,
            name,
            email,
            phone,
            position,
            department,
            salary,
            enroll_date || new Date()
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
        const id = req.params.id as string;
        const { name, email, phone, position, department, salary, status } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await Teamdb.updateTeamMember(
            id,
            business_id,
            name,
            email,
            phone,
            position,
            department,
            salary,
            status
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
        const id = req.params.id as string;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await Teamdb.getTeamMemberById(id, business_id);

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

        const business_id = await Business_pool.Get_Business_id(user_id);

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

        await pool.query('BEGIN');

        // Deduct from COGS balance
        await pool.query(
            'UPDATE cogs_account SET balance = balance - $1 WHERE account_id = $2',
            [amount, account_id]
        );

        // Record transaction (no account_id needed for COGS payout)
        const transactionResult = await pool.query(
            `INSERT INTO transactions (amount, type, note)
             VALUES ($1, $2, $3)
             RETURNING transaction_id`,
            [amount, 'Outgoing', `Salary payout for ${memberName} - ${trimmedMonth}`]
        );

        // Link transaction to business
        await pool.query(
            'INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)',
            [transactionResult.rows[0].transaction_id, business_id]
        );

        await pool.query('COMMIT');

        res.json({
            message: 'Salary payout successful',
            transaction_id: transactionResult.rows[0].transaction_id
        });
    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('Error processing salary payout:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getTeamMemberSalaryHistory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);
        const GetMemberSalaryHistoryResult = await Teamdb.getTeamMemberSalaryHistory(id, business_id);


        res.json(GetMemberSalaryHistoryResult);
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

        const business_id = await Business_pool.Get_Business_id(user_id);

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

        const business_id = await Business_pool.Get_Business_id(user_id);

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

        const business_id = await Business_pool.Get_Business_id(user_id);

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
        const user_id = req.user?.id as string;

        const result = await Teamdb.autoDistributeSalaries(user_id as string);

        return res.json(result);

    } catch (error: any) {
        console.error('Error auto distributing salaries:', error);

        return res.status(error?.status || 500).json({
            message: error?.message || 'Server error',
            error: error?.message
        });
    }
};
