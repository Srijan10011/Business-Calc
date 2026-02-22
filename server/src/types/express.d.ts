// Extend Express Request interface with custom properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
      userId: string;  // Set by loadUserBusiness middleware
      businessId: string;  // Set by loadUserBusiness middleware
      userPermissions?: string[];
    }
  }
}

export {};
