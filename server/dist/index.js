"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = __importDefault(require("./db"));
const logger_1 = __importDefault(require("./utils/logger"));
const errorHandler_1 = require("./middleware/errorHandler");
const httpsRedirect_1 = require("./middleware/httpsRedirect");
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productCostRuleRoutes_1 = __importDefault(require("./routes/productCostRuleRoutes"));
const accountRoutes_1 = __importDefault(require("./routes/accountRoutes"));
const auth_1 = __importDefault(require("./routes/auth"));
const salesRoutes_1 = __importDefault(require("./routes/salesRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const costTargetRoutes_1 = __importDefault(require("./routes/costTargetRoutes"));
const cogsRoutes_1 = __importDefault(require("./routes/cogsRoutes"));
const assetRoutes_1 = __importDefault(require("./routes/assetRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const creditRoutes_1 = __importDefault(require("./routes/creditRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const requestRoutes_1 = __importDefault(require("./routes/requestRoutes"));
const roleRoutes_1 = __importDefault(require("./routes/roleRoutes"));
const businessUsers_1 = __importDefault(require("./routes/businessUsers"));
const dependencyRoutes_1 = __importDefault(require("./routes/dependencyRoutes"));
const recurringCostRoutes_1 = __importDefault(require("./routes/recurringCostRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 5000;
// Security: HTTPS redirect in production
app.use(httpsRedirect_1.httpsRedirect);
// Security: Helmet for security headers
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'x-auth-token', 'x-permission-context']
}));
// Security: Rate limiting for authentication endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per 15 min
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});
// Security: General API rate limiting (all authenticated endpoints)
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000, // 1000 requests per 10 minutes per user
    message: 'Too many requests from this account, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        var _a, _b;
        // Rate limit by user_id from JWT token, fallback to IP (IPv6 safe)
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (userId) {
            return `user:${userId}`;
        }
        // Use ipKeyGenerator for IPv6-safe IP handling
        return (0, express_rate_limit_1.ipKeyGenerator)((_b = req.ip) !== null && _b !== void 0 ? _b : '');
    },
    skip: (req) => {
        // Skip auth routes (they have their own stricter limiter)
        return req.path.startsWith('/api/auth');
    }
});
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Health check endpoint (no auth, no rate limit)
app.use('/', healthRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Minimal Express Server');
});
// Test database connection
app.get('/api/test-tables', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
        res.json({
            tableCount: result.rows.length,
            tables: result.rows.map((row) => row.table_name)
        });
    }
    catch (error) {
        logger_1.default.error('Database test error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}));
// Apply rate limiting ONLY to auth routes (but exclude refresh endpoint)
const authLimiterMiddleware = (req, res, next) => {
    // Skip rate limiting for refresh endpoint
    if (req.path === '/refresh') {
        return next();
    }
    return authLimiter(req, res, next);
};
app.use('/api/auth', authLimiterMiddleware, auth_1.default);
// Apply general rate limiting to all API routes (after auth middleware extracts user)
app.use('/api', apiLimiter);
app.use('/api/customers', customerRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/product-cost-rules', productCostRuleRoutes_1.default);
app.use('/api/accounts', accountRoutes_1.default);
app.use('/api/sales', salesRoutes_1.default);
app.use('/api/inventory', inventoryRoutes_1.default);
app.use('/api/cost-targets', costTargetRoutes_1.default);
app.use('/api/cogs', cogsRoutes_1.default);
app.use('/api/assets', assetRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/expenses', expenseRoutes_1.default);
app.use('/api/credits', creditRoutes_1.default);
app.use('/api/team', teamRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/requests', requestRoutes_1.default);
app.use('/api/business-users', businessUsers_1.default);
app.use('/api/dependencies', dependencyRoutes_1.default);
app.use('/api', roleRoutes_1.default);
app.use('/api/recurring-costs', recurringCostRoutes_1.default);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
const server = app.listen(port, () => {
    logger_1.default.info(`Server running at http://localhost:${port}`);
    logger_1.default.info('Application initialization complete');
});
