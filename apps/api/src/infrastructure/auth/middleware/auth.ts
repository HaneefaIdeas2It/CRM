/**
 * Authentication middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { verifyAccessToken, JWTPayload } from '../jwt';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Authenticate user using JWT token
 */
export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const payload = verifyAccessToken(token);
    
    // Attach user to request
    req.user = payload;
    
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

