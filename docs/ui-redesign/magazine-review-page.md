# Dedicated manager magazine review page

Date: 2026-11-02

The order drawer's Drafts tab shows version cards with an authenticated, watermarked first-page cover and an action. A placeholder appears if the cover is unavailable or still preparing. No reader, original download, or decision form is embedded in this tab.

Review actions open `/staff/review/:orderId/versions/:version`. Admins and managers can use the existing protected reader, annotations, download verification, and review decisions there. Historical versions remain read-only. A version selector and Back to order action preserve order context. Native Back/Forward checks unsaved editor state before the staff shell changes routes.

## Verification

- Production frontend build passed.
- Frontend unit tests: 26 passed.
- Focused Chrome browser suite: 27 passed; one existing summary-card viewport resize assertion failed and passed on an isolated rerun (1 passed). No product change was made for that intermittent assertion.
- The suite covered manager review at 390/768/1440px, fullscreen, comments and notes, failure/retry, historical versions, browser Back, direct-link reload, designer route denial, draft-card navigation, download/session security and staff navigation loading.
- Disposable local backend workflow passed: manager returns corrections, designer uploads replacement, manager releases, client receives released version. Test data was synthetic; production data and messages were not used.
- Screenshot inspection: [card](evidence/magazine-review-page/draft-card.png), [desktop](evidence/magazine-review-page/desktop.png), [mobile](evidence/magazine-review-page/mobile.png). Blank cover artwork in the card image is the synthetic fixture.

Local implementation only. No push or production deployment performed. Automated browser viewport coverage is not physical-device testing.
