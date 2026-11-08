import { test, expect } from './fixtures.js';

const slug = 'review-gate-test';
const path = `/catalogue/${slug}`;
const contact = { clientName: 'Review test', clientWhatsApp: '+255700000001' };
const fields = [
  { fieldId: 'story', type: 'textarea', label: 'Your memory', required: true },
  { fieldId: 'choices', type: 'checkbox', label: 'Themes', options: ['Celebration', 'Travel'], required: true },
  { fieldId: 'grid', type: 'grid_radio', label: 'Preferences', rows: ['Cover', 'Pages'], options: ['Colour', 'Classic'], required: true },
  { fieldId: 'optional', type: 'text', label: 'Optional note' },
  { fieldId: 'photo', type: 'photo_upload', label: 'Cover photo', required: true },
];
const answers = { story: 'A happy memory', choices: ['Travel'], grid: { Cover: 'Colour', Pages: 'Classic' } };
const review = page => page.getByRole('button', { name: '4 Review', exact: true });

async function setup(page, draft, formFields = fields) {
  await page.addInitScript(({ slug, draft }) => {
    localStorage.setItem('tinzel_language', 'en');
    if (draft) localStorage.setItem(`tinzel:answers:v2:${slug}`, JSON.stringify({ savedAt: Date.now(), data: draft }));
    // Detect transient review renders as well as the final state after redirects.
    window.reviewRendered = false;
    new MutationObserver(() => {
      if (document.querySelector('.order-review')) window.reviewRendered = true;
    }).observe(document, { childList: true, subtree: true });
  }, { slug, draft });
  await page.route(`**/api/public/forms/${slug}`, route => route.fulfill({ json: { form: {
    slug, title: 'Review gate test', price: 50000, currency: 'TZS', fields: formFields,
  } } }));
}

async function expectBlocked(page, step) {
  await expect(page).toHaveURL(new RegExp(`step=${step}$`));
  await expect(review(page)).toHaveCount(0);
  await expect(page.locator('.order-review')).toHaveCount(0);
  await expect(page.locator('.tinzel-submit-button')).toBeHidden();
}

test('empty direct review links and Continue from photos cannot bypass earlier steps', async ({ page }) => {
  await setup(page);
  await page.goto(`${path}?step=review`);
  await expectBlocked(page, 'details');
  expect(await page.evaluate(() => window.reviewRendered)).toBe(false);
  await page.getByRole('button', { name: '3 Photographs' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expectBlocked(page, 'details');
  await expect(page.locator('#magazine-client-name')).toBeFocused();
});

for (const [name, draft, step] of [
  ['invalid phone', { ...contact, clientWhatsApp: '123', answers }, 'details'],
  ['invalid optional email', { ...contact, clientEmail: 'invalid-email', answers }, 'details'],
  ['blank story', { ...contact, answers: { ...answers, story: '   ' } }, 'story'],
  ['empty checkbox', { ...contact, answers: { ...answers, choices: [] } }, 'story'],
  ['incomplete grid', { ...contact, answers: { ...answers, grid: { Cover: 'Colour' } } }, 'story'],
  ['missing photo', { ...contact, answers }, 'photos'],
]) {
  test(`restored draft with ${name} returns to ${step} before rendering review`, async ({ page }) => {
    await setup(page, draft);
    await page.goto(`${path}?step=review`);
    await expectBlocked(page, step);
    expect(await page.evaluate(() => window.reviewRendered)).toBe(false);
  });
}

test('required answers unlock review; edits and browser history cannot restore incomplete review', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, contact, fields.filter(field => field.type !== 'photo_upload'));
  await page.goto(`${path}?step=story`);
  await expect(review(page)).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Your memory' }).fill(answers.story);
  await page.getByRole('checkbox', { name: 'Travel', exact: true }).check();
  await page.getByRole('radio', { name: 'Preferences: Cover — Colour', exact: true }).check();
  await expect(review(page)).toHaveCount(0);
  await page.getByRole('radio', { name: 'Preferences: Pages — Classic', exact: true }).check();
  await expect(review(page)).toBeVisible();
  await review(page).click();
  await expect(page.locator('.order-review')).toBeVisible();
  await expect(page.locator('.order-review')).toContainText(answers.story);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/tinzel-review-complete-mobile.png', fullPage: true });
  await page.goBack();
  await page.getByRole('textbox', { name: 'Your memory' }).fill('');
  await expect(review(page)).toHaveCount(0);
  await page.goForward();
  await expectBlocked(page, 'story');
  await page.getByRole('textbox', { name: 'Your memory' }).fill(answers.story);
  await review(page).click();
  await expect(page.getByRole('button', { name: 'Clear saved draft', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear saved draft', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear answers', exact: true }).click();
  await expectBlocked(page, 'details');
  await page.screenshot({ path: '/tmp/tinzel-review-incomplete-mobile.png', fullPage: true });
});

test('a complete restored draft opens review with optional fields blank', async ({ page }) => {
  await setup(page, { ...contact, answers }, fields.filter(field => field.type !== 'photo_upload'));
  await page.goto(`${path}?step=review`);
  await expect(page.locator('.order-review')).toBeVisible();
  await expect(review(page)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.tinzel-submit-button')).toBeVisible();
  await expect(page).toHaveURL(/step=review$/);
});

test('required photo selection unlocks review, survives refresh, and removing it hides review again', async ({ page }) => {
  await setup(page, { ...contact, answers });
  const pixels = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFZ0AAAAASUVORK5CYII=', 'base64');
  const photo = { assetId: 'cover-asset', fieldId: 'photo', name: 'cover.png' };
  let entry;
  await page.route('**/api/public/media/**', route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/preview')) return route.fulfill({ contentType: 'image/png', body: pixels });
    if (pathname.endsWith('/sessions')) return route.fulfill({ json: { limits: { maxFileBytes: 25000000, maxFiles: 100, maxTotalBytes: 1000000000 } } });
    if (pathname.endsWith('/assets') && request.method() === 'POST') {
      entry = { ...request.postDataJSON(), _id: photo.assetId };
      return route.fulfill({ json: { entry } });
    }
    if (pathname.endsWith(`/assets/${photo.assetId}`)) return route.fulfill({ json: { photo } });
    if (request.method() === 'DELETE') { entry = null; return route.fulfill({ json: { success: true } }); }
    return route.fulfill({ json: { entries: entry ? [entry] : [], completed: entry ? [photo] : [] } });
  });
  await page.goto(`${path}?step=review`);
  await expectBlocked(page, 'photos');
  await page.locator('#upload-photo').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: pixels });
  await expect(page.locator('.photo-field__tile')).toHaveCount(1);
  await review(page).click();
  await expect(page.locator('.order-review')).toBeVisible();
  await expect.poll(() => page.evaluate(slug => JSON.parse(localStorage.getItem(`tinzel:uploads:v2:${slug}`))?.items?.[0]?.state, slug)).toBe('complete');
  await page.reload();
  await expect(page.locator('.order-review')).toBeVisible();
  await expect(page).toHaveURL(/step=review$/);
  await page.getByRole('button', { name: '3 Photographs', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select cover.png', exact: true }).check();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(review(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expectBlocked(page, 'photos');
});
