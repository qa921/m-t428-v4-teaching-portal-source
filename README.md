# M-T428-V4 Teaching Portal

## v2 (current) — server-backed release
Static client + Vercel serverless API (`/api/*`) backed by a dedicated,
persistent Supabase Postgres schema (`portal_*` tables) and a private storage
bucket (`portal-receipts`).

- **Authentication:** login with user id + password (bcrypt via pgcrypto
  `portal_verify_user`), server-issued 12h session tokens in `portal_sessions`.
  No client-side role switching.
- **Server-enforced RBAC:** every `/api/*` route checks the session and role
  (admin / staff / teacher / student) before reading or writing.
- **Persistent data:** lessons, materials, invoices, receipts, users, audit log.
- **Admin tools:** user create / role change / deactivate / password reset
  (password reset also revokes sessions), plus the audit log viewer.
- **Billing:** manual invoices (no student account or email is ever created —
  `payer_ref` is stored verbatim), tax-inclusive totals computed server-side,
  branded PDF, payment-proof upload to storage, invoice issue / mark-paid
  (requires proof) / void (requires reason).
- **Confirmations:** every sensitive action asks for explicit confirmation in
  the UI and is written to `portal_audit_log`.
- **Integrations:** `/api/integrations` reports each capability as connected
  only when a key is configured AND a live check passes at request time.
  Meetings and notifications have no provider keys → always "not connected".
  Database and receipt storage are live-checked on every call.

### Initial accounts (change passwords after first login)
| ID | Role | Initial password |
|---|---|---|
| USR-401 | admin | `Admin#T428-2026` |
| USR-402 | staff | `Staff#T428-2026` |
| USR-403 | teacher | `Teacher#T428-2026` |
| USR-404 | student | `Student#T428-2026` |

### Required Vercel env vars
`SUPABASE_URL` (plain), `SUPABASE_SERVICE_ROLE_KEY` (sensitive, server-only).

See `docs/reconciliation-report.md` for verified vs. unverified items.

## v1 (superseded)
The first release was a static, in-browser preview without backend. Its code
was replaced by v2; the history remains in git.
