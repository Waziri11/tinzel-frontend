# Tinzel page states and branding plan

Tinzel should give people a clear, familiar response whenever a page is loading, has nothing to show, needs attention, or completes an action. This plan covers public pages, customer ordering and tracking, printer access, staff workspaces, and their important tabs and dialogs.

> **Approved on 8 November 2026.** The user approved implementation across all pages in English and Kiswahili. The original current-state notes below record the pre-implementation source audit. The implementation and verification record is appended below; production deployment is separate.

## Branding direction

| Element | Proposed Tinzel treatment |
| --- | --- |
| Identity | Reuse the existing Tinzel butterfly and wordmark. Full identity on standalone state pages; a small butterfly or relevant icon inside panels. |
| Colour | Warm ivory background `#FAF8F4`, white cards, ink text `#282720`, and Tinzel gold `#78571E` for primary actions. Use the existing green, amber, and red for success, caution, and errors, always with text and an icon. |
| Typography | Cormorant Garamond for prominent page titles; Plus Jakarta Sans for explanations, field errors, and controls. Keep small feedback text easy to read. |
| Layout | One clear title, one useful explanation, and a primary recovery action. Keep the page header, navigation, and any usable content visible when only one section fails. |
| Motion | Quiet butterfly motion for short waits; page-shaped placeholders for initial content loading; measured progress for transfers. Static fallback for reduced motion or unavailable animation. No added waiting time for decoration. |
| Voice | Warm, direct English and Swahili. Say what happened, what is saved, and what to do next. Only promise saved work or completion when confirmed. |
| Shared components | Extend the existing PageSkeleton, BrandLoading, Feedback, EmptyState, ActionButton, and transfer components into one consistent family. |
| Review gallery | After approval, build a local state gallery with a page selector, state selector, language switch, and mobile preview so every treatment can be reviewed consistently. |

## State rules for every page

Each page is assessed against the following states. Apply a state only where it makes sense: the static home and language screens do not need artificial loading or empty screens.

| State | Display and recovery rule |
| --- | --- |
| Initial loading | Preserve the layout with a matching placeholder and a specific loading label. |
| Refreshing or stale data | Keep existing content visible, indicate the refresh, and show when information may be outdated. |
| First use or truly empty | Explain why there is nothing here and offer the permitted next step. |
| No search results | Keep filters visible and provide Clear filters or Change search. |
| Unavailable or not found | Distinguish removed content, an invalid link, and a temporary request failure. Offer a valid destination. |
| Recoverable request error | Show a contextual message and Retry in the affected page or panel; preserve inputs and filters. |
| Partial failure | Keep successful sections or files usable; retry only the failed part. |
| Offline, slow request, or service unavailable | Give the known connection/service status and a safe recovery path. Do not claim maintenance unless the service explicitly reports it. |
| Validation | Explain the correction beside the field, associate it with the input, and focus the first invalid field. |
| Saving, sending, processing, uploading, downloading | Name the operation, prevent duplicate submissions, and show real progress where measurable. Distinguish bytes sent from server confirmation. |
| Success | Show the confirmed result and the next action; use a persistent panel for important outcomes and brief feedback for small changes. |
| Permission or session problem | Separate access denied, sign-in expired, additional verification, revoked access, and invalid/expired codes. Return to the intended page after successful recovery where permitted. |
| Conflict or uncertain outcome | Explain that the order/version changed or the previous result is unconfirmed. Refresh/check the saved result before retrying a mutation. |
| Unsaved work and destructive actions | Use a branded confirmation dialog; show the consequence and safe alternative. Preserve inputs when the person cancels or an action fails. |
| Technical crash | Offer a branded recovery screen with Reload and an appropriate safe destination; give accurate guidance about unsaved work. |

## Page by page plan

**Priority:** P1 covers customer access, orders, uploads, proof decisions, and misleading failure states. P2 completes administration and consistency. All 51 rows below were approved for implementation. Screens listed as panels or dialogs belong to the named page rather than separate URLs.

### Public and customer pages

