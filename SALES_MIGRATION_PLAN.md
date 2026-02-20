# Sales Module Migration Plan - Option B (Incremental)

## Strategy: Comment-Out & Rebuild Approach

Your approach is perfect for zero-downtime migration:
1. Keep old code commented out (as backup)
2. Write new clean code below
3. Test new code thoroughly
4. Once stable, remove commented code
5. Business continues running throughout

---

## Phase 1: Extract COGS Service (Week 1, Day 1-2)

### Step 1.1: Create COGS Service Module
**File:** `src/services/cogsService.ts` (NEW FILE)

**Action:**
```typescript
// New file - no conflicts
// Extract the COGS allocation logic into reusable functions
```

**Functions to create:**
- `processCOGSAllocation(client, product_id, quantity, business_id, account_id)`
- `allocateToFixedVariable(client, allocation, totalAmount, business_id)`
- `allocateToMonthlyRecurring(client, allocation, totalAmount, currentMonth, account_id)`
- `allocateToFixedAssets(client, allocation, totalAmount, account_id)`

**Testing:**
- Unit tests for each function
- Test with sample data
- Verify calculations match old logic

**Risk:** LOW - New file, no impact on existing code

---

## Phase 2: Refactor Salesdb.ts (Week 1, Day 3-4)

### Step 2.1: Add New Query Functions (Bottom of file)

**File:** `server/src/db/Salesdb.ts`

**Action:**
```typescript
// ============================================
// NEW IMPLEMENTATION - MIGRATION IN PROGRESS
// ============================================

// Query Functions (Read-only)
export const getDebitAccountBySaleId = async (client: PoolClient, sale_id: string) => {
    const result = await client.query(
        'SELECT amount, recovered, total, customer_id FROM debit_account WHERE sale_id = $1',
        [sale_id]
    );
    if (result.rows.length === 0) throw new Error('Debit account not found');
    return result.rows[0];
};

export const getProductById = async (client: PoolClient, product_id: string) => {
    const result = await client.query(
        'SELECT name, stock FROM products WHERE product_id = $1',
        [product_id]
    );
    if (result.rows.length === 0) throw new Error('Product not found');
    return result.rows[0];
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

export const getDebitAccountId = async (client: PoolClient, business_id: string) => {
    const result = await client.query(
        `SELECT a.account_id
         FROM accounts a
         JOIN business_account ba ON a.account_id = ba.account_id
         WHERE ba.business_id = $1 AND a.account_name = 'Debit Account'`,
        [business_id]
    );
    if (result.rows.length === 0) throw new Error('Debit Account not found');
    return result.rows[0].account_id;
};

// ... more query functions
```

**Keep old functions commented:**
```typescript
// OLD IMPLEMENTATION - TO BE REMOVED AFTER MIGRATION
// export const productResult = async (product_id: string) => { ... }
// export const cogsResult = async (product_id: string, quantity: number) => { ... }
```

**Testing:**
- Test each query function independently
- Verify return types
- Check error handling

**Risk:** LOW - New functions, old code still works

---

### Step 2.2: Add Transaction Helper Functions

**File:** `server/src/db/Salesdb.ts` (continue at bottom)

