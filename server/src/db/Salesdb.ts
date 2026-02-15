import pool from '../db';

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
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE s.business_id = $1';
    const queryParams = [business_id];
    let paramCount = 1;

    if (filters.status) {
        paramCount++; whereClause += ` AND si.status = $${paramCount}`;
        queryParams.push(filters.status);
    }
    if (filters.product) {
        paramCount++; whereClause += ` AND p.product_id = $${paramCount}`;
        queryParams.push(filters.product.toString());
    }
    if (filters.date_from) {
        paramCount++; whereClause += ` AND DATE(si.created_at) >= $${paramCount}`;
        queryParams.push(filters.date_from);
    }
    if (filters.date_to) {
        paramCount++; whereClause += ` AND DATE(si.created_at) <= $${paramCount}`;
        queryParams.push(filters.date_to);
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

    const totalSales = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalSales / limit);

    paramCount++; queryParams.push(limit.toString());
    paramCount++; queryParams.push(offset.toString());

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
        total: row.payment_type === 'debit' && row.recovered !== null 
            ? `${row.recovered}/${row.amount_due}` 
            : row.total
    }));

    return { sales, totalSales, totalPages };
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
