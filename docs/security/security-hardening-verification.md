# Tinzel security verification — 2026-11-02

## Outcome and scope

The ten-step security plan is implemented locally in the backend and frontend repositories. Changes were reviewed and committed in logical increments. Nothing was pushed or deployed. The implementation controls original-file access, watermarked previews, revocation and attribution; it cannot prevent a recipient capturing displayed pixels or photographing a screen.

Tests use a disposable MongoMemoryServer database, generated two-page PDF fixtures, fictional staff, two clients, assigned/unassigned designers, and a designated fictional printer. The separate loopback OTP sink is owned by `scripts/mediaTestServer.js`; it is not mounted in the production app. Production rejects `SECURITY_OTP_SINK`. No real customer documents or provider credentials are included in evidence.

## Findings and controls

| Issue found | Original risk | Implemented solution | Evidence |
|---|---|---|---|
| Upload headers, unscoped media credentials and static print paths could bypass access checks | Critical | Remove bypasses; private-media ownership/current-session authorization; explicit public covers only | `mediaSign`, private-draft/media integration tests; static paths denied |
| Roles and resource permissions could diverge between routes | High | Deny-default shared role/action policies plus current activity, role, token-version and assignment checks | `authorization.test.js`, management/proof/download integration tests |
| Original transfers lacked a reliable authorization/outcome trail | High | Durable pre-byte audit, SHA-256 snapshot, transfer ID, completion/interruption events, immutable-event outbox | `downloadSecurity.integration.test.js`, `securityAudit.test.js`; visible staff history |
| Privileged password-only or reusable browser bearer sessions | High | Email/SMS OTP; opaque hashed revocable server sessions; HttpOnly cookies; exact-origin CSRF; recent-OTP gates | `accessSessions.integration.test.js`, browser `security-hardening.spec.js` |
| Reusable printer links granted access without recipient verification | High | 24-hour job invitation, designated-phone SMS OTP, ten-minute exact-file session; revoke/reissue | API and browser printer tests; manual download/revoke/reissue |
| Old client versions and transferable previews | High | Latest released version only, revocable client sessions, tiled server-burned identity/order/version/time/session watermarks | Proof integration tests; manual manager/client screenshots and session revocation |
| Harvesting could evade per-IP/client-view limits | Medium | Shared identity/order limits plus IP limit, per-session/page events, durable harvesting alerts | Proof integration rate test; reader/prefetch/annotation browser regressions |
| Shared/fallback keys, permissive origins, missing CSP | High | Independent production keys, no database fallback, exact origins, frontend CSP, private/no-store responses | Configuration/CSRF tests; production-build browser tests with asserted CSP response header |
| Weak keyboard/error feedback in new security controls | Medium | Focus containment/return, responsive forms/table, clear OTP and revoked-printer errors; erase consumed OTP input | Production-CSP mobile dialog test; manual revocation error screenshot |

## Automated verification

- Backend: **155 passed**, zero failed (`npm test`). A subsequent focused authentication/download/audit run passed **16 tests** after improving attribution of denied downloads.
- Frontend: **26 passed**, zero failed (`npm test`).
- Production build: **passed** (`npm run build`).
- Full existing and new browser suite: **124 passed**, zero failed (`npm run test:e2e`).
- Production-build security scenarios with enforced deployment CSP: **3 passed**, zero failed (`SECURITY_PRODUCTION_PREVIEW=1 npx playwright test tests/browser/security-hardening.spec.js`). The test asserts the CSP header, exercises mobile admin SMS OTP, manager downloads/audit and printer OTP/revocation.

The suites cover invalid tokens and changed resource IDs, assigned/unassigned designers, account deactivation and role changes, absolute/idle expiry, logout/contact revocation, CSRF and hostile origins, OTP expiration/reuse/five-attempt limits, concurrent redemption, cross-channel resend limits, provider failure, audit failure/redaction/recovery, interrupted transfer/retry, obsolete client versions, printer recipient/file/status/invitation/session changes, throttling, and normal upload/review/annotation workflows. Backend tests deliberately simulate clock/state changes for expiration and rate windows instead of waiting hours. Browser regression includes 320/390/430/768/1440-width and English/Swahili cases.

## Computer-use observations

The actual Chrome interface was operated with the computer-use tool against isolated local servers (5077/5177, then a separate production-build instance on 5097/5197):

| Manual scenario | Observed result |
|---|---|
| Manager email sign-in | Password opens verification; wrong code rejected; sink-delivered code opens workspace |
| Admin SMS sign-in | Password opens SMS challenge; immediate resend rejected; correct code opens admin workspace |
| Manager magazine reader | Watermarked synthetic magazine readable; original-download control works; authorization/completion shown in history |
| Client reader for the same magazine | Client-specific watermarked page; no original-download control |
| Manager revokes client sessions while client page exists | Client reload returns session-expired sign-in instead of private content |
| Copied printer invitation | Presents SMS verification, not an original file |
| Wrong then correct printer code | Wrong code rejected; code sent only to designated synthetic phone enables file download |
| Printer download and staff audit search | History shows Designated printer with matching order/version and authorization/completion |
| Revoke and reissue printer invitation | Reissued invitation requires a fresh SMS code; revoked active access displays an error and removes download control |
| Keyboard/security controls | Security dialog focuses Close on open; automated mobile tests additionally verify no page overflow and Escape dismissal |

The browser viewport override in computer use did not change the native window dimensions; narrow-width acceptance is supported by the automated browser tests, not a physical-device claim. Expiry/concurrency/provider outages and interrupted-transfer checks were performed through deterministic integration tests, not claimed as manual browser actions.

Screenshots (all synthetic):

- [Manager watermarked preview](evidence/manager-watermarked-preview.png)
- [Client watermarked preview](evidence/client-watermarked-preview.png)
- [Staff download history](evidence/download-audit-history.png)
- [Printer download history](evidence/printer-audit-history.png)
- [Revoked printer error](evidence/printer-revoked.png)

## Commit references

Backend controls: `1969fbf`, `51c28fe`, `48ce624`, `f3ddff6`, `0f48e43`, `735a048`, `e9e48b2`, `9212919`, `ff1b5b2`, `06e0fd8`, `1cc5926`, `9a3783c`.

Frontend controls and tests: `bd8c4e9`, `528ff5a`, `e2a1004`, `01a3daa`, `6ec49cb`. Documentation/evidence are committed separately after verification.

## Production release gates and limitations

Follow backend `docs/security/rollout.md`. Live SMTP/NextSMS delivery, HTTPS reverse-proxy cookies, private cloud storage ACLs, append-only export permissions, scheduler operation and 365-day exported-log deletion require production verification before release. Those external systems were not changed. The application outbox tolerates receiver outages; monitor backlog and missing terminal transfer events. Database administrators remain outside the application RBAC trust boundary. Downloads report server transfer completion, not proof the recipient saved/read the file. Revocation applies to future requests and cannot retract already delivered pixels/files.
