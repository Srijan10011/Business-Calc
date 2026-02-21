import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';
import { logSecurityEvent } from '../utils/securityAudit';

// Generate a random CSRF token
export const generateCsrfToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

// Middleware to set CSRF token cookie
export const setCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    // Only set if not already present
    if (!req.cookies['csrf-token']) {
        const token = generateCsrfToken();
        res.cookie('csrf-token', token, {
            httpOnly: false, // Client needs to read this
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
    }
    next();
};

// Middleware to validate CSRF token (double-submit pattern)
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromCookie = req.cookies['csrf-token'];

    // Both must exist
    if (!tokenFromHeader || !tokenFromCookie) {
        logger.warn(`CSRF token missing - Header: ${!!tokenFromHeader}, Cookie: ${!!tokenFromCookie}`);
        
        logSecurityEvent({
            event_type: 'csrf_violation',
            user_id: (req as any).user?.id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            details: { 
                reason: 'token_missing',
                has_header: !!tokenFromHeader,
                has_cookie: !!tokenFromCookie,
                path: req.path,
                method: req.method
            },
            severity: 'high'
        });
        
        return res.status(403).json({ 
            msg: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING'
        });
    }

    // Must match
    if (tokenFromHeader !== tokenFromCookie) {
        logger.warn(`CSRF token mismatch for user ${(req as any).user?.id}`);
        
        logSecurityEvent({
            event_type: 'csrf_violation',
            user_id: (req as any).user?.id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            details: { 
                reason: 'token_mismatch',
                path: req.path,
                method: req.method
            },
            severity: 'high'
        });
        
        return res.status(403).json({ 
            msg: 'Invalid CSRF token',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    next();
};
