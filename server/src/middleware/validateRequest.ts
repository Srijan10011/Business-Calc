import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateRequest = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate and parse the request body
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Format Zod errors into user-friendly messages
                const errors = error.issues.map((err: z.ZodIssue) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                
                return res.status(400).json({
                    message: 'Validation failed',
                    errors
                });
            }
            // Pass other errors to error handler
            next(error);
        }
    };
};
