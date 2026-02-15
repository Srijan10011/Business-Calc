import pool from '../db';

export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );
    if (result.rows.length === 0) throw new Error('User not associated with any business');
    return result.rows[0].business_id;
};

export const getAccountInfo = async (account_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT balance, account_name 
         FROM business_account ba 
         JOIN accounts a ON ba.account_id = a.account_id 
         WHERE ba.account_id = $1 AND ba.business_id = $2`,
        [account_id, business_id]
    );
    return result.rows[0] || null;
};

export const createExpenseTransaction = async (
    account_id: string,
    amount: number,
    note: string,
    business_id: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check account info
        const account = await getAccountInfo(account_id, business_id);
        if (!account) throw new Error('Account not found');

        const isCredit = account.account_name.toLowerCase().includes('credit');
        if (!isCredit && (account.balance) < (amount)) {
            throw new Error('Insufficient balance');
        }

        // Create transaction
        const transactionResult = await client.query(
            `INSERT INTO transactions (account_id, amount, type, note)
             VALUES ($1, $2, $3, $4)
             RETURNING transaction_id`,
            [account_id, amount, 'Outgoing', note]
        );

        // Link transaction to business
        await client.query(
            `INSERT INTO business_transactions (transaction_id, business_id)
             VALUES ($1, $2)`,
            [transactionResult.rows[0].transaction_id, business_id]
        );

        // Update account balance
        await client.query(
            `UPDATE business_account 
             SET balance = balance ${isCredit ? '+' : '-'} $1 
             WHERE account_id = $2 AND business_id = $3`,
            [amount, account_id, business_id]
        );

        await client.query('COMMIT');
        return transactionResult.rows[0].transaction_id;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// --- COGS functions ---

export const getCOGSBalance = async (category_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT ca.balance, cc.name 
         FROM cogs_account ca
         JOIN cost_categories cc ON ca.category_id = cc.category_id
         WHERE ca.category_id = $1 AND ca.business_id = $2`,
        [category_id, business_id]
    );
    return result.rows[0] || null;
};

export const getTeamMemberByName = async (name: string, business_id: string) => {
    const result = await pool.query(
        'SELECT member_id FROM team_members WHERE name = $1 AND business_id = $2',
        [name, business_id]
    );
    return result.rows[0] || null;
};

export const processCOGSPayout = async (
    category_id: string,
    amount: number,
    note: string,
    business_id: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const cogsInfo = await getCOGSBalance(category_id, business_id);
        if (!cogsInfo) throw new Error('COGS category not found');

        if ((cogsInfo.balance) < (amount)) {
            throw new Error('Insufficient COGS balance');
        }

        const categoryName = cogsInfo.name;

        // Create transaction
        const transactionResult = await client.query(
            `INSERT INTO transactions (amount, type, note)
             VALUES ($1, $2, $3)
             RETURNING transaction_id`,
            [amount, 'Outgoing', `${categoryName}: ${note}`]
        );

        await client.query(
            `INSERT INTO business_transactions (transaction_id, business_id)
             VALUES ($1, $2)`,
            [transactionResult.rows[0].transaction_id, business_id]
        );

        // Deduct COGS balance
        await client.query(
            `UPDATE cogs_account 
             SET balance = balance - $1 
             WHERE category_id = $2 AND business_id = $3`,
            [amount, category_id, business_id]
        );

        // Salary processing
        if (categoryName.toLowerCase().includes('salary') && note.includes('Salary for ')) {
            const employeeNameMatch = note.match(/Salary for ([\w\s]+?) on/);
            if (employeeNameMatch) {
                const employeeName = employeeNameMatch[1];
                const employee = await getTeamMemberByName(employeeName, business_id);
                if (employee) {
                    const memberId = employee.member_id;

                    // Ensure account exists
                    const accountResult = await client.query(
                        'SELECT * FROM team_accounts WHERE member_id = $1',
                        [memberId]
                    );
                    if (accountResult.rows.length === 0) {
                        await client.query(
                            'INSERT INTO team_accounts (member_id) VALUES ($1)',
                            [memberId]
                        );
                    }

                    // Deduct from team account
                    await client.query(
                        'UPDATE team_accounts SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE member_id = $2',
                        [amount, memberId]
                    );

                    // Record salary transaction
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    await client.query(
                        'INSERT INTO salary_transactions (member_id, amount, distribution_month, transaction_type) VALUES ($1, $2, $3, $4)',
                        [memberId, -amount, currentMonth, 'withdrawal']
                    );
                }
            }
        }

        await client.query('COMMIT');
        return transactionResult.rows[0].transaction_id;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
