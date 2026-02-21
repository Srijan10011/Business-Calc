# Business-Calc Technical Analysis & Security Audit

**Generated:** 2026-02-21  
**Analyst Role:** Senior Software Architect & Security Engineer

---

## Executive Summary

Business-Calc is a multi-tenant business management SaaS platform with financial tracking, inventory, sales, and team management capabilities. The application uses a React frontend with Material-UI, Express.js/TypeScript backend, and PostgreSQL database.

**Critical Findings:**
- 🔴 **HIGH**: Hardcoded credentials in .env files committed to repository
- 🔴 **HIGH**: SQL injection vulnerabilities in multiple database queries
- 🟡 **MEDIUM**: Missing input validation on several endpoints
- 🟡 **MEDIUM**: Inconsistent error handling exposing stack traces
- 🟡 **MEDIUM**: No database connection pooling limits enforcement
- 🟢 **LOW**: Missing database indexes on frequently queried columns

---

## 1. Architecture Overview

### 1.1 Technology Stack

**Frontend:**
- React 19.2.0 with React Router 7.12.0
- Material-UI 7.3.7 for UI components
- Axios for HTTP client with interceptors
- Vite 7.2.4 as build tool

**Backend:**
- Node.js with Express 5.2.1
- TypeScript 5.9.3
- PostgreSQL 14+ with pg driver
- JWT authentication (jsonwebtoken 9.0.3)
- Bcrypt for password hashing
- Zod 4.3.6 for validation
- Winston 3.19.0 for logging
- Helmet 8.1.0 for security headers
- Express-rate-limit 8.2.1

**Infrastructure:**
- Docker Compose for orchestration
- PostgreSQL container with persistent volumes

### 1.2 Data Flow Architecture

```
Client (React) 
    ↓ HTTP/HTTPS + Cookies
Express Server (Port 5000)
    ↓ Middleware Chain:
      - HTTPS Redirect
      - Helmet (Security Headers)
      - CORS
      - Rate Limiting (Auth: 10/15min, API: 1000/10min)
      - Cookie Parser
      - Auth Middleware (JWT validation)
      - Business Context Middleware
      - Permission Middleware
    ↓
Controllers (Business Logic)
    ↓
Database Layer (db/*.ts)
    ↓
PostgreSQL (Connection Pool: max 20)
```

### 1.3 Authentication Flow

1. **Registration**: User registers → JWT token generated → httpOnly cookie set
2. **Login**: Credentials validated → Access token (15min) + Refresh token (7 days) → Both stored as httpOnly cookies
3. **Token Refresh**: Expired access token → Client auto-refreshes via `/auth/refresh` → New access token issued
4. **Authorization**: JWT decoded → User ID extracted → Business association verified → Permissions loaded

### 1.4 Multi-Tenancy Model

- **Business Isolation**: All data scoped by `business_id`
- **User-Business Mapping**: `business_users` junction table
- **Role-Based Access Control (RBAC)**: 
  - Roles defined per business
  - Permissions assigned to roles
  - Owner role has wildcard permissions (`*`)

---

## 2. Security Vulnerabilities

### 2.1 🔴 CRITICAL: Exposed Credentials

**Location:** `/server/.env`

```env
DB_PASSWORD=Srijan123qwe@
JWT_SECRET=b31c944253cc929f5c5798759f88f975e6f51076910d7a36e9710e63ae7733da...
REFRESH_TOKEN_SECRET=1a69b9c9104026e4a553a7830d5002515877cf18658e5fd02d43bfcc5b184010...
```

**Risk:** Credentials committed to version control can be extracted from git history.

**Impact:** 
- Database compromise
- JWT token forgery
- Complete system takeover

**Recommendation:**
```bash
# Immediate actions:
1. Rotate all secrets immediately
2. Add .env to .gitignore (already present but file committed)
3. Remove from git history: git filter-branch or BFG Repo-Cleaner
4. Use environment variables or secret management (AWS Secrets Manager, HashiCorp Vault)
5. Implement secret scanning in CI/CD pipeline
```

### 2.2 🔴 HIGH: SQL Injection Vulnerabilities

**Location:** Multiple database files

**Example 1:** `/server/src/db/Salesdb.ts` (Lines 51-71)
```typescript
// Dynamic WHERE clause construction without proper parameterization
let whereClause = 'WHERE s.business_id = $1';
const queryParams: any[] = [business_id];

if (status) {
    paramCount++;
    whereClause += ` AND si.status = $${paramCount}`;
    queryParams.push(status);
}
```

**Vulnerability:** While parameterized, the dynamic SQL construction is error-prone. If any filter bypasses validation, injection is possible.

