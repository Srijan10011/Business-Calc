import pool from '../db';
import { PoolClient } from 'pg';

export const getBusinessIdForUser = async (user_id: string) => {
    const result = await pool.query(
        'SELECT business_id FROM business_users WHERE user_id = $1',
        [user_id]
    );
    if (result.rows.length === 0) throw new Error('User not associated with any business');
    return result.rows[0].business_id;
};

export const getSalesWithPagination = async (
    business_id: string,
    filters: any,
    page: number,
    limit: number
) => {
    const { status, product, date_from, date_to } = filters;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.business_id = $1';
    const queryParams: any[] = [business_id];
    let paramCount = 1;

    if (status) {
        paramCount++;
        whereClause += ` AND si.status = $${paramCount}`;
        queryParams.push(status);
    }

    if (product) {
        paramCount++;
        whereClause += ` AND p.product_id = $${paramCount}`;
        queryParams.push(product);
    }

    if (date_from) {
        paramCount++;
        whereClause += ` AND DATE(si.created_at) >= $${paramCount}`;
        queryParams.push(date_from);
    }

    if (date_to) {
        paramCount++;
        whereClause += ` AND DATE(si.created_at) <= $${paramCount}`;
        queryParams.push(date_to);
    }

    const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM sales_info si
         INNER JOIN sales s ON si.sale_id = s.sale_id
         INNER JOIN customers_info ci ON s.customer_id = ci.customer_id
         INNER JOIN products p ON si.product_id = p.product_id
         LEFT JOIN debit_account da ON si.sale_id = da.sale_id
         ${whereClause}`,
        queryParams
    );

    const totalSales = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(totalSales / limit);

    paramCount++;
    queryParams.push(limit);

    paramCount++;
    queryParams.push(offset);

    const salesResult = await pool.query(
        `SELECT 
            si.sale_id,
            si.created_at as date,
            ci.name as customer,
            p.name as product,
            si.quantity,
            si.total_amount as total,
            si.type as payment_type,
            si.status,
            da.amount as amount_due,
            da.recovered
         FROM sales_info si
         INNER JOIN sales s ON si.sale_id = s.sale_id
         INNER JOIN customers_info ci ON s.customer_id = ci.customer_id
         INNER JOIN products p ON si.product_id = p.product_id
         LEFT JOIN debit_account da ON si.sale_id = da.sale_id
         ${whereClause}
         ORDER BY si.created_at DESC, si.sale_id DESC
         LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
        queryParams
    );

    const sales = salesResult.rows.map(row => ({
        ...row,
        status: row.status === 'Pending' ? 'Pending' : 'Paid',
        total:
            row.payment_type === 'debit' && row.recovered !== null
                ? `${row.recovered}/${row.amount_due}`
                : row.total
    }));

    return {
        sales,
        pagination: {
            currentPage: page,
            totalPages,
            totalSales,
            limit
        }
    };
};


