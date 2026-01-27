"use strict";
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
const db_1 = __importDefault(require("./db"));
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
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
        console.error('Database test error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}));
app.use('/api/customers', customerRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/product-cost-rules', productCostRuleRoutes_1.default);
app.use('/api/accounts', accountRoutes_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/sales', salesRoutes_1.default);
app.use('/api/inventory', inventoryRoutes_1.default);
app.use('/api/cost-targets', costTargetRoutes_1.default);
app.use('/api/cogs', cogsRoutes_1.default);
app.use('/api/assets', assetRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/expenses', expenseRoutes_1.default);
app.use('/api/credits', creditRoutes_1.default);
const server = app.listen(port, () => {
    console.log(`⚡️[server]: Minimal Express Server is running at http://localhost:${port}`);
    console.log('Minimal application initialization complete. Server should now be active.');
});
// No unhandledRejection handler for minimal test, let it crash if it has to.
