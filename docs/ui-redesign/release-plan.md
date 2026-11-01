# Production redesign release

The approved local prototype is the visual reference. This folder versions the source audit and 111-view / 438-state inventory. The CSV records design references, not proof that production acceptance is complete.

## Commit sequence
1. Backend: isolated disposable browser fixtures, simulated providers.
2. Frontend: strict browser fixtures and versioned acceptance inventory.
3. Design foundations and bundled fonts.
4. Public/staff navigation and bilingual shells.
5. Customer ordering and addressable guided forms.
6. Secure tracking and recovery.
7. Protected reader presentation.
8. Manager workspace and addressable details.
9. Designer revisions and production.
10. Edition/form administration.
11. People and communications.
12. Release verification and deployment evidence.

## Acceptance rules
Use existing API payloads and server-authoritative permissions, approval/version/printing gates. Preserve answer/upload storage keys and 24-hour expiry. No fictional records, role selector or simulated provider UI from the prototype enters production. Actual provider statuses remain distinct. Local checks, isolated browser checks, preview and production evidence must be recorded separately.

## Rollback
Record the current Vercel production deployment before promotion. Restore that deployment for access, ordering or proof regressions. No database migration is included. Keep API rewrites and existing production environment settings.
