# Phone and tablet responsiveness audit — 4 November 2026

## Coverage

The route audit visits each screen directly, so it also catches styles accidentally dependent on previously visited pages. It checks English and Kiswahili at 320, 390, 600, 768, 820, 1024 and 1180 CSS pixels. Interaction checks include 844 × 390 landscape and use touch input in Chromium and WebKit.

| Area | Screens and states checked |
| --- | --- |
| Public | Home, catalogue, all four order steps, all 16 question types, tracking sign-in, staff sign-in, missing route |
| Customer | Protected proof, zoom and paging, correction form, long delivery references, notifications |
| Manager | All three workflow phases, returns, users, notifications, system; payment, assignment, print authorization, printer progress, dispatch, delivery, hold and resume dialogs |
| Designer | Queue, order, corrections, client content, history, PDF upload dialog, normal/fullscreen reader, returns |
| Administrator | Edition list, full editor, preview, users/add-user dialog, system/provider settings, notification settings/health/composer |
| Shared | Workspace drawer, profile dialog, account security, loading/error states, transfer controls, language switching, focus restoration |
| Printer | SMS request, code entry/verification, authorized-download control |

The regression suites additionally exercise saved proof annotations, failed/retried uploads, correction confirmation, onboarding, profile saves, notification preferences and the order-to-delivery workflow. The checks measure the document **and** internal staff/dialog scroll containers; deliberately scrollable PDF pages and data grids retain their own scrolling.

## Changes

- Moved staff shell sizing, drawer layout, menu-button and narrow-screen spacing into the eagerly loaded shell stylesheet.
- Reflowed user records into labeled cards through tablet widths, with visible touch actions.
- Wrapped system/return filters and customer decision controls; stacked narrow correction and delivery forms.
- Removed fixed minimum grid widths from contact/photo layouts and wrapped long content.
- Improved touch target sizes, input text sizing, reader controls, dynamic-height dialogs and space around floating security/upload controls.
- Made the notification composer scroll within short landscape screens and labeled its close button.
- Adapted the sign-in security widget to its actual container width. Cloudflare documents a [300 px minimum for flexible widgets and a 150 px compact option](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/). Changing size removes the previous widget and clears its result.
- Fixed notification settings crashing because an effect returned loading markup instead of a cleanup function.
- Stabilized existing regression checks by targeting the open payment drawer, waiting for sign-out/background notification completion, and scoping delivery assertions to the tested order rather than unrelated account-security alerts.

## Repeatable checks

```sh
npm test
npm run build
npm run test:responsive
```

The responsive command uses an isolated temporary backend database and local fixtures. It runs both browser engines and saves screenshots/traces under `test-results/responsive`. Existing accessibility and workflow suites remain under `tests/browser/`.

## Validation results

- All 56 responsive page/action checks passed in Chromium and WebKit on the final layout changes.
- All 43 unit tests passed; the production build and whitespace checks passed.
- All 71 targeted designer, manager, onboarding, routing and notification regressions passed across the initial run and focused reruns after fixes.
- All 40 accessibility and staff-workspace checks passed, along with six loading-system checks.
- All 26 authentication, loading-UX and production-workflow checks passed across the combined run and the focused order-workflow rerun. The workflow reached delivery closure and verified that its order notifications completed in the isolated environment.

## Limits

These are local browser-emulation checks, not physical-device certification. Real SMS/email delivery, live CAPTCHA verification and production deployment are outside this layout audit. No production records or provider settings were changed.
