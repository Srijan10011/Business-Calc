import pool from '../db';
import logger from '../utils/logger';

export const createDefaultAccount = async (clientOrBusinessId: any, business_id?: string) => {
    const isClient = business_id !== undefined;
    const client = isClient ? clientOrBusinessId : pool;
    const bizId = isClient ? business_id : clientOrBusinessId;

    try {
        const defaultAccounts = [
            'Cash Account',
            'Bank Account',
            'Credit Account',
            'Debit Account'
        ];

        for (const accountName of defaultAccounts) {
            const accountResult = await client.query(
                'INSERT INTO accounts (account_name) VALUES ($1) RETURNING account_id',
                [accountName]
            );

            const account_id = accountResult.rows[0].account_id;

            await client.query(
                'INSERT INTO business_account (account_id, business_id, balance) VALUES ($1, $2, $3)',
                [account_id, bizId, 0]
            );
        }

        logger.info(`Default accounts created for business_id: ${bizId}`);
    } catch (error) {
        logger.error('Error creating default accounts:', error);
        throw error;
    }
}
export const getAccount = async (user_id: string, business_id: string) => {


    // Get accounts for this business
    const result = await pool.query(
        `SELECT a.account_id, a.account_name, ba.balance 
             FROM accounts a 
             JOIN business_account ba ON a.account_id = ba.account_id 
             WHERE ba.business_id = $1`,
        [business_id]
    );

    return result.rows;

}
export const getTransactions = async (user_id: string, business_id: string) => {


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

    return transactions;

};
export const transferFund = async (
    user_id: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    business_id: string
) => {
    if (!amount || amount <= 0) {
        throw new Error("Invalid transfer amount");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Check source balance
        const fromAccountResult = await client.query(
            "SELECT balance FROM business_account WHERE account_id = $1 AND business_id = $2",
            [fromAccountId, business_id]
        );

        if (fromAccountResult.rows.length === 0) {
            throw new Error("From account not found");
        }

        const fromBalance = parseFloat(fromAccountResult.rows[0].balance);

        if (fromBalance < amount) {
            throw new Error("Insufficient balance");
        }

        // Account names for notes
        const accountsResult = await client.query(
            "SELECT account_id, account_name FROM accounts WHERE account_id IN ($1, $2)",
            [fromAccountId, toAccountId]
        );

        const toAccount = accountsResult.rows.find(
            (acc) => acc.account_id === toAccountId
        );

        // Deduct source
        await client.query(
            "UPDATE business_account SET balance = balance - $1 WHERE account_id = $2 AND business_id = $3",
            [amount, fromAccountId, business_id]
        );

        // Add destination
        await client.query(
            "UPDATE business_account SET balance = balance + $1 WHERE account_id = $2 AND business_id = $3",
            [amount, toAccountId, business_id]
        );

        // Transaction record
        const transactionResult = await client.query(
            "INSERT INTO transactions (account_id, amount, type, note) VALUES ($1, $2, $3, $4) RETURNING transaction_id",
            [
                fromAccountId,
                amount,
                "Transfer",
                `Transfer to ${toAccount?.account_name || "another account"}`
            ]
        );

        await client.query(
            "INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)",
            [transactionResult.rows[0].transaction_id, business_id]
        );

        await client.query("COMMIT");

        return {
            success: true,
            message: "Transfer completed successfully"
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
export const transferCOGS = async (user_id: string, categoryId: string, accountId: string, amount: number, direction: "to-cogs" | "from-cogs", business_id: string) => {


    if (!amount || (amount) <= 0) {
        throw new Error("Amount must be positive");
    }
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
        return { message: 'COGS transfer completed successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