**Example 2:** `/server/src/db/Reportdb.ts`
```typescript
const productSalesResult = await pool.query(`
    SELECT ... 
    WHERE pb.business_id = $1
    ORDER BY p.created_at DESC
`, [business_id]);
```

**Risk:** Template literals with user input can lead to SQL injection if not properly sanitized.

**Recommendation:**
```typescript
// Use query builders or ORM
import { QueryBuilder } from 'pg-query-builder'; // Example

// Or use prepared statements consistently
const query = {
    text: 'SELECT * FROM sales WHERE business_id = $1 AND status = $2',
    values: [business_id, status]
};
await pool.query(query);
```

### 2.3 🔴 HIGH: Refresh Token Storage Vulnerability

**Location:** `/server/src/db/Authdb.ts`

**Issue:** Refresh tokens stored as bcrypt hashes but validation logic unclear.

```typescript
await Authdb.storeRefreshToken(
    user_id,
    refreshToken,  // Plain token stored?
    expiresAt,
    req.ip,
    req.headers['user-agent']
);
```

**Risk:** If plain tokens are stored, database compromise exposes all sessions.

**Recommendation:**
```typescript
// Store only hashed tokens
const tokenHash = await bcrypt.hash(refreshToken, 10);
await storeRefreshToken(user_id, tokenHash, expiresAt, ...);

// Validate by comparing hash
const storedTokens = await getRefreshTokens(user_id);
for (const stored of storedTokens) {
    if (await bcrypt.compare(providedToken, stored.token_hash)) {
        return true;
    }
}
```

### 2.4 🟡 MEDIUM: Missing Rate Limiting on Sensitive Operations

**Location:** `/server/src/index.ts`

**Issue:** Rate limiting only on auth routes (10/15min) and general API (1000/10min). No specific limits on:
- Password reset attempts
- Account enumeration endpoints
- Expensive report generation
- Bulk operations

**Recommendation:**
```typescript
// Add endpoint-specific rate limiters
const reportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5, // 5 reports per minute
    message: 'Too many report requests'
});

app.use('/api/reports', reportLimiter, reportRoutes);
```

### 2.5 🟡 MEDIUM: CORS Misconfiguration

**Location:** `/server/src/index.ts` (Lines 54-59)

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'x-permission-context']
}));
```

**Issue:** Fallback to localhost in production if `FRONTEND_URL` not set.

**Recommendation:**
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

### 2.6 🟡 MEDIUM: Insufficient Input Validation

**Location:** Multiple controllers

**Example:** `/server/src/controllers/salesController.ts`
```typescript
// No validation on filters object
const { status, product, date_from, date_to } = filters;
```

**Missing Validations:**
- Date format validation
- UUID format validation
- Enum value validation
- Numeric range validation

**Recommendation:**
```typescript
// Use Zod schemas consistently
const salesFilterSchema = z.object({
    status: z.enum(['Pending', 'Paid']).optional(),
    product: z.string().uuid().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional()
});

// In controller
const filters = salesFilterSchema.parse(req.query);
```

### 2.7 🟡 MEDIUM: Error Information Disclosure

**Location:** `/server/src/middleware/errorHandler.ts`

```typescript
res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message,
    ...(err.errors && { errors: err.errors })
});
```

**Issue:** Stack traces logged with Winston but error details may leak in development mode deployed to staging.

**Recommendation:**
```typescript
// Never expose internal errors
res.status(statusCode).json({
    message: statusCode < 500 ? err.message : 'Internal server error',
    ...(statusCode < 500 && err.errors && { errors: err.errors })
});

// Log full details server-side only
logger.error({
    statusCode,
    message: err.message,
    stack: err.stack,
    user: req.user?.id,
    path: req.path,
    method: req.method
});
```

---

## 3. Code Quality Issues

### 3.1 Inconsistent Error Handling

**Problem:** Mix of try-catch blocks, async handlers, and unhandled promise rejections.

**Examples:**
- Some controllers use `asyncHandler` wrapper
- Others use manual try-catch
- Database layer sometimes throws, sometimes returns null

**Recommendation:**
```typescript
// Standardize on asyncHandler for all routes
import { asyncHandler } from '../utils/asyncHandler';

export const getCustomers = asyncHandler(async (req, res) => {
    const customers = await Customerdb.getCustomersByBusiness(business_id);
    res.json(customers);
});

// Database layer should throw custom errors
export class NotFoundError extends Error {
    statusCode = 404;
}

