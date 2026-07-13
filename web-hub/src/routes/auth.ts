import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool';
import { signAccess, generateRefreshToken, hashToken, verifyAccess } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { config } from '../config';
import rateLimit from 'express-rate-limit';

const router = Router();

const signupLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxAuth,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});

const loginRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxLogin,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email || '';
    return `${ip}:${email}`;
  },
  message: { error: 'Too many login attempts. Try again later.' },
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' }) }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// ── POST /api/auth/signup ──
router.post('/signup', signupLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (email, password_hash, role, consent_terms_at)
       VALUES ($1, $2, $3, now()) RETURNING id, email, role, consent_terms_at, created_at`,
      [email, passwordHash, 'member']
    );

    const user = result.rows[0];
    const accessToken = signAccess(user.id, user.role);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);

    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiry]
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, consentTermsAt: user.consent_terms_at, createdAt: user.created_at },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('signup error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const result = await query(
      'SELECT id, email, password_hash, role, consent_terms_at, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = signAccess(user.id, user.role);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);

    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiry]
    );

    res.json({
      user: { id: user.id, email: user.email, role: user.role, consentTermsAt: user.consent_terms_at, createdAt: user.created_at },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('login error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/refresh ──
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { refreshToken } = parsed.data;
    const tokenHash = hashToken(refreshToken);

    const result = await query(
      `SELECT rt.id, rt.user_id, rt.expires_at, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const row = result.rows[0];

    if (new Date(row.expires_at) < new Date()) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    await query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);

    const newAccessToken = signAccess(row.user_id, row.role);
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRefreshToken);

    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [row.user_id, newTokenHash, expiry]
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('refresh error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/logout ──
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { refreshToken } = parsed.data;
    const tokenHash = hashToken(refreshToken);

    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);

    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ──
router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  try {
    const payload = verifyAccess(header.slice(7));
    const result = await query(
      'SELECT id, email, role, consent_terms_at, created_at FROM users WHERE id = $1',
      [payload.sub]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const u = result.rows[0];
    res.json({ user: { id: u.id, email: u.email, role: u.role, consentTermsAt: u.consent_terms_at, createdAt: u.created_at } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ── POST /api/auth/forgot-password ──
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email } = parsed.data;

    const result = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      res.json({ message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    const user = result.rows[0];
    const resetToken = generateRefreshToken();
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + config.passwordReset.tokenExpiresMs);

    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetLink = `${config.corsOrigin}/reset-password/${resetToken}`;
    console.log(`[password-reset] Link for ${email}: ${resetLink}`);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('forgot-password error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/reset-password ──
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const result = await query(
      `SELECT id, user_id, expires_at FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or already used reset token' });
      return;
    }

    const row = result.rows[0];

    if (new Date(row.expires_at) < new Date()) {
      await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id]);
      res.status(400).json({ error: 'Reset token has expired' });
      return;
    }

    const passwordHash = await hashPassword(password);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, row.user_id]);

    await query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [row.id]
    );

    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [row.user_id]);

    res.json({ message: 'Password has been reset. Please log in with your new password.' });
  } catch (err) {
    console.error('reset-password error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
