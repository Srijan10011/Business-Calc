import { Request, Response } from 'express';
import logger from '../utils/logger';

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
        logger.error('Error fetching team members:', error);
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
        logger.error('Error adding team member:', error);
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
        logger.error('Error updating team member:', error);
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
        logger.error('Error fetching team member:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const payoutSalary = async (req: Request, res: Response) => {
    try {

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
        const cogsResult = await Teamdb.payoutSalary(finalMemberId, parseFloat(amount), trimmedMonth, business_id);

        res.json({
            message: 'Salary payout successful',
            transaction_id: cogsResult.transaction_id
        });
    } catch (error: any) {

        logger.error('Error processing salary payout:', error);
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
        logger.error('Error fetching salary history:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const result = await Teamdb.deleteTeamMember(id, business_id);

        res.json({ message: 'Team member deleted successfully', result });
    } catch (error: any) {
        logger.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

// Get or create team account
export const getTeamMemberAccount = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        // Verify member belongs to business
        const get_teammemberaccount = await Teamdb.getTeamMemberAccount(id, business_id);



        res.json(get_teammemberaccount);
    } catch (error: any) {
        logger.error('Error fetching team account:', error);
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



        // Get or create account
        let accountResult = await Teamdb.distributeSalary(member_id, amount, month, business_id);
        res.json({ message: 'Salary distributed successfully', data: accountResult });
    } catch (error: any) {

        logger.error('Error distributing salary:', error);
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
        logger.error('Error auto distributing salaries:', error);

        return res.status(error?.status || 500).json({
            message: error?.message || 'Server error',
            error: error?.message
        });
    }
};
