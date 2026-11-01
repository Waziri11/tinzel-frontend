# Tinzel redesign — implementation handoff

Design date: 1 November 2026. This stage changes design artifacts only. Backend and frontend application repositories remain unchanged.

## Source of truth and navigation

- The active local coverage matrix links each screen, state, language and viewport. Screen identifiers remain stable in `inventory.json`; the editable prototype is in `local-prototype/`. Earlier Figma IDs remain archived in `figma-state.json` and are not the active handoff.
- Retain the existing public destinations `/`, `/catalogue` (including the `/showcase` alias), `/track`, and the current `/staff/*` phase, queue, returns, notification, form and user routes.
- During implementation, make selected editions and form steps URL-addressable, retain an order identifier while changing detail tabs, and support Back/Forward. Proposed nested URL shape: `/catalogue/:slug` with the current questionnaire step represented in the query string. Validate slugs through the existing public-form lookup.
- Anonymous visitors see ordering and tracking. Customers see only their authenticated order and released drafts. Designers see assigned work, returns and their notifications. Managers see phase worklists, review actions, returns and appropriate communications. Administrators additionally manage editions, team accounts, settings and audit history. Never infer permissions solely from navigation visibility.
- A prototype is a sample-data walkthrough, not authentication or an API client. Do not treat a prototype transition as a successful workflow action.

## Visual and responsive contract

- Retain the supplied Tinzel logo and cover asset; retain Cormorant Garamond for editorial headings and Plus Jakarta Sans for body, labels and controls.
- Semantic colors: canvas `#FAF8F4`, surface `#FFFFFF`, ink `#282720`, muted `#67645B`, line `#DED9CD`, decorative gold `#C5A059`, primary action `#78571E`. Semantic success, warning, error and information colors are defined in the prototype CSS tokens.
- Prefer the shared semantic CSS tokens over raw values. New variable names use `--tinzel-*`; map them to the existing CSS/Ant Design theme centrally during implementation. Decorative gold must not carry essential text or status information by itself.
- Desktop reference width is 1440px. Customer content is centered; staff tools use a compact left navigation and a flexible content region. Mobile reference width is 390px, with 20px content padding and a collapsed menu. All page containers must shrink without fixed minimum tracks that overflow.
- At 320–430px, reduce columns to a single content flow, wrap controls and preserve 44px minimum action targets. Forms use the available width. Tables become labeled records with a single clear detail action; keep secondary information in the record detail.
- At tablet widths, collapse staff navigation when content cannot fit comfortably, use two catalogue columns where room permits, wrap filters and toolbars, and switch the reader between single-page and spread according to available page width. Do not force desktop tables or a two-page spread onto a phone.
- Preserve reading order in the DOM. Responsive rearrangement must not create a different keyboard order from the visible order.

## Component and interaction contract

- Use shared field, feedback, status, action, navigation, record, upload and reader patterns. Default/hover/pressed/focus/disabled/busy appearances require implementation testing; a design variant alone is insufficient.
- Every field has a persistent label. Telephone fields use appropriate input mode and autocomplete; OTP entry supports paste, leading zeros and the server's actual length. Do not hardcode a resend countdown that the server does not provide.
- A busy mutation prevents accidental resubmission. Preserve inputs while waiting. Do not automatically replay mutations after ambiguous failures; first reload the saved record or use an existing idempotent operation.
- Distinguish first-use empty lists, zero filtered results, missing records and failed loads. Keep selected filters when retrying. Avoid turning an outage into a “no editions” message.
- Validation uses a concise summary plus field-specific feedback. Focus the first invalid field. An asynchronous failure must not clear unrelated form values.
- First-visit language selection remains explicit; subsequent visits restore the saved preference. Switching language must preserve the order/form context. Both English and Kiswahili include labels, helpers, errors, confirmations and status explanations.

## Accessibility and motion

- Text contrast: at least 4.5:1 for ordinary text and 3:1 for large text. Visible component boundaries and focus indicators need sufficient non-text contrast. Statuses use labels and icons as well as color.
- Minimum actionable touch area: 44×44px. Small icons receive an appropriately sized hit area and a specific accessible label. Clickable rows must support Enter/Space as appropriate to their semantic control.
- Dialogs: set the accessible name; move focus inside on opening; contain Tab; restore focus to the trigger on close. Escape closes only when safe. If transfer finalization cannot be cancelled, explain that state and prevent data loss.
- Drawers and mobile navigation follow the same focus and dismissal rules. Confirm before discarding unsaved answers, comments or publication edits.
- Errors use an alert where immediate attention is required; non-urgent loading/save status uses a status live region. Do not repeatedly announce polling updates.
- Respect reduced motion. No auto-rotating copy is required in the redesigned home. Reader navigation must retain a usable instant transition option.
- Set the document language to `en` or `sw`. Verify zoom/reflow at 200% and keyboard access through every journey after implementation.

