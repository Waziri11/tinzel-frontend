# Magazine annotations — implementation and verification

The shared protected reader now follows the QAMS interaction pattern without delivering source PDFs to browsers. Read, Select text, Select image and Mark area remain distinct modes. Native PDF text is aligned using font family, rotation, direction, baseline and measured run-width scaling. Mobile selection handles remain active until Add comment is tapped; the current native range is read at that exact moment. The desktop composer is anchored to the selection; the mobile sheet follows the visual viewport so its actions stay above the keyboard. Unfinished text must be saved or discarded before replacing its target.

The existing PDF.js renderer records raster-image placements. Geometry schema 2 includes text metrics and image quads with normalized bounds and deterministic region IDs. Image selection uses containing polygons and chooses the smallest overlapping bounding region. Image comments are validated against server geometry and persist a copy of the authoritative rectangle and quad. Rasterized collages and scans remain page images; vector artwork and individual objects inside flattened images use manual area marks. No OCR, semantic segmentation or reply threads were added.

Comments use persistent IDs and numbered pins. The list groups by page, keeps its controls visible, filters by All/Current page/Private/Open/Addressed and supports previous/next navigation. Pins and list rows focus each other. Correction status, round information and designer responses are derived from existing checklist records. Submitted annotations, release permissions, assignment checks, correction gates and historical versions retain their existing rules.

## Compatibility and performance

New renders include geometry. Existing page images stay readable while separate idempotent `geometryOnly` proof jobs prepare selection data for visible pages. These jobs reuse the leased worker, bounded PDF context/range reads, and lower priority than image preparation; they do not replace page images. `/prepare` accepts `{pages, geometryOnly:true, retry:true}` for explicit retries. Page bundles and text-position responses add `geometryVersion` and `imageRegions`; old annotations and clients remain compatible. Geometry refresh updates the bounded browser cache without fetching the image again. Polling is bounded and periodically re-kicks queued work; failure leaves reading and manual marking available.

## Local evidence

- Backend: 83 tests passed, including real PDF image extraction, overlaps/rotation/clipping, authoritative anchors, idempotency, geometry-only upgrades, retry, private/released-version access, stale-version rejection, correction submission and designer response.
- Frontend: 24 unit tests passed, including image hit testing, legacy status behavior and image-preserving geometry cache upgrades.
- Browser journeys exercise native partial-word selection, mobile selection adjustments, keyboard viewport changes, image selection, comment filters/navigation, draft replacement choices, retries, historical versions, zoom and existing book turns.
- Renderer smoke passes locally with real raster placement recording. Local runtime is macOS; deployment verification must confirm the Vercel Linux path separately.
- Originals remain private; page responses remain authenticated, watermarked and private/no-store. No bulk backfill or new infrastructure purchase is needed.

## Deployment and live checks

Backend `tinzel-backend-ofpbw92x2-stryxis.vercel.app` was deployed first, followed by frontend `tinzel-frontend-9sbau3bwj-stryxis.vercel.app`, both on their existing production aliases. All 40 browser journeys passed; the final bounded-retry change passed five focused checks, and the latest-click-wins navigation adjustment passed two focused checks. The final frontend build passed.

The existing live version opened and prepared geometry for its cover and interior pages on Vercel. The cover exposed one detected page-image region and opened the image-linked composer. The cover and pages 6–7 had no native PDF text, so their individual words/photos correctly use the area tool under the selected no-OCR/no-segmentation scope. Manual marking opened the anchored composer, then the draft was cancelled. The comment filters/navigation rendered, and comments remained zero. No production review comment or correction round was submitted. Live text selection on a native-text production PDF was not exercised; real native text/image extraction, saving, persistence and checklist tracking were exercised in local backend/browser tests. Native mobile selection-handle behavior was simulated in Chromium, not tested on a physical phone.

Live UI screenshot: `/tmp/tinzel-live-annotation-editor.png`. Synthetic populated-list and mobile-editor screenshots: `/tmp/tinzel-linked-comments-desktop.png`, `/tmp/tinzel-text-comment-mobile.png`.
