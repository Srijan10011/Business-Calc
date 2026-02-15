import pool from '../db';

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

export const getTeamMembersByBusiness = async (business_id: string) => {
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
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, tm.enroll_date)) AS months_working,
            COALESCE(ta.current_balance, 0) AS account_balance
        FROM team_members tm
        LEFT JOIN team_accounts ta ON tm.member_id = ta.member_id
        WHERE tm.business_id = $1
        ORDER BY tm.enroll_date DESC`,
        [business_id]
    );

    return result.rows;
};

export const addTeamMember = async (
    business_id: string,
    name: string,
    email: string,
    phone: string,
    position: string,
    department: string,
    salary: number,
    enroll_date?: Date
) => {
    const result = await pool.query(
        `INSERT INTO team_members (business_id, name, email, phone, position, department, salary, enroll_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING member_id, name, position`,
        [business_id, name, email, phone, position, department, salary, enroll_date || new Date()]
    );

    return result.rows[0];
};

export const updateTeamMember = async (
    member_id: string,
    business_id: string,
    name: string,
    email: string,
    phone: string,
    position: string,
    department: string,
    salary: number,
    status: string
) => {
    const result = await pool.query(
        `UPDATE team_members
         SET name=$1, email=$2, phone=$3, position=$4, department=$5, salary=$6, status=$7, updated_at=CURRENT_TIMESTAMP
         WHERE member_id=$8 AND business_id=$9
         RETURNING member_id, name, position`,
        [name, email, phone, position, department, salary, status, member_id, business_id]
    );

    return result.rows[0] || null;
};

export const getTeamMemberById = async (member_id: string, business_id: string) => {
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
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, enroll_date)) AS months_working
         FROM team_members
         WHERE member_id=$1 AND business_id=$2`,
        [member_id, business_id]
    );

    return result.rows[0] || null;
};

export const deleteTeamMember = async (member_id: string, business_id: string) => {
    const result = await pool.query(
        'DELETE FROM team_members WHERE member_id=$1 AND business_id=$2 RETURNING name',
        [member_id, business_id]
    );

    return result.rows[0]?.name || null;
};

export const getTeamMemberAccount = async (member_id: string, business_id: string) => {
    const memberCheck = await pool.query(
        'SELECT member_id FROM team_members WHERE member_id=$1 AND business_id=$2',
        [member_id, business_id]
    );

    if (memberCheck.rows.length === 0) return null;

    let account = await pool.query(
        'SELECT * FROM team_accounts WHERE member_id=$1',
        [member_id]
    );

    if (account.rows.length === 0) {
        account = await pool.query(
            'INSERT INTO team_accounts (member_id) VALUES ($1) RETURNING *',
            [member_id]
        );
    }

    return account.rows[0];
};

