-- ============================================================================
-- REFRESH TOKEN SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- Purpose: Add refresh token support for enhanced security and UX
-- Date: February 21, 2026
-- Estimated execution time: < 1 second
-- ============================================================================

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Add comment for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores hashed refresh tokens for session management and revocation';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Bcrypt hash of the refresh token - never store plain tokens';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Token expiration time - 7 days from creation';
COMMENT ON COLUMN refresh_tokens.last_used IS 'Last time this token was used to refresh access token';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address where token was created for security audit';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'Browser or device info for security audit';

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Check table exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'refresh_tokens';

-- Check columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'refresh_tokens' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'refresh_tokens';

-- Check foreign key constraint
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'refresh_tokens' AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- CLEANUP QUERY (Optional - for automatic token cleanup)
-- ============================================================================
-- Run this daily via cron job to remove expired tokens
-- DELETE FROM refresh_tokens WHERE expires_at < NOW();

-- ============================================================================
-- ROLLBACK QUERY (If you need to undo this migration)
-- ============================================================================
-- DROP TABLE IF EXISTS refresh_tokens CASCADE;
