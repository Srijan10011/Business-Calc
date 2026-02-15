import pool from '../db';

export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );
    if (result.rows.length === 0) throw new Error('User not associated with any business');
    return result.rows[0].business_id;
};

export const checkAccountType = async (account_id: string) => {
    const result = await pool.query(
        'SELECT account_name FROM accounts WHERE account_id = $1',
        [account_id]
    );
    return result.rows[0]?.account_name?.toLowerCase().includes('credit') || false;
};

export const getExistingPayable = async (
    client: any,
    business_id: string,
    party_name: string
) => {
    const result = await client.query(
        'SELECT payable_id FROM credit_payables WHERE business_id = $1 AND party_name = $2 AND status != $3',
        [business_id, party_name, 'Paid']
    );
    return result.rows[0] || null;
};

export const updateExistingPayable = async (
    client: any,
    payable_id: string,
    total_amount: number
) => {
    await client.query(
        'UPDATE credit_payables SET total_amount = total_amount + $1 WHERE payable_id = $2',
        [total_amount, payable_id]
    );
};

export const createCreditPayable = async (
    client: any,
    business_id: string,
    party_name: string,
    total_amount: number
) => {
    await client.query(
        `INSERT INTO credit_payables (business_id, party_name, total_amount)
         VALUES ($1, $2, $3)`,
        [business_id, party_name, total_amount]
    );
};

export const addInventoryItem = async (
    name: string,
    stock: number,
    unit_cost: number,
    type: string,
    payment_account?: string,
    total_amount?: number,
    party_name?: string,
    business_id?: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const dbType = type === 'raw_material' ? 'Raw_material' : 'Other';

        // Insert inventory info
        const inventoryResult = await client.query(
            `INSERT INTO inventory_info (name, stock, type, unit_cost)
             VALUES ($1, $2, $3, $4)
             RETURNING inventory_id, name, stock, type, unit_cost`,
            [name, stock, dbType, unit_cost]
        );

        const inventory_id = inventoryResult.rows[0].inventory_id;
        const totalCost = Number(stock) * Number(unit_cost);

        // Inventory log
        await client.query(
            `INSERT INTO inventory_logs (type, amount, previous_stock, new_stock, total_cost, add_to_recover, inventory_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            ['Incomming', stock, 0, stock, totalCost, 0, inventory_id]
        );

        // Link inventory to business
        await client.query(
            `INSERT INTO business_inventory (inventory_id, business_id)
             VALUES ($1, $2)`,
            [inventory_id, business_id]
        );

        // Handle payment if provided
        if (payment_account && total_amount && total_amount > 0) {
            // Create transaction
            const transactionResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, note)
                 VALUES ($1, $2, $3, $4)
                 RETURNING transaction_id`,
                [payment_account, total_amount, 'Outgoing', `Purchase of inventory: ${name}`]
            );

            // Link transaction to business
            await client.query(
                `INSERT INTO business_transactions (transaction_id, business_id)
                 VALUES ($1, $2)`,
                [transactionResult.rows[0].transaction_id, business_id]
            );

            const isCredit = await checkAccountType(payment_account);

            // Update account balance
            await client.query(
                `UPDATE business_account 
                 SET balance = balance ${isCredit ? '+' : '-'} $1
                 WHERE account_id = $2`,
                [total_amount, payment_account]
            );

            // Handle credit payable
            if (isCredit && party_name) {
                const existingPayable = await getExistingPayable(client, business_id!, party_name);
                if (existingPayable) {
                    await updateExistingPayable(client, existingPayable.payable_id, total_amount);
                } else {
                    await createCreditPayable(client, business_id!, party_name, total_amount);
                }
            }
        }

        await client.query('COMMIT');
        return inventoryResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getInventoryItems = async (business_id: string) => {
    const result = await pool.query(
        `SELECT ii.inventory_id as id, ii.name, ii.stock, ii.type, ii.unit_cost
         FROM inventory_info ii
         INNER JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
         WHERE bi.business_id = $1
         ORDER BY ii.name`,
        [business_id]
    );
    return result.rows;
};

export const getInventoryItemById = async (inventory_id: string, business_id: string) => {
    const result = await pool.query(
        `SELECT ii.stock, ii.unit_cost, ii.name
         FROM inventory_info ii
         INNER JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
         WHERE ii.inventory_id = $1 AND bi.business_id = $2`,
        [inventory_id, business_id]
    );
    return result.rows[0] || null;
};

export const updateInventoryStock = async (
    inventory_id: string,
    quantity: number,
    operation: 'in' | 'out',
    payment_account?: string,
    total_amount?: number,
    party_name?: string,
    business_id?: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const currentItem = await getInventoryItemById(inventory_id, business_id!);
        if (!currentItem) throw new Error('Inventory item not found');

        const stockChange = operation === 'in' ? quantity : -quantity;
        const newStock = currentItem.stock + stockChange;
        if (newStock < 0) throw new Error('Insufficient stock');

        // Update stock and log
        const logType = operation === 'in' ? 'Incomming' : 'Outgoing';
        const updatedItem = await client.query(
            `UPDATE inventory_info
             SET stock = $1
             WHERE inventory_id = $2
             RETURNING inventory_id, name, stock, type, unit_cost`,
            [newStock, inventory_id]
        );

        const totalCost = Math.abs(quantity) * currentItem.unit_cost;
        const addToRecover = stockChange > 0 ? totalCost : 0;

        await client.query(
            `INSERT INTO inventory_logs (type, amount, previous_stock, new_stock, total_cost, add_to_recover, inventory_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [logType, Math.abs(quantity), currentItem.stock, newStock, totalCost, addToRecover, inventory_id]
        );

        // Handle payment if stock in
        if (operation === 'in' && payment_account && total_amount && total_amount > 0) {
            const transactionResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, note)
                 VALUES ($1, $2, $3, $4)
                 RETURNING transaction_id`,
                [payment_account, total_amount, 'Outgoing', `Stock in payment for ${currentItem.name}`]
            );

            await client.query(
                `INSERT INTO business_transactions (transaction_id, business_id)
                 VALUES ($1, $2)`,
                [transactionResult.rows[0].transaction_id, business_id]
            );

            const isCredit = await checkAccountType(payment_account);
            await client.query(
                `UPDATE business_account
                 SET balance = balance ${isCredit ? '+' : '-'} $1
                 WHERE account_id = $2`,
                [total_amount, payment_account]
            );

            if (isCredit && party_name) {
                const existingPayable = await getExistingPayable(client, business_id!, party_name);
                if (existingPayable) {
                    await updateExistingPayable(client, existingPayable.payable_id, total_amount);
                } else {
                    await createCreditPayable(client, business_id!, party_name, total_amount);
                }
            }
        }

        await client.query('COMMIT');
        return updatedItem.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
