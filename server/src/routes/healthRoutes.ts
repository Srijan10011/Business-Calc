import { Router, Request, Response } from 'express';
import pool from '../db';
import logger from '../utils/logger';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
    try {
        // Test database connection
        await pool.query('SELECT 1');
        
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            version: '1.0.0'
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: 'Database connection failed'
        });
    }
});

export default router;
