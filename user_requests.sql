-- Create user_requests table for pending business join requests
CREATE TABLE IF NOT EXISTS user_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);

CREATE INDEX idx_user_requests_business ON user_requests(business_id, status);
CREATE INDEX idx_user_requests_user ON user_requests(user_id);
