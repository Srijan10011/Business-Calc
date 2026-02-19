-- ============================================
-- FINAL SQL MIGRATION FOR MONTHLY RECURRING FIXED COSTS
-- Run this script in your PostgreSQL database
-- ============================================

-- Step 1: Add columns to cost_categories table
ALTER TABLE cost_categories 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_target NUMERIC(14,2) DEFAULT NULL;

-- Step 2: Create monthly_cost_recovery table
CREATE TABLE IF NOT EXISTS monthly_cost_recovery (
    recovery_id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    category_id UUID NOT NULL,
    business_id UUID NOT NULL,
    month VARCHAR(7) NOT NULL,
    target_amount NUMERIC(14,2) NOT NULL,
    recovered_amount NUMERIC(14,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT monthly_cost_recovery_status_check 
        CHECK (status IN ('in_progress', 'fulfilled', 'unfulfilled')),
    
    CONSTRAINT fk_monthly_recovery_category 
        FOREIGN KEY (category_id) REFERENCES cost_categories(category_id) ON DELETE CASCADE,
    
    CONSTRAINT fk_monthly_recovery_business 
        FOREIGN KEY (business_id) REFERENCES businesses(business_id) ON DELETE CASCADE,
    
    CONSTRAINT unique_category_month 
        UNIQUE (category_id, month)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_recovery_category ON monthly_cost_recovery(category_id);
CREATE INDEX IF NOT EXISTS idx_monthly_recovery_month ON monthly_cost_recovery(month);
CREATE INDEX IF NOT EXISTS idx_monthly_recovery_business ON monthly_cost_recovery(business_id);
CREATE INDEX IF NOT EXISTS idx_monthly_recovery_status ON monthly_cost_recovery(status);

-- Step 4: Add comments for documentation
COMMENT ON TABLE monthly_cost_recovery IS 'Tracks monthly recovery progress for recurring fixed costs like rent and loan interest';
COMMENT ON COLUMN cost_categories.is_recurring IS 'True for monthly recurring costs (rent, interest), false for one-time assets';
COMMENT ON COLUMN cost_categories.monthly_target IS 'Monthly target amount to recover for recurring costs';

-- ============================================
-- VERIFICATION QUERIES (Optional - Run to verify)
-- ============================================

-- Check if columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cost_categories' 
AND column_name IN ('is_recurring', 'monthly_target');

-- Check if table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'monthly_cost_recovery';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'monthly_cost_recovery';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
