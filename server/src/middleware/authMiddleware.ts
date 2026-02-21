import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logSecurityEvent } from '../utils/securityAudit';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Try cookie first, then header (backward compatibility)
    const token = req.cookies?.token || req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { user: { id: string } };
        req.user = decoded.user;
        next();
    } catch (err) {
        // Log invalid token attempt
        logSecurityEvent({
            event_type: 'invalid_token',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            details: { 
                error: (err as Error).message,
                path: req.path,
                method: req.method
            },
            severity: 'medium'
        });
        
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
