import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import serverless from 'serverless-http';
import { Handler } from '@netlify/functions';
import authRouter from '../../src/routes/auth';
import adminRouter from '../../src/routes/admin';
import publicRouter from '../../src/routes/public';
import { errorHandler } from '../../src/middleware/errorHandler';

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});
app.use(globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.2.0' });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

app.get('/fleet', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Fleet – Shakti Logistics</title>
<style>body{font-family:sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#e0e0e0;background:#121212}h1{color:#ff6b35}h2{color:#ff8c5a}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #333;padding:.5rem;text-align:left}th{background:#1e1e1e;color:#ff6b35}.note{color:#888;font-style:italic}a{color:#ff6b35}</style>
</head>
<body>
<h1>Our Fleet</h1>
<p>Shakti Logistics operates a modern fleet of Euro Truck Simulator 2 vehicles. Below is an overview of our current equipment.</p>
<table>
<tr><th>Vehicle</th><th>Type</th><th>Notes</th></tr>
<tr><td>Scania S 730</td><td>Heavy Haul</td><td>Flagship — long-haul operations</td></tr>
<tr><td>Volvo FH16 750</td><td>General Cargo</td><td>Versatile workhorse</td></tr>
<tr><td>MAN TGX 18.640</td><td>Refrigerated</td><td>Temperature-sensitive loads</td></tr>
<tr><td>DAF XG+ 530</td><td>Light Freight</td><td>Regional deliveries</td></tr>
<tr><td>Iveco S-Way 570</td><td>Bulk Transport</td><td>Dry bulk &amp; tanker</td></tr>
</table>
<p class="note">Fleet composition may change. Contact leadership for the current roster.</p>
<p><a href="/rules">View Rules</a> &middot; <a href="/terms">Terms of Service</a></p>
</body>
</html>`);
});

app.get('/rules', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Rules – Shakti Logistics</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#e0e0e0;background:#121212}h1{color:#ff6b35}h2{color:#ff8c5a}ol li{margin:.5rem 0}a{color:#ff6b35}</style>
</head>
<body>
<h1>VTC Rules</h1>
<p><em>Last updated: July 2026</em></p>
<ol>
<li><strong>Respect</strong> — Treat all drivers, staff, and other road users with courtesy. Harassment or toxic behaviour will not be tolerated.</li>
<li><strong>Simulation Rules</strong> — Follow TruckersMP and SCS Software rules at all times while representing Shakti Logistics.</li>
<li><strong>Convoy Attendance</strong> — Members are expected to attend at least one convoy per month. Extended absence requires prior notice to leadership.</li>
<li><strong>Cargo Integrity</strong> — Damage caused by reckless driving or intentional crashes is unacceptable.</li>
<li><strong>Communication</strong> — Join our Discord server and remain contactable. Leadership announcements are mandatory reading.</li>
<li><strong>Reporting</strong> — Report any issues or rule violations to a manager or owner via Discord.</li>
<li><strong>Tagging</strong> — All members must use the official VTC tag <code>[SLOG]</code> in their in-game name while representing the company.</li>
<li><strong>Consequences</strong> — Violations may result in warnings, demotion, suspension, or permanent removal at leadership discretion.</li>
</ol>
<p><a href="/fleet">View Fleet</a> &middot; <a href="/terms">Terms of Service</a></p>
</body>
</html>`);
});

app.get('/terms', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Terms of Service – Shakti Logistics</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#e0e0e0;background:#121212}h1{color:#ff6b35}h2{color:#ff8c5a}hr{border-color:#333}a{color:#ff6b35}</style>
</head>
<body>
<h1>Terms of Service</h1>
<p><em>Last updated: July 2026</em></p>
<h2>1. Acceptance</h2>
<p>By creating an account and using Shakti Logistics ("the VTC"), you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
<h2>2. Membership</h2>
<p>Membership is granted at the discretion of VTC leadership. We reserve the right to suspend or terminate accounts for violations of these terms.</p>
<h2>3. Conduct</h2>
<p>Members must behave respectfully toward all drivers, staff, and partners. Harassment, cheating, or disruptive behaviour will result in immediate removal.</p>
<h2>4. Game Rules</h2>
<p>All members must follow TruckersMP and SCS Software rules while representing the VTC in Euro Truck Simulator 2.</p>
<h2>5. Changes</h2>
<p>These terms may be updated at any time. Continued use after changes constitutes acceptance of the new terms.</p>
<h2>6. Contact</h2>
<p>For questions, contact the VTC leadership via our Discord server.</p>
<hr>
<p><a href="/privacy">Privacy Policy</a></p>
</body>
</html>`);
});

app.get('/privacy', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Privacy Policy – Shakti Logistics</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#e0e0e0;background:#121212}h1{color:#ff6b35}h2{color:#ff8c5a}hr{border-color:#333}a{color:#ff6b35}</style>
</head>
<body>
<h1>Privacy Policy</h1>
<p><em>Last updated: July 2026</em></p>
<h2>1. Data We Collect</h2>
<p>When you create an account, we collect your email address and a securely hashed password. We also record when you accepted these terms.</p>
<h2>2. How We Use Data</h2>
<p>Your email is used solely for account management and password reset requests. We never share, sell, or distribute your personal data to third parties.</p>
<h2>3. Data Retention</h2>
<p>Account data is retained while your account is active. You may request deletion at any time by contacting leadership.</p>
<h2>4. Security</h2>
<p>Passwords are hashed with bcrypt (cost factor 12). Refresh and reset tokens are stored as SHA-256 hashes. Plaintext secrets are never persisted.</p>
<h2>5. Cookies</h2>
<p>We use HTTP-only cookies for session management where applicable. No tracking or analytics cookies are used.</p>
<h2>6. Your Rights</h2>
<p>You may request a copy of your data or ask for its deletion. Contact us on Discord to exercise these rights.</p>
<hr>
<p><a href="/terms">Terms of Service</a></p>
</body>
</html>`);
});

app.use(errorHandler);

export const handler: Handler = serverless(app);
