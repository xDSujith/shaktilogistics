import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function req(key: string, hint?: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required env var: ${key}${hint ? ` (${hint})` : ''}`);
  }
  return val;
}

function opt(key: string, def: string): string {
  return process.env[key] || def;
}

function num(key: string, def: number): number {
  const v = process.env[key];
  return v ? parseInt(v, 10) : def;
}

export const config = {
  port: num('PORT', 4000),
  nodeEnv: opt('NODE_ENV', 'development'),
  databaseUrl: req('DATABASE_URL', 'postgres://user:pass@host:5432/db'),
  corsOrigin: opt('CORS_ORIGIN', 'http://localhost:3000'),

  jwt: {
    accessSecret: req('ACCESS_TOKEN_SECRET', 'random 64+ char string'),
    accessExpiresIn: opt('ACCESS_TOKEN_EXPIRES_IN', '15m'),
    refreshSecret: req('REFRESH_TOKEN_SECRET', 'random 64+ char string'),
    refreshExpiresIn: opt('REFRESH_TOKEN_EXPIRES_IN', '7d'),
  },

  rateLimit: {
    windowMs: num('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxAuth: num('RATE_LIMIT_MAX_AUTH', 10),
    maxLogin: num('RATE_LIMIT_MAX_LOGIN', 5),
    maxApply: num('RATE_LIMIT_MAX_APPLY', 5),
  },

  passwordReset: {
    tokenExpiresMs: num('PASSWORD_RESET_EXPIRES_MS', 60 * 60 * 1000),
  },

  isDev: () => config.nodeEnv === 'development',
  isProd: () => config.nodeEnv === 'production',
} as const;
