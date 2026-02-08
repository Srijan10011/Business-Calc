-- Table for tracking removed/deleted products with historical data
CREATE TABLE removed_products (
    removed_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Original product information
    original_product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    original_price NUMERIC(12, 2) NOT NULL,
    
    -- Business relationship
    business_id UUID NOT NULL,
    
    -- Financial metrics (aggregated from sales_info)
    total_quantity_sold NUMERIC(14, 2) DEFAULT 0,
    total_revenue NUMERIC(15, 2) DEFAULT 0.00,
    
    -- Inventory at deletion
    final_stock_quantity INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, -- Original product creation time
    removed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Audit information
    removed_by UUID,
    removal_reason TEXT,
    
    -- Additional metrics
    total_sales_count INTEGER DEFAULT 0, -- Number of sales transactions
    last_sale_date TIMESTAMP WITHOUT TIME ZONE,
    
    -- Foreign key constraints
    CONSTRAINT fk_removed_products_business 
        FOREIGN KEY (business_id) 
        REFERENCES businesses(business_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_removed_products_user 
        FOREIGN KEY (removed_by) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX idx_removed_products_business_id ON removed_products(business_id);
CREATE INDEX idx_removed_products_removed_at ON removed_products(removed_at);
CREATE INDEX idx_removed_products_original_id ON removed_products(original_product_id);
CREATE INDEX idx_removed_products_business_removed ON removed_products(business_id, removed_at);

-- Comments for documentation
COMMENT ON TABLE removed_products IS 'Stores historical data of deleted products for audit and analytics';
COMMENT ON COLUMN removed_products.original_product_id IS 'The UUID of the product before deletion';
COMMENT ON COLUMN removed_products.total_quantity_sold IS 'Total quantity sold during product lifetime';
COMMENT ON COLUMN removed_products.total_revenue IS 'Total revenue generated during product lifetime';
COMMENT ON COLUMN removed_products.final_stock_quantity IS 'Remaining stock at time of deletion';
COMMENT ON COLUMN removed_products.created_at IS 'Original product creation timestamp';
COMMENT ON COLUMN removed_products.removed_at IS 'Timestamp when product was deleted';
