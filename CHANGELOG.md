# Changelog

## v0.2.0 — 2026-07-14

### Web Hub / Member Portal (Level 2 — "Foundation")

- **Fleet page** — static `/fleet` route displaying current VTC vehicle lineup (Scania, Volvo, MAN, DAF, Iveco)
- **Rules page** — static `/rules` route with the eight official VTC rules
- **Static event list** — public `GET /api/events` endpoint returning upcoming convoy/event data
- **Manual member roster** — admin-only CRUD at `/api/admin/roster` for driver name, join date, rank, and status
- **Simple JWT login** — member/admin sign-in at `POST /api/auth/login` with access + refresh token rotation
- **Password reset / account recovery** — `POST /api/auth/forgot-password` (generates one-time link) and `POST /api/auth/reset-password` (consumes token)
- **Terms of service + privacy policy pages** — static `/terms` and `/privacy` routes; signup requires `termsAccepted: true`
- **Basic rate limiting** — `express-rate-limit` on login (5 req/window) and apply-form endpoints, plus a global 100 req/window limiter
- **PostgreSQL-backed data layer** — schema for `users`, `refresh_tokens`, `password_reset_tokens`, `roster_entries`, and `events`; parameterized queries via `pg` connection pool
- **TypeScript compilation fixes** — resolved type-level issues in `jwt.ts` and `admin.ts` for clean `tsc` build

### No regressions

- No test suites exist in the repository. TypeScript compilation (`tsc --noEmit`) passes cleanly, confirming zero regression from the prior v0.1.0 baseline.

## v0.1.0 — 2026-07-13

### Static Landing Page (Level 1 — "Starter")

- **Static one-pager** — hero with VTC name/tagline, about section, rules summary, "apply to join" form, and a disabled Desktop Tracker "coming soon" card
- **Apply-to-join form** — fields: name, Steam/TruckersMP profile URL, timezone, experience, why-join; client-side validation with inline error messages; honeypot spam protection; success/error states after submit
- **Serverless form handler** — Netlify Function (`netlify/functions/submit.js`) forwarding submissions to a Google Sheets Apps Script web app
- **Google Sheets backend** — Apps Script endpoint (`google-sheet-endpoint/code.gs`) appending form submissions as rows
- **Deployment config** — `netlify.toml` with build settings, function routing, security headers, and CSP; deployed to **https://shaktilogistics.netlify.app**
- **Dark trucking-industry aesthetic** — fully responsive, semantic HTML, accessible form controls, zero framework dependencies

### No regressions

- No test suites exist in the repository. All pre-existing directories (`API-Client/`, `API-Documentation/`, `API-Types/`, `ets2-sdk-plugin/`) are untouched.
