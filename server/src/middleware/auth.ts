import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

interface JwtPayload {
  userId: string;
}

// Extend Express's Request type definition
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        isAdmin?: boolean;
        [key: string]: any;
      };
    }
  }
}

// Type guard to check if a request is authenticated
export function isAuthenticated(req: Request): req is Request & { user: NonNullable<Express.Request['user']> } {
  return req.user !== undefined;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      
      // Fetch user to get admin status
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user info to request
      req.user = {
        id: user.id,
        isAdmin: user.isAdmin
      };

      // Set auth headers
      res.setHeader('X-User-Id', user.id);
      res.setHeader('X-User-Admin', user.isAdmin ? 'true' : 'false');
      
      console.log('Auth middleware - user data:', {
        id: user.id,
        isAdmin: user.isAdmin
      });
      
      next();
    } catch (err) {
      console.error('Token verification failed:', err);
      res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Optional authentication middleware
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      // No token, but that's okay - just continue without auth
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      
      // Fetch user to get admin status
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId }
      });

      if (!user) {
        // Invalid user, but that's okay - just continue without auth
        return next();
      }

      // Add user info to request
      req.user = {
        id: user.id,
        isAdmin: user.isAdmin
      };

      // Set auth headers
      res.setHeader('X-User-Id', user.id);
      res.setHeader('X-User-Admin', user.isAdmin ? 'true' : 'false');
      
      console.log('Optional auth middleware - user data:', {
        id: user.id,
        isAdmin: user.isAdmin
      });
      
      next();
    } catch (err) {
      // Token verification failed, but that's okay - just continue without auth
      console.error('Token verification failed in optional auth:', err);
      next();
    }
  } catch (err) {
    console.error('Optional auth middleware error:', err);
    next();
  }
};

// Admin authentication middleware
export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First run the regular auth middleware
    await auth(req, res, async () => {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    });
  } catch (err) {
    res.status(403).json({ message: 'Admin access required' });
  }
};
