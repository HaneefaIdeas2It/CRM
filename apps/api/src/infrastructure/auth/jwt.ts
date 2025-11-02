/**
 * JWT token generation and verification
 */

import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRATION_TIME as string,
    issuer: 'crm-system',
    audience: 'crm-users',
  } as jwt.SignOptions);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRATION_TIME as string,
    issuer: 'crm-system',
    audience: 'crm-users',
  } as jwt.SignOptions);
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: 'crm-system',
      audience: 'crm-users',
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'crm-system',
      audience: 'crm-users',
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

