// Authentication and authorization constants
export const AUTH_CONSTANTS = {
  // Token expiry times
  ACCESS_TOKEN_EXPIRY: 3600, // 1 hour in seconds
  ACCESS_TOKEN_EXPIRY_MS: 3600000, // 1 hour in milliseconds
  
  // Rate limiting
  RATE_LIMITS: {
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10 // 10 attempts per window
    },
    API: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 1000 // 1000 requests per window
    }
  }
};

// Status constants
export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CLOSED: 'closed',
  RUNNING: 'Running',
  PAID: 'Paid',
  UNPAID: 'Unpaid'
} as const;

// User roles
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
} as const;

// Transaction types
export const TRANSACTION_TYPES = {
  INCOMING: 'Incomming', // Note: keeping original spelling for DB compatibility
  OUTGOING: 'Outgoing'
} as const;

// Account types
export const ACCOUNT_TYPES = {
  CASH: 'Cash Account',
  BANK: 'Bank Account',
  CREDIT: 'Credit Account',
  DEBIT: 'Debit Account'
} as const;
