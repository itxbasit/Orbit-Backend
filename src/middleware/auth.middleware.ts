import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export class AuthMiddleware {
  static async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    try {
      // Try to get token from cookie first, then from Authorization header
      let token = req.cookies?.accessToken;
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        // Set as anonymous user
        req.user = {
          userId: 'anonymous',
          name: 'Anonymous User',
          email: 'anonymous@example.com',
          role: 'user',
          isAuthenticated: false
        };
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const user = await User.findOne({ userId: decoded.userId });

        if (!user) {
          req.user = {
            userId: 'anonymous',
            name: 'Anonymous User',
            email: 'anonymous@example.com',
            role: 'user',
            isAuthenticated: false
          };
          return next();
        }

        req.user = {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          isAuthenticated: true
        };

        next();
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          // Token expired, but we don't auto-refresh here
          // Client should call /api/auth/refresh to get new tokens
          req.user = {
            userId: 'anonymous',
            name: 'Anonymous User',
            email: 'anonymous@example.com',
            role: 'user',
            isAuthenticated: false
          };
          return next();
        }
        throw error;
      }
    } catch (error) {
      logger.error('Authentication error:', error);
      req.user = {
        userId: 'anonymous',
        name: 'Anonymous User',
        email: 'anonymous@example.com',
        role: 'user',
        isAuthenticated: false
      };
      next();
    }
  }

  static requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || !req.user.isAuthenticated) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please login or register.'
      });
      return;
    }
    next();
  }

  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
      return;
    }
    next();
  }
}