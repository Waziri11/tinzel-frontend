# Tinzel loading and media UX

Implemented 18 October 2026. Frontend-only changes; no storage, order-workflow, payment, or worker-scheduling changes.

## Experience

- Catalogue and form loading reuse the existing Tinzel butterfly, gold/cream palette, and editorial typography. Animation uses lightweight transforms and opacity; reduced-motion preferences disable it.
- The upload panel reports byte-weighted progress, transferred size, completed-photo counts, and real stages. Uploads never display 100% until the server confirms all files. No speculative countdown or invented estimate is shown.
- Customers can fill in their details while two files transfer at a time. A compact return-to-progress link stays available. After submission starts, the submitted fields are locked until completion/failure so displayed details cannot diverge from the submitted snapshot.
- Completed photos collapse into a summary. Active transfers and files requiring attention remain visible, with per-file retry/removal. Field-level selected-file lists also collapse.
- Recovery confirmation is shown only after browser storage succeeds. When storage is unavailable, customers are told to keep the page open. Completed uploads survive refresh; unfinished files still require reselection.
- After 20 seconds without progress across active transfers, a message explains the delay without assuming a specific cause. Offline messaging is separate. Screen readers receive stage/count updates, not live announcements for every byte or percentage change.
- Confirmed order creation gets a short success treatment followed by payment instructions. This is not presented as payment verification or magazine production completion. The payment handoff wraps long submission IDs on small screens.
- Staff can continue browsing orders while an archive prepares. Queued/running/ready/failure messages follow the server state. Download-again uses the original order even if another order is currently selected. Polling stops when the workspace unmounts and individual requests time out after 30 seconds.
- Preview placeholders retain access to originals and offer manual refresh for delayed/unavailable thumbnails. Grids use a static butterfly rather than animating every image.

## Checks

```sh
npm test
npx playwright test --config playwright.ux.config.js tests/browser/loading-ux.spec.js tests/browser/media.spec.js
```

The UX configuration builds and serves a production bundle against the sibling backend's disposable MongoDB test server. It requires installed dependencies and Google Chrome. It does not use customer data.

The new unit checks cover byte weighting, confirmed completion, stalled transfers, and byte labels. Browser checks cover reduced motion, interactive uploading, server-confirmed stages, collapsed summaries, mobile payment layout, storage failure, slow connections, and Kiswahili milestones. The staff preview/archive UI test uses synthetic mocked responses; the existing backend integration tests separately cover actual preview/archive generation and downloads.

No production deployment is part of this change. Existing large-bundle build warnings are unchanged in category; physical-device testing and worker-backlog improvements remain separate work.
