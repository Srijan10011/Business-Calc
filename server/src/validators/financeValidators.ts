import { z } from 'zod';
import { positiveNumberSchema, noteSchema, idSchema } from './commonValidators';

/**
 * Validation schemas for finance/account endpoints
 */

// POST /api/accounts/transfer
export const transferFundsSchema = z.object({
    fromAccountId: idSchema,
    toAccountId: idSchema,
    amount: positiveNumberSchema
}).refine(
    (data) => data.fromAccountId !== data.toAccountId,
    {
        message: 'Cannot transfer to the same account',
        path: ['toAccountId']
    }
);

// POST /api/accounts/transfer-cogs
export const transferCOGSSchema = z.object({
    categoryId: idSchema,
    accountId: idSchema,
    amount: positiveNumberSchema,
    direction: z.enum(['to-cogs', 'from-cogs'])
});

// POST /api/expenses
export const addExpenseSchema = z.object({
    account_id: idSchema,
    amount: positiveNumberSchema,
    note: noteSchema
});

// POST /api/expenses/cogs-payout
export const cogsPayoutSchema = z.object({
    category_id: idSchema,
    amount: positiveNumberSchema,
    note: noteSchema
});
