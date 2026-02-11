# Permission Dependencies - Implementation Summary

## Problem
Users with specific action permissions (e.g., `sales.create`) need temporary read access to related resources (products, customers, accounts) ONLY when performing that action, without having direct view permissions for those resources.

## Solution
Created a centralized `/api/dependencies` endpoint that provides scoped read access to resources based on the user's action permissions.

## Backend Changes

### 1. New File: `server/src/routes/dependencyRoutes.ts`
Centralized dependency endpoints with permission-based access control:

**Endpoints:**
- `GET /api/dependencies/accounts` - Accessible by: sales.create, sales.edit, inventory.create, inventory.edit, credits.view, credits.manage, team.manage, finance.edit, assets.create
- `GET /api/dependencies/products` - Accessible by: sales.create, sales.edit
- `GET /api/dependencies/customers` - Accessible by: sales.create, sales.edit, credits.view, credits.manage
- `GET /api/dependencies/inventory-categories` - Accessible by: products.create

### 2. Updated: `server/src/index.ts`
- Registered `/api/dependencies` route

### 3. Updated: `server/src/routes/salesRoutes.ts`
- Removed duplicate dependency endpoints (moved to centralized location)

### 4. Updated Permission Middleware: `server/src/middleware/permissionMiddleware.ts`
- Removed contextual middleware functions (requireAccountsReadAccess, requireProductsReadAccess, etc.)
- Kept only core functions: loadPermissions, requirePermission

### 5. Updated Resource Routes
- `productRoutes.ts` - Strict `products.view` permission required
- `customerRoutes.ts` - Strict `customers.view` permission required  
- `accountRoutes.ts` - Strict `finance.view` permission required
- `inventoryRoutes.ts` - Strict `inventory.view` permission required

## Frontend Changes

### Updated Components:
1. **Sales.tsx** - Uses `/dependencies/products` and `/dependencies/accounts`
2. **AddSaleModal.tsx** - Uses `/dependencies/products`, `/dependencies/customers`, `/dependencies/accounts`
3. **Inventory.jsx** - Uses `/dependencies/accounts`
4. **Credits.jsx** - Uses `/dependencies/accounts`

### Components Using Direct Endpoints (have full permissions):
- **Finance.jsx** - Uses `/accounts` (has finance.view)
- **Dashboard.jsx** - Uses `/accounts` (has finance.view)
- **Customers.jsx** - Uses `/customers` (has customers.view)
- **Products.jsx** - Uses `/products` (has products.view)

## Permission Dependencies Matrix

| Action Permission | Needs Access To | Endpoint |
|------------------|-----------------|----------|
| sales.create | products, customers, accounts | /dependencies/* |
| sales.edit | accounts | /dependencies/accounts |
| inventory.create | accounts | /dependencies/accounts |
| inventory.edit | accounts | /dependencies/accounts |
| credits.view | customers, accounts | /dependencies/* |
| credits.manage | customers, accounts | /dependencies/* |
| team.manage | accounts | /dependencies/accounts |
| finance.edit | accounts | /dependencies/accounts |
| assets.create | accounts | /dependencies/accounts |
| products.create | inventory categories | /dependencies/inventory-categories |

## How It Works

1. **User has only `sales.create` permission**
   - ✅ Can POST to `/api/sales` (controller queries DB directly)
   - ✅ Can GET `/api/dependencies/products` (scoped access)
   - ✅ Can GET `/api/dependencies/customers` (scoped access)
   - ✅ Can GET `/api/dependencies/accounts` (scoped access)
   - ❌ Cannot GET `/api/products` (needs products.view)
   - ❌ Cannot GET `/api/customers` (needs customers.view)
   - ❌ Cannot GET `/api/accounts` (needs finance.view)

2. **Controllers operate with database-level privileges**
   - No middleware restrictions on internal DB queries
   - Permission checks only at API endpoint level

3. **Dependency endpoints check for action permissions**
   - Middleware validates user has at least one permission that needs that resource
   - Returns minimal data needed for the action

## Testing Checklist

- [ ] User with only `sales.create` can add sales
- [ ] User with only `sales.create` cannot view products page
- [ ] User with only `sales.create` cannot view customers page
- [ ] User with only `sales.create` cannot view finance page
- [ ] User with only `inventory.create` can add inventory with account selection
- [ ] User with only `credits.manage` can pay credits with account selection
- [ ] User with `products.view` can view products page
- [ ] User with `finance.view` can view finance page
- [ ] Owner (role='owner') has access to everything

## Benefits

1. **Minimal code** - Single centralized location for dependencies
2. **Secure** - Strict permission boundaries on direct endpoints
3. **Flexible** - Easy to add new dependencies
4. **Maintainable** - Clear separation between action permissions and view permissions
5. **Scalable** - Works for all features with dependencies
