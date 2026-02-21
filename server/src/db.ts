import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from './utils/logger';

dotenv.config();

// Validate required environment variables
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable is required');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'postgres',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Connection pool configuration
  max: 20,                      // Maximum 20 connections in pool
  idleTimeoutMillis: 30000,     // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout connection attempts after 2 seconds
  maxUses: 7500,                // Recycle connection after 7500 uses
});

// Handle unexpected pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message, stack: err.stack });
});

export default pool;