// ------------------------
// Sale Creation (Full Transaction)
export const createSale = async (
    customer_id: string,
    total_amount: number,
    payment_type: string,
    account_id: string,
    product_id: string,
    rate: number,
    quantity: number,
    business_id: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Determine status
        const status = payment_type === 'debit' ? 'Pending' : 'Paid';

        // Get product name
        const productResult = await client.query(
            'SELECT name FROM products WHERE product_id = $1',
            [product_id]
        );
        const product_name = productResult.rows[0]?.name || 'Unknown';

        // Insert into sales_info
        const saleInfo = await client.query(
            `INSERT INTO sales_info 
                (product_id, quantity, rate, total_amount, account_id, type, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING sale_id`,
            [product_id, quantity, rate, total_amount, account_id, payment_type === 'cash' ? 'Cash' : payment_type, status]
        );
        const sale_id = saleInfo.rows[0].sale_id;

        // Insert into sales
        await client.query(
            `INSERT INTO sales (sale_id, business_id, customer_id)
             VALUES ($1, $2, $3)`,
            [sale_id, business_id, customer_id]
        );

        // Handle debit sale
        if (payment_type === 'debit') {
            await client.query(
                `INSERT INTO debit_account (customer_id, sale_id, amount, recovered, total, status)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [customer_id, sale_id, total_amount, 0, total_amount, 'Running']
            );
        }

        // Update stock
        await client.query(
            `UPDATE products SET stock = stock - $1 WHERE product_id = $2`,
            [quantity, product_id]
        );

        // TODO: COGS, profit calculation, business account update (implement like original)
        // Can be added here modularly per allocation

        await client.query('COMMIT');
        return { sale_id };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// ------------------------
// Record payment (debit / partial)
export const recordDebitPayment = async (
    sale_id: string,
    amount: number,
    account_id: string,
    business_id: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get debit info
        const debitResult = await client.query(
            'SELECT amount, recovered FROM debit_account WHERE sale_id = $1',
            [sale_id]
        );
        if (debitResult.rows.length === 0) throw new Error('Debit account not found');

        const { amount: totalAmount, recovered } = debitResult.rows[0];
        const remainingDue = totalAmount - recovered;
        if (amount > remainingDue) throw new Error(`Credit = ${remainingDue}, exceeds remaining`);

        const newRecovered = recovered + amount;
        const newStatus = newRecovered >= totalAmount ? 'closed' : 'Running';

        await client.query(
            'UPDATE debit_account SET recovered=$1, status=$2 WHERE sale_id=$3',
            [newRecovered, newStatus, sale_id]
        );

        if (newStatus === 'closed') {
            await client.query('UPDATE sales_info SET status=\'Paid\' WHERE sale_id=$1', [sale_id]);
        }

        // TODO: add transaction, profit, COGS, customer history updates as per original
        await client.query('COMMIT');
        return { newRecovered, newStatus };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
export const productResult = async (product_id: string) => {
    const result = await pool.query(
        'SELECT name FROM products WHERE product_id = $1', [product_id]
    );
    if (result.rows.length === 0) throw new Error('Product not found');
    return result.rows[0].name;
}
export const saleInfoResult = async (
    product_id: string,
    quantity: number,
    rate: number,
    total_amount: number,
    account_id: string,
    payment_type: string
) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const status = (payment_type === 'debit') ? 'Pending' : 'Paid';

        const result = await client.query(
            `INSERT INTO sales_info (product_id, quantity, rate, total_amount, account_id, type, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING sale_id`,
            [product_id, quantity, rate, total_amount, account_id, payment_type === 'cash' ? 'Cash' : payment_type, status]
        );

        await client.query('COMMIT');
        return result.rows[0].sale_id;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
export const Insert_Into_sales = async (
    sale_id: string,
    business_id: string,
    customer_id: string
) => {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO sales (sale_id, business_id, customer_id)
             VALUES ($1, $2, $3)`,
            [sale_id, business_id, customer_id]
        );

    } catch (err) {
        throw err;
    } finally {
        client.release();
    }
}
export const cogsResult = async (product_id: string, quantity: number) => {
    try {
        const client = await pool.connect();
        const Result = await client.query(
            `SELECT COALESCE(SUM(pca.amount_per_unit * $1), 0) as total_cogs
                     FROM product_cost_allocation pca
                     WHERE pca.product_id = $2`,
            [quantity, product_id]
        );
        return Result;


    } catch (err) {
        throw err;
    }
}

export const Transaction_result = async (account_id: string, profit: number, product_name: string) => {
    try {
        const client = await pool.connect();
        const transactionResult = await client.query(
            `INSERT INTO transactions (account_id, amount, type, note)
                     VALUES ($1, $2, $3, $4)
                     RETURNING transaction_id`,
            [account_id, profit, 'Incomming', `Profit from sale of ${product_name}`]
        );
        return transactionResult;



    } catch (err) {
        throw err;
    }
}
export const insert_into_business_transactions = async (business_id: string, transaction_id: string) => {
    let client;
    try {
        client = await pool.connect();
        await client.query(
            `INSERT INTO business_transactions (business_id, transaction_id)
             VALUES ($1, $2)`,
            [business_id, transaction_id]
        );
    } catch (err) {
        throw err;
    } finally {
        // Only release the client if it was successfully initialized
        if (client) {
            client.release();
        }
    }
};
export const Update_business_with_profit = async (account_id: string, profit: number) => {
    try {
        const client = await pool.connect();
        await client.query(
            `UPDATE business_account 
                     SET balance = balance + $1 
                     WHERE account_id = $2`,
            [profit, account_id]
        );
    }
    catch (err) {
        throw err;
    }
}

export const decrease_product_stock = async (product_id: string, quantity: number) => {
    let client;
    try {
        client = await pool.connect();
        await client.query(
            `UPDATE products SET stock = stock - $1 WHERE product_id = $2`,
            [quantity, product_id]
        );
    } catch (err) {
        throw err;
    } finally {
        // Only release the client if it was successfully initialized
        if (client) {
            client.release();
        }
    }
};


// ============================================
// NEW IMPLEMENTATION - MIGRATION IN PROGRESS
// ============================================

// Query Functions (Read-only)
export const getProductInfo = async (client: PoolClient, product_id: string) => {
    const result = await client.query(
        'SELECT name, stock FROM products WHERE product_id = $1',
        [product_id]
    );
    if (result.rows.length === 0) throw { status: 404, message: 'Product not found' };
    return result.rows[0];
};

export const getDebitAccountInfo = async (client: PoolClient, sale_id: string) => {
    const result = await client.query(
        'SELECT amount, recovered, customer_id FROM debit_account WHERE sale_id = $1',
        [sale_id]
    );
    if (result.rows.length === 0) throw { status: 404, message: 'Debit account not found' };
    return result.rows[0];
};

export const getDebitAccountId = async (client: PoolClient, business_id: string) => {
    const result = await client.query(
        `SELECT a.account_id FROM accounts a
         JOIN business_account ba ON a.account_id = ba.account_id
         WHERE ba.business_id = $1 AND a.account_name = 'Debit Account'`,
        [business_id]
    );
    if (result.rows.length === 0) throw { status: 404, message: 'Debit Account not found' };
    return result.rows[0].account_id;
};

export const getCostAllocations = async (client: PoolClient, product_id: string) => {
    const result = await client.query(
        `SELECT pca.category_id, pca.amount_per_unit, cc.type, cc.is_recurring
         FROM product_cost_allocation pca
         JOIN cost_categories cc ON pca.category_id = cc.category_id
         WHERE pca.product_id = $1`,
        [product_id]
    );
    return result.rows;
};

export const calculateTotalCOGS = async (client: PoolClient, product_id: string, quantity: number) => {
    const result = await client.query(
        `SELECT COALESCE(SUM(pca.amount_per_unit * $1), 0) as total_cogs
         FROM product_cost_allocation pca
         WHERE pca.product_id = $2`,
        [quantity, product_id]
    );
    return Number(result.rows[0].total_cogs);
};

// Transaction Functions (Write operations)
export const insertSaleInfo = async (
    client: PoolClient,
    product_id: string,
    quantity: number,
    rate: number,
    total_amount: number,
    account_id: string,
    payment_type: string,
    status: string
) => {
    const result = await client.query(
        `INSERT INTO sales_info (product_id, quantity, rate, total_amount, account_id, type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING sale_id`,
        [product_id, quantity, rate, total_amount, account_id, payment_type, status]
    );
    return result.rows[0].sale_id;
};

export const insertSale = async (
    client: PoolClient,
    sale_id: string,
    business_id: string,
    customer_id: string
) => {
    await client.query(
        'INSERT INTO sales (sale_id, business_id, customer_id) VALUES ($1, $2, $3)',
        [sale_id, business_id, customer_id]
    );
};

export const insertDebitAccount = async (
    client: PoolClient,
    customer_id: string,
    sale_id: string,
    amount: number
) => {
    await client.query(
        `INSERT INTO debit_account (customer_id, sale_id, amount, recovered, total, status)
         VALUES ($1, $2, $3, 0, $3, 'Running')`,
        [customer_id, sale_id, amount]
    );
};

export const updateProductStock = async (
    client: PoolClient,
    product_id: string,
    quantity: number
) => {
    await client.query(
        'UPDATE products SET stock = stock - $1 WHERE product_id = $2',
        [quantity, product_id]
    );
};

export const updateBusinessAccountBalance = async (
    client: PoolClient,
    account_id: string,
    amount: number,
    business_id?: string
) => {
    if (business_id) {
        await client.query(
            'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2 AND business_id = $3',
            [amount, account_id, business_id]
        );
    } else {
        await client.query(
            'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
            [amount, account_id]
        );
    }
};

export const insertTransaction = async (
    client: PoolClient,
    account_id: string,
    amount: number,
    type: string,
    note: string
) => {
    const result = await client.query(
        `INSERT INTO transactions (account_id, amount, type, note)
         VALUES ($1, $2, $3, $4) RETURNING transaction_id`,
        [account_id, amount, type, note]
    );
    return result.rows[0].transaction_id;
};

export const insertBusinessTransaction = async (
    client: PoolClient,
    business_id: string,
    transaction_id: string
) => {
    await client.query(
        'INSERT INTO business_transactions (business_id, transaction_id) VALUES ($1, $2)',
        [business_id, transaction_id]
    );
};

export const upsertCustomerPurchaseHistory = async (
    client: PoolClient,
    customer_id: string,
    total_amount: number,
    outstanding_credit: number
) => {
    const existing = await client.query(
        'SELECT customer_id FROM customer_purchase_history WHERE customer_id = $1',
        [customer_id]
    );

    if (existing.rows.length > 0) {
        await client.query(
            `UPDATE customer_purchase_history 
             SET total_purchase = total_purchase + $1,
                 outstanding_credit = outstanding_credit + $2,
                 last_purchase = NOW()
             WHERE customer_id = $3`,
            [total_amount, outstanding_credit, customer_id]
        );
    } else {
        await client.query(
            `INSERT INTO customer_purchase_history (customer_id, total_purchase, outstanding_credit, last_purchase)
             VALUES ($1, $2, $3, NOW())`,
            [customer_id, total_amount, outstanding_credit]
        );
    }
};

export const updateDebitAccountPayment = async (
    client: PoolClient,
    sale_id: string,
    amount: number
) => {
    const debit = await getDebitAccountInfo(client, sale_id);
    const currentAmount = Number(debit.amount);
    const currentRecovered = Number(debit.recovered);
    const remainingDue = currentAmount - currentRecovered;

    if (amount > remainingDue) {
        throw { status: 400, message: `Credit = ${remainingDue}, only ${remainingDue} is due` };
    }

    const newRecovered = currentRecovered + amount;
    const newStatus = newRecovered >= currentAmount ? 'closed' : 'Running';

    await client.query(
        'UPDATE debit_account SET recovered = $1, status = $2 WHERE sale_id = $3',
        [newRecovered, newStatus, sale_id]
    );

    if (newStatus === 'closed') {
        await client.query('UPDATE sales_info SET status = $1 WHERE sale_id = $2', ['Paid', sale_id]);
    }

    return { newRecovered, newStatus, customer_id: debit.customer_id };
};

export const insertPaymentRecord = async (
    client: PoolClient,
    customer_id: string,
    sale_id: string,
    amount: number
) => {
    await client.query(
        'INSERT INTO payments (customer_id, sale_id, amount) VALUES ($1, $2, $3)',
        [customer_id, sale_id, amount]
    );
};

export const updateCustomerOutstandingCredit = async (
    client: PoolClient,
    customer_id: string,
    amount: number
) => {
    await client.query(
        'UPDATE customer_purchase_history SET outstanding_credit = outstanding_credit - $1 WHERE customer_id = $2',
        [amount, customer_id]
    );
};


// ============================================
// ORCHESTRATION FUNCTIONS (Full Transactions)
// ============================================

export const createCashSaleNew = async (
    client: PoolClient,
    business_id: string,
    saleData: {
        customer_id: string;
        product_id: string;
        quantity: number;
        rate: number;
        total_amount: number;
        account_id: string;
        payment_type: string;
    }
) => {
    const { customer_id, product_id, quantity, rate, total_amount, account_id, payment_type } = saleData;

    // Get product name
    const product = await getProductInfo(client, product_id);

    // Insert sale info
    const sale_id = await insertSaleInfo(
        client,
        product_id,
        quantity,
        rate,
        total_amount,
        account_id,
        payment_type === 'cash' ? 'Cash' : payment_type,
        'Paid'
    );

    // Insert sale
    await insertSale(client, sale_id, business_id, customer_id);

    // Calculate COGS and profit
    const totalCogs = await calculateTotalCOGS(client, product_id, quantity);
    const profit = total_amount - totalCogs;

    // Create transaction
    const transaction_id = await insertTransaction(
        client,
        account_id,
        profit,
        'Incomming',
        `Profit from sale of ${product.name}`
    );

    await insertBusinessTransaction(client, business_id, transaction_id);

    // Update business account with profit
    await updateBusinessAccountBalance(client, account_id, profit, business_id);

    // Update product stock
    await updateProductStock(client, product_id, quantity);

    // Process COGS allocation (keep existing logic from controller)
    const costAllocations = await getCostAllocations(client, product_id);
    const currentMonth = new Date().toISOString().slice(0, 7);

    for (const allocation of costAllocations) {
        const totalAmount = allocation.amount_per_unit * quantity;

        if (allocation.type === 'fixed' || allocation.type === 'variable') {
            const existingCogs = await client.query(
                'SELECT account_id FROM cogs_account WHERE category_id = $1 AND business_id = $2',
                [allocation.category_id, business_id]
            );

            if (existingCogs.rows.length > 0) {
                await client.query(
                    'UPDATE cogs_account SET balance = balance + $1 WHERE category_id = $2 AND business_id = $3',
                    [totalAmount, allocation.category_id, business_id]
                );
            } else {
                await client.query(
                    'INSERT INTO cogs_account (category_id, balance, business_id) VALUES ($1, $2, $3)',
                    [allocation.category_id, totalAmount, business_id]
                );
            }
        } else if (allocation.is_recurring) {
            const monthlyRecovery = await client.query(
                'SELECT recovered_amount, target_amount, status FROM monthly_cost_recovery WHERE category_id = $1 AND month = $2',
                [allocation.category_id, currentMonth]
            );

            if (monthlyRecovery.rows.length > 0) {
                const { recovered_amount, target_amount, status } = monthlyRecovery.rows[0];
                const remaining = target_amount - recovered_amount;

                if (remaining > 0 && status !== 'fulfilled') {
                    const amountToAdd = Math.min(totalAmount, remaining);
                    const excessAmount = totalAmount - amountToAdd;

                    await client.query(
                        `UPDATE monthly_cost_recovery 
                         SET recovered_amount = recovered_amount + $1,
                             status = CASE 
                                 WHEN recovered_amount + $1 >= target_amount THEN 'fulfilled'
                                 ELSE 'in_progress'
                             END
                         WHERE category_id = $2 AND month = $3`,
                        [amountToAdd, allocation.category_id, currentMonth]
                    );

                    if (excessAmount > 0) {
                        await client.query(
                            'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
                            [excessAmount, account_id]
                        );
                    }
                } else {
                    await client.query(
                        'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
                        [totalAmount, account_id]
                    );
                }
            }
        } else {
            const assetResult = await client.query(
                'SELECT total_cost, recovered FROM fixed_cost_assets WHERE cateogory_id = $1',
                [allocation.category_id]
            );

            if (assetResult.rows.length > 0) {
                const { total_cost, recovered } = assetResult.rows[0];
                const remaining = total_cost - recovered;

                if (remaining > 0) {
                    const amountToAdd = Math.min(totalAmount, remaining);
                    const excessAmount = totalAmount - amountToAdd;

                    await client.query(
                        'UPDATE fixed_cost_assets SET recovered = recovered + $1 WHERE cateogory_id = $2',
                        [amountToAdd, allocation.category_id]
                    );

                    if (excessAmount > 0) {
                        await client.query(
                            'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
                            [excessAmount, account_id]
                        );
                    }
                } else {
                    await client.query(
                        'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
                        [totalAmount, account_id]
                    );
                }
            }
        }
    }

    // Update customer history
    await upsertCustomerPurchaseHistory(client, customer_id, total_amount, 0);

    return { sale_id, message: 'Sale created successfully' };
};

export const createDebitSaleNew = async (
    client: PoolClient,
    business_id: string,
    saleData: {
        customer_id: string;
        product_id: string;
        quantity: number;
        rate: number;
        total_amount: number;
        account_id: string;
    }
) => {
    const { customer_id, product_id, quantity, rate, total_amount, account_id } = saleData;

    // Insert sale info
    const sale_id = await insertSaleInfo(
        client,
        product_id,
        quantity,
        rate,
        total_amount,
        account_id,
        'debit',
        'Pending'
    );

    // Insert sale
    await insertSale(client, sale_id, business_id, customer_id);

    // Create debit account
    await insertDebitAccount(client, customer_id, sale_id, total_amount);

    // Update Debit Account balance
    const debit_account_id = await getDebitAccountId(client, business_id);
    await updateBusinessAccountBalance(client, debit_account_id, total_amount, business_id);

    // Update product stock
    await updateProductStock(client, product_id, quantity);

    // Update customer history
    await upsertCustomerPurchaseHistory(client, customer_id, total_amount, total_amount);

    return { sale_id, message: 'Sale created successfully' };
};

export const recordDebitPaymentNew = async (
    client: PoolClient,
    sale_id: string,
    amount: number,
    account_id: string,
    business_id: string
) => {
    // Update debit account and get info
    const { customer_id } = await updateDebitAccountPayment(client, sale_id, amount);

    // Record payment
    await insertPaymentRecord(client, customer_id, sale_id, amount);

    // Get product info for transaction
    const saleInfo = await client.query(
        'SELECT product_id, rate FROM sales_info WHERE sale_id = $1',
        [sale_id]
    );
    const { product_id, rate } = saleInfo.rows[0];
    const product = await getProductInfo(client, product_id);
    const quantity = amount / rate;

    // Create transaction
    const transaction_id = await insertTransaction(
        client,
        account_id,
        amount,
        'Incomming',
        `Payment received for ${product.name}`
    );

    await insertBusinessTransaction(client, business_id, transaction_id);

    // Update customer outstanding credit
    await updateCustomerOutstandingCredit(client, customer_id, amount);

    // Decrease Debit Account balance
    const debit_account_id = await getDebitAccountId(client, business_id);
    await updateBusinessAccountBalance(client, debit_account_id, -amount, business_id);

    // Process COGS allocation (keep existing logic from controller)
    const costAllocations = await getCostAllocations(client, product_id);
    const currentMonth = new Date().toISOString().slice(0, 7);
    let totalCOGS = 0;

    for (const allocation of costAllocations) {
        const totalAmount = allocation.amount_per_unit * quantity;
        totalCOGS += totalAmount;

        if (allocation.type === 'fixed' || allocation.type === 'variable') {
            const existingCogs = await client.query(
                'SELECT account_id FROM cogs_account WHERE category_id = $1 AND business_id = $2',
                [allocation.category_id, business_id]
            );

            if (existingCogs.rows.length > 0) {
                await client.query(
                    'UPDATE cogs_account SET balance = balance + $1 WHERE category_id = $2 AND business_id = $3',
                    [totalAmount, allocation.category_id, business_id]
                );
            } else {
                await client.query(
                    'INSERT INTO cogs_account (category_id, balance, business_id) VALUES ($1, $2, $3)',
                    [allocation.category_id, totalAmount, business_id]
                );
            }
        } else if (allocation.is_recurring) {
            const monthlyRecovery = await client.query(
                'SELECT recovered_amount, target_amount, status FROM monthly_cost_recovery WHERE category_id = $1 AND month = $2',
                [allocation.category_id, currentMonth]
            );

            if (monthlyRecovery.rows.length > 0) {
                const { recovered_amount, target_amount, status } = monthlyRecovery.rows[0];
                const remaining = target_amount - recovered_amount;

                if (remaining > 0 && status !== 'fulfilled') {
                    const amountToAdd = Math.min(totalAmount, remaining);

                    await client.query(
                        `UPDATE monthly_cost_recovery 
                         SET recovered_amount = recovered_amount + $1,
                             status = CASE 
                                 WHEN recovered_amount + $1 >= target_amount THEN 'fulfilled'
                                 ELSE 'in_progress'
                             END
                         WHERE category_id = $2 AND month = $3`,
                        [amountToAdd, allocation.category_id, currentMonth]
                    );
                }
            }
        } else {
            const assetResult = await client.query(
                'SELECT total_cost, recovered FROM fixed_cost_assets WHERE cateogory_id = $1',
                [allocation.category_id]
            );

            if (assetResult.rows.length > 0) {
                const { total_cost, recovered } = assetResult.rows[0];
                const remaining = total_cost - recovered;

                if (remaining > 0) {
                    const amountToAdd = Math.min(totalAmount, remaining);
                    await client.query(
                        'UPDATE fixed_cost_assets SET recovered = recovered + $1 WHERE cateogory_id = $2',
                        [amountToAdd, allocation.category_id]
                    );
                }
            }
        }
    }

    // Calculate net amount and update payment account
    const netAmountToCash = amount - totalCOGS;
    await updateBusinessAccountBalance(client, account_id, netAmountToCash, business_id);

    return { message: 'Payment recorded successfully' };
};
