"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./utils/logger"));
dotenv_1.default.config();
// Validate required environment variables
if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD environment variable is required');
}
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
const pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'postgres',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    // Connection pool configuration
    max: 20, // Maximum 20 connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Timeout connection attempts after 2 seconds
    maxUses: 7500, // Recycle connection after 7500 uses
});
// Handle unexpected pool errors
pool.on('error', (err) => {
    logger_1.default.error('Unexpected database pool error', { error: err.message, stack: err.stack });
});
exports.default = pool;
