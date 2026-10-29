# Protected reader performance verification — 29 October 2026

## Changes

Page-turn animation retains requests in the useful prefetch window instead of cancelling and restarting them. The reader still limits decoded pages to ten and concurrent loads to two. A separate per-reader memory cache retains up to 32 compressed watermarked bundles, bounded to 32 MiB including estimated text geometry. It is cleared when the reader is disposed; no browser disk cache is added. Navigation prioritizes the destination and next spread over remaining batch pages.

Interior pages use their own dimensions, with facing pages aligned at the spine. Selection markers remain visible while writing. Newer typing survives completion of an earlier save, and metadata responses cannot overwrite annotations saved after those requests began. Save retries reuse a mutation reference scoped by author, version, and review party. The server rejects reuse for changed content. Reader order queries include the concurrency revision so concurrent saves cannot append the same receipt twice.

## Evidence and limits

The existing live magazine was tested for page navigation, distant jumps, fullscreen, and private comment persistence after reopening. The clearly labelled temporary annotation was discarded and its absence confirmed. No correction round was submitted. Live observations preceded deployment of these changes and are not evidence of improved production latency.

Local validation: 81 backend tests, 21 frontend unit tests, production frontend build, and all 30 browser journeys pass (including 15 targeted reader/workspace journeys). Regression checks cover retained prefetch requests, compressed-cache bounds and isolation, decoded-page reuse without another network fetch, idempotent comment replay/concurrency, and preserving newer typing during a delayed save. Browser journeys also exercise desktop and mobile layout, reduced motion, normalized annotation coordinates, upload progress/resume, and historical versions.

The user authorized deployment of the backend followed by the frontend. Post-deployment live verification is tracked separately from these local results. No claim is made here about production p95 latency or 150–500 MiB upload throughput.

## Deployment follow-up

Backend deployment `tinzel-backend-p07fox74i-stryxis.vercel.app` and initial frontend deployment `tinzel-frontend-m45519ct7-stryxis.vercel.app` completed successfully. Reloading the live user tab returned to sign-in, interrupting post-deployment verification. The existing profile loader cleared credentials on every error, including transient failures. It now retains credentials after temporary failures and displays a retry screen without protected content; 401/403 responses still clear the session. Both browser regressions pass, and the production build passes. The user has been asked to sign back in for the remaining live verification.

Final frontend deployment: `tinzel-frontend-6mx7e616k-stryxis.vercel.app`, aliased to `https://tinzel.stryxis.com`. After sign-in, two further reloads preserved authentication. The live reader displayed its cover, turned through opening spreads, jumped to pages 20–21, returned to pages 4–5, and was left fullscreen at pages 6–7. A temporary page-20 area comment showed its unsaved marker, saved, persisted after reload, and was discarded; zero comments and Saved were confirmed. The order remained Draft Manager Review. Final screenshot: `/tmp/tinzel-live-reader-verified.png`. These are functional live checks, not a controlled latency or large-file throughput benchmark. The two additional authentication browser regressions passed after the full 30-test suite.

## Flexible paper turn and request overlap

The page-turn overlay now uses 16 connected hinges with curved geometry, continuous lighting, a cast shadow, and a short settling motion. Its 640 ms duration is shared with the navigation lock. Original annotation surfaces stay untransformed. The overlay reuses existing decoded image URLs; no additional page fetch or animation dependency is added. Reduced motion still skips the turn, and mobile remains single-page.

Cover transfer now starts alongside metadata rather than waiting for metadata to return. Older compatible image responses are reused rather than discarded and downloaded a second time. Page authorization queries omit unrelated annotation/history payloads. Durable access-audit writes overlap watermark processing and must finish before delivery; authorization and private/no-store responses remain enforced.

Watermark WebP encoding retains quality 85 with effort 2. An eight-iteration local sample measured median encoding at 101 ms versus 144 ms with effort 4; output was 126,278 versus 122,156 bytes. This is one local sample, not an end-to-end production benchmark. Previous production page-20 logs showed prepared responses at 397, 414 and 880 ms; initial page preparation logged 1,140 ms rendering plus 463 ms opening the PDF.

Validation: 81 backend tests, 21 frontend unit tests, all 34 browser journeys, production build, and whitespace checks passed. New browser checks prove cover transfer starts before delayed metadata completes, compatible image delivery avoids a redundant raw-image fetch, and the paper curves through connected hinges then settles. Mid-turn synthetic screenshot: `/tmp/tinzel-paper-curl.png`.

Deployed backend `tinzel-backend-miz6sigjb-stryxis.vercel.app` and frontend `tinzel-frontend-bvxzyip5a-stryxis.vercel.app` to the existing production aliases. A separate authenticated verification tab displayed the cover, curved forward/backward turns, distant pages 20–21, cached revisits, and single-page navigation. DOM inspection during the live turn confirmed sixteen different 3D hinge transforms. An area selection opened its correctly referenced comment form and was cancelled without saving; comments remained zero. The user's original tab was left untouched. The first prepared page-20 response in this check logged 759.676 ms server time and 108,906 bytes. This sample does not establish a production percentile or a consistent end-to-end improvement. The loading changes remove serial work and unnecessary downloads; network latency and first-time preparation remain separate costs.

## Mobile binding correction

Single-page turns no longer pivot around the page centre. The left binding remains fixed: forward folds the outgoing sheet away, while backward unfolds the incoming sheet over the still-visible current page. Single-page turns use an unprinted reverse face rather than showing the destination as a mirrored card back. Desktop spread geometry is unchanged.

Validation: 21 unit tests, 20 reader/workspace browser journeys, production build, and whitespace checks passed. The new mobile regression checks the fixed left binding in both directions, outgoing/incoming page identity, absence of destination imagery on the reverse face, and preservation of the current page beneath a backward fold. Existing mobile swipe, touch landscape, reduced-motion, zoom, and annotation checks passed. A synthetic mid-fold screenshot is saved at `/tmp/tinzel-mobile-edge-fold.png`; these browser checks do not constitute physical-device testing.

Deployed frontend `tinzel-frontend-4n3z2m74u-stryxis.vercel.app` to `https://tinzel.stryxis.com`. Live single-page forward/backward checks confirmed a 0 px left transform origin, no reverse-face page image, and a stationary current page beneath the incoming backward fold. The verification tab was closed; the user's original tab and production comments were unchanged.
