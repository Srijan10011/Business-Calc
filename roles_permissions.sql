-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(business_id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, role_name)
);

-- Create permissions table (system + custom permissions)
CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(business_id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    permission_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, permission_key)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Add role_id to business_users table
ALTER TABLE business_users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(role_id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_business ON roles(business_id);
CREATE INDEX IF NOT EXISTS idx_permissions_business ON permissions(business_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_business_users_role ON business_users(role_id);

-- Insert system permissions (business_id = NULL means available to all businesses)
INSERT INTO permissions (business_id, permission_key, permission_name, category, description) VALUES
(NULL, 'sales.create', 'Add Sale Record', 'Sales', 'Create new sales transactions'),
(NULL, 'sales.view', 'View Sales', 'Sales', 'View sales records and history'),
(NULL, 'sales.edit', 'Edit Sales', 'Sales', 'Modify existing sales records'),
(NULL, 'sales.delete', 'Delete Sales', 'Sales', 'Remove sales records'),

(NULL, 'customers.create', 'Add Customer', 'Customers', 'Create new customer records'),
(NULL, 'customers.view', 'View Customers', 'Customers', 'View customer information'),
(NULL, 'customers.edit', 'Edit Customers', 'Customers', 'Modify customer details'),
(NULL, 'customers.delete', 'Delete Customers', 'Customers', 'Remove customer records'),

(NULL, 'inventory.create', 'Add Inventory', 'Inventory', 'Add new inventory items'),
(NULL, 'inventory.view', 'View Inventory', 'Inventory', 'View inventory levels and details'),
(NULL, 'inventory.edit', 'Edit Inventory', 'Inventory', 'Modify inventory records'),
(NULL, 'inventory.delete', 'Delete Inventory', 'Inventory', 'Remove inventory items'),

(NULL, 'products.create', 'Add Product', 'Products', 'Create new products'),
(NULL, 'products.view', 'View Products', 'Products', 'View product catalog'),
(NULL, 'products.edit', 'Edit Products', 'Products', 'Modify product details'),
(NULL, 'products.delete', 'Delete Products', 'Products', 'Remove products'),

(NULL, 'finance.view', 'View Finance', 'Finance', 'View financial reports and accounts'),
(NULL, 'finance.edit', 'Manage Finance', 'Finance', 'Manage financial transactions'),

(NULL, 'reports.view', 'View Reports', 'Reports', 'Access business reports'),

(NULL, 'team.view', 'View Team', 'Team', 'View team members'),
(NULL, 'team.manage', 'Manage Team', 'Team', 'Add, edit, or remove team members'),

(NULL, 'assets.create', 'Add Assets', 'Assets', 'Create new asset records'),
(NULL, 'assets.view', 'View Assets', 'Assets', 'View asset information'),
(NULL, 'assets.edit', 'Edit Assets', 'Assets', 'Modify asset details'),

(NULL, 'credits.view', 'View Credits', 'Credits', 'View credit information'),
(NULL, 'credits.manage', 'Manage Credits', 'Credits', 'Manage credit transactions')
ON CONFLICT (business_id, permission_key) DO NOTHING;
