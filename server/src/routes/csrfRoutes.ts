import express, { Request, Response } from 'express';
import { generateCsrfToken } from '../middleware/csrfMiddleware';

const router = express.Router();

// Get CSRF token endpoint
router.get('/csrf-token', (req: Request, res: Response) => {
    const token = req.cookies['csrf-token'] || generateCsrfToken();
    
    // Set cookie if not present
    if (!req.cookies['csrf-token']) {
        res.cookie('csrf-token', token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
    }
    
    res.json({ csrfToken: token });
});

export default router;
