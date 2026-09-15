# M-T428-V4 Teaching Portal

Static, no-build implementation of the education portal release, reconciled from the
prior-state fixtures in `docs/`.

## Run / deploy
No build step. Serve the repository root as static files (Vercel project with
framework "Other", no build command, output = repository root).

## Scope of this release
- **Teacher path in the requested order:** Schedule → Materials → Share
  (fixes the prior navigation that put Materials before Schedule).
- **Honest integration states:** meetings / notifications / storage render as
  *not connected* or *unconfirmed* unless a configured key **and** a successful
  live test exist. Meeting creation/join and file upload are disabled;
  legacy `meetingRef` values are shown as identifiers, never as join links;
  in-portal (manual) sharing is the notification alternative.
- **Unified roles & billing:** admin/staff have billing access; teacher manages
  schedule/materials/sharing; student is read-only over published items.
- **Billing:** manual invoices for staff, payment-proof receipt references,
  branded PDF export per invoice, and consistently tax-inclusive totals
  (`total = amountExTax × (1 + taxRate)`). Prior inconsistent records
  (INV-501, INV-504) are flagged; their stale totals are not trusted.
- **No phantom identities:** entering invoice data never creates student
  accounts or assumed email addresses (there is no email field at all).
- Stale material links (MAT-301 v1 download, MAT-304 invalid domain) are
  blocked from the student view until re-uploaded.

See `docs/reconciliation-report.md` for what is verified vs. still unverified.
