# Reconciliation and release report — M-T428-V4

## v2 (2026-09-15) — server-backed release

### Implemented
- **Server authentication & RBAC:** `/api/auth` (login/logout/me), bcrypt
  password checks in Postgres (`portal_verify_user`, pgcrypto), 12h session
  tokens; every API route enforces role membership server-side. Client has no
  role switcher.
- **Persistent storage (Supabase project `zgkkoavrxxgjsykwazkq`):**
  `portal_users`, `portal_sessions`, `portal_courses`, `portal_lessons`,
  `portal_materials`, `portal_invoices`, `portal_receipts`, `portal_audit_log`.
- **Teacher path:** Schedule → Materials → Share (fixed order). Lessons and
  materials persist; sharing sets student visibility server-side and is audited.
- **Admin tools:** user list/create (explicit, password >= 8), role change,
  activate/deactivate (self-deactivate blocked), password reset with session
  revocation, audit log view (last 200 events).
- **Billing:** manual invoices by staff/admin; tax-inclusive totals computed
  server-side; `payer_ref` stored verbatim (no account/email creation — the API
  has no email field at all); invoice lifecycle issue / mark-paid (server
  rejects without uploaded proof or legacy receipt ref) / void (reason
  required); branded client-side PDF.
- **Payment proof upload:** real file upload (<= 2MB) to private Supabase
  Storage bucket `portal-receipts` via `/api/receipts`; marks invoice paid;
  audited.
- **Confirmations:** share, invoice create/void/mark-paid/issue, receipt
  upload, user create/role/deactivate/password reset — all require explicit
  confirmation and are written to the audit log.
- **Honest integrations:** `/api/integrations` live-checks database and storage
  on every request; meetings/notifications report "not-connected" (no provider
  keys configured).

### Verified (checked during this workflow)
- Schema + seed created: 4 users, 6 courses, 6 lessons, 6 materials, 6
  invoices, bucket `portal-receipts` (SQL count check).
- Password verification: `portal_verify_user('USR-401', correct)` returns the
  user; wrong password returns empty (tested via SQL).
- Vercel env vars set: `SUPABASE_URL` (plain), `SUPABASE_SERVICE_ROLE_KEY`
  (sensitive) for production+preview.

### Not verified / open
- End-to-end HTTP behavior of `/api/*` on the deployed URL (no live HTTP test
  tool was available in this workflow; Firecrawl had no credits, Supadata was
  rate-limited). Deployment readiness is reported separately.
- PDF visual rendering (generator is deterministic; not opened in a viewer).
- Meetings/notifications integrations remain unconnected by design until real
  provider keys exist and pass a live test.
- RLS on `portal_*` tables is not enabled; access control is enforced by the
  serverless layer using the service role. Enabling RLS + policies is a
  recommended hardening step.

## v1 (2026-09-15, superseded)
Static in-browser preview: teacher path, honest integration display,
tax-inclusive billing, branded PDF. Limitations (no auth, no server, no
persistence) were documented and are addressed in v2 above.