| Page or surface | Current source coverage | Planned states and recovery | Priority |
| --- | --- | --- | --- |
| Language selection · first visit | Logo and language choices. | Immediate English/Kiswahili choice, visible focus and selection. Loading and empty states are not applicable. | P2 |
| Home · `/` | Immediate content; sample cover retained if optional edition artwork fails. | Designed missing-artwork fallback; keep ordering and tracking usable. | P2 |
| Catalogue · `/catalogue`, `/showcase` | Loading placeholders; error + retry; no editions; no matches; missing cover. | Unify all five treatments; preserve search and visible editions during refresh failure. | P1 |
| Edition entry · `/catalogue/:slug`, `/showcase/:slug` | Form loader; fetch failure and unavailable edition share one error. | Separate unavailable edition → Browse editions from temporary failure → Retry. | P1 |
| Order form · Details | Name/phone validation and saved-answer restoration. | Inline errors with focus; restored-draft notice; accurate saving/saved/unavailable recovery feedback. | P1 |
| Order form · Story | Required-answer checks and draft saving. | Field-level errors and summary; retain answers; branded leave/discard dialog. | P1 |
| Order form · Photographs | Empty picker; upload/confirm/progress; offline/stalled; partial failure; retry/resume; preview failures. | Keep existing recovery; distinguish saved and unfinished files; retry failed files only; consistent file-validation and preview states. | P1 |
| Order form · Review and submit | Upload readiness, saving, error, and saved-order confirmation. | Blocked-until-ready explanation; long-running and unconfirmed result states; check saved result before resubmitting. | P1 |
| Order saved and payment instructions | Saved order, awaiting payment, methods, no methods, and copy outcomes. | Distinct saved-order and payment-confirmed states; actionable unavailable-payment panel using configured contact details; clear tracking action. | P1 |
| Tracking entry and SMS code · `/track` | Restore loader; validation; sending/verifying/resend; errors; initial load retry. | Invalid/expired code, resend wait, rate limit, SMS failure, expired session, and connection failure with contextual recovery; retain entered details. | P1 |
| Tracking order overview · `/track` | Order stages, on-hold reason, payment and delivery details. | Pending/action-needed/completed treatments for every workflow stage; no-draft-yet explanation; stale-data notice and safe refresh. | P1 |
| Customer notifications · tracking dialog | Loader, empty inbox, error + retry, read/unread. | Branded inbox states; separate list refresh failure from mark-as-read failure with the correct retry. | P2 |
| Customer proof review · tracking | Reader, comments, approval and requested-change controls. | Use shared reader states; current/read-only/stale version; branded approval confirmation; retain unsent feedback; distinguish comment saved from changes submitted. | P1 |
| Audio feedback and playback · proof review | Recording, permission failure, preview/remove, validation, playback loading/error. | Consistent microphone-denied, unsupported recording, duration-limit, upload and playback failure states; attachment alternative and labeled retry. | P2 |
| Printer invitation · `/printer/:id` | English SMS verification, generic error, authorized download. | Tinzel identity and bilingual access flow; invalid/expired/revoked invitation, OTP recovery, verified access, downloading/failure and reverify; include crash recovery. | P1 |

### Staff workflow pages

| Page or surface | Current source coverage | Planned states and recovery | Priority |
| --- | --- | --- | --- |
| Workspace shell · `/staff` | Opening loader; missing-page/access-denied states; reconnect. | Consistent opening, reconnect, sign-in-expired, denied, missing-page and crash recovery; retain intended destination. | P1 |
| Pre-Design · `/staff/pre-design` | Dashboard/columns, loading, refresh, error, empty, payment and assignment actions. | Prevent failed load appearing as All clear; no-orders vs no matches; designer-list failure vs no capacity; confirm/save/success/conflict for payment, assignment, hold and resume. | P1 |
| Design Phase · `/staff/design-phase` | Shared board with design, review, returned and held stages. | Same board states; no pending reviews; current-version and blocked-action guidance; preserve visible orders during refresh. | P1 |
| Post-Design · `/staff/post-design` | Print/delivery stages and printer configuration warning. | Missing print file; printer settings unavailable vs unconfigured; authorization/acknowledgement, dispatch and closure outcomes; safe unconfirmed-action recovery. | P1 |
| Manager order drawer · `?orderId=…&tab=…` | Detail loader; Overview, Client answers, Photos, Drafts, Print & delivery, Activity. | Drawer-specific error + Retry/Close; missing order/access changed; distinct empty/unavailable states for all six tabs; retain working tabs. | P1 |
| Magazine review · `/staff/review/:id/versions/:version` | Loader, initial error with Back, missing-version text, version switch and success. | Add initial Retry; missing version → Open current version; historical/read-only banner; decision saving/saved/failed/conflict; retain corrections. | P1 |
| Designer queue · `/staff/design` | Four columns with independent load/error/retry/empty behavior. | Brand New orders, Manager returns, Client returns and Completed separately; no matches + Clear search; retain loaded cards on refresh; unavailable count differs from zero. | P2 |
| Designer order · `/staff/design/orders/:id` | Loader/error; Magazine, Corrections, Client content, Version history tabs. | Retry opening; missing/unassigned/access changed; no draft with permitted Upload action; no corrections/content/history; clear progress and next steps. | P1 |
| Returns · `/staff/returns` | Loader, error notice, filters and generic empty results. | Separate load failure, no corrections waiting, and no filter matches; Clear filters, Retry, stale-data notice and role-appropriate navigation. | P1 |
| Draft upload dialog and background uploads | Queued/checking/uploading/reconnecting/finalizing/complete/error; retry/resume/cancel. | Preserve recovery and real progress; distinguish uploaded from submitted; interrupted/expired/invalid/canceling outcomes and clear completion actions. | P1 |
| Correction review dialog | Checklist, submitting/error, changed-round block. | Incomplete/ready/zero-items states; changed-round recovery; preserve context; confirmed and unconfirmed submission outcomes. | P1 |
| Print preparation · designer order | Approval gates; reuse approved PDF or upload print file. | Explain blocked actions; validate file/specifications; show processing and confirmed result; recover interrupted/unconfirmed operations safely. | P1 |

