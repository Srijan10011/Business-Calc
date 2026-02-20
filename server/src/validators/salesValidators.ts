import { z } from 'zod';
import { positiveNumberSchema, positiveIntegerSchema, idSchema } from './commonValidators';

/**
 * Validation schemas for sales endpoints
 */

// POST /api/sales
export const createSaleSchema = z.object({
    customer_id: idSchema,
    total_amount: positiveNumberSchema,
    payment_type: z.enum(['cash', 'bank', 'credit', 'partial', 'debit']),
    account_id: idSchema.optional(),
    product_id: idSchema,
    rate: positiveNumberSchema,
    quantity: positiveIntegerSchema
}).refine(
    (data) => {
        // If payment_type is cash, bank, or partial, account_id is required
        if ((data.payment_type === 'cash' || data.payment_type === 'bank' || data.payment_type === 'partial') && !data.account_id) {
            return false;
        }
        return true;
    },
    {
        message: 'Account ID is required for cash, bank, or partial payments',
        path: ['account_id']
    }
);

// POST /api/sales/:id/payment
export const recordPaymentSchema = z.object({
    amount: positiveNumberSchema,
    account_id: idSchema
});