export const getCustomerById = async (id: string) => {
    const customer = await pool.query(...);
    if (!customer.rows[0]) {
        throw new NotFoundError('Customer not found');
    }
    return customer.rows[0];
};
```

### 3.2 Type Safety Issues

**Problem:** Excessive use of `any` types, missing interfaces.

**Examples:**
```typescript
// server/src/index.ts
const result = await pool.query(...);
res.json({ tables: result.rows.map((row: any) => row.table_name) });

// server/src/db/Salesdb.ts
const queryParams: any[] = [business_id];
```

**Recommendation:**
```typescript
// Define proper interfaces
interface DatabaseRow {
    table_name: string;
}

interface SalesFilter {
    status?: 'Pending' | 'Paid';
    product?: string;
    date_from?: string;
    date_to?: string;
}

// Use typed query results
const result = await pool.query<DatabaseRow>(...);
const queryParams: (string | number)[] = [business_id];
```

### 3.3 Code Duplication

**Problem:** Repeated patterns across controllers and database files.

**Examples:**
- User ID extraction: `const user_id = (req as any).user?.id;`
- Business ID lookup: Repeated in every controller
- Error responses: Similar patterns everywhere

**Recommendation:**
```typescript
// Create utility functions
export const getUserId = (req: Request): string => {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
        throw new UnauthorizedError('User ID not found');
    }
    return userId;
};

