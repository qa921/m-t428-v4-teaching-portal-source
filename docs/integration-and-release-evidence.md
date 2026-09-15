# Integration and release evidence (prior state)

- `MEETING_PROVIDER_TOKEN`: not present in the handoff inventory. Existing `meetingRef` fields are legacy identifiers; do not present meeting creation/join as enabled without a verified provider connection.
- `NOTIFICATION_PROVIDER_KEY`: not present in the handoff inventory. The UI must surface an unconnected state and an in-product/manual-share alternative.
- `STORAGE_UPLOAD_BUCKET`: status unknown; receipt references above do not prove a usable upload path.
- Prior deployment note dated 2026-09-07: learner download `MAT-301` returned a stale v1 link. No verified fix record.
- Prior deployment note dated 2026-09-09: invoice printout for `INV-501` excluded tax. No verified PDF evidence.
- Prior deployment note dated 2026-09-10: teacher navigation ordered Materials before Schedule, while requested workflow is Schedule → Materials → Share.

These are input facts, not acceptance results. Build, schema, download, and deployed behavior remain to be checked by the later workflow.