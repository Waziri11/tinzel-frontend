import { readFileSync } from 'node:fs';
import { test, expect, openClientReview } from './fixtures.js';

async function setup(page, lang = 'en') {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const policy = config.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
  await page.route('**/track', async route => {
    const response = await route.fetch();
    // Vite's development refresh scripts need inline code; production uses the full policy.
    const appliedPolicy = process.env.SECURITY_PRODUCTION_PREVIEW ? policy : policy.split(';').find(directive => directive.trim().startsWith('media-src'));
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': appliedPolicy } });
  });
  await page.addInitScript(lang => localStorage.setItem('tinzel_language', lang), lang);
  const order = { _id: 'audio-order', submissionId: 'SUB-AUDIO', clientName: 'Audio client', clientPreferredLanguage: lang, status: 'client_review', currentDraftVersion: 1,
    createdAt: '2026-11-07T08:00:00Z', draftVersions: [{ versionNumber: 1, managerReview: { status: 'approved' } }], revisionRequests: [] };
  await page.route('**/api/client/order', route => route.fulfill({ json: { order } }));
  await page.route('**/api/proofs/client/**', route => route.fulfill({ json: { state: 'ready', pageCount: 0, pages: [], annotations: [], canComment: true } }));
  await page.goto('/track');
  await openClientReview(page);
  await page.getByRole('button', { name: lang === 'en' ? 'Request changes' : 'Omba marekebisho' }).click();
  return order;
}
function silentWav() {
  const sampleRate = 8000, channels = 1, bytesPerSample = 2;
  const dataSize = sampleRate * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32); buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}
const file = { name: 'changes.wav', mimeType: 'audio/wav', buffer: silentWav() };