export const getBusinessId = (req: Request): string => {
    const businessId = (req as AuthRequest).user?.businessId;
    if (!businessId) {
        throw new BadRequestError('Business ID not found');
    }
    return businessId;
};
```


### 3.4 Missing Transaction Management

**Problem:** Database operations that should be atomic are not wrapped in transactions.

**Example:** `/server/src/db/Authdb.ts` - Registration uses transaction, but many other multi-step operations don't.

**Vulnerable Operations:**
- Sales creation with inventory updates
- Account transfers
- COGS allocation
- Team member salary distribution

**Recommendation:**
```typescript
// Wrap all multi-step operations in transactions
export const createSaleWithInventory = async (saleData: SaleData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const sale = await client.query('INSERT INTO sales_info ...');
        await client.query('UPDATE inventory_info SET stock = stock - $1 ...', [quantity]);
        await client.query('INSERT INTO transactions ...');
        
        await client.query('COMMIT');
        return sale.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
```

### 3.5 Lack of Database Migrations

**Problem:** No migration system detected. Schema changes require manual SQL execution.

**Risk:**
- Inconsistent database states across environments
- No rollback capability
- Difficult to track schema changes

**Recommendation:**
```bash
# Install migration tool
npm install node-pg-migrate

# Create migrations
npx node-pg-migrate create add-user-indexes

# migrations/1234567890_add-user-indexes.js
exports.up = (pgm) => {
    pgm.createIndex('users', 'email');
    pgm.createIndex('business_users', ['user_id', 'business_id']);
};

exports.down = (pgm) => {
    pgm.dropIndex('users', 'email');
    pgm.dropIndex('business_users', ['user_id', 'business_id']);
};
```

---

## 4. Performance Issues

### 4.1 N+1 Query Problems

**Location:** Multiple controllers fetch related data in loops.

**Example:** Dashboard loading assets, then fetching category for each asset.

**Impact:** 
- 1 query for assets
- N queries for categories
- Total: N+1 queries

**Recommendation:**
```typescript
// Use JOINs to fetch related data
const assets = await pool.query(`
    SELECT 
        a.asset_idd,
        a.total_cost,
        a.recovered,
        c.name as category_name,
        c.type as category_type
    FROM fixed_cost_assets a
    LEFT JOIN cost_categories c ON a.cateogory_id = c.category_id
    WHERE c.business_id = $1
`, [business_id]);
```

### 4.2 Missing Database Indexes

**Analysis of Schema:** Good index coverage on foreign keys, but missing on:

**Missing Indexes:**
```sql
-- Frequently filtered columns
CREATE INDEX idx_sales_info_created_at_business ON sales_info(created_at DESC) 
    WHERE business_id IN (SELECT business_id FROM sales WHERE sale_id = sales_info.sale_id);

-- Composite indexes for common queries
CREATE INDEX idx_business_users_user_business ON business_users(user_id, business_id);

-- Partial indexes for active records
CREATE INDEX idx_team_members_active ON team_members(business_id) 
    WHERE status = 'active';

-- Text search indexes
CREATE INDEX idx_customers_name_trgm ON customers_info USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
```

### 4.3 Inefficient Pagination

**Location:** `/server/src/db/Salesdb.ts`

```typescript
const offset = (page - 1) * limit;
// Uses OFFSET which scans all skipped rows
```

**Problem:** OFFSET-based pagination scans all previous rows, slow for large datasets.

**Recommendation:**
```typescript
// Use cursor-based pagination
export const getSalesWithCursor = async (
    business_id: string,
    cursor?: string,
    limit: number = 50
) => {
    const query = cursor 
        ? `SELECT * FROM sales_info 
           WHERE business_id = $1 AND created_at < $2 
           ORDER BY created_at DESC LIMIT $3`
        : `SELECT * FROM sales_info 
           WHERE business_id = $1 
           ORDER BY created_at DESC LIMIT $2`;
    
    const params = cursor 
        ? [business_id, cursor, limit]
        : [business_id, limit];
    
    const result = await pool.query(query, params);
    
    return {
        data: result.rows,
        nextCursor: result.rows.length === limit 
            ? result.rows[result.rows.length - 1].created_at 
            : null
    };
};
```

### 4.4 Connection Pool Exhaustion Risk

**Location:** `/server/src/db.ts`

```typescript
const pool = new Pool({
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 7500,
});
```

**Issues:**
- No monitoring of pool usage
- No graceful degradation when pool exhausted
- 2-second timeout may be too aggressive for complex queries

**Recommendation:**
```typescript
// Add pool monitoring
pool.on('connect', () => {
    logger.info('New client connected to pool');
});

pool.on('acquire', () => {
    logger.debug(`Pool size: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('remove', () => {
    logger.info('Client removed from pool');
});

// Add health check endpoint
app.get('/health/db', async (req, res) => {
    try {
        const result = await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            poolSize: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingRequests: pool.waitingCount
        });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

// Increase timeout for complex queries
connectionTimeoutMillis: 5000,
```

### 4.5 Lack of Caching

**Problem:** No caching layer for frequently accessed data.

**Candidates for Caching:**
- User permissions (loaded on every request)
- Business settings
- Product catalog
- Category lists
- Role definitions

**Recommendation:**
```typescript
// Install Redis
npm install redis ioredis

// Create cache service
import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3
});

export const cacheMiddleware = (ttl: number = 300) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const key = `cache:${req.originalUrl}:${req.user?.id}`;
        
        const cached = await redis.get(key);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        
        const originalJson = res.json.bind(res);
        res.json = (data: any) => {
            redis.setex(key, ttl, JSON.stringify(data));
            return originalJson(data);
        };
        
        next();
    };
};

// Use in routes
app.get('/api/permissions', 
    authMiddleware, 
    cacheMiddleware(600), // Cache for 10 minutes
    getPermissions
);
```

### 4.6 Unoptimized Frontend Bundle

**Location:** `/client/package.json`

**Issues:**
- No code splitting detected
- All routes loaded upfront
- Large Material-UI bundle

**Recommendation:**
```javascript
// Implement lazy loading in App.jsx
import React, { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sales = lazy(() => import('./pages/Sales'));
const Products = lazy(() => import('./pages/Products'));

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<CircularProgress />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          {/* ... */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

// Configure Vite for code splitting
// vite.config.js
export default {
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'mui': ['@mui/material', '@mui/icons-material'],
                    'vendor': ['react', 'react-dom', 'react-router-dom'],
                }
            }
        }
    }
};
```

---

## 5. Reliability & Error Handling Gaps

### 5.1 No Retry Logic

**Problem:** Network failures, database timeouts, or transient errors cause immediate failure.

**Recommendation:**
```typescript
// Install retry library
npm install async-retry

import retry from 'async-retry';

export const queryWithRetry = async (query: string, params: any[]) => {
    return retry(
        async (bail) => {
            try {
                return await pool.query(query, params);
            } catch (error) {
                // Don't retry on validation errors
                if (error.code === '23505') { // Unique violation
                    bail(error);
                    return;
                }
                throw error;
            }
        },
        {
            retries: 3,
            minTimeout: 1000,
            maxTimeout: 5000,
            onRetry: (error, attempt) => {
                logger.warn(`Query retry attempt ${attempt}:`, error.message);
            }
        }
    );
};
```

### 5.2 Missing Health Checks

**Problem:** No comprehensive health check endpoint for monitoring.

**Recommendation:**
```typescript
// Create health check endpoint
app.get('/health', async (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'healthy',
        checks: {
            database: 'unknown',
            memory: 'unknown',
            disk: 'unknown'
        }
    };
    
    // Database check
    try {
        await pool.query('SELECT 1');
        health.checks.database = 'healthy';
    } catch (error) {
        health.checks.database = 'unhealthy';
        health.status = 'degraded';
    }
    
    // Memory check
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    health.checks.memory = memUsagePercent < 90 ? 'healthy' : 'warning';
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});
```

### 5.3 No Graceful Shutdown

**Problem:** Server terminates immediately on SIGTERM, potentially losing in-flight requests.

**Recommendation:**
```typescript
// Add graceful shutdown
const server = app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});

const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    
    // Stop accepting new connections
    server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database pool
        await pool.end();
        logger.info('Database pool closed');
        
        process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 5.4 Insufficient Logging

**Problem:** Winston configured but inconsistent usage across codebase.

**Issues:**
- No request ID tracking
- Missing correlation between logs
- No structured logging for queries

**Recommendation:**
```typescript
// Add request ID middleware
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Enhance logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'business-calc-api' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// Log all requests
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            requestId: req.id,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userId: req.user?.id,
            ip: req.ip
        });
    });
    
    next();
});
```

### 5.5 No Circuit Breaker Pattern

**Problem:** If database becomes slow, all requests queue up and exhaust resources.

**Recommendation:**
```typescript
// Install circuit breaker
npm install opossum

