-- Team member account balances (references existing team_members table)
CREATE TABLE team_accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES team_members(member_id) ON DELETE CASCADE,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary distribution transactions
CREATE TABLE salary_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES team_members(member_id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'salary_credit' CHECK (transaction_type IN ('salary_credit', 'withdrawal', 'adjustment')),
    distribution_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto salary distribution settings (per business)
CREATE TABLE salary_distribution_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    distribution_mode VARCHAR(20) DEFAULT 'manual' CHECK (distribution_mode IN ('manual', 'automatic')),
    distribution_day INTEGER DEFAULT 1 CHECK (distribution_day BETWEEN 1 AND 28),
    last_distribution_month VARCHAR(7), -- Last month when distribution was done
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_team_accounts_member_id ON team_accounts(member_id);
CREATE INDEX idx_salary_transactions_member_id ON salary_transactions(member_id);
CREATE INDEX idx_salary_transactions_month ON salary_transactions(distribution_month);
CREATE INDEX idx_salary_distribution_business_id ON salary_distribution_settings(business_id);
