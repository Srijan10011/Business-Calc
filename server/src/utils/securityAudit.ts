import pool from '../db';
import logger from './logger';

export type SecurityEventType = 
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'token_refresh'
  | 'permission_denied'
  | 'csrf_violation'
  | 'rate_limit_exceeded'
  | 'invalid_token'
  | 'password_change'
  | 'account_created'
  | 'suspicious_activity';

interface SecurityEventData {
  event_type: SecurityEventType;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const logSecurityEvent = async (data: SecurityEventData): Promise<void> => {
  try {
    const {
      event_type,
      user_id = null,
      ip_address = null,
      user_agent = null,
      details = {},
      severity = 'medium'
    } = data;

    // Log to database
    await pool.query(
      `INSERT INTO security_audit_log 
       (event_type, user_id, ip_address, user_agent, details, severity, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [event_type, user_id, ip_address, user_agent, JSON.stringify(details), severity]
    );

    // Also log to Winston for immediate visibility
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    logger[logLevel]('Security Event', {
      event_type,
      user_id,
      ip_address,
      severity,
      details
    });
  } catch (error) {
    // Don't let audit logging failures break the application
    logger.error('Failed to log security event:', error);
  }
};