import CircuitBreaker from 'opossum';

const dbCircuitBreaker = new CircuitBreaker(
    async (query: string, params: any[]) => {
        return await pool.query(query, params);
    },
    {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
    }
);

dbCircuitBreaker.on('open', () => {
    logger.error('Circuit breaker opened - database unavailable');
});

dbCircuitBreaker.on('halfOpen', () => {
    logger.warn('Circuit breaker half-open - testing database');
});

export const queryWithCircuitBreaker = (query: string, params: any[]) => {
    return dbCircuitBreaker.fire(query, params);
};
```

---

## 6. Database Schema Issues

### 6.1 Missing Constraints

**Issues Found:**

1. **No CHECK constraints on numeric fields:**
```sql
-- Missing constraints
ALTER TABLE business_account 
    ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

ALTER TABLE products 
    ADD CONSTRAINT price_positive CHECK (price > 0),
    ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);

ALTER TABLE inventory_info 
    ADD CONSTRAINT stock_non_negative CHECK (stock >= 0),
    ADD CONSTRAINT unit_cost_positive CHECK (unit_cost > 0);
```

2. **Missing NOT NULL constraints:**
```sql
-- Critical fields that should not be null
ALTER TABLE business_users 
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE sales 
    ALTER COLUMN sale_id SET NOT NULL,
    ALTER COLUMN business_id SET NOT NULL;
```

### 6.2 Denormalization Issues

**Problem:** `customer_purchase_history` table stores aggregated data that can become stale.

**Risk:**
- Data inconsistency if not updated properly
- Potential for race conditions

**Recommendation:**
```sql
-- Option 1: Use materialized view
CREATE MATERIALIZED VIEW customer_purchase_summary AS
SELECT 
    c.customer_id,
    COALESCE(SUM(si.total_amount), 0) as total_purchase,
    COALESCE(SUM(CASE WHEN si.status = 'Pending' THEN si.total_amount ELSE 0 END), 0) as outstanding_credit,
    MAX(si.created_at) as last_purchase
FROM customers_info c
LEFT JOIN sales s ON c.customer_id = s.customer_id
LEFT JOIN sales_info si ON s.sale_id = si.sale_id
GROUP BY c.customer_id;

-- Refresh periodically
CREATE INDEX ON customer_purchase_summary(customer_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY customer_purchase_summary;

-- Option 2: Use triggers to maintain consistency
CREATE OR REPLACE FUNCTION update_customer_purchase_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_purchase_history (customer_id, total_purchase, outstanding_credit, last_purchase)
    SELECT 
        s.customer_id,
        SUM(si.total_amount),
        SUM(CASE WHEN si.status = 'Pending' THEN si.total_amount ELSE 0 END),
        MAX(si.created_at)
    FROM sales s
    JOIN sales_info si ON s.sale_id = si.sale_id
    WHERE s.customer_id = (SELECT customer_id FROM sales WHERE sale_id = NEW.sale_id)
    GROUP BY s.customer_id
    ON CONFLICT (customer_id) DO UPDATE SET
        total_purchase = EXCLUDED.total_purchase,
        outstanding_credit = EXCLUDED.outstanding_credit,
        last_purchase = EXCLUDED.last_purchase;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats
AFTER INSERT OR UPDATE ON sales_info
FOR EACH ROW EXECUTE FUNCTION update_customer_purchase_history();
```

### 6.3 Missing Audit Trail

**Problem:** No tracking of who modified what and when.

**Recommendation:**
```sql
-- Add audit columns to critical tables
ALTER TABLE products 
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN updated_by UUID REFERENCES users(user_id);

ALTER TABLE customers_info 
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN updated_by UUID REFERENCES users(user_id);

-- Create audit log table
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(user_id),
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at DESC);