for (const width of [320, 390, 1280]) test(`customer chat composer sends written feedback and keeps cancelled drafts at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 844 });
  const order = await setup(page);
  const composer = page.getByRole('form', { name: 'Feedback editor', exact: true });
  await expect(page.getByText('Send a voice note', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add another change', exact: true })).toHaveCount(0);
  await composer.getByLabel('Written feedback 1', { exact: true }).fill('Please update the title.\nKeep the photograph.');
  await composer.getByLabel('Page number 1', { exact: true }).fill('2–3');
  await expect(composer.getByRole('button', { name: 'Attach audio', exact: true })).toBeVisible();
  const box = await composer.boundingBox();
  expect(box.width).toBeLessThanOrEqual(480);
  expect(box.height).toBeLessThan(350);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await composer.screenshot({ path: info.outputPath(`feedback-chat-${width}.png`) });
  await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('dialog', { name: 'Leave unsent feedback?' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(composer.getByLabel('Written feedback 1', { exact: true })).toHaveValue('Please update the title.\nKeep the photograph.');
  let body;
  await page.route('**/api/client/request-revision', route => {
    body = route.request().postDataJSON(); order.status = 'revision_requested';
    return route.fulfill({ json: { order } });
  });
  await composer.getByRole('button', { name: 'Send my changes', exact: true }).click();
  if (await page.getByRole('dialog', { name: 'Review magazine', exact: true }).isVisible()) await page.getByRole('dialog', { name: 'Send these changes to Tinzel?' }).getByRole('button', { name: 'Send my changes', exact: true }).click();
  await expect.poll(() => body).toEqual({ expectedVersion: 1, items: [{ text: 'Please update the title.\nKeep the photograph.', pageReference: '2–3' }] });
  await expect(composer).toHaveCount(0);
});

test('audio-only submission previews, retains audio after failure, and plays from history', async ({ page }) => {
  const order = await setup(page);
  let calls = 0;
  await page.route('**/api/client/request-revision', async route => {
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    expect(route.request().postDataBuffer().toString()).toContain('changes.wav');
    expect(route.request().headers()['x-csrf-token']).toBeTruthy();
    calls += 1;
    if (calls === 1) return route.fulfill({ status: 503, json: { message: 'Please retry your request' } });
    order.status = 'revision_requested';
    order.revisionRequests = [{ _id: 'round', roundNumber: 1, status: 'open', items: [{ _id: 'item', text: 'Audio feedback', audio: { contentType: 'audio/wav', size: file.buffer.length } }] }];
    return route.fulfill({ json: { order } });
  });
  await page.getByLabel('Audio file', { exact: true }).setInputFiles(file);
  await expect(page.getByRole('group', { name: 'Preview audio feedback player', exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel('Preview audio feedback', { exact: true }).evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  const previewPlay = page.getByRole('button', { name: 'Play preview audio feedback', exact: true });
  await expect(previewPlay).toHaveCSS('color', 'rgb(255, 255, 255)');
  await previewPlay.click();
  await expect(page.getByRole('button', { name: 'Pause preview audio feedback', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause preview audio feedback', exact: true }).click();
  await expect(page.getByLabel('Written feedback 1')).toBeEmpty();
  await page.getByRole('button', { name: 'Send my changes' }).click();
  await expect(page.getByText('Please retry your request')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Preview audio feedback player', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send my changes' })).toBeDisabled();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Check decision status', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send my changes' })).toBeEnabled();
  await page.getByRole('button', { name: 'Send my changes' }).click();
  await expect.poll(() => calls).toBe(2);
  let playbackRequests = 0;
  await page.route('**/api/client/revisions/round/items/item/audio', route => {
    playbackRequests += 1;
    // A damaged response must recover through the local playback retry.
    return route.fulfill({ contentType: 'audio/wav', body: playbackRequests === 1 ? Buffer.from('invalid audio') : file.buffer });
  });
  await page.getByRole('button', { name: 'Play audio feedback' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Audio could not open. Tap to retry.' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry audio', exact: true }).click();
  const historyAudio = page.getByLabel('Audio feedback', { exact: true });
  await expect(historyAudio).toBeAttached();
  await expect(page.getByRole('group', { name: 'Audio feedback player' })).toBeVisible();
  await expect.poll(() => historyAudio.evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Audio could not open. Tap to retry.' })).toHaveCount(0);
  expect(playbackRequests).toBe(2);
});

test('mobile Swahili form supports removing audio, empty validation, and size limit', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, 'sw');
  const attach = page.locator('.client-review-controls input[type="file"]');
  await attach.setInputFiles(file);
  await expect(page.getByRole('group', { name: 'Kicheza maoni ya sauti', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('audio-mobile-sw.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Ondoa sauti' }).click();
  await expect(page.getByRole('button', { name: 'Tuma marekebisho yangu' })).toBeDisabled();
  await attach.setInputFiles({ ...file, buffer: Buffer.alloc(3 * 1024 * 1024 + 1) });
  await expect(page.getByRole('region', { name: 'Maoni ya sauti' }).getByRole('alert')).toContainText('Chagua faili la sauti lisilozidi MB 3.');
});

test('microphone denial keeps file upload available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } });
  });
  await setup(page);
  await page.getByRole('button', { name: 'Record voice note' }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access was not allowed');
  await expect(page.getByLabel('Attach audio', { exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Send my changes' })).toBeDisabled();
  await page.getByLabel('Written feedback 1', { exact: true }).fill('Please update the title.');
  await expect(page.getByRole('button', { name: 'Send my changes' })).toBeEnabled();
});

for (const width of [1280, 390]) test(`recording stops and releases the microphone before audio-only submission at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 844 });
  await context.grantPermissions(['microphone']);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async options => { const stream = await original(options); window.recordedStream = stream; return stream; };
  });
  await setup(page);
  await page.getByRole('button', { name: 'Record voice note' }).click();
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send my changes' })).toBeDisabled();
  if (width === 390) {
    await expect(page.getByRole('button', { name: 'Close review', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Review magazine', exact: true })).toBeVisible();
  }
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('group', { name: 'Preview audio feedback player', exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel('Preview audio feedback', { exact: true }).evaluate(audio => audio.readyState)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.recordedStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Send my changes' })).toBeEnabled();
  if (width === 390) await expect(page.getByRole('button', { name: 'Close review', exact: true })).toBeEnabled();
});

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