### Sign in and account surfaces

| Page or surface | Current source coverage | Planned states and recovery | Priority |
| --- | --- | --- | --- |
| Staff sign-in · `/staff/login` | Button loader, CAPTCHA, login errors. | Signing in, invalid credentials, verification unavailable, rate limit, expired session and connection failure; retain email and destination. | P1 |
| First password setup · sign-in gate | Branded form, validation, saving/error; then workspace. | Password requirements/mismatch; expired temporary password; saving/failure; confirmed account-ready transition. | P1 |
| Password recovery · sign-in dialog | Request, SMS verification, reset, done; resend countdown/expiry. | Consistent sending/invalid/expired/delayed code, retry limit, expired reset and successful reset with Return to sign in. | P1 |
| Additional security verification · shared dialog | Busy buttons, cooldown, expiry, cancel, trusted-device choice. | Separate progress, code sent, invalid/expired code and delivery failure; successful resend must not look or sound like an error. | P1 |
| Profile and password · account dialogs | Validation, saving and error; closes after success. | Saved/password-changed confirmation; preserve entries on failure; unsaved-close handling. | P2 |
| Sessions and trusted devices · Security dialog | Loader, refresh, errors, empty messages, revoke actions. | No other sessions/devices/activity; revoke progress/success/failure; retain last-loaded records if refresh fails. | P2 |
| Assisted account recovery · admin Security section | Identity confirmation, validation, verification and outcome feedback. | Waiting/expired/cancelled challenge; recoverable failure with input retained; verified recovery success. | P1 |
| Order security tools and download history · Security dialog | Order selection, history and download/revoke/invite actions. | Before-search guidance, searching/no history, failed search, denied access; invitation outcomes and download progress; separate success from error. | P1 |

### Administration pages

