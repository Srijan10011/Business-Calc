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

const server = app.listen(port, () => {
  console.log(`⚡️[server]: Minimal Express Server is running at http://localhost:${port}`);
  console.log('Minimal application initialization complete. Server should now be active.');
});

// No unhandledRejection handler for minimal test, let it crash if it has to.



