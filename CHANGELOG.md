# Changelog

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
