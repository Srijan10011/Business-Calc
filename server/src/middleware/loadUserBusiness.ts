import { Request, Response, NextFunction } from 'express';
import * as Business_pool from '../db/Business_pool';

export const loadUserBusiness = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const businessId = await Business_pool.Get_Business_id(userId);
    (req as any).businessId = businessId;
    (req as any).userId = userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'No business access' });
  }
};