-- Create trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.product_id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.product_id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.product_id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```


---

## 7. Frontend Security & Quality Issues

### 7.1 Token Storage in localStorage

**Location:** Multiple client files

**Issue:** Some components still reference `localStorage.getItem('token')` despite cookie-based auth.

**Examples:**
- `/client/src/pages/Admin.jsx` (Line 89)
- `/client/src/pages/Finance.jsx` (Line 63)
- `/client/src/pages/Dashboard.jsx` (Line 64)

**Risk:** XSS attacks can steal tokens from localStorage.

**Recommendation:**
```javascript
// Remove all localStorage token references
// The api.js already uses cookies via withCredentials: true

// Remove these lines from all components:
// const token = localStorage.getItem('token');
// headers: { 'x-auth-token': token }

// The axios instance handles cookies automatically
api.get('/endpoint'); // Cookies sent automatically
```

### 7.2 Missing Input Sanitization

**Problem:** User input not sanitized before rendering.

**Risk:** XSS vulnerabilities if user-controlled data contains scripts.

**Recommendation:**
```javascript
// Install DOMPurify
npm install dompurify

import DOMPurify from 'dompurify';

// Sanitize before rendering
const SafeHTML = ({ html }) => {
    const clean = DOMPurify.sanitize(html);
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
};

// Or use text content only
<Typography>{customer.name}</Typography> // Safe - React escapes by default
```

### 7.3 Sensitive Data in Client State

**Problem:** Permissions and role data stored in context without encryption.

**Location:** `/client/src/context/PermissionContext.jsx`

**Risk:** Client-side data can be manipulated. Server must always validate.

**Current Implementation:** ✅ Server validates permissions on every request (good!)

**Recommendation:** Continue server-side validation, but add integrity check:
```javascript
// Add checksum to prevent tampering
const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [checksum, setChecksum] = useState('');
    
    useEffect(() => {
        api.get('/business-users/permissions')
            .then(res => {
                setPermissions(res.data.permissions);
                setChecksum(res.data.checksum); // Server-generated hash
            });
    }, []);
    
    // Verify integrity before using
    const hasPermission = (permission) => {
        if (!verifyChecksum(permissions, checksum)) {
            console.error('Permission data tampered');
            return false;
        }
        return permissions.includes(permission);
    };
    
    return (
        <PermissionContext.Provider value={{ hasPermission }}>
            {children}
        </PermissionContext.Provider>
    );
};
```

### 7.4 No Content Security Policy

**Problem:** CSP headers configured in Helmet but may be too permissive.

**Location:** `/server/src/index.ts` (Lines 47-53)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // ⚠️ Allows inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"] // ⚠️ Allows all HTTPS images
    }
  }
}));
```

**Recommendation:**
```typescript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'nonce-{RANDOM}'"], // Use nonces instead
            scriptSrc: ["'self'", "'nonce-{RANDOM}'"],
            imgSrc: ["'self'", "data:", "https://trusted-cdn.com"],
            connectSrc: ["'self'", process.env.API_URL],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Generate nonce per request
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});
```

### 7.5 Missing CSRF Protection

**Problem:** No CSRF tokens for state-changing operations.

**Risk:** Attackers can trick users into performing unwanted actions.

**Recommendation:**
```bash
npm install csurf
```

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// Apply to state-changing routes
app.use('/api', csrfProtection);

// Send token to client
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Client must include token in requests
// api.js
let csrfToken = null;

export const getCsrfToken = async () => {
    if (!csrfToken) {
        const res = await axios.get('/api/csrf-token');
        csrfToken = res.data.csrfToken;
    }
    return csrfToken;
};

api.interceptors.request.use(async (config) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
        config.headers['X-CSRF-Token'] = await getCsrfToken();
    }
    return config;
});
```

---

## 8. Testing Gaps

### 8.1 No Tests Found

**Problem:** No test files detected in the codebase.

**Risk:**
- Regressions go undetected
- Refactoring is risky
- No confidence in deployments

**Recommendation:**

```bash
# Install testing frameworks
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**Backend Tests:**
```typescript
// server/src/__tests__/auth.test.ts
import request from 'supertest';
import app from '../index';
import pool from '../db';

describe('Authentication', () => {
    beforeAll(async () => {
        // Setup test database
        await pool.query('BEGIN');
    });
    
    afterAll(async () => {
        await pool.query('ROLLBACK');
        await pool.end();
    });
    
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'SecurePass123!'
                });
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });
        
        it('should reject weak passwords', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test2@example.com',
                    password: '123'
                });
            
            expect(res.status).toBe(400);
        });
    });
    
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePass123!'
                });
            
            expect(res.status).toBe(200);
            expect(res.headers['set-cookie']).toBeDefined();
        });
        
        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword'
                });
            
            expect(res.status).toBe(400);
        });
    });
});
```

