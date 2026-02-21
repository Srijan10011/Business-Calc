-- Security Audit Log Table
CREATE TABLE IF NOT EXISTS security_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_security_audit_event_type ON security_audit_log(event_type);
CREATE INDEX idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_created_at ON security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_severity ON security_audit_log(severity);
CREATE INDEX idx_security_audit_ip ON security_audit_log(ip_address);

-- Composite index for common queries
CREATE INDEX idx_security_audit_user_event ON security_audit_log(user_id, event_type, created_at DESC);

COMMENT ON TABLE security_audit_log IS 'Tracks all security-related events for audit and compliance';
COMMENT ON COLUMN security_audit_log.event_type IS 'Type of security event (login_success, permission_denied, etc.)';
COMMENT ON COLUMN security_audit_log.severity IS 'Event severity: low, medium, high, critical';
COMMENT ON COLUMN security_audit_log.details IS 'Additional event-specific data in JSON format';
