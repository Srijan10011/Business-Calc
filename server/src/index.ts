import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
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

dotenv.config();

const app: Express = express();
const port = 5000;

app.use(cors());
app.use(express.json());

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
    console.error('Database test error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/product-cost-rules', productCostRuleRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/auth', authRoutes);
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

const server = app.listen(port, () => {
  console.log(`⚡️[server]: Minimal Express Server is running at http://localhost:${port}`);
  console.log('Minimal application initialization complete. Server should now be active.');
});

// No unhandledRejection handler for minimal test, let it crash if it has to.



