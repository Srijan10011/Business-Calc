import pool from '../db';

export async function createTransaction(
    client: any,
    account_id: string,
    amount: number,
    type: string,
    note: string
) {
    const result = await client.query(
        'INSERT INTO transactions (account_id, amount, type, note) VALUES ($1, $2, $3, $4) RETURNING transaction_id',
        [account_id, amount, type, note]
    );

    return result.rows[0].transaction_id;
}

export async function linkTransactionToBusiness(
    client: any,
    transaction_id: string,
    business_id: string
) {
    await client.query(
        'INSERT INTO business_transactions (transaction_id, business_id) VALUES ($1, $2)',
        [transaction_id, business_id]
    );
}

export async function createBusinessTransaction(
    client: any,
    account_id: string,
    amount: number,
    type: string,
    note: string,
    business_id: string
) {
    const transaction_id = await createTransaction(client, account_id, amount, type, note);
    await linkTransactionToBusiness(client, transaction_id, business_id);
    return transaction_id;
}

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
