import { Request, Response } from 'express';
import logger from '../utils/logger';
import pool from '../db';

export const addInventoryItem = async (req: Request, res: Response) => {
    try {
        const { name, stock, unit_cost, type, payment_account, total_amount, party_name } = req.body;
        const user_id = req.user?.id;

        if (!name || stock === undefined || unit_cost === undefined || !type) {
            return res.status(400).json({ message: 'Missing required fields: name, stock, unit_cost, type' });
        }

        if (parseInt(stock) < 0) {
            return res.status(400).json({ message: 'Stock cannot be negative' });
        }

        if (parseFloat(unit_cost) < 0) {
            return res.status(400).json({ message: 'Unit cost cannot be negative' });
        }

        const dbType = type === 'raw_material' ? 'Raw_material' : 'Other';

        if (!['Raw_material', 'Other'].includes(dbType)) {
            return res.status(400).json({ message: 'Invalid type. Must be Raw_material or Other' });
        }

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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert into inventory_info
            const inventoryResult = await client.query(
                `INSERT INTO inventory_info (name, stock, type, unit_cost)
                 VALUES ($1, $2, $3, $4)
                 RETURNING inventory_id, name, stock, type, unit_cost`,
                [name, stock, dbType, unit_cost]
            );

            const inventory_id = inventoryResult.rows[0].inventory_id;
            const total_cost = parseFloat(stock) * parseFloat(unit_cost);

            // Create inventory log entry
            await client.query(
                `INSERT INTO inventory_logs (type, amount, previous_stock, new_stock, total_cost, add_to_recover, inventory_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['Incomming', stock, 0, stock, total_cost, 0, inventory_id]
            );

            // Link to business in business_inventory
            await client.query(
                `INSERT INTO business_inventory (inventory_id, business_id)
                 VALUES ($1, $2)`,
                [inventory_id, business_id]
            );

            // Handle payment if not skipped
            if (payment_account && total_amount > 0) {
                // Check if it's credit account
                const accountResult = await client.query(
                    'SELECT account_name FROM accounts WHERE account_id = $1',
                    [payment_account]
                );
                
                const isCredit = accountResult.rows[0]?.account_name?.toLowerCase().includes('credit');

                // Check balance for non-credit accounts
                if (!isCredit) {
                    const balanceResult = await client.query(
                        'SELECT balance, account_name FROM business_account ba JOIN accounts a ON ba.account_id = a.account_id WHERE ba.account_id = $1 AND ba.business_id = $2',
                        [payment_account, business_id]
                    );

                    if (balanceResult.rows.length === 0) {
                        await client.query('ROLLBACK');
                        return res.status(404).json({ message: 'Account not found' });
                    }

                    const { balance, account_name } = balanceResult.rows[0];
                    if (parseFloat(balance) < parseFloat(total_amount)) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ 
                            message: `Insufficient balance in ${account_name}. Available: ₹${parseFloat(balance).toLocaleString('en-IN')}, Required: ₹${parseFloat(total_amount).toLocaleString('en-IN')}`
                        });
                    }
                }

                // Create expense transaction
                const transactionResult = await client.query(
                    `INSERT INTO transactions (account_id, amount, type, note)
                     VALUES ($1, $2, $3, $4)
                     RETURNING transaction_id`,
                    [payment_account, total_amount, 'Outgoing', `Purchase of inventory: ${name}`]
                );

                // Link to business
                await client.query(
                    `INSERT INTO business_transactions (transaction_id, business_id)
                     VALUES ($1, $2)`,
                    [transactionResult.rows[0].transaction_id, business_id]
                );

                // Update account balance (add for credit, subtract for cash/bank)
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance ${isCredit ? '+' : '-'} $1 
                     WHERE account_id = $2`,
                    [total_amount, payment_account]
                );

                // Create credit payable record if credit account
                if (isCredit && party_name) {
                    await client.query(
                        `INSERT INTO credit_payables (business_id, party_name, total_amount)
                         VALUES ($1, $2, $3)`,
                        [business_id, party_name, total_amount]
                    );
                }
            }

            await client.query('COMMIT');
            res.status(201).json(inventoryResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        logger.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const getInventoryItems = async (req: Request, res: Response) => {
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

        const result = await pool.query(
            `SELECT ii.inventory_id as id, ii.name, ii.stock, ii.type, ii.unit_cost
             FROM inventory_info ii
             INNER JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
             WHERE bi.business_id = $1
             ORDER BY ii.name`,
            [business_id]
        );

        res.json(result.rows);
    } catch (error: any) {
        logger.error('Error fetching inventory items:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};

export const updateInventoryStock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { quantity, operation, payment_account, total_amount, party_name } = req.body;
        const user_id = req.user?.id;

        if (!quantity || !operation) {
            return res.status(400).json({ message: 'Missing required fields: quantity, operation' });
        }

        if (parseInt(quantity) < 0) {
            return res.status(400).json({ message: 'Quantity cannot be negative' });
        }

        if (!['in', 'out'].includes(operation)) {
            return res.status(400).json({ message: 'Invalid operation. Must be in or out' });
        }

        // Validation for stock in operations
        if (operation === 'in' && total_amount > 0 && !payment_account) {
            return res.status(400).json({ message: 'Payment account is required for stock in operations unless payment is skipped' });
        }

        // Validation for credit account requiring party name
        if (operation === 'in' && payment_account && total_amount > 0) {
            const accountResult = await pool.query(
                'SELECT account_name FROM accounts WHERE account_id = $1',
                [payment_account]
            );
            
            const isCredit = accountResult.rows[0]?.account_name?.toLowerCase().includes('credit');
            if (isCredit && !party_name) {
                return res.status(400).json({ message: 'Party name is required for credit transactions' });
            }
        }

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

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current stock and unit cost
            const currentResult = await client.query(
                `SELECT ii.stock, ii.unit_cost, ii.name
                 FROM inventory_info ii
                 INNER JOIN business_inventory bi ON ii.inventory_id = bi.inventory_id
                 WHERE ii.inventory_id = $1 AND bi.business_id = $2`,
                [id, business_id]
            );

            if (currentResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Inventory item not found' });
            }

            const { stock: currentStock, unit_cost, name } = currentResult.rows[0];
            const stockChange = operation === 'in' ? parseInt(quantity) : -parseInt(quantity);
            const newStock = parseInt(currentStock) + stockChange;

            if (newStock < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Insufficient stock' });
            }

            // Update stock
            const updateResult = await client.query(
                `UPDATE inventory_info 
                 SET stock = $1 
                 WHERE inventory_id = $2
                 RETURNING inventory_id, name, stock, type, unit_cost`,
                [newStock, id]
            );

            // Handle payment for stock in operations
            if (operation === 'in' && payment_account && total_amount > 0) {
                // Check if it's credit account
                const accountResult = await client.query(
                    'SELECT account_name FROM accounts WHERE account_id = $1',
                    [payment_account]
                );
                
                const isCredit = accountResult.rows[0]?.account_name?.toLowerCase().includes('credit');

                // Check balance for non-credit accounts
                if (!isCredit) {
                    const balanceResult = await client.query(
                        'SELECT balance, account_name FROM business_account ba JOIN accounts a ON ba.account_id = a.account_id WHERE ba.account_id = $1 AND ba.business_id = $2',
                        [payment_account, business_id]
                    );

                    if (balanceResult.rows.length === 0) {
                        await client.query('ROLLBACK');
                        return res.status(404).json({ message: 'Account not found' });
                    }

                    const { balance, account_name } = balanceResult.rows[0];
                    if (parseFloat(balance) < parseFloat(total_amount)) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ 
                            message: `Insufficient balance in ${account_name}. Available: ₹${parseFloat(balance).toLocaleString('en-IN')}, Required: ₹${parseFloat(total_amount).toLocaleString('en-IN')}`
                        });
                    }
                }

                // Create expense transaction
                const transactionResult = await client.query(
                    `INSERT INTO transactions (account_id, amount, type, note)
                     VALUES ($1, $2, $3, $4)
                     RETURNING transaction_id`,
                    [payment_account, total_amount, 'Outgoing', `Stock in payment for ${name}`]
                );

                // Link to business
                await client.query(
                    `INSERT INTO business_transactions (transaction_id, business_id)
                     VALUES ($1, $2)`,
                    [transactionResult.rows[0].transaction_id, business_id]
                );

                // Update account balance (add for credit, subtract for cash/bank)
                await client.query(
                    `UPDATE business_account 
                     SET balance = balance ${isCredit ? '+' : '-'} $1 
                     WHERE account_id = $2`,
                    [total_amount, payment_account]
                );

                // Handle credit payable for stock in
                if (isCredit && party_name) {
                    logger.info('Creating credit payable for:', party_name, 'amount:', total_amount);
                    
                    // Check if payable already exists for this party
                    const existingPayable = await client.query(
                        'SELECT payable_id, total_amount, paid_amount FROM credit_payables WHERE business_id = $1 AND party_name = $2 AND status != $3',
                        [business_id, party_name, 'Paid']
                    );

                    logger.info('Existing payable found:', existingPayable.rows.length);

                    if (existingPayable.rows.length > 0) {
                        // Add to existing payable
                        await client.query(
                            'UPDATE credit_payables SET total_amount = total_amount + $1 WHERE payable_id = $2',
                            [total_amount, existingPayable.rows[0].payable_id]
                        );
                        logger.info('Updated existing payable');
                    } else {
                        // Create new payable
                        const newPayableResult = await client.query(
                            `INSERT INTO credit_payables (business_id, party_name, total_amount)
                             VALUES ($1, $2, $3) RETURNING payable_id`,
                            [business_id, party_name, total_amount]
                        );
                        logger.info('Created new payable with ID:', newPayableResult.rows[0].payable_id);
                    }
                } else {
                    logger.info('Credit payable not created - isCredit:', isCredit, 'party_name:', party_name);
                }
            }

            // Log the transaction
            const logType = operation === 'in' ? 'Incomming' : 'Outgoing';
            const totalCost = parseInt(quantity) * parseFloat(unit_cost);
            const addToRecover = operation === 'in' ? totalCost : 0;

            await client.query(
                `INSERT INTO inventory_logs (type, amount, previous_stock, new_stock, total_cost, add_to_recover, inventory_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [logType, parseInt(quantity), parseInt(currentStock), newStock, totalCost, addToRecover, id]
            );

            await client.query('COMMIT');
            res.json(updateResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        logger.error('Error updating inventory stock:', error);
        res.status(500).json({ message: 'Server error', error: error?.message });
    }
};
