import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface CustomError extends Error {
    statusCode?: number;
    errors?: any[];
    code?: string; // PostgreSQL error code
}

// Sanitize database errors to prevent schema leakage
const sanitizeError = (err: CustomError): string => {
    // PostgreSQL error codes
    if (err.code === '23505') return 'Resource already exists';
    if (err.code === '23503') return 'Invalid reference or foreign key constraint';
    if (err.code === '23502') return 'Required field is missing';
    if (err.code === '22P02') return 'Invalid data format';
    if (err.code === '23514') return 'Check constraint violation';
    if (err.code === '42P01') return 'Database configuration error';
    if (err.code === '42703') return 'Invalid field';
    
    // Client errors (4xx) - safe to show message
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
        return err.message;
    }
    
    // Server errors (5xx) - hide details
    return 'An internal error occurred';
};

export const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    
    // Log full error details server-side
    logger.error({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        statusCode,
        message: err.message,
        stack: err.stack,
        code: err.code,
        user: (req as any).user?.id,
        ip: req.ip
    });

    // Send sanitized error to client
    const clientMessage = sanitizeError(err);
    
    res.status(statusCode).json({
        message: clientMessage,
        ...(err.errors && statusCode < 500 && { errors: err.errors })
    });
};
