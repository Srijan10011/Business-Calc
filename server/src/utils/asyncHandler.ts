import { Request, Response } from 'express';

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: Function) => {
        Promise.resolve(fn(req, res, next)).catch((error: any) => {
            console.error('Error:', error);
            res.status(500).json({ 
                message: 'Server error', 
                error: error?.message 
            });
        });
    };
};