| Page or surface | Current source coverage | Planned states and recovery | Priority |
| --- | --- | --- | --- |
| Forms list · `/staff/forms` | Loader, first-edition empty, no matches, error/success. | Load failure + Retry must replace misleading No editions; clear filters; publish/archive/delete outcomes. | P1 |
| Edition editor and import · Forms | Save/publish validation/progress; cover transfers; import warnings; archived state; unsaved protection. | Branded empty sections, cover failure, import/partial import, field validation, saving/publishing/saved, archived status and leave/discard dialogs. | P1 |
| Edition preview · Forms dialog | Synchronous read-only preview; sparse incomplete content. | Keep Preview label; explain missing title/questions and unsupported content. No artificial loading screen. | P2 |
| Users and workload · `/staff/users` | Loader/error, filtered roster, add/view/edit/delete dialogs. | No staff vs no matches; Add user/Clear filters; load Retry; row-level progress/success/failure; validation and conflict guidance. | P1 |
| Staff onboarding · user detail | Setup pending/expired; delivery outcomes; retry; uncertain provider acceptance warning. | Consistent issued/pending/expired/disabled/complete states; sending/accepted/delivered/unconfirmed/failed outcomes; retain duplicate-send protection. | P1 |
| Notification history and compose · `/staff/notifications` | Loader/error, filters, resend and compose; shared empty message. | Separate no history, no unread, no matches and load failure; retain message on failure; pending/partial/accepted/delivered/failed outcomes. | P1 |
| Notification triggers · admin tab | Default catalogue, save/reset and notices; load failure ignored. | Loading/load failure + Retry; prevent saving unknown defaults; changed/saving/saved/failed; explain disabled triggers. | P1 |
| Delivery health · admin tab | Diagnostic refresh and test progress/results. | Not checked/checking/not configured/unavailable/partial result; accepted vs delivered vs unconfirmed vs failed with appropriate recovery. | P2 |
| Printer notification language · Notifications | Loader and save; failed load leaves editable default. | Load error + Retry; prevent saving an unconfirmed default; changed/saving/saved/failure with selection retained. | P1 |
| System overview · `/staff/system` | Independent application/storage/messaging cards, refresh, errors and timestamps. | Per-card loading/retry; stale values; distinguish unavailable, not configured and disconnected; keep healthy cards visible. | P2 |
| System configuration · admin section | Per-setting load/error/retry/save and provider checks. | Independent failures; unsaved changes/validation/save outcomes; checking/passed/failed; warn before reloading over edits. | P1 |
| Payment options · System card | Unset, empty/all-disabled and enabled options; edit/reorder/save. | Keep all four cases distinct; validation and unsaved changes; saved/failed results; explain the customer-visible consequence of disabling every option. | P1 |
| Diagnostics and audit history · System tabs | Notification/audit tabs; some request failures ignored; blank audit empty view. | Independent loading/error/retry; no logs vs no matches; partial diagnostics; resend/test outcomes; preserve last successful records. | P1 |

### Shared readers and controls

| Page or surface | Current source coverage | Planned states and recovery | Priority |
| --- | --- | --- | --- |
| PDF reader and proof pages · customer and staff | Preparing, page retry, selection/OCR fallback, comments, read-only states. | Add initial-file-load Retry; expired access and unavailable version; slow preparation; preserve readable pages and unsent comments during partial failure. | P1 |
| Answers, photos, covers, drafts and comments · shared panels | Several empty/fallback states; thumbnail retry and pending previews. | Specific no answers/photos/drafts/comments; no filtered comments; distinguish loading, unavailable and failed previews; keep permitted original-file access. | P2 |
| Transfers and confirmations · shared controls | Progress/recovery components; some browser alerts and confirmations. | Consistent upload/download/copy/save states; honest handoff vs completion wording; branded discard/approval/archive/revoke dialogs with focus return. | P1 |

## Order journey coverage

The customer tracking overview, manager boards, and order details must each show an appropriate state for awaiting payment, payment verified, queued/assigned, in design, manager review, client review, changes requested, client approved, print preparation/review, sent to printer, printing, printing complete, dispatched, delivered, closed, and on hold. Unknown status receives a neutral explanation and refresh action. Actions remain governed by the current server-confirmed role, stage, and version.

## Example wording

These examples establish the proposed tone. Final wording will use the specific page, action, and confirmed outcome.

| Situation | English | Kiswahili | Action |
| --- | --- | --- | --- |
| Loading orders | Loading your orders… | Tunapakia oda zako… | None |
| No pending corrections | No corrections waiting. New requests will appear here. | Hakuna marekebisho yanayosubiri. Maombi mapya yataonekana hapa. | Back to orders / Rudi kwenye oda |
| Filter has no matches | No orders match these filters. | Hakuna oda zinazolingana na vichujio hivi. | Clear filters / Ondoa vichujio |
| Request failed | We couldn’t load your orders. Please try again. | Hatukuweza kupakia oda zako. Tafadhali jaribu tena. | Try again / Jaribu tena |
| Saved order | Your order has been saved. You can now view payment instructions. | Oda yako imehifadhiwa. Sasa unaweza kuona maelekezo ya malipo. | View payment instructions / Ona maelekezo ya malipo |
| Session expired | Your session has ended. Sign in again to continue. | Kipindi chako kimeisha. Ingia tena ili kuendelea. | Sign in / Ingia |
| Outdated proof | A newer version is available. Open it before approving. | Kuna toleo jipya. Lifungue kabla ya kuidhinisha. | Open latest version / Fungua toleo jipya |

