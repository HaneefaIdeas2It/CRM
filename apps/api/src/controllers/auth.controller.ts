/**
 * Authentication controller
 * Updated to use simple pg queries instead of Prisma for MVP
 */

import type { Request, Response } from 'express';
import { successResponse, errorResponse } from '@crm/shared';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../infrastructure/auth/password';
import { generateAccessToken, generateRefreshToken, JWTPayload } from '../infrastructure/auth/jwt';
import { query, queryOne } from '../config/database';
import { ConflictError, UnauthorizedError } from '../shared/errors/AppError';

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  organizationId: string;
  lastLoginAt?: Date;
}

interface Organization {
  id: string;
  name: string;
  subscriptionTier: string;
}

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName, organizationName } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid password', passwordValidation.errors));
      return;
    }

    // Check if user already exists
    const existingUser = await queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create organization
    const orgResult = await query<Organization>(
      `INSERT INTO organizations (id, name, settings, "subscriptionTier", "maxUsers", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, '{}'::jsonb, 'FREE', 5, NOW(), NOW())
       RETURNING id, name, "subscriptionTier"`,
      [organizationName]
    );
    const organization = orgResult[0];

    if (!organization) {
      throw new Error('Failed to create organization');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await query<User>(
      `INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, "organizationId", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ADMIN', $5, true, NOW(), NOW())
       RETURNING id, email, "firstName", "lastName", role`,
      [email.toLowerCase(), passwordHash, firstName, lastName, organization.id]
    );
    const user = userResult[0];

    if (!user) {
      throw new Error('Failed to create user');
    }

    res.status(201).json(successResponse({
      user,
      message: 'User registered successfully',
    }));
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find user with organization
    interface UserWithOrg {
      id: string;
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      role: string;
      isActive: boolean;
      organizationId: string;
      lastLoginAt: Date | null;
      org_id: string;
      org_name: string;
      org_subscription_tier: string;
    }

    const userResult = await query<UserWithOrg>(
      `SELECT u.id, u.email, u."passwordHash", u."firstName", u."lastName", u.role, u."isActive", 
              u."organizationId", u."lastLoginAt",
              o.id as org_id, o.name as org_name, o."subscriptionTier" as org_subscription_tier
       FROM users u
       INNER JOIN organizations o ON u."organizationId" = o.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    const userRow = userResult[0];

    if (!userRow || !userRow.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, userRow.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await query(
      'UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1',
      [userRow.id]
    );

    // Generate tokens
    const payload: JWTPayload = {
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json(successResponse({
      user: {
        id: userRow.id,
        email: userRow.email,
        firstName: userRow.firstName,
        lastName: userRow.lastName,
        role: userRow.role,
        organization: {
          id: userRow.org_id,
          name: userRow.org_name,
          subscriptionTier: userRow.org_subscription_tier,
        },
      },
      accessToken,
      refreshToken,
    }));
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new UnauthorizedError('Refresh token required');
    }

    // Import here to avoid circular dependency
    const { verifyRefreshToken } = await import('../infrastructure/auth/jwt');
    
    try {
      const payload = verifyRefreshToken(token);
      
      // Generate new tokens
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      res.json(successResponse({
        accessToken,
        refreshToken,
      }));
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    // In a stateless JWT system, logout is handled client-side
    // Server could maintain a token blacklist in Redis for advanced scenarios
    res.json(successResponse({ message: 'Logged out successfully' }));
  }
}

export const authController = new AuthController();
