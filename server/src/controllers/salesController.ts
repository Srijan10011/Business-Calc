import { Request, Response } from 'express';
import pool from '../db';

export const getSales = async (req: Request, res: Response) => {
    try {
        const user_id = req.user?.id;

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

        const salesResult = await pool.query(
            `SELECT 
                si.sale_id,
                ci.created_at as date,
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
            WHERE s.business_id = $1
            ORDER BY si.sale_id DESC`,
            [business_id]
        );

        const sales = salesResult.rows.map(row => ({
            ...row,
            status: row.status === 'Pending' ? 'Pending' : 'Paid',
            total: row.payment_type === 'debit' && row.recovered !== null 
                ? `${row.recovered}/${row.amount_due}` 
                : row.total
        }));

        res.json(sales);
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

            // Insert into transactions table (only for non-debit payments)
            if (payment_type !== 'debit') {
                const transactionResult = await client.query(
                    `INSERT INTO transactions (account_id, amount, type, note)
                     VALUES ($1, $2, $3, $4)
                     RETURNING transaction_id`,
                    [account_id, total_amount, 'Incomming', `Sale of product ${product_name}`]
                );

                // Insert into business_transactions
                await client.query(
                    `INSERT INTO business_transactions (transaction_id, business_id)
                     VALUES ($1, $2)`,
                    [transactionResult.rows[0].transaction_id, business_id]
                );

                // Update business account balance
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance + $1 
                     WHERE account_id = $2`,
                    [total_amount, account_id]
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
                    `SELECT pca.category_id, pca.amount_per_unit, cc.type 
                     FROM product_cost_allocation pca
                     JOIN cost_categories cc ON pca.category_id = cc.category_id
                     WHERE pca.product_id = $1`,
                    [product_id]
                );

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

            // If payment type is debit, create debit account entry and update balance
            if (payment_type === 'debit') {
                await client.query(
                    `INSERT INTO debit_account (customer_id, sale_id, amount, recovered, total, status)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [customer_id, sale_id, total_amount, 0, total_amount, 'Running']
                );

                // Update debit account balance (increase for amount owed)
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance + $1 
                     WHERE account_id = $2`,
                    [total_amount, account_id]
                );
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

            // Add transaction entry for installment payment
            const productResult = await client.query(
                `SELECT p.name FROM products p 
                 INNER JOIN sales_info si ON p.product_id = si.product_id 
                 WHERE si.sale_id = $1`,
                [id]
            );
            
            const productName = productResult.rows[0]?.name || 'Unknown Product';
            
            const transactionResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, note)
                 VALUES ($1, $2, $3, $4)
                 RETURNING transaction_id`,
                [account_id, amount, 'Incomming', `Sale of ${productName} installment`]
            );

            // Insert into business_transactions
            const businessResult = await client.query(
                'SELECT business_id FROM business_users WHERE user_id = $1',
                [req.user?.id]
            );
            const business_id = businessResult.rows[0]?.business_id;

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

            // Update business account balance for installment payment
            await client.query(
                `UPDATE business_account 
                 SET balance = balance + $1 
                 WHERE account_id = $2`,
                [amount, account_id]
            );

            // Reduce debit account balance since customer owes less
            const debitAccountResult = await client.query(
                'SELECT account_id FROM sales_info WHERE sale_id = $1',
                [id]
            );
            const debit_account_id = debitAccountResult.rows[0]?.account_id;

            if (debit_account_id) {
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance - $1 
                     WHERE account_id = $2`,
                    [amount, debit_account_id]
                );
            }

            // Process COGS for debit payment
            const saleInfoResult = await client.query(
                'SELECT product_id, rate FROM sales_info WHERE sale_id = $1',
                [id]
            );
            
            if (saleInfoResult.rows.length > 0) {
                const { product_id, rate } = saleInfoResult.rows[0];
                const quantity = amount / rate; // Calculate quantity based on payment amount

                // Get cost allocations for this product
                const costAllocations = await client.query(
                    `SELECT pca.category_id, pca.amount_per_unit, cc.type 
                     FROM product_cost_allocation pca
                     JOIN cost_categories cc ON pca.category_id = cc.category_id
                     WHERE pca.product_id = $1`,
                    [product_id]
                );

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
