import { z } from 'zod';

/**
 * Common reusable validation schemas
 */

// Email validation
export const emailSchema = z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters');

// Password validation (minimum 6 characters)
export const passwordSchema = z.string()
    .min(6, 'Password must be at least 6 characters');

// Positive number validation
export const positiveNumberSchema = z.number()
    .positive('Must be a positive number');

// Non-negative number validation
export const nonNegativeNumberSchema = z.number()
    .nonnegative('Must be a non-negative number');

// Positive integer validation
export const positiveIntegerSchema = z.number()
    .int('Must be an integer')
    .positive('Must be a positive number');

// Non-negative integer validation
export const nonNegativeIntegerSchema = z.number()
    .int('Must be an integer')
    .nonnegative('Must be a non-negative number');

// String with min/max length
export const nameSchema = z.string()
    .min(2, 'Must be at least 2 characters')
    .max(200, 'Must be less than 200 characters')
    .trim();

// Optional email
export const optionalEmailSchema = z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal(''));

// Date in YYYY-MM format
export const monthSchema = z.string()
    .regex(/^\d{4}-\d{2}$/, 'Must be in YYYY-MM format');

// UUID validation (for all IDs in the system)
export const uuidSchema = z.string()
    .uuid('Invalid UUID format');

// Flexible ID schema - accepts both UUID strings and numbers (for backward compatibility)
export const idSchema = z.union([
    z.string().uuid('Invalid ID format'),
    z.string().min(1, 'ID cannot be empty'),
    z.number().positive('ID must be positive')
]);

// Phone number (optional, flexible format)
export const phoneSchema = z.string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal(''));

// Note/Description field
export const noteSchema = z.string()
    .min(1, 'Note cannot be empty')
    .max(500, 'Note must be less than 500 characters')
    .trim();

// Optional note
export const optionalNoteSchema = z.string()
    .max(500, 'Note must be less than 500 characters')
    .trim()
    .optional()
    .or(z.literal(''));
