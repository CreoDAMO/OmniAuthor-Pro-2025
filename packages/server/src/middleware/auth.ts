import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { Counter, Histogram } from 'prom-client';

// Prometheus metrics
const authRequests = new Counter({
  name: 'auth_requests_total',
  help: 'Total number of authentication requests',
  labelNames: ['status'],
});

const authDuration = new Histogram({
  name: 'auth_request_duration_seconds',
  help: 'Duration of authentication requests in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

// Define interfaces for type safety
interface JwtPayload {
  id: string;
  email: string;
  coinbaseCustomerId?: string; // Added for Coinbase integration
}

interface AuthRequest {
  user?: {
    id: string;
    email: string;
    coinbaseCustomerId?: string;
    lastLogin: Date;
  } | null;
}

// Middleware for authentication
export const authMiddleware = async (req: AuthRequest, res: any, next: any) => {
  const start = Date.now();
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      authRequests.inc({ status: 'missing_token' });
      logger.warn('No authorization header provided', { path: req.path });
      req.user = null;
      return res.status(401).json({ error: 'Authentication token required' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      authRequests.inc({ status: 'invalid_format' });
      logger.warn('Invalid authorization header format', { path: req.path, header: authHeader });
      req.user = null;
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await User.findById(decoded.id).select('+coinbaseCustomerId');
    if (!user) {
      authRequests.inc({ status: 'user_not_found' });
      logger.warn('User not found for token', { userId: decoded.id });
      req.user = null;
      return res.status(401).json({ error: 'User not found' });
    }

    // Update last login (once per day)
    if (!user.lastLogin || Date.now() - user.lastLogin.getTime() > 24 * 60 * 60 * 1000) {
      await User.findByIdAndUpdate(user.id, { lastLogin: new Date() });
      logger.info('Updated last login', { userId: user.id });
    }

    req.user = {
      id: user.id,
      email: user.email,
      coinbaseCustomerId: user.coinbaseCustomerId,
      lastLogin: user.lastLogin,
    };
    authRequests.inc({ status: 'success' });
    logger.info('User authenticated', { userId: user.id, path: req.path });
    next();
  } catch (error) {
    authRequests.inc({ status: 'error' });
    logger.error('Auth middleware error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
    });
    req.user = null;
    res.status(401).json({ error: 'Invalid or expired token' });
  } finally {
    authDuration.observe((Date.now() - start) / 1000);
  }
};