import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface CustomError extends Error {
    statusCode?: number;
    errors?: any[];
}

export const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    
    // Log error with Winston
    logger.error({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        statusCode,
        message: err.message,
        stack: err.stack,
        user: (req as any).user?.id
    });

    // Send sanitized error to client
    res.status(statusCode).json({
        message: process.env.NODE_ENV === 'production' 
            ? 'An error occurred' 
            : err.message,
        ...(err.errors && { errors: err.errors })
    });
};
