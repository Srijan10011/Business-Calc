import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import pool from './db';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { httpsRedirect } from './middleware/httpsRedirect';
import { validateCsrfToken } from './middleware/csrfMiddleware';
import healthRoutes from './routes/healthRoutes';
import csrfRoutes from './routes/csrfRoutes';
import customerRoutes from './routes/customerRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productCostRuleRoutes from './routes/productCostRuleRoutes';
import accountRoutes from './routes/accountRoutes';
import authRoutes from './routes/auth';
import salesRoutes from './routes/salesRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import costTargetRoutes from './routes/costTargetRoutes';
import cogsRoutes from './routes/cogsRoutes';
import assetRoutes from './routes/assetRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import expenseRoutes from './routes/expenseRoutes';
import creditRoutes from './routes/creditRoutes';
import teamRoutes from './routes/teamRoutes';
import reportRoutes from './routes/reportRoutes';
import requestRoutes from './routes/requestRoutes';
import roleRoutes from './routes/roleRoutes';
import businessUsersRoutes from './routes/businessUsers';
import dependencyRoutes from './routes/dependencyRoutes';
import recurringCostRoutes from './routes/recurringCostRoutes';

// Load .env from project root (two levels up from dist/index.js)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app: Express = express();
const port = 5000;

// Security: HTTPS redirect in production
app.use(httpsRedirect);

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// Security: CORS configuration
const configureCORS = () => {
  // In production, FRONTEND_URL must be set
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL environment variable is required in production');
  }

  // Support multiple origins (comma-separated)
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000']; // Dev defaults

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'x-auth-token', 'x-permission-context', 'x-csrf-token']
  });
};

app.use(configureCORS());

// Security: Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Security: General API rate limiting (all authenticated endpoints)
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000, // 1000 requests per 10 minutes per user
  message: 'Too many requests from this account, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by user_id from JWT token, fallback to IP (IPv6 safe)
    const userId = (req as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    // Use ipKeyGenerator for IPv6-safe IP handling
    return ipKeyGenerator(req.ip ?? '');
  },
  skip: (req: Request) => {
    // Skip auth routes (they have their own stricter limiter)
    return req.path.startsWith('/api/auth');
  }
});

app.use(express.json());
app.use(cookieParser());

// Health check endpoint (no auth, no rate limit)
app.use('/', healthRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Minimal Express Server');
});

// Test database connection
app.get('/api/test-tables', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    res.json({ 
      tableCount: result.rows.length,
      tables: result.rows.map((row: any) => row.table_name)
    });
  } catch (error) {
    logger.error('Database test error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Apply rate limiting ONLY to auth routes (but exclude refresh endpoint)
const authLimiterMiddleware = (req: Request, res: Response, next: any) => {
  // Skip rate limiting for refresh endpoint
  if (req.path === '/refresh') {
    return next();
  }
  return authLimiter(req, res, next);
};

app.use('/api/auth', authLimiterMiddleware, authRoutes);

// CSRF token endpoint (no CSRF protection needed for GET)
app.use('/api', csrfRoutes);

// Apply general rate limiting to all API routes (after auth middleware extracts user)
app.use('/api', apiLimiter);

// Apply CSRF protection to all state-changing API routes
app.use('/api', validateCsrfToken);

app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/product-cost-rules', productCostRuleRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cost-targets', costTargetRoutes);
app.use('/api/cogs', cogsRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/business-users', businessUsersRoutes);
app.use('/api/dependencies', dependencyRoutes);
app.use('/api', roleRoutes);
app.use('/api/recurring-costs', recurringCostRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

const server = app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
  logger.info('Application initialization complete');
});