**Action:**
```typescript
// Transaction Functions (Write operations - accept client)
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
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING sale_id`,
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
        `INSERT INTO sales (sale_id, business_id, customer_id)
         VALUES ($1, $2, $3)`,
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
    business_id: string
) => {
    await client.query(
        'UPDATE business_account SET balance = balance + $1 WHERE account_id = $2 AND business_id = $3',
        [amount, account_id, business_id]
    );
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
         VALUES ($1, $2, $3, $4)
         RETURNING transaction_id`,
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
        `INSERT INTO business_transactions (business_id, transaction_id)
         VALUES ($1, $2)`,
        [business_id, transaction_id]
    );
};

export const upsertCustomerPurchaseHistory = async (
    client: PoolClient,
    customer_id: string,
    total_amount: number,
    outstanding_credit: number
) => {
    await client.query(
        `INSERT INTO customer_purchase_history (customer_id, total_purchase, outstanding_credit, last_purchase)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (customer_id) 
         DO UPDATE SET 
            total_purchase = customer_purchase_history.total_purchase + $2,
            outstanding_credit = customer_purchase_history.outstanding_credit + $3,
            last_purchase = NOW()`,
        [customer_id, total_amount, outstanding_credit]
    );
};

export const updateDebitAccountPayment = async (
    client: PoolClient,
    sale_id: string,
    amount: number
) => {
    const debit = await getDebitAccountBySaleId(client, sale_id);
    const newRecovered = Number(debit.recovered) + amount;
    const newStatus = newRecovered >= Number(debit.amount) ? 'closed' : 'Running';

    await client.query(
        'UPDATE debit_account SET recovered = $1, status = $2 WHERE sale_id = $3',
        [newRecovered, newStatus, sale_id]
    );

    if (newStatus === 'closed') {
        await client.query(
            'UPDATE sales_info SET status = $1 WHERE sale_id = $2',
            ['Paid', sale_id]
        );
    }

    return { newRecovered, newStatus };
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
```

**Testing:**
- Test each function with mock client
- Verify SQL correctness
- Check parameter types

**Risk:** LOW - New functions, isolated

---

### Step 2.3: Add Orchestration Functions

**File:** `server/src/db/Salesdb.ts` (continue at bottom)

**Action:**
```typescript
// ============================================
// ORCHESTRATION FUNCTIONS (Full Transactions)
// ============================================

export const createCashSale = async (
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

    // Get product info
    const product = await getProductById(client, product_id);

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
    const totalCOGS = await processCOGSAllocation(
        client,
        product_id,
        quantity,
        business_id,
        account_id
    );

    const profit = total_amount - totalCOGS;

    // Create transaction record
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

    // Update customer history
    await upsertCustomerPurchaseHistory(client, customer_id, total_amount, 0);

    return { sale_id, message: 'Sale created successfully' };
};

export const createDebitSale = async (
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

    // Create debit account entry
    await insertDebitAccount(client, customer_id, sale_id, total_amount);

    // Update Debit Account balance
    const debit_account_id = await getDebitAccountId(client, business_id);
    await updateBusinessAccountBalance(client, debit_account_id, total_amount, business_id);

    // Update product stock
    await updateProductStock(client, product_id, quantity);

    // Update customer history
    await upsertCustomerPurchaseHistory(client, customer_id, total_amount, total_amount);

    return { sale_id, message: 'Debit sale created successfully' };
};

export const recordDebitPaymentNew = async (
    client: PoolClient,
    sale_id: string,
    amount: number,
    account_id: string,
    business_id: string
) => {
    // Get debit info
    const debit = await getDebitAccountBySaleId(client, sale_id);
    const remainingDue = Number(debit.amount) - Number(debit.recovered);

    if (amount > remainingDue) {
        throw { status: 400, message: `Credit = ${remainingDue}, only ${remainingDue} is due` };
    }

    // Update debit account
    const { newRecovered, newStatus } = await updateDebitAccountPayment(client, sale_id, amount);

    // Record payment
    await insertPaymentRecord(client, debit.customer_id, sale_id, amount);

    // Get product info for transaction note
    const saleInfo = await client.query(
        'SELECT product_id, rate FROM sales_info WHERE sale_id = $1',
        [sale_id]
    );
    const { product_id, rate } = saleInfo.rows[0];
    const product = await getProductById(client, product_id);
    const quantity = amount / rate;

    // Process COGS for this payment
    const totalCOGS = await processCOGSAllocation(
        client,
        product_id,
        quantity,
        business_id,
        account_id
    );

    const netAmount = amount - totalCOGS;

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
    await updateCustomerOutstandingCredit(client, debit.customer_id, amount);

    // Decrease Debit Account balance
    const debit_account_id = await getDebitAccountId(client, business_id);
    await updateBusinessAccountBalance(client, debit_account_id, -amount, business_id);

    // Increase payment account with net amount
    await updateBusinessAccountBalance(client, account_id, netAmount, business_id);

    return { message: 'Payment recorded successfully', newRecovered, newStatus };
};
```

**Note:** Import `processCOGSAllocation` from cogsService

**Testing:**
- Test full transaction flows
- Test rollback scenarios
- Verify data consistency

**Risk:** MEDIUM - Complex logic, needs thorough testing

---

## Phase 3: Update Controller (Week 1, Day 5)

### Step 3.1: Comment Out Old addSale, Add New Version

**File:** `server/src/controllers/salesController.ts`

**Action:**
```typescript
// ============================================
// OLD IMPLEMENTATION - COMMENTED OUT
// TO BE REMOVED AFTER NEW CODE IS VERIFIED
// ============================================
/*
export const addSale = async (req: Request, res: Response) => {
    // ... entire old implementation (300 lines)
};
*/

// ============================================
// NEW IMPLEMENTATION - CLEAN & MODULAR
// ============================================
import { processCOGSAllocation } from '../services/cogsService';

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

        const business_id = await Business_pool.Get_Business_id(user_id);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let result;
            if (payment_type === 'debit') {
                result = await Salesdb.createDebitSale(client, business_id, {
                    customer_id,
                    product_id,
                    quantity,
                    rate,
                    total_amount,
                    account_id
                });
            } else {
                result = await Salesdb.createCashSale(client, business_id, {
                    customer_id,
                    product_id,
                    quantity,
                    rate,
                    total_amount,
                    account_id,
                    payment_type
                });
            }

            await client.query('COMMIT');
            return res.status(201).json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error adding sale:', error);
        return res.status(error?.status || 500).json({
            message: error?.message || 'Server error'
        });
    }
};
```

**Testing:**
- Test with Postman/API client
- Verify database state
- Compare with old implementation results
- Test error scenarios

**Risk:** MEDIUM - User-facing change

---

### Step 3.2: Comment Out Old recordPayment, Add New Version

**File:** `server/src/controllers/salesController.ts`

**Action:**
```typescript
// ============================================
// OLD IMPLEMENTATION - COMMENTED OUT
// ============================================
/*
export const recordPayment = async (req: Request, res: Response) => {
    // ... entire old implementation (200 lines)
};
*/

// ============================================
// NEW IMPLEMENTATION - CLEAN & MODULAR
// ============================================
export const recordPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, account_id } = req.body;
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const business_id = await Business_pool.Get_Business_id(user_id);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const result = await Salesdb.recordDebitPaymentNew(
                client,
                id,
                amount,
                account_id,
                business_id
            );

            await client.query('COMMIT');
            return res.json(result);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Error recording payment:', error);
        return res.status(error?.status || 500).json({
            message: error?.message || 'Server error'
        });
    }
};
```

**Testing:**
- Test payment recording
- Verify balance updates
- Test partial payments
- Test full payment closure

**Risk:** MEDIUM - Financial operations

---

## Phase 4: Cleanup (Week 2, Day 1)

### Step 4.1: Remove Commented Code

**Action:**
- Once new code is verified in production for 3-5 days
- Remove all commented old implementations
- Remove unused old functions from Salesdb.ts

**Files to clean:**
- `server/src/controllers/salesController.ts`
- `server/src/db/Salesdb.ts`

**Risk:** LOW - Old code already unused

---

### Step 4.2: Remove Old Salesdb Functions

**File:** `server/src/db/Salesdb.ts`

**Remove these (after verification):**
```typescript
// Remove these old functions:
// - productResult()
// - saleInfoResult()
// - Insert_Into_sales()
// - cogsResult()
// - Transaction_result()
// - insert_into_business_transactions()
// - Update_business_with_profit()
// - decrease_product_stock()
// - createSale() (old unused version)
// - recordDebitPayment() (old unused version)
```

**Risk:** LOW - Already replaced

---

## Testing Checklist

### Unit Tests
- [ ] COGS calculation functions
- [ ] Query functions return correct data
- [ ] Transaction functions execute correct SQL
- [ ] Error handling works correctly

### Integration Tests
- [ ] Create cash sale (full flow)
- [ ] Create debit sale (full flow)
- [ ] Record payment (full flow)
- [ ] Transaction rollback on error
- [ ] Concurrent sales handling

### Manual Testing
- [ ] Create sale via API
- [ ] Verify database state
- [ ] Check account balances
- [ ] Test payment recording
- [ ] Test error scenarios
- [ ] Compare old vs new results

### Production Verification
- [ ] Monitor error logs
- [ ] Check transaction success rate
- [ ] Verify financial accuracy
- [ ] Monitor performance metrics
- [ ] Run for 3-5 days before cleanup

---

## Rollback Plan

### If Issues Found:

**Option 1: Quick Rollback (Uncomment old code)**
```typescript
// Comment out new implementation
/*
export const addSale = async (req: Request, res: Response) => {
    // NEW CODE
};
*/

// Uncomment old implementation
export const addSale = async (req: Request, res: Response) => {
    // OLD CODE (restored)
};
```

**Option 2: Git Revert**
```bash
git revert <commit-hash>
git push
```

**Risk:** VERY LOW - Old code preserved as comments

---

## Timeline

### Week 1
- **Day 1-2:** Create cogsService.ts + tests
- **Day 3-4:** Add new Salesdb functions + tests
- **Day 5:** Update controller (comment old, add new)

### Week 2
- **Day 1-3:** Production monitoring
- **Day 4:** Remove commented code (if stable)
- **Day 5:** Final cleanup + documentation

**Total Time:** 10 days (2 weeks)

---

## Success Criteria

### Code Quality
- ✅ Controller reduced from 500 to ~100 lines
- ✅ No duplicate COGS logic
- ✅ All DB operations in Salesdb
- ✅ Clean separation of concerns

### Business Continuity
- ✅ Zero downtime during migration
- ✅ No data loss
- ✅ No financial discrepancies
- ✅ All existing features work

### Performance
- ✅ Response time maintained or improved
- ✅ No connection pool issues
- ✅ No deadlocks

---

## Communication Plan

### Before Migration
- Notify team of migration schedule
- Document expected changes
- Prepare rollback plan

### During Migration
- Daily status updates
- Monitor error logs
- Quick response to issues

### After Migration
- Verify all metrics
- Document lessons learned
- Remove old code after verification

---

## Next Steps

1. **Review this plan** - Get team approval
2. **Create feature branch** - `feature/sales-refactor`
3. **Start with cogsService.ts** - Lowest risk
4. **Test thoroughly** - Each step
5. **Deploy incrementally** - One function at a time
6. **Monitor closely** - Production metrics
7. **Clean up** - After verification

---

## Notes

- Keep old code commented for at least 3-5 days in production
- Test each step independently
- Don't rush the cleanup phase
- Document any issues found
- Update this plan as needed

**This approach ensures business continuity while improving code quality!**
