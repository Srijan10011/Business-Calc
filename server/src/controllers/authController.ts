import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { logSecurityEvent } from '../utils/securityAudit';
import * as Authdb from '../db/Authdb';
import { createDefaultAccounts } from './accountController';
import * as Accountdb from '../db/Accountdb';

export const checkBusiness = async (req: Request, res: Response) => {
    const business_id = req.params.business_id as string;
    try {
        const business = await Authdb.checkBusinessExists(business_id);
        if (!business) return res.status(404).json({ msg: 'Business not found' });
        res.json({ exists: true, business });
    } catch (err: any) {
        logger.error(err.message);
        res.status(500).send('Server error');
    }
};

export const register = async (req: Request, res: Response) => {
    const { name, email, password, business_id } = req.body;
    try {
        const result = await Authdb.registerUser(name, email, password, business_id);
        
        // Set httpOnly cookie
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });
        
        res.json(result);
    } catch (err: any) {
        logger.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        // Get user first to extract user_id
        const normalizedEmail = email.toLowerCase().trim();
        const user = await Authdb.getUserByEmail(normalizedEmail);
        
        if (!user) {
            // Log failed login attempt
            await logSecurityEvent({
                event_type: 'login_failure',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                details: { email: normalizedEmail, reason: 'user_not_found' },
                severity: 'medium'
            });
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        
        const user_id = user.user_id;
        
        // Perform login (validates password and checks business access)
        try {
            const result = await Authdb.loginUser(email, password);
            
            // Generate access token (15 minutes)
            const accessToken = jwt.sign(
                { user: { id: user_id } },
                process.env.JWT_SECRET as string,
                { expiresIn: '15m' }
            );
            
            // Generate refresh token (7 days)
            const refreshToken = jwt.sign(
                { user: { id: user_id } },
                process.env.REFRESH_TOKEN_SECRET as string,
                { expiresIn: '7d' }
            );
            
            // Store refresh token in database
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await Authdb.storeRefreshToken(
                user_id,
                refreshToken,
                expiresAt,
                req.ip,
                req.headers['user-agent']
            );
            
            // Set access token cookie (15 minutes)
            res.cookie('token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            
            // Set refresh token cookie (7 days)
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
            
            // Log successful login
            await logSecurityEvent({
                event_type: 'login_success',
                user_id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                severity: 'low'
            });
            
            // Send response (backward compatibility)
            res.json({
                ...result,
                token: accessToken // For backward compatibility
            });
        } catch (loginError: any) {
            // Log failed login (wrong password or no business access)
            await logSecurityEvent({
                event_type: 'login_failure',
                user_id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                details: { reason: loginError.message },
                severity: 'medium'
            });
            throw loginError;
        }
    } catch (err: any) {
        logger.error(err.message || err);
        res.status(err.statusCode || 500).send(err.message || 'Server error');
    }
};

export const setupBusiness = async (req: Request, res: Response) => {
    const { businessName, currency } = req.body;
    const user_id = req.user?.id;

    if (!user_id) return res.status(401).json({ msg: 'Unauthorized' });

    try {
        const business = await Authdb.setupBusiness(user_id, businessName, currency, Accountdb.createDefaultAccount);
        res.json({ msg: 'Business setup completed', business });
    } catch (err: any) {
        logger.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
};

export const getUserInfo = async (req: Request, res: Response) => {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ msg: 'Unauthorized' });

    try {
        const userInfo = await Authdb.getUserInfo(user_id); // you can move getUserInfo to service if needed
        res.json(userInfo);
    } catch (err: any) {
        logger.error(err.message);
        res.status(500).send(err.message || 'Server error');
    }
};

export const verifyToken = async (req: Request, res: Response) => {
    // authMiddleware already validated the token
    // If we reach here, token is valid
    res.json({ valid: true, user: req.user });
};

export const logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    const user_id = req.user?.id;
    
    // Delete refresh token from database
    if (refreshToken && user_id) {
        try {
            await Authdb.deleteRefreshToken(refreshToken, user_id);
        } catch (err) {
            logger.error('Error deleting refresh token:', err);
        }
    }
    
    // Clear both cookies
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    
    res.json({ msg: 'Logged out successfully' });
};


// Refresh access token using refresh token
export const refreshAccessToken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
        return res.status(401).json({ msg: 'Refresh token not found' });
    }
    
    try {
        // Verify refresh token JWT signature
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as { user: { id: string } };
        const user_id = decoded.user.id;
        
        // Validate refresh token in database with security checks
        const validation = await Authdb.validateRefreshToken(
            refreshToken, 
            user_id,
            req.ip,
            req.headers['user-agent']
        );
        
        if (!validation.valid) {
            // Log failed refresh attempt
            await logSecurityEvent({
                event_type: 'invalid_token',
                user_id,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                details: { reason: 'refresh_token_invalid' },
                severity: 'medium'
            });
            return res.status(401).json({ msg: 'Invalid refresh token' });
        }
        
        // Token rotation: Generate new refresh token
        const newRefreshToken = jwt.sign(
            { user: { id: user_id } },
            process.env.REFRESH_TOKEN_SECRET as string,
            { expiresIn: '7d' }
        );
        
        // Delete old refresh token
        await Authdb.deleteRefreshTokenById(validation.token_id);
        
        // Store new refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await Authdb.storeRefreshToken(
            user_id,
            newRefreshToken,
            expiresAt,
            req.ip,
            req.headers['user-agent']
        );
        
        // Generate new access token (15 minutes)
        const newAccessToken = jwt.sign(
            { user: { id: user_id } },
            process.env.JWT_SECRET as string,
            { expiresIn: '15m' }
        );
        
        // Set new access token cookie
        res.cookie('token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });
        
        // Set new refresh token cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        // Log successful token refresh
        await logSecurityEvent({
            event_type: 'token_refresh',
            user_id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            severity: 'low'
        });
        
        res.json({ msg: 'Token refreshed successfully' });
    } catch (err: any) {
        logger.error('Refresh token error:', err.message);
        res.status(401).json({ msg: 'Invalid or expired refresh token' });
    }
};
