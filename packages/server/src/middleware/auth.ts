import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';


export const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }


    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
    
    const user = await User.findById(decoded.id);
    if (!user) {
      req.user = null;
      return next();
    }


    // Update last login
    if (!user.lastLogin || Date.now() - user.lastLogin.getTime() > 24 * 60 * 60 * 1000) {
      await User.findByIdAndUpdate(user.id, { lastLogin: new Date() });
    }


    req.user = user;
    next();
  } catch (error) {
    logger.warn('Auth middleware error:', error);
    req.user = null;
    next();
  }
};