## Approved implementation order

| Step | Work | Review evidence |
| --- | --- | --- |
| 1 | Agree the shared page, panel, inline, button and dialog treatments; build the local state gallery. | English/Swahili examples on desktop and mobile, including loading, empty, error and success. |
| 2 | Complete P1 public ordering, tracking, printer access, authentication and shared reader/transfer states. | Customer journeys with invalid input, slow/offline requests, partial uploads, expired access and confirmed outcomes. |
| 3 | Complete P1 manager/designer workflows and administrative failures that currently resemble empty or default data. | Role-specific empty/error/retry cases, safe version conflicts, preserved input and unconfirmed-action recovery. |
| 4 | Complete P2 consistency, account panels, diagnostics and optional artwork fallbacks. | No unstyled or ambiguous states in the approved inventory. |
| 5 | Verify every applicable state and record built/verified status separately. | Screenshots plus behavior checks for each page/state, role, language and viewport. |

Some distinctions, such as expired access, unavailable content, and version conflicts, depend on reliable server responses. During implementation, map existing error responses first and identify any missing response detail before wiring the recovery action.

## Acceptance checks

- Every applicable table entry has a loading, ready, empty, failure, recovery, and action-outcome treatment; genuinely inapplicable states are marked as such.
- A failed request never reports zero records, All clear, or an unconfirmed default setting as if loading succeeded.
- Retry targets the failed operation, preserves filters and editable input, and checks an uncertain saved result before repeating a submission.
- All wording and actions work in English and Kiswahili, including printer access, browser-dialog replacements, and shared components.
- Desktop and narrow mobile layouts remain readable; long text, keyboard navigation, focus return, screen-reader announcements, and reduced motion are checked.
- Confirmed saves, sent bytes, provider acceptance, delivered messages, payment verification, and completed downloads are described accurately.
- Permission/session states expose only allowed recovery actions. A historical or stale proof cannot be accidentally approved as the current one.
- The existing Tinzel logo and typography remain recognizable, and status meaning never depends only on colour or motion.

## Source map

Current route coverage comes from [the public router](../src/App.jsx) and [the staff router](../src/components/common/StaffWorkspace.jsx). Brand values and reusable components are defined in [the theme](../src/index.css), [shared feedback](../src/components/common/UI.jsx), [page placeholders](../src/components/common/PageSkeleton.jsx) and [brand loading](../src/components/common/BrandLoading.jsx).

| Finding or area | Source |
| --- | --- |
| Existing catalogue states; edition unavailable and request failure share a block | [Catalogue](../src/components/client/MagazineShowcase.jsx); [Order form](../src/components/client/DynamicFormRenderer.jsx) |
| Upload recovery, payment options, tracking and printer entry | [Photos](../src/components/client/PhotoUploadField.jsx); [Payment](../src/components/client/PaymentOptions.jsx); [Tracking](../src/components/client/ClientTrackingPortal.jsx); [Printer](../src/components/client/PrinterPortal.jsx) |
| Manager failure can coexist with All clear; drawer can be blank after failure | [Board load](../src/components/manager/ConveyorBeltBoard.jsx); [Empty view](../src/components/manager/ConveyorBeltBoard.jsx); [Detail drawer](../src/components/manager/ConveyorBeltBoard.jsx) |
| Designer/returns initial failures and existing independent queue recovery | [Order](../src/components/designer/DesignerOrderPage.jsx); [Returns](../src/components/designer/ReturnsPage.jsx); [Queue](../src/components/designer/DesignerQueue.jsx) |
| Reader initial metadata error lacks Retry; review initial error has Back only | [Reader](../src/components/common/PdfBookReader.jsx); [Review](../src/components/manager/MagazineReviewPage.jsx) |
| Account dialogs, session recovery and verification announcements | [Workspace](../src/components/common/StaffWorkspace.jsx); [Profile](../src/components/common/StaffProfile.jsx); [Verification](../src/components/common/SecurityVerification.jsx); [Security](../src/components/common/SecurityCenter.jsx) |
| Forms failure can look empty; audit/notification requests can fail silently | [Forms](../src/components/admin/FormBuilder.jsx); [Staff and audit](../src/components/admin/StaffWorkloadManager.jsx) |
| Trigger settings and printer language need explicit load-failure states | [Triggers](../src/components/common/NotificationsPage.jsx); [Printer language](../src/components/admin/PrinterNotificationSettings.jsx) |
| System sections, payment configuration and onboarding outcomes | [System](../src/components/common/SystemPage.jsx); [Payment settings](../src/components/admin/PaymentOptionsSettings.jsx); [Onboarding](../src/components/admin/StaffOnboardingStatus.jsx) |

