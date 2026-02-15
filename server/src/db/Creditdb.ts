import pool from '../db';

export const getCreditsByBusiness = async (business_id: string) => {
    const result = await pool.query(
        `SELECT payable_id, party_name, total_amount, paid_amount, 
                (total_amount - paid_amount) as remaining_amount, status, created_at
         FROM credit_payables 
         WHERE business_id = $1 
         ORDER BY created_at DESC`,
        [business_id]
    );

    return result.rows;
};

export const getPayableDetails = async (payable_id: string, business_id: string) => {
    const result = await pool.query(
        'SELECT party_name, total_amount, paid_amount FROM credit_payables WHERE payable_id = $1 AND business_id = $2',
        [payable_id, business_id]
    );

    return result;
};

export const getPaymentAccount = async (account_id: string, business_id: string) => {
    const result = await pool.query(
        'SELECT ba.balance, a.account_name FROM business_account ba JOIN accounts a ON ba.account_id = a.account_id WHERE ba.account_id = $1 AND ba.business_id = $2',
        [account_id, business_id]
    );

    return result;
};

export const getCreditAccount = async (business_id: string) => {
    const result = await pool.query(
        `SELECT ba.account_id 
         FROM business_account ba
         JOIN accounts a ON ba.account_id = a.account_id
         WHERE a.account_name ILIKE '%credit%' AND ba.business_id = $1`,
        [business_id]
    );

    return result;
};

export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );

    if (result.rows.length === 0) {
        throw new Error('User not associated with any business');
    }

    return result.rows[0].business_id;
};