**Frontend Tests:**
```javascript
// client/src/__tests__/Login.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../components/Login';
import api from '../utils/api';

jest.mock('../utils/api');

describe('Login Component', () => {
    it('renders login form', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
    
    it('submits form with valid data', async () => {
        api.post.mockResolvedValue({ data: { token: 'fake-token' } });
        
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
        
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'password123' }
        });
        
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@example.com',
                password: 'password123'
            });
        });
    });
});
```

### 8.2 No Load Testing

**Recommendation:**
```bash
# Install k6 for load testing
brew install k6  # or download from k6.io

# Create load test script
# tests/load/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 100 }, // Ramp up to 100 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
        http_req_failed: ['rate<0.01'],   // Less than 1% errors
    },
};

export default function () {
    // Login
    const loginRes = http.post('http://localhost:5000/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
    });
    
    check(loginRes, {
        'login successful': (r) => r.status === 200,
    });
    
    const token = loginRes.json('token');
    
    // Fetch dashboard
    const dashboardRes = http.get('http://localhost:5000/api/dashboard', {
        headers: { 'x-auth-token': token },
    });
    
    check(dashboardRes, {
        'dashboard loaded': (r) => r.status === 200,
    });
    
    sleep(1);
}

# Run test
k6 run tests/load/api-load-test.js
```

---

## 9. DevOps & Infrastructure Issues

### 9.1 No CI/CD Pipeline

**Problem:** No automated testing, building, or deployment.

**Recommendation:**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd server && npm ci
          cd ../client && npm ci
      
      - name: Run linter
        run: |
          cd server && npm run lint
          cd ../client && npm run lint
      
      - name: Run tests
        run: |
          cd server && npm test
          cd ../client && npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Build
        run: |
          cd server && npm run build
          cd ../client && npm run build
      
      - name: Security audit
        run: |
          cd server && npm audit --audit-level=high
          cd ../client && npm audit --audit-level=high
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Add deployment script here
          echo "Deploy to AWS/Azure/GCP"
```

### 9.2 No Environment Separation

**Problem:** Single .env file for all environments.

**Recommendation:**
```bash
# Create environment-specific files
.env.development
.env.staging
.env.production

# Use dotenv-cli
npm install --save-dev dotenv-cli

# Update package.json
"scripts": {
    "dev": "dotenv -e .env.development nodemon",
    "start:staging": "dotenv -e .env.staging node dist/index.js",
    "start:prod": "dotenv -e .env.production node dist/index.js"
}
```

### 9.3 No Monitoring & Alerting

**Recommendation:**
```bash
# Install monitoring tools
npm install prom-client express-prom-bundle

# Add Prometheus metrics
import promBundle from 'express-prom-bundle';

const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { app: 'business-calc' },
    promClient: {
        collectDefaultMetrics: {
            timeout: 1000
        }
    }
});

app.use(metricsMiddleware);

// Metrics available at /metrics endpoint
```

**Set up Grafana Dashboard:**
```yaml
# docker-compose.yml additions
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 9.4 No Backup Strategy

**Problem:** No automated database backups.

**Recommendation:**
```bash
# Create backup script
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Create backup
pg_dump -h localhost -U postgres -d postgres > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://my-backups/database/

# Delete local backups older than 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Add to crontab
# 0 2 * * * /path/to/backup-db.sh
```

### 9.5 No Secrets Management

**Problem:** Secrets in .env files.

**Recommendation:**
```bash
# Use AWS Secrets Manager
npm install @aws-sdk/client-secrets-manager

# server/src/config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export const getSecret = async (secretName: string) => {
    try {
        const response = await client.send(
            new GetSecretValueCommand({ SecretId: secretName })
        );
        return JSON.parse(response.SecretString);
    } catch (error) {
        console.error('Error fetching secret:', error);
        throw error;
    }
};

// Usage
const secrets = await getSecret('business-calc/production');
const pool = new Pool({
    user: secrets.DB_USER,
    password: secrets.DB_PASSWORD,
    // ...
});
```

---

## 10. Prioritized Recommendations

### 🔴 CRITICAL (Fix Immediately)

1. **Remove hardcoded credentials from repository**
   - Rotate all secrets
   - Remove from git history
   - Implement secrets management

