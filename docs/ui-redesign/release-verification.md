# Tinzel production UI release

The production application now uses the approved local prototype's warm editorial direction, shared fonts and tokens, accessible action colors, bilingual public and staff navigation, guided addressable ordering, compact staff records and protected proof presentation.

## Scope and compatibility

- Existing React service interfaces, API payloads, database schemas, authentication and notification templates are retained. No migration or production seeding is included.
- Public links remain `/`, `/catalogue`, `/showcase`, `/track` and the existing `/staff/*` destinations. An edition opens at `/catalogue/:slug?step=details|story|photos|review`.
- Manager details use the current phase path with `?orderId=:id&tab=overview|answers|photos|drafts|production|activity`.
- Answer/upload storage keys and the 24-hour answer draft expiry remain intact. Language changes preserve stored option values, zero values and entered content. User-authored content uses its configured translation or existing fallback.
- Payment configuration, assignment capacity, workflow status, reviewed versions, proof release, correction verification, printing and delivery permissions remain server-controlled. Unconfirmed manager mutations require checking the saved record before repetition.
- Private proof originals have no customer/designer download action. Existing protected image pages, watermarks, selection geometry, page caches, spreads, mobile reader and version restrictions remain in use.
- Edition administration supports search, publication status filters, archived read-only editions and a preview covering all 16 field types. Diagnostic test recipients start empty.

## Coverage and evidence

[Production coverage JSON](production-coverage.json) and [CSV](production-coverage.csv) map all **111 views and 438 states** to actual routes, components and interactions. The original [audit](audit.md), [inventory](inventory.json) and [implementation notes](implementation-notes.md) remain versioned alongside them.

The 1,752 language/viewport combinations describe design traceability. They are not 1,752 separate manual screenshot reviews. Shared components are exercised through the browser workflows and responsive cases; the exact run totals are recorded in `quality-gates.json`. Representative screenshots in [evidence](evidence) use isolated fictional test records and the supplied brand artwork.

Local verification includes:

- Frontend unit and coverage-integrity checks; backend unit/integration/adversarial checks; production build.
- The repaired full browser suite rejects unexpected mocked API requests. Real workflow mutations use a separate in-memory database, disposable files and simulated external providers.
- Ordering, payment verification, assignment, manager return, designer response, customer revision, reviewed-version checks, whole-magazine approval, print gates, dispatch and closure are exercised against that isolated API.
- Interrupted/partial uploads, resumed transfers, missing previews, failed comments, selection retries, old versions, fullscreen, mobile turns, ambiguous notifications, assignment conflicts, unconfigured printing and expired sessions have explicit checks.
- English and Kiswahili layouts at 1440 and 390 pixels; 320, 430 and 768 pixel reflow; 720 CSS pixels as the layout equivalent of a 1440px desktop at 200% zoom.
- Automated WCAG 2 A/AA, 2.1 AA and 2.2 AA checks, including contrast and labels, plus keyboard focus containment/return and reduced-motion reader/loading cases.

Automated checks do not certify accessibility or inbox delivery. Physical screen-reader/device testing and real provider delivery are separate from this release's isolated/browser evidence. Production verification remains read-only: no real payments, customer approvals, print actions or outbound test messages are performed.

## Preview and production procedure

1. Preserve the successful production deployments below.
2. Push the tested branches and build the frontend Vercel preview. Verify its exact commit, ready status, assets, direct routes, live catalogue and authentication boundaries using read-only requests.
3. Merge the reviewable commits without force-pushing. Keep the existing Vercel projects, rewrites and production configuration.
4. Verify the new production deployments, exact commits, public assets/routes, catalogue and both health endpoints. Save the final rollout record in the task's workspace release artifact.

## Previous production deployments and rollback

Frontend before release: commit `b29ef47cb9f45bd01f0dcfa4e25ae8cbdcc606bd`, deployment `dpl_BfzbPfmi3Dt9SQL8MTJULqYrZGUn`, [deployment](https://tinzel-frontend-l1w9l3cix-stryxis.vercel.app).

Backend before release: commit `ea85365a2b3761775737669c704dffd21992104d`, deployment `dpl_EvFCUo4JGSneJHSz24NHKSY79dYL`, [deployment](https://tinzel-backend-co37mda0a-stryxis.vercel.app).

For broken access, ordering or protected review, restore the prior frontend deployment immediately. From the linked frontend project, use `npx vercel rollback dpl_BfzbPfmi3Dt9SQL8MTJULqYrZGUn --yes` and verify the production alias and health again. The backend equivalent is `npx vercel rollback dpl_EvFCUo4JGSneJHSz24NHKSY79dYL --yes` from its linked project if needed. The backend changes extend the isolated test harness and patch redirect/archive dependencies. The production dependency audit is clean; the development-only nodemon/minimatch advisories are documented in the backend repository.

No data rollback is required. Keep the previous deployment available until post-release checks are complete. The exact successful rollback targets were inspected before promotion; a live rollback is intentionally not rehearsed against customer traffic.

## Dependency review

Both production dependency audits report zero vulnerabilities. The backend release includes a separate redirect/archive dependency patch, verified by its 119 tests and the isolated end-to-end browser journey. The backend repository records the upstream advisory links and development-only audit entries in `docs/ui-redesign-dependency-review.md`.
