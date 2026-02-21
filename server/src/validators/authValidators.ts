import { z } from 'zod';
import { emailSchema, passwordSchema, nameSchema, uuidSchema } from './commonValidators';

/**
 * Validation schemas for authentication endpoints
 */

// POST /api/auth/register
export const registerSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema, // Strong password validation
    business_id: uuidSchema.optional()
});

// POST /api/auth/login
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required') // Simple validation for login
});

// POST /api/auth/setup-business
export const setupBusinessSchema = z.object({
    businessName: z.string()
        .min(2, 'Business name must be at least 2 characters')
        .max(200, 'Business name must be less than 200 characters')
        .trim(),
    currency: z.string()
        .max(10, 'Currency code must be less than 10 characters')
        .optional()
        .default('INR')
});
