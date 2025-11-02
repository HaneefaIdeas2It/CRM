/**
 * Authorization middleware for role-based access control
 */

import type { Response, NextFunction } from 'express';
import { ForbiddenError } from '../../../shared/errors/AppError';
import type { AuthenticatedRequest } from './auth';

export type Role = 'ADMIN' | 'MANAGER' | 'USER';

/**
 * Check if user has required role
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('User not authenticated'));
      return;
    }

    const userRole = req.user.role as Role;
    
    if (!allowedRoles.includes(userRole)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

/**
 * Check if user owns the resource or is admin
 */
export function checkOwnership(resourceUserId: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('User not authenticated'));
      return;
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = req.user.userId === resourceUserId;

    if (!isAdmin && !isOwner) {
      next(new ForbiddenError('You do not have permission to access this resource'));
      return;
    }

    next();
  };
}