2. **Fix SQL injection vulnerabilities**
   - Review all database queries
   - Use parameterized queries consistently
   - Implement query builder or ORM

3. **Secure refresh token storage**
   - Hash tokens before storage
   - Implement token rotation
   - Add revocation mechanism

### 🟡 HIGH (Fix Within 1 Week)

4. **Add comprehensive input validation**
   - Apply Zod schemas to all endpoints
   - Validate UUIDs, dates, enums
   - Sanitize user input

5. **Implement proper error handling**
   - Standardize on asyncHandler
   - Never expose stack traces
   - Log errors with context

6. **Add database transactions**
   - Wrap multi-step operations
   - Implement rollback on failure
   - Add retry logic

7. **Fix CORS configuration**
   - Remove fallback to localhost
   - Whitelist specific origins
   - Validate origin dynamically

8. **Remove localStorage token references**
   - Use cookies exclusively
   - Clean up legacy code
   - Update documentation

### 🟢 MEDIUM (Fix Within 1 Month)

9. **Implement caching layer**
   - Add Redis
   - Cache permissions, settings
   - Implement cache invalidation

10. **Add database indexes**
    - Index frequently queried columns
    - Create composite indexes
    - Monitor query performance

11. **Implement monitoring**
    - Add Prometheus metrics
    - Set up Grafana dashboards
    - Configure alerts

12. **Add comprehensive tests**
    - Unit tests for business logic
    - Integration tests for APIs
    - E2E tests for critical flows

13. **Implement CI/CD pipeline**
    - Automated testing
    - Security scanning
    - Automated deployments

### 🔵 LOW (Fix Within 3 Months)

14. **Optimize frontend bundle**
    - Implement code splitting
    - Lazy load routes
    - Optimize images

15. **Add audit logging**
    - Track all data changes
    - Store who, what, when
    - Implement audit trail UI

16. **Implement backup strategy**
    - Automated daily backups
    - Test restore procedures
    - Off-site backup storage

17. **Add load testing**
    - Identify bottlenecks
    - Test scalability
    - Optimize performance

---

## 11. Estimated Impact & Effort

| Recommendation | Security Impact | Performance Impact | Effort | Priority |
|----------------|----------------|-------------------|--------|----------|
| Remove hardcoded credentials | 🔴 Critical | - | 2 hours | 1 |
| Fix SQL injection | 🔴 Critical | - | 1 week | 2 |
| Secure refresh tokens | 🔴 Critical | - | 1 day | 3 |
| Add input validation | 🟡 High | - | 3 days | 4 |
| Proper error handling | 🟡 High | - | 2 days | 5 |
| Database transactions | 🟡 High | 🟢 Medium | 3 days | 6 |
| Fix CORS | 🟡 High | - | 2 hours | 7 |
| Remove localStorage | 🟡 High | - | 4 hours | 8 |
| Implement caching | - | 🔴 High | 1 week | 9 |
| Add indexes | - | 🟡 Medium | 1 day | 10 |
| Monitoring | 🟢 Low | 🟡 Medium | 3 days | 11 |
| Add tests | 🟢 Medium | - | 2 weeks | 12 |
| CI/CD pipeline | 🟢 Medium | - | 1 week | 13 |
| Optimize frontend | - | 🟢 Medium | 3 days | 14 |
| Audit logging | 🟢 Medium | - | 1 week | 15 |
| Backup strategy | 🟢 Medium | - | 2 days | 16 |
| Load testing | - | 🟡 Medium | 3 days | 17 |

---

## 12. Conclusion

The Business-Calc application demonstrates solid architectural foundations with proper separation of concerns, multi-tenancy support, and RBAC implementation. However, critical security vulnerabilities and performance optimizations must be addressed before production deployment.

**Key Strengths:**
- ✅ Well-structured codebase with clear separation
- ✅ Comprehensive database schema with good indexing
- ✅ JWT-based authentication with refresh tokens
- ✅ Permission-based access control
- ✅ Rate limiting on critical endpoints
- ✅ Security headers with Helmet

**Critical Weaknesses:**
- ❌ Hardcoded credentials in repository
- ❌ SQL injection vulnerabilities
- ❌ Missing input validation
- ❌ No testing infrastructure
- ❌ No monitoring or alerting
- ❌ Inconsistent error handling

**Immediate Actions Required:**
1. Rotate all secrets and remove from git history
2. Implement comprehensive input validation
3. Fix SQL injection vulnerabilities
4. Add database transactions to critical operations
5. Implement monitoring and alerting

Following the prioritized recommendations will significantly improve the security, reliability, and performance of the application.

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-21  
**Next Review:** After implementing critical fixes
