import { Request, Response } from 'express';
import pool from '../db';

export const getSales = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;
        const { status, product, date_from, date_to, page = 1, limit = 20 } = req.query;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

        let whereClause = 'WHERE s.business_id = $1';
        const queryParams = [business_id];
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

        // Get total count
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
        const totalPages = Math.ceil(totalSales / parseInt(limit as string));

        // Add pagination to query params
        paramCount++;
        const limitParam = `$${paramCount}`;
        queryParams.push(limit);

        paramCount++;
        const offsetParam = `$${paramCount}`;
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
            LIMIT ${limitParam} OFFSET ${offsetParam}`,
            queryParams
        );

        const sales = salesResult.rows.map(row => ({
            ...row,
            status: row.status === 'Pending' ? 'Pending' : 'Paid',
            total: row.payment_type === 'debit' && row.recovered !== null
                ? `${row.recovered}/${row.amount_due}`
                : row.total
        }));

        res.json({
            sales,
            pagination: {
                currentPage: parseInt(page as string),
                totalPages,
                totalSales,
                limit: parseInt(limit as string)
            }
        });
    } catch (error: any) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const addSale = async (req: Request, res: Response) => {
    try {
        const { customer_id, total_amount, payment_type, account_id, product_id, rate, quantity } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        if (!customer_id) {
            return res.status(400).json({ message: 'Customer selection is required' });
        }

        if (parseFloat(rate) < 0) {
            return res.status(400).json({ message: 'Rate cannot be negative' });
        }

        if (parseInt(quantity) < 0) {
            return res.status(400).json({ message: 'Quantity cannot be negative' });
        }

        // Get business_id from business_users table
        const businessResult = await pool.query(
            'SELECT business_id FROM business_users WHERE user_id = $1',
            [user_id]
        );

        if (businessResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not associated with any business' });
        }

        const business_id = businessResult.rows[0].business_id;

        // Get product name for transaction note
        const productResult = await pool.query(
            'SELECT name FROM products WHERE product_id = $1',
            [product_id]
        );

        if (productResult.rows.length === 0) {
            return res.status(400).json({ message: 'Product not found' });
        }

        const product_name = productResult.rows[0].name;

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Payment type received:', payment_type);
            console.log('Payment type check:', payment_type === 'debit');

            // Determine status based on payment type
            const status = (payment_type === 'debit') ? 'Pending' : 'Paid';

            // Insert into sales_info
            const saleInfoResult = await client.query(
                `INSERT INTO sales_info (product_id, quantity, rate, total_amount, account_id, type, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING sale_id`,
                [product_id, quantity, rate, total_amount, account_id, payment_type === 'cash' ? 'Cash' : payment_type, status]
            );

            const sale_id = saleInfoResult.rows[0].sale_id;

            // Insert into sales table (sales_id + business_id + customer_id)
            await client.query(
                `INSERT INTO sales (sale_id, business_id, customer_id)
                 VALUES ($1, $2, $3)`,
                [sale_id, business_id, customer_id]

            );
            console.log('Inserted into sales_info and sales tables with sale_id:', sale_id);

            // Insert into transactions table (only for non-debit payments)
            if (payment_type !== 'debit') {
                // Calculate total COGS for this sale
                const cogsResult = await client.query(
                    `SELECT COALESCE(SUM(pca.amount_per_unit * $1), 0) as total_cogs
                     FROM product_cost_allocation pca
                     WHERE pca.product_id = $2`,
                    [quantity, product_id]
                );

                const totalCogs = parseFloat(cogsResult.rows[0].total_cogs);
                const profit = parseFloat(total_amount) - totalCogs;

                const transactionResult = await client.query(
                    `INSERT INTO transactions (account_id, amount, type, note)
                     VALUES ($1, $2, $3, $4)
                     RETURNING transaction_id`,
                    [account_id, profit, 'Incomming', `Profit from sale of ${product_name}`]
                );

                // Insert into business_transactions
                await client.query(
                    `INSERT INTO business_transactions (transaction_id, business_id)
                     VALUES ($1, $2)`,
                    [transactionResult.rows[0].transaction_id, business_id]
                );

                // Update business account balance with profit only
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance + $1 
                     WHERE account_id = $2`,
                    [profit, account_id]
                );
            }

            // Decrease product stock
            await client.query(
                `UPDATE products SET stock = stock - $1 WHERE product_id = $2`,
                [quantity, product_id]
            );

            // Process COGS allocation (skip for debit sales)
            if (payment_type !== 'debit') {
                const costAllocations = await client.query(
                    `SELECT pca.category_id, pca.amount_per_unit, cc.type, cc.is_recurring
                     FROM product_cost_allocation pca
                     JOIN cost_categories cc ON pca.category_id = cc.category_id
                     WHERE pca.product_id = $1`,
                    [product_id]
                );

                const currentMonth = new Date().toISOString().slice(0, 7);

                for (const allocation of costAllocations.rows) {
                    const totalAmount = allocation.amount_per_unit * quantity;

                    if (allocation.type === 'fixed' || allocation.type === 'variable') {
                        // Update or insert into cogs_account
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
                        // Handle monthly recurring costs (rent, loan interest)
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
                        // Update fixed_cost_assets recovered amount (with limit check)
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

                                // Update asset recovery
                                await client.query(
                                    'UPDATE fixed_cost_assets SET recovered = recovered + $1 WHERE cateogory_id = $2',
                                    [amountToAdd, allocation.category_id]
                                );

                                // Add excess back to the payment account (cash/bank)
                                if (excessAmount > 0) {
                                    await client.query(
                                        'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
                                        [excessAmount, account_id]
                                    );
                                }
                            } else {
                                // Asset fully recovered, add all amount back to payment account
                                await client.query(
                                    'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2',
                                    [totalAmount, account_id]
                                );
                            }
                        }
                    }
                }
            }

            // If payment type is debit, create debit_account entry and update Debit balance
            if (payment_type === 'debit') {
                console.log('Here running 1');
                await client.query(
                    `INSERT INTO debit_account (customer_id, sale_id, amount, recovered, total, status)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [customer_id, sale_id, total_amount, 0, total_amount, 'Running']

                );

                const debitAccountResult = await client.query(
                    `SELECT a.account_id
                    FROM accounts a
                    JOIN business_account ba ON a.account_id = ba.account_id
                    WHERE ba.business_id = $1
                    AND a.account_name = 'Debit Account'`,
                    [business_id]
                );
                console.log('Debit account result:', debitAccountResult.rows);


                // Increase Debit account balance (accounts receivable)
                if (debitAccountResult.rows.length > 0) {
                    const debit_account_id = debitAccountResult.rows[0].account_id;

                    await client.query(
                        `UPDATE business_account 
                         SET balance = balance + $1 
                         WHERE account_id = $2 AND business_id = $3`,
                        [total_amount, debit_account_id, business_id]
                    );
                    console.log('total_amount:', total_amount, 'debit_account_id:', debit_account_id, 'business_id:', business_id);
                }
            }

            // Update customer purchase history
            const existingHistory = await client.query(
                'SELECT customer_id FROM customer_purchase_history WHERE customer_id = $1',
                [customer_id]
            );

            if (existingHistory.rows.length > 0) {
                // Update existing record
                await client.query(
                    `UPDATE customer_purchase_history 
                     SET total_purchase = total_purchase + $1,
                         outstanding_credit = outstanding_credit + $2,
                         last_purchase = NOW()
                     WHERE customer_id = $3`,
                    [total_amount, payment_type === 'debit' ? total_amount : 0, customer_id]
                );
            } else {
                // Insert new record
                await client.query(
                    `INSERT INTO customer_purchase_history (customer_id, total_purchase, outstanding_credit, last_purchase)
                     VALUES ($1, $2, $3, NOW())`,
                    [customer_id, total_amount, payment_type === 'debit' ? total_amount : 0]
                );
            }

            await client.query('COMMIT');
            res.status(201).json({ sale_id, message: 'Sale created successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error adding sale:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const recordPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, account_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current debit account info
            const debitResult = await client.query(
                'SELECT amount, recovered, total FROM debit_account WHERE sale_id = $1',
                [id]
            );

            if (debitResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Debit account not found' });
            }

            const currentAmount = parseFloat(debitResult.rows[0].amount);
            const currentRecovered = parseFloat(debitResult.rows[0].recovered);
            const remainingDue = currentAmount - currentRecovered;

            if (amount > remainingDue) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: `Credit = ${remainingDue}, only ${remainingDue} is due`
                });
            }

            // Update debit account
            const newRecovered = currentRecovered + amount;
            const newStatus = newRecovered >= currentAmount ? 'closed' : 'Running';

            await client.query(
                `UPDATE debit_account 
                 SET recovered = $1, status = $2
                 WHERE sale_id = $3`,
                [newRecovered, newStatus, id]
            );

            // Update sales_info status if fully paid
            if (newStatus === 'closed') {
                await client.query(
                    `UPDATE sales_info SET status = 'Paid' WHERE sale_id = $1`,
                    [id]
                );
            }

            // Record payment
            await client.query(
                `INSERT INTO payments (customer_id, sale_id, amount)
                 VALUES ((SELECT customer_id FROM debit_account WHERE sale_id = $1), $1, $2)`,
                [id, amount]
            );

            // Get business_id and product info
            const businessResult = await client.query(
                'SELECT business_id FROM business_users WHERE user_id = $1',
                [req.user?.id]
            );
            const business_id = businessResult.rows[0]?.business_id;

            const productResult = await client.query(
                `SELECT p.name FROM products p 
                 INNER JOIN sales_info si ON p.product_id = si.product_id 
                 WHERE si.sale_id = $1`,
                [id]
            );
            const productName = productResult.rows[0]?.name || 'product';

            // Create transaction record
            const transactionResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, note)
                 VALUES ($1, $2, $3, $4)
                 RETURNING transaction_id`,
                [account_id, amount, 'Incomming', `Payment received for ${productName}`]
            );

            await client.query(
                `INSERT INTO business_transactions (transaction_id, business_id)
                 VALUES ($1, $2)`,
                [transactionResult.rows[0].transaction_id, business_id]
            );

            // Update customer purchase history - reduce outstanding credit
            await client.query(
                `UPDATE customer_purchase_history 
                 SET outstanding_credit = outstanding_credit - $1
                 WHERE customer_id = (SELECT customer_id FROM debit_account WHERE sale_id = $2)`,
                [amount, id]
            );

            // Find Debit account_id
            const debitAccountResult = await client.query(
                `SELECT a.account_id
                    FROM accounts a
                    JOIN business_account ba ON a.account_id = ba.account_id
                    WHERE ba.business_id = $1
                    AND a.account_name = 'Debit Account'`,
                [business_id]
            );

            if (debitAccountResult.rows.length > 0) {
                const debit_account_id = debitAccountResult.rows[0].account_id;

                // Decrease Debit account balance (accounts receivable)
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance - $1 
                     WHERE account_id = $2 AND business_id = $3`,
                    [amount, debit_account_id, business_id]
                );
            }

            // Process COGS for debit payment and calculate total COGS
            let totalCOGS = 0;
            const saleInfoResult = await client.query(
                'SELECT product_id, rate FROM sales_info WHERE sale_id = $1',
                [id]
            );

            if (saleInfoResult.rows.length > 0) {
                const { product_id, rate } = saleInfoResult.rows[0];
                const quantity = amount / rate; // Calculate quantity based on payment amount

                // Get cost allocations for this product
                const costAllocations = await client.query(
                    `SELECT pca.category_id, pca.amount_per_unit, cc.type, cc.is_recurring
                     FROM product_cost_allocation pca
                     JOIN cost_categories cc ON pca.category_id = cc.category_id
                     WHERE pca.product_id = $1`,
                    [product_id]
                );

                const currentMonth = new Date().toISOString().slice(0, 7);

                for (const allocation of costAllocations.rows) {
                    const totalAmount = allocation.amount_per_unit * quantity;
                    totalCOGS += totalAmount; // Accumulate total COGS

                    if (allocation.type === 'fixed' || allocation.type === 'variable') {
                        // Update or insert into cogs_account
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
                        // Handle monthly recurring costs
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
                        // Update fixed_cost_assets recovered amount (with limit check)
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
            }


            // Calculate net amount after COGS deduction
            const netAmountToCash = amount - totalCOGS;

            // Increase payment account balance with NET amount (after COGS deduction)
            await client.query(
                `UPDATE business_account 
                 SET balance = balance + $1 
                 WHERE account_id = $2 AND business_id = $3`,
                [netAmountToCash, account_id, business_id]
            );
            await client.query('COMMIT');
            res.json({ message: 'Payment recorded successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error recording payment:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