## Approval

Approve the Tinzel visual direction, the full page and panel inventory, and the proposed implementation order. Specific rows can be revised or deferred before work starts. All application changes remain pending your approval.



## Implementation record · 8 November 2026

| Area | Local implementation |
| --- | --- |
| Shared identity and review page | Shared Tinzel state panels, safe error classification, branded skeletons, lightweight butterfly loading, bilingual confirmations with keyboard/focus handling, and the development-only `/__states` gallery for all 51 inventory entries. |
| Public and customer pages | Missing artwork fallback; catalogue refresh preserves results/search; missing edition differs from a temporary error; form validation and draft feedback; uncertain submissions check the existing session before retry; tracking stale/no-draft states; independent notification-action retry; bilingual printer access. |
| Manager and designer workflows | Failures no longer imply All clear, zero counts or missing printer settings; independent retries; stale content retained; drawer/tab empty states; historical review guidance; upload/print/decision uncertainty; branded leave and cancellation confirmations. |
| Administration | Failed settings loads cannot save defaults; per-section/row recovery; preserved edits; separate notification request and delivery outcomes; branded forms, users, onboarding, settings, audit and diagnostics states. |
| Authentication and account | Bilingual branded recovery/verification; supplied code-expiry and resend timers; field-level validation and focus; profile leave confirmation; confirmed access revocation separated from failed refresh; retained security results labeled with their actual search context. |
| Shared media and proof reader | Initial metadata/cover failure retry; slow preparation; local page recovery; empty answers/photos/comments and filtered comments; audio recording/playback feedback; localized preview states. |
| Navigation and opening | Deferred branded leave dialogs protect in-app navigation and browser history. The home opening ends when the app is ready; direct links open immediately, and startup no longer decodes the oversized animation atlas. |

### Verification boundaries

- Browser checks use controlled failures and a disposable local backend/database; no customer orders or production settings are changed.
- The gallery demonstrates reusable treatments. Its sample outcomes are not evidence of an actual order action.
- The server groups invalid, expired and revoked printer invitations into the same unavailable response. The UI describes unavailable access honestly instead of claiming an unreported cause.
- Public payment responses do not supply a support contact. The unavailable-payment state offers existing order/payment actions and does not invent a contact destination.
- Production release, real SMS/email provider delivery, and physical-device verification are not part of this local implementation result.


### Completed verification

| Check | Result |
| --- | --- |
| Production build | Passed on the final source (`npm run build`). The development gallery is excluded from the production bundle. |
| Unit checks | 53 passed, including safe error classification, upload recovery, transfer progress and page coverage. |
| Browser suite | All 262 unique browser scenarios passed across the full run and resumed, corrected reruns. The remaining-failures record finished with `status: passed` and an empty list. |
| New page-state scenarios | All 40 passed: independent retries, failed settings loads, stale data, missing content, uncertain submissions/decisions, draft preservation, session isolation, navigation, bilingual printer recovery and gallery behavior. |
| End-to-end journeys | Passed against the disposable local backend: order through delivery closure, manager/designer/client correction cycle, OTP access, printer revocation, and upload resumption. SMS/email use the test sink rather than live providers. |
| Accessibility and responsive behavior | English/Swahili accessibility checks passed, including contrast, valid labels, keyboard focus, horizontal keyboard scrolling, 200% layout equivalent and phone/tablet/desktop reflow. Gallery checks passed at 390px and 1440px in both languages. |
| Audio | Valid audio decoded in preview and history; damaged playback recovered through local retry; denied microphone access retained the attachment option; recording released the microphone before submission. |
| Source hygiene | Final whitespace/diff check passed. Production release was subsequently approved by the user; release verification is recorded separately. |

Gallery screenshots are retained in the workspace plan’s `state-evidence/` folder: `states-en-390.png`, `states-en-1440.png`, `states-sw-390.png` and `states-sw-1440.png`. English desktop and Swahili mobile screenshots were visually reviewed. The local review page is `/__states` and remains a sample-state gallery, not a production route or a live order workspace.
