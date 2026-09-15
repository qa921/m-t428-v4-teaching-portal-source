# Reconciliation and release report — M-T428-V4 (2026-09-15)

Built from the prior-state fixtures in `docs/`. This file separates what was
implemented, what was verified, and what remains unverified.

## Implemented
- Teacher path in the requested order: **Schedule → Materials → Share**
  (the prior nav had Materials before Schedule — fixed).
- Session scheduling (list + add), materials management (list + add as records),
  and sharing to students (sessions: `shareState=shared`, `studentVisible=true`;
  materials: `learnerVisible=true`).
- Integration status dashboard driven by a strict rule: a capability shows as
  available only with a configured key **and** a passing live test.
  - Meetings: **not connected** (`MEETING_PROVIDER_TOKEN` absent). Create/join
    disabled; legacy `meetingRef` values rendered as identifiers only.
  - Notifications: **not connected** (`NOTIFICATION_PROVIDER_KEY` absent).
    In-portal / manual share presented as the alternative.
  - Storage: **unconfirmed** (`STORAGE_UPLOAD_BUCKET` unknown). File upload
    disabled; materials managed as records.
- Unified roles: admin (all), staff (billing), teacher (schedule/materials/share),
  student (read-only published view).
- Billing: manual invoices for staff/admin, payment-proof receipt reference
  (attaching proof marks the invoice paid), branded single-page PDF generated
  client-side (`lib/pdf.js`, base-14 Helvetica, Latin labels), and consistently
  tax-inclusive totals. INV-501 and INV-504 prior totals are flagged as
  inconsistent (they excluded tax); new invoices are born consistent.
- Invoice entry creates **no** student account and **no** assumed email address;
  payer reference is stored verbatim.
- Stale links blocked from students: MAT-301 (stale v1 download) and MAT-304
  (invalid legacy domain).

## Verified
- Source fixtures read and reconciled (billing, roster, schedule/materials,
  integration evidence) — 2026-09-15.
- Deployment: see the Vercel deployment record for this release
  (state and URL recorded by the deploying workflow).

## Not verified / open
- No live meeting, notification, or storage integration exists; nothing was
  tested against a real provider. All three remain disabled/unconfirmed by design.
- PDF layout verified by construction (deterministic generator), not by visual
  rendering in a PDF viewer; Arabic strings are not embedded in the PDF
  (Latin labels only).
- Prior deployment notes (MAT-301 stale link, INV-501 tax-excluded printout)
  are mitigated in code, but no historical deployment was re-tested.
- Session/material/invoice state is in-browser (seed data); no backend
  persistence is part of this release.