## Ordering, files and payment

- Preserve all 16 native question types and stable field identifiers. Translated option labels must not change stored answer values. Imported form content remains a one-time copy into a private draft.
- Describe exactly what is recovered from browser storage. Provide resume and discard controls, handle storage denial and expiry, and clear locally retained personal content when no longer needed. Preserve the current 24-hour personal-draft expiry; confirm separate uploaded-media retention against the backend policy.
- Show actual per-file and per-edition restrictions from the current form/API. Draft PDFs currently advertise a maximum of 500 MB; do not apply that limit to covers, customer photographs or print files.
- Uploads distinguish selected, queued, transferring, retrying, server-confirming and ready. Keep transfer progress below completion until the server confirms the asset. Retry failed files without duplicating ready ones. Resume requires selecting the matching file.
- Photo preview availability and ZIP archive generation are separate jobs. Preserve job/order association while staff browse another record. Never replace a missing preview by silently requesting a protected original.
- Submission creates a saved order and payment instructions. Payment verification is a separate manager action. Tracking and production availability follow existing server rules. Read all real prices, payment numbers, references and support details from configured sources; do not copy invented design values into production.

## Review, permissions and official history

- The client sees only released draft versions; a private replacement must not hide an earlier released version. Reader images, text metadata and annotations remain protected.
- Keep the book-style reader, desktop spreads and mobile single-page navigation. No client-facing original-PDF download is introduced.
- Selection modes depend on metadata. Text selection requires usable text geometry; image selection requires image-region metadata; flattened pages offer explicit area marking. Persist normalized coordinates and keep page/version context.
- Show comment saving, saved, failed and retry states. Preserve the exact text and selected target on failure. Do not discard a comment until the server acknowledges the discard.
- Whole-magazine approval and correction submissions use the reviewed version. On version conflict, preserve notes, reload the released/current version and require a fresh decision. Existing `expectedVersion` checks remain authoritative.
- Manager release, client approval, return checklists, verification of all fixes, print authorization, printer progress, dispatch and delivery closure retain their existing gates. Never auto-advance an order because a notification was merely accepted.
- Holds preserve the previous stage and record a reason and next action. Capacity conflicts reload eligible designers and leave the order unchanged until the server confirms assignment.
- History preserves historical actor identity, version, action and time. Do not rewrite old actors when users are edited or deactivated.

## Team and communications

- The server generates initial staff credentials. Administrators choose role, language, contact details and capacity; they do not choose or retrieve users' passwords. Reissue creates a new credential generation and records delivery outcome without exposing the secret.
- Account deactivation shows active-assignment blockers and required reassignment. Preserve audit records and distinguish an inactive account from a deleted historical actor.
- Show queued/pending, provider accepted, delivered, failed and simulated attempts separately. “Accepted” is not proof of receipt. Display a sanitized reference for diagnostics; never show OTPs, credentials or raw provider secrets.
- An unsuccessful notification does not undo a successfully persisted business action. Keep both outcomes visible and make retry eligibility explicit.
- Sending a test message is an explicit action in the implemented app. Local prototypes do not send messages. Persist useful sanitized diagnostics and history before provider calls where required by the server workflow.

## Backend dependencies to resolve during implementation

No endpoints, schemas or migrations are changed here. Reuse current public-form, client tracking, staff authentication, manager, designer, admin, notification, media and proof APIs. Any missing safe error categories, delivery receipts, retry eligibility, rate limits, durable transfers, session revocation, capacity reservations or idempotency guarantees must be implemented server-side; The local prototype does not supply them.

## Implementation acceptance journeys

1. In both languages, choose an edition, complete every question type, recover a draft, upload photos, fix validation and submit once; distinguish saved submission from verified payment.
2. Enter tracking details, handle bad/expired codes and delivery/network failures, retain a valid session during an outage, and show every server order status with the correct next action.
3. Open a released proof, navigate/zoom, add text/image/area comments where supported, recover a failed save, submit corrections, inspect a historical version and handle stale approval safely.
4. As manager, search/filter phase lists, inspect full details, verify payment, assign within capacity, review/return/release a draft, hold/resume, authorize print and record dispatch/delivery evidence.
5. As designer, find active work, answer every correction, upload/resume a draft, verify all fixes, browse versions and prepare the approved print file.
6. As administrator, edit all field types, review Google import warnings, preview/publish/archive, manage team access and inspect credential delivery, notification outcomes and sanitized audit history.
7. Exercise keyboard-only use, dialog dismissal, focus restoration, reduced motion, translation reflow and 320/390/430/768/1440px layouts. Test the implementation, not just the local design screens.