export const distributeSalary = async (member_id: string, amount: number, month: string, business_id: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let accountResult = await client.query('SELECT * FROM team_accounts WHERE member_id=$1', [member_id]);
        if (accountResult.rows.length === 0) {
            await client.query('INSERT INTO team_accounts (member_id) VALUES ($1)', [member_id]);
        }

        await client.query(
            'UPDATE team_accounts SET current_balance = current_balance + $1, updated_at=CURRENT_TIMESTAMP WHERE member_id=$2',
            [amount, member_id]
        );

        await client.query(
            'INSERT INTO salary_transactions (member_id, amount, distribution_month) VALUES ($1,$2,$3)',
            [member_id, amount, month]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const autoDistributeSalaries = async (business_id: string, month: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const members = await client.query(
            'SELECT member_id, salary FROM team_members WHERE business_id=$1 AND status=$2 AND salary>0',
            [business_id, 'active']
        );

        let distributedCount = 0;

        for (const member of members.rows) {
            const existing = await client.query(
                'SELECT transaction_id FROM salary_transactions WHERE member_id=$1 AND distribution_month=$2',
                [member.member_id, month]
            );

            if (existing.rows.length === 0) {
                await client.query('INSERT INTO team_accounts (member_id) VALUES ($1) ON CONFLICT DO NOTHING', [member.member_id]);
                await client.query(
                    'UPDATE team_accounts SET current_balance = current_balance + $1, updated_at=CURRENT_TIMESTAMP WHERE member_id=$2',
                    [member.salary, member.member_id]
                );
                await client.query(
                    'INSERT INTO salary_transactions (member_id, amount, distribution_month) VALUES ($1,$2,$3)',
                    [member.member_id, member.salary, month]
                );
                distributedCount++;
            }
        }

        await client.query('COMMIT');
        return distributedCount;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const payoutSalary = async (member_id: string, amount: number, month: string, business_id: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Salary COGS account
        const cogs = await client.query(
            `SELECT ca.account_id, ca.balance 
             FROM cogs_account ca
             JOIN cost_categories cc ON ca.category_id=cc.category_id
             WHERE ca.business_id=$1 AND LOWER(cc.name)='salary'`,
            [business_id]
        );

        if (cogs.rows.length === 0) throw new Error('Salary COGS account not found');

        const { account_id, balance } = cogs.rows[0];
        if ((balance) < (amount)) throw new Error('Insufficient balance');

        const memberRes = await client.query(
            'SELECT name FROM team_members WHERE member_id=$1 AND business_id=$2',
            [member_id, business_id]
        );

        if (memberRes.rows.length === 0) throw new Error('Team member not found');
        const memberName = memberRes.rows[0].name;

        await client.query('UPDATE cogs_account SET balance = balance - $1 WHERE account_id=$2', [amount, account_id]);

        const transaction = await client.query(
            'INSERT INTO transactions (amount, type, note) VALUES ($1,$2,$3) RETURNING transaction_id',
            [amount, 'Outgoing', `Salary payout for ${memberName} - ${month}`]
        );

        await client.query('INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1,$2)', [
            transaction.rows[0].transaction_id,
            business_id
        ]);

        let account = await client.query('SELECT * FROM team_accounts WHERE member_id=$1', [member_id]);
        if (account.rows.length === 0) {
            await client.query('INSERT INTO team_accounts (member_id) VALUES ($1)', [member_id]);
        }

        await client.query(
            'UPDATE team_accounts SET current_balance = current_balance - $1, updated_at=CURRENT_TIMESTAMP WHERE member_id=$2',
            [amount, member_id]
        );

        await client.query(
            'INSERT INTO salary_transactions (member_id, amount, distribution_month, transaction_type) VALUES ($1,$2,$3,$4)',
            [member_id, -(amount), month, 'withdrawal']
        );

        await client.query('COMMIT');
        return transaction.rows[0].transaction_id;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const getTeamMemberSalaryHistory = async (member_id: string, business_id: string) => {
    const memberRes = await pool.query(
        'SELECT name FROM team_members WHERE member_id=$1 AND business_id=$2',
        [member_id, business_id]
    );

    if (memberRes.rows.length === 0) throw new Error('Team member not found');
    const memberName = memberRes.rows[0].name;

    const payoutHistory = await pool.query(
        `SELECT t.transaction_id, t.amount, t.note, t.created_at, 'payout' AS transaction_type
         FROM transactions t
         JOIN business_transactions bt ON t.transaction_id=bt.transaction_id
         WHERE bt.business_id=$1 AND t.type='Outgoing' AND (t.note LIKE $2 OR t.note LIKE $3)`,
        [business_id, `Salary payout for ${memberName}%`, `%Salary for ${memberName}%`]
    );

    const additionHistory = await pool.query(
        `SELECT st.transaction_id, st.amount, ('Salary added for '||$2||' - '||st.distribution_month) AS note, st.created_at, 'addition' AS transaction_type
         FROM salary_transactions st
         WHERE st.member_id=$1 AND st.amount>0`,
        [member_id, memberName]
    );

    const allHistory = [...payoutHistory.rows, ...additionHistory.rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return allHistory.map((row) => ({
        transaction_id: row.transaction_id,
        amount: parseFloat(row.amount),
        note: row.note,
        created_at: row.created_at,
        type: row.transaction_type
    }));
};
