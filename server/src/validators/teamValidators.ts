import { z } from 'zod';
import { 
    nameSchema, 
    optionalEmailSchema, 
    phoneSchema, 
    positiveNumberSchema, 
    monthSchema,
    optionalNoteSchema,
    idSchema
} from './commonValidators';

/**
 * Validation schemas for team endpoints
 */

// POST /api/team
export const addTeamMemberSchema = z.object({
    name: nameSchema,
    email: optionalEmailSchema,
    phone: phoneSchema,
    position: z.string()
        .min(2, 'Position must be at least 2 characters')
        .max(100, 'Position must be less than 100 characters')
        .trim(),
    department: z.string()
        .max(100, 'Department must be less than 100 characters')
        .trim()
        .optional()
        .or(z.literal('')),
    salary: positiveNumberSchema.optional(),
    enroll_date: z.string()
        .optional()
        .or(z.literal(''))
});

// PUT /api/team/:id
export const updateTeamMemberSchema = z.object({
    name: nameSchema,
    email: optionalEmailSchema,
    phone: phoneSchema,
    position: z.string()
        .min(2, 'Position must be at least 2 characters')
        .max(100, 'Position must be less than 100 characters')
        .trim(),
    department: z.string()
        .max(100, 'Department must be less than 100 characters')
        .trim()
        .optional()
        .or(z.literal('')),
    salary: positiveNumberSchema.optional(),
    status: z.enum(['active', 'inactive', 'terminated']).optional()
});

// POST /api/team/salary-payout
// Note: Accepts member_id, memberId, or id (keeping existing flexibility)
export const salaryPayoutSchema = z.object({
    member_id: idSchema.optional(),
    memberId: idSchema.optional(),
    id: idSchema.optional(),
    amount: positiveNumberSchema,
    month: monthSchema,
    description: optionalNoteSchema
}).refine(
    (data) => data.member_id || data.memberId || data.id,
    {
        message: 'One of member_id, memberId, or id is required',
        path: ['member_id']
    }
);

// POST /api/team/distribute-salary
export const distributeSalarySchema = z.object({
    member_id: idSchema, // UUID string
    amount: z.number(), // Can be negative for deductions
    month: monthSchema
});
