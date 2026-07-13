import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface AccessPayload {
  sub: number;
  role: string;
  type: 'access';
}

export function signAccess(userId: number, role: string): string {
  return jwt.sign(
    { sub: userId, role, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
  );
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, config.jwt.accessSecret) as unknown as AccessPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
